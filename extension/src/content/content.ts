// ============================================================================
// Content Script - Inject vào YouTube DOM
// ============================================================================
// File này là điểm khởi đầu của extension trên trang YouTube.
// Nó được Chrome inject vào MỌI trang youtube.com (theo manifest.json).
//
// Trách nhiệm:
// Phase 1: Phát hiện <video>, lắng nghe timeupdate, xử lý SPA navigation
// Phase 2: Trích xuất caption tracks, yêu cầu SW fetch transcript
// Phase 3: Đồng bộ + render phụ đề song ngữ, tokenization
//
// ── YouTube DOM Structure ──────────────────────────────────────────────
// Cấu trúc DOM của YouTube Video Player (tính đến thời điểm hiện tại):
//
//   #page-manager
//     └── ytd-watch-flexy
//           └── #player-container-outer
//                 └── #player-container-inner
//                       └── #player
//                             └── #movie_player (.html5-video-player)
//                                   └── .html5-video-container
//                                         └── video.html5-main-video
//
// LƯU Ý QUAN TRỌNG:
// - YouTube KHÔNG sử dụng Shadow DOM cho video player
// - Tuy nhiên, YouTube THƯỜNG XUYÊN thay đổi class names và structure
// - Code sử dụng nhiều fallback selectors để tăng độ bền (resilience)
// ========================================================================

import {
  MessageType,
  createMessage,
  VideoDetectedPayload,
  NavigationChangedPayload,
  FetchTranscriptPayload,
  TranscriptResultPayload,
} from '../types/messages';
import type { TranscriptData, CaptionTrack } from '../types/transcript';
import { waitForElement, observeUrlChange, extractVideoId } from '../utils/dom-observer';
import { extractCaptionTracks, logCaptionTracks } from './transcript-extractor';
import { SubtitleSync } from './subtitle-sync';
import { initSubtitleOverlay, renderSubtitle, destroySubtitleOverlay } from './subtitle-renderer';

const LOG_PREFIX = '[ChiHaiDaiCa]';

// ── Selectors ─────────────────────────────────────────────────────────────
// Danh sách CSS selectors theo thứ tự ưu tiên để tìm <video> element.
// Nếu YouTube thay đổi structure, chỉ cần update danh sách này.
const VIDEO_SELECTORS = [
  'video.html5-main-video',           // Selector chính - class hiện tại
  '#movie_player video',              // Fallback 1 - tìm qua parent ID
  '.html5-video-container video',     // Fallback 2 - tìm qua parent class
  'ytd-player video',                 // Fallback 3 - tìm qua custom element
  'video',                            // Fallback cuối - bất kỳ video nào
] as const;

// ── State ─────────────────────────────────────────────────────────────────
// Content Script state - quản lý trạng thái hiện tại
let currentVideoElement: HTMLVideoElement | null = null;
let currentVideoId: string | null = null;
let cleanupUrlObserver: (() => void) | null = null;
let timeUpdateThrottleTimer: ReturnType<typeof setTimeout> | null = null;

// Phase 2: Transcript state
export let currentTranscript: TranscriptData | null = null;
export let availableCaptionTracks: CaptionTrack[] = [];

// Phase 3: Subtitle sync & render state
const subtitleSync = new SubtitleSync();
let isSubtitleOverlayReady = false;

/**
 * Tìm thẻ <video> của YouTube Player.
 * Thử lần lượt từng selector trong danh sách cho đến khi tìm được.
 */
function findVideoElement(): HTMLVideoElement | null {
  for (const selector of VIDEO_SELECTORS) {
    const video = document.querySelector<HTMLVideoElement>(selector);
    if (video) {
      console.log(`${LOG_PREFIX} Tìm thấy <video> bằng selector: "${selector}"`);
      return video;
    }
  }
  return null;
}

/**
 * Lấy tiêu đề video từ DOM.
 * YouTube render title ở nhiều vị trí, thử từng cái.
 */
function getVideoTitle(): string {
  const selectors = [
    'h1.ytd-watch-metadata yt-formatted-string',
    '#title h1 yt-formatted-string',
    'h1.title',
    '#info-contents h1',
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el?.textContent?.trim()) {
      return el.textContent.trim();
    }
  }

  return document.title.replace(' - YouTube', '').trim();
}

/**
 * Gửi message tới Service Worker một cách an toàn.
 * Bọc trong try-catch vì Service Worker có thể đã bị terminate (MV3 lifecycle).
 */
async function sendMessageToBackground<T>(
  type: MessageType,
  payload: T
): Promise<void> {
  try {
    const message = createMessage(type, payload);
    await chrome.runtime.sendMessage(message);
  } catch (error) {
    // Service Worker có thể inactive - đây là hành vi bình thường trong MV3
    // Service Worker sẽ tự restart khi có message mới
    console.warn(`${LOG_PREFIX} Không thể gửi message (SW có thể inactive):`, error);
  }
}

/**
 * Handler cho sự kiện `timeupdate` của <video>.
 *
 * Phase 3: Giảm throttle xuống 250ms để subtitle sync mượt hơn.
 * Mỗi lần fire:
 * 1. Tìm segment hiện tại (binary search, cached)
 * 2. Render phụ đề nếu segment thay đổi
 * 3. Gửi time update tới Service Worker
 */
function handleTimeUpdate(event: Event): void {
  const video = event.target as HTMLVideoElement;

  // Throttle: 250ms cho subtitle sync mượt
  if (timeUpdateThrottleTimer) return;

  timeUpdateThrottleTimer = setTimeout(() => {
    timeUpdateThrottleTimer = null;
  }, 250);

  const currentTime = video.currentTime;

  // ── Phase 3: Đồng bộ và render phụ đề ─────────────────────────────
  if (isSubtitleOverlayReady) {
    const segment = subtitleSync.findSegmentAtTime(currentTime);
    renderSubtitle(segment);
  }
}

/**
 * Format giây thành dạng MM:SS để dễ đọc trong console.
 */
function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Attach event listeners lên <video> element.
 * Gọi khi phát hiện video element lần đầu hoặc khi video element thay đổi.
 */
function attachVideoListeners(video: HTMLVideoElement): void {
  // Cleanup listener cũ nếu có (tránh duplicate listeners)
  detachVideoListeners();

  currentVideoElement = video;

  // ── Lắng nghe timeupdate ──────────────────────────────────────────
  video.addEventListener('timeupdate', handleTimeUpdate);

  // ── Lắng nghe play/pause để debug ─────────────────────────────────
  video.addEventListener('play', () => {
    console.log(`${LOG_PREFIX} ▶ Video đang phát`);
  });

  video.addEventListener('pause', () => {
    console.log(`${LOG_PREFIX} ⏸ Video đã tạm dừng`);
  });

  console.log(`${LOG_PREFIX} ✅ Đã attach event listeners lên <video>`);
}

/**
 * Gỡ bỏ event listeners khỏi <video> element hiện tại.
 * Quan trọng khi YouTube navigate sang video mới (SPA) -
 * video element có thể bị replace hoàn toàn.
 */
function detachVideoListeners(): void {
  if (currentVideoElement) {
    currentVideoElement.removeEventListener('timeupdate', handleTimeUpdate);
    console.log(`${LOG_PREFIX} Đã detach event listeners khỏi <video> cũ`);
    currentVideoElement = null;
  }
}

/**
 * Khởi tạo kết nối với YouTube Video Player.
 * Đây là hàm chính được gọi khi:
 * 1. Content script load lần đầu
 * 2. YouTube SPA navigate sang video mới
 */
async function initializeVideoConnection(): Promise<void> {
  const url = window.location.href;
  const videoId = extractVideoId(url);

  // Chỉ hoạt động trên trang xem video (có video ID)
  if (!videoId) {
    console.log(`${LOG_PREFIX} Không phải trang video, bỏ qua. URL: ${url}`);
    return;
  }

  // Tránh re-initialize nếu đang xem cùng video
  if (videoId === currentVideoId && currentVideoElement) {
    console.log(`${LOG_PREFIX} Vẫn đang xem video ${videoId}, không cần re-init`);
    return;
  }

  currentVideoId = videoId;
  console.log(`${LOG_PREFIX} 🎬 Đang kết nối với video: ${videoId}`);

  try {
    // Chờ <video> element xuất hiện trong DOM
    // YouTube có thể chưa render video ngay khi navigate
    const video = await waitForElement<HTMLVideoElement>(
      VIDEO_SELECTORS[0],
      10000
    ).catch(() => {
      // Nếu selector chính fail, thử tìm bằng function
      console.log(`${LOG_PREFIX} Selector chính fail, thử fallback...`);
      return findVideoElement();
    });

    if (!video) {
      console.error(`${LOG_PREFIX} ❌ Không tìm thấy <video> element!`);
      return;
    }

    // Attach listeners
    attachVideoListeners(video);

    // Lấy title và gửi thông báo về Service Worker
    const title = getVideoTitle();
    const payload: VideoDetectedPayload = {
      videoUrl: url,
      videoId,
      title,
    };

    await sendMessageToBackground(MessageType.VIDEO_DETECTED, payload);

    console.log(`${LOG_PREFIX} ✅ Kết nối thành công!`);
    console.log(`${LOG_PREFIX}    Video ID: ${videoId}`);
    console.log(`${LOG_PREFIX}    Title: ${title}`);
    console.log(`${LOG_PREFIX}    Duration: ${formatTime(video.duration)}`);

    // ── Phase 2: Trích xuất transcript ───────────────────────────────
    await initializeTranscript(videoId);

  } catch (error) {
    console.error(`${LOG_PREFIX} ❌ Lỗi khi kết nối video:`, error);
  }
}

// ============================================================================
// Phase 2: Transcript Extraction
// ============================================================================

/**
 * Khởi tạo quá trình lấy transcript cho video hiện tại.
 *
 * Luồng:
 * 1. Trích xuất caption tracks từ YouTube page (DOM/injected script)
 * 2. Chọn track phù hợp nhất (ưu tiên: English > manual > auto-generated)
 * 3. Gửi yêu cầu fetch transcript XML tới Service Worker
 * 4. Nhận và lưu transcript đã parse
 */
async function initializeTranscript(videoId: string): Promise<void> {
  console.log(`${LOG_PREFIX} 📝 Bắt đầu trích xuất transcript...`);

  // Reset transcript state cho video mới
  currentTranscript = null;
  availableCaptionTracks = [];

  try {
    // ── Bước 1: Lấy danh sách caption tracks ──────────────────────────
    // Delay nhỏ để đảm bảo YouTube đã load xong player data
    await delay(1000);

    const tracks = await extractCaptionTracks(videoId);

    if (tracks.length === 0) {
      console.warn(`${LOG_PREFIX} ⚠️ Video không có phụ đề!`);
      return;
    }

    availableCaptionTracks = tracks;
    logCaptionTracks(tracks);

    // ── Bước 2: Chọn track tốt nhất ──────────────────────────────────
    const selectedTrack = selectBestTrack(tracks);
    console.log(
      `${LOG_PREFIX} 🎯 Đã chọn track: ${selectedTrack.languageName} ` +
      `(${selectedTrack.languageCode}) [${selectedTrack.isAutoGenerated ? 'Auto' : 'Manual'}]`
    );

    // ── Bước 3: Yêu cầu Service Worker fetch transcript ──────────────
    const transcript = await requestTranscript(
      videoId,
      selectedTrack
    );

    if (transcript) {
      currentTranscript = transcript;
      console.log(
        `${LOG_PREFIX} ✅ Transcript sẵn sàng: ${transcript.segments.length} segments`
      );
      // Log vài segments đầu để verify
      transcript.segments.slice(0, 3).forEach((seg, i) => {
        console.log(
          `${LOG_PREFIX}    [${i}] ${formatTime(seg.startTime)}-${formatTime(seg.endTime)}: "${seg.text}"`
        );
      });

      // ── Phase 3: Khởi tạo subtitle sync + overlay ─────────────────
      subtitleSync.setSegments(transcript.segments);

      if (currentVideoElement) {
        isSubtitleOverlayReady = initSubtitleOverlay(currentVideoElement);
        if (isSubtitleOverlayReady) {
          console.log(`${LOG_PREFIX} 🎬 Subtitle overlay sẵn sàng!`);
        }
      }
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} ❌ Lỗi khi trích xuất transcript:`, error);
  }
}

/**
 * Chọn caption track phù hợp nhất từ danh sách available tracks.
 *
 * Thứ tự ưu tiên:
 * 1. Track manual (do creator upload) với ngôn ngữ English
 * 2. Track manual bất kỳ
 * 3. Track auto-generated English
 * 4. Track đầu tiên trong danh sách
 */
function selectBestTrack(tracks: CaptionTrack[]): CaptionTrack {
  // Ưu tiên 1: Manual English
  const manualEn = tracks.find(
    t => !t.isAutoGenerated && t.languageCode === 'en'
  );
  if (manualEn) return manualEn;

  // Ưu tiên 2: Bất kỳ manual track nào
  const manual = tracks.find(t => !t.isAutoGenerated);
  if (manual) return manual;

  // Ưu tiên 3: Auto-generated English
  const autoEn = tracks.find(
    t => t.isAutoGenerated && t.languageCode === 'en'
  );
  if (autoEn) return autoEn;

  // Fallback: track đầu tiên
  return tracks[0];
}

/**
 * Fetch transcript bằng cách gửi yêu cầu tới Service Worker.
 * Service Worker sẽ thực hiện fetch() (bypass CORS nhờ host_permissions)
 * và parse kết quả rồi trả về cho Content Script.
 */
/**
 * Fetch transcript bằng cách Inject script vào Main World.
 * Trình duyệt sẽ tự động đính kèm Cookie của YouTube, giúp vượt rào Anti-bot.
 */
async function requestTranscript(videoId: string, track: CaptionTrack): Promise<TranscriptData | null> {
  console.log(`${LOG_PREFIX} 📥 Đang tải transcript (Main World Injection)...`);

  return new Promise((resolve) => {
    // 1. Chuẩn hóa URL, ép buộc YouTube trả định dạng JSON3
    let fetchUrl = track.baseUrl;
    if (!fetchUrl.includes('fmt=json3')) {
      fetchUrl += (fetchUrl.includes('?') ? '&' : '?') + 'fmt=json3';
    }

    // Tạo ID duy nhất cho request này để tránh đụng độ message
    const requestId = 'CHIHAIDAICA_FETCH_' + Date.now() + Math.random().toString(36).substring(7);

    // Timeout safety - không chờ mãi nếu fetch bị treo
    const timeoutId = setTimeout(() => {
      window.removeEventListener('message', handleMessage);
      console.warn(`${LOG_PREFIX} ⚠️ Lỗi Timeout khi fetch transcript từ Main World.`);
      resolve(null);
    }, 15000);

    // ── Listener nhận data từ Main World ──────────────────────────────
    function handleMessage(event: MessageEvent): void {
      // Security: chỉ accept message từ cùng origin
      if (event.origin !== window.location.origin) return;

      // Validate message format
      if (event.data?.type !== requestId) return;

      clearTimeout(timeoutId);
      window.removeEventListener('message', handleMessage);

      if (event.data.error) {
        console.error(`${LOG_PREFIX} ❌ Lỗi từ Main World fetch:`, event.data.error);
        resolve(null);
        return;
      }

      const rawText = event.data.text;
      
      if (!rawText) {
        console.warn(`${LOG_PREFIX} ⚠️ Dữ liệu tải về rỗng. YouTube từ chối request.`);
        resolve(null);
        return;
      }

      try {
        // Phân tích dữ liệu JSON3
        const data = JSON.parse(rawText);
        const segments: any[] = [];

        if (data.events) {
          data.events.forEach((event: any) => {
            if (event.segs) {
              // Lọc rác và ghép từ lại thành câu hoàn chỉnh
              let textSegment = event.segs
                .map((seg: any) => seg.utf8)
                .filter((text: string) => text && text.trim() !== '' && text !== '\n')
                .join('').trim();

              if (textSegment.length > 0) {
                const startTime = (event.tStartMs || 0) / 1000;
                const duration = (event.dDurationMs || 0) / 1000;

                // Đẩy vào mảng theo đúng định dạng UI cần
                segments.push({
                  text: textSegment,
                  startTime: startTime,
                  duration: duration,
                  endTime: startTime + duration
                });
              }
            }
          });
        }

        console.log(`${LOG_PREFIX} ✅ Đã trích xuất thành công ${segments.length} câu thoại!`);

        resolve({
          videoId: videoId,
          segments: segments,
          languageCode: track.languageCode,
          languageName: track.languageName,
          isAutoGenerated: track.isAutoGenerated,
          fetchedAt: Date.now()
        });
      } catch (error) {
        console.error(`${LOG_PREFIX} ❌ Lỗi parse transcript:`, error);
        resolve(null);
      }
    }

    window.addEventListener('message', handleMessage);

    // ── Inject script vào Main World ─────────────────────────────────
    const scriptEl = document.createElement('script');
    scriptEl.textContent = `
      (async function() {
        try {
          // Thực hiện fetch trực tiếp ở Main World
          const response = await window.fetch("${fetchUrl}");
          const text = await response.text();
          
          window.postMessage({
            type: "${requestId}",
            text: text
          }, '*');
        } catch(error) {
          window.postMessage({
            type: "${requestId}",
            error: error.toString()
          }, '*');
        }
      })();
    `;

    (document.head || document.documentElement).appendChild(scriptEl);

    // Cleanup: remove script tag ngay sau khi inject
    scriptEl.remove();
  });
}
/** Simple delay utility */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Xử lý khi YouTube SPA navigate sang URL mới.
 */
function handleNavigation(newUrl: string, oldUrl: string): void {
  console.log(`${LOG_PREFIX} 🧭 Navigation detected`);

  // Gửi thông báo navigation tới Service Worker
  const payload: NavigationChangedPayload = { newUrl, oldUrl };
  sendMessageToBackground(MessageType.NAVIGATION_CHANGED, payload);

  // Re-initialize kết nối video cho trang mới
  // Delay nhỏ để YouTube kịp render DOM mới
  setTimeout(() => {
    initializeVideoConnection();
  }, 500);
}

// ============================================================================
// ENTRY POINT - Content Script bắt đầu từ đây
// ============================================================================

function main(): void {
  console.log(`${LOG_PREFIX} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`${LOG_PREFIX} 🚀 Content Script loaded!`);
  console.log(`${LOG_PREFIX}    URL: ${window.location.href}`);
  console.log(`${LOG_PREFIX} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  // ── 1. Thiết lập URL observer cho SPA navigation ────────────────────
  cleanupUrlObserver = observeUrlChange(handleNavigation);

  // ── 2. Khởi tạo kết nối video lần đầu ──────────────────────────────
  initializeVideoConnection();
}

// Chạy main khi script load
main();

// ── Cleanup khi extension bị unload/disable ───────────────────────────
// Trong MV3, content scripts không có event "unload" rõ ràng,
// nhưng chúng ta vẫn export cleanup để có thể gọi nếu cần.
export function cleanup(): void {
  detachVideoListeners();
  destroySubtitleOverlay();
  subtitleSync.reset();
  isSubtitleOverlayReady = false;
  if (cleanupUrlObserver) {
    cleanupUrlObserver();
    cleanupUrlObserver = null;
  }
  if (timeUpdateThrottleTimer) {
    clearTimeout(timeUpdateThrottleTimer);
    timeUpdateThrottleTimer = null;
  }
  currentVideoId = null;
  console.log(`${LOG_PREFIX} 🧹 Content Script cleaned up`);
}
