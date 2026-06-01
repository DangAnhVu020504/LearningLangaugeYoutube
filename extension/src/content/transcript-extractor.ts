// ============================================================================
// Transcript Extractor - Trích xuất caption tracks từ YouTube page
// ============================================================================
//
// ── VẤN ĐỀ CỐT LÕI ──────────────────────────────────────────────────────
//
// YouTube lưu thông tin phụ đề (caption tracks) trong biến JavaScript:
//   window.ytInitialPlayerResponse.captions.playerCaptionsTracklistRenderer.captionTracks
//
// Tuy nhiên, Content Script chạy trong "Isolated World" - một sandbox
// cách ly hoàn toàn với JavaScript context của trang.
//
// → KHÔNG thể truy cập window.ytInitialPlayerResponse từ Content Script.
//
// ── GIẢI PHÁP ─────────────────────────────────────────────────────────────
//
// Sử dụng 2 phương pháp bổ sung nhau:
//
// 1. **Primary**: Parse trực tiếp HTML source của trang.
//    YouTube nhúng ytInitialPlayerResponse dưới dạng JSON bên trong
//    thẻ <script> trong HTML. Ta dùng regex để trích xuất JSON này
//    mà không cần inject script vào Main World.
//    → An toàn hơn, không cần thêm permission.
//
// 2. **Fallback**: Inject script vào Main World qua manifest.json
//    (world: "MAIN") để đọc biến window trực tiếp.
//    → Chỉ dùng nếu phương pháp 1 thất bại.
//
// ========================================================================

import type { CaptionTrack } from '../types/transcript';

const LOG_PREFIX = '[ChiHaiDaiCa][TranscriptExtractor]';

/**
 * Trích xuất danh sách caption tracks có sẵn cho video hiện tại.
 *
 * Luồng xử lý:
 * 1. Thử parse ytInitialPlayerResponse từ HTML source (Primary)
 * 2. Nếu fail → thử đọc từ script tags trong DOM (Fallback 1)
 * 3. Nếu fail → thử inject script vào Main World (Fallback 2)
 *
 * @param videoId - Video ID để validate kết quả
 * @returns Mảng CaptionTrack hoặc mảng rỗng nếu video không có phụ đề
 */
export async function extractCaptionTracks(
  videoId: string
): Promise<CaptionTrack[]> {
  console.log(`${LOG_PREFIX} 🔍 Đang trích xuất caption tracks cho video: ${videoId}`);

  // ── Phương pháp 1: Parse từ DOM script tags ──────────────────────────
  let tracks = extractFromDomScripts();
  if (tracks.length > 0) {
    console.log(`${LOG_PREFIX} ✅ Tìm thấy ${tracks.length} caption tracks (từ DOM scripts)`);
    return tracks;
  }

  // ── Phương pháp 2: Inject script vào Main World ──────────────────────
  console.log(`${LOG_PREFIX} ⚠️ DOM scripts extraction thất bại, thử inject script...`);
  tracks = await extractViaInjectedScript();
  if (tracks.length > 0) {
    console.log(`${LOG_PREFIX} ✅ Tìm thấy ${tracks.length} caption tracks (từ injected script)`);
    return tracks;
  }

  console.warn(`${LOG_PREFIX} ❌ Không tìm thấy caption tracks. Video có thể không có phụ đề.`);
  return [];
}

// ============================================================================
// Phương pháp 1: Parse trực tiếp từ DOM <script> tags
// ============================================================================
//
// Khi YouTube load trang, nó nhúng player response data trong <script> tags:
//
//   <script nonce="...">
//     var ytInitialPlayerResponse = { ... };
//   </script>
//
// Hoặc trong format mới hơn:
//
//   <script nonce="...">
//     var ytInitialData = ...;
//     var ytInitialPlayerResponse = ...;
//   </script>
//
// Ta quét tất cả <script> tags và tìm chuỗi chứa "captionTracks".
// ============================================================================

function extractFromDomScripts(): CaptionTrack[] {
  try {
    const scripts = document.querySelectorAll('script');

    for (const script of scripts) {
      const content = script.textContent;
      if (!content) continue;

      // Tìm script chứa ytInitialPlayerResponse
      // YouTube có thể dùng nhiều format khác nhau:
      // - var ytInitialPlayerResponse = {...};
      // - ytInitialPlayerResponse = {...};
      // - window["ytInitialPlayerResponse"] = {...};

      // Cách 1: Tìm trực tiếp captionTracks trong nội dung script
      if (content.includes('captionTracks')) {
        const tracks = parseCaptionTracksFromScript(content);
        if (tracks.length > 0) return tracks;
      }
    }

    // Cách 2: Tìm trong ytInitialPlayerResponse được set vào ytplayer.config
    // YouTube đôi khi nhúng data theo cách khác
    for (const script of scripts) {
      const content = script.textContent;
      if (!content) continue;

      if (content.includes('playerCaptionsTracklistRenderer')) {
        const tracks = parseCaptionTracksFromScript(content);
        if (tracks.length > 0) return tracks;
      }
    }
  } catch (error) {
    console.warn(`${LOG_PREFIX} Lỗi khi parse DOM scripts:`, error);
  }

  return [];
}

/**
 * Parse captionTracks array từ nội dung text của <script> tag.
 *
 * YouTube JSON structure:
 * ```json
 * {
 *   "captions": {
 *     "playerCaptionsTracklistRenderer": {
 *       "captionTracks": [
 *         {
 *           "baseUrl": "https://www.youtube.com/api/timedtext?...",
 *           "name": { "simpleText": "English" },
 *           "vssId": ".en",
 *           "languageCode": "en",
 *           "kind": "asr",         // "asr" = auto-generated, "" = manual
 *           "isTranslatable": true
 *         }
 *       ]
 *     }
 *   }
 * }
 * ```
 */
function parseCaptionTracksFromScript(scriptContent: string): CaptionTrack[] {
  try {
    // ── Chiến lược 1: Trích xuất JSON object chứa captionTracks ─────
    // Regex tìm mảng "captionTracks":[...] trong text
    const captionTracksRegex = /"captionTracks"\s*:\s*(\[[\s\S]*?\])\s*(?:,\s*")/;
    const match = scriptContent.match(captionTracksRegex);

    if (match?.[1]) {
      const rawTracks = JSON.parse(match[1]) as RawYouTubeCaptionTrack[];
      return rawTracks.map(mapRawTrackToCaptionTrack);
    }

    // ── Chiến lược 2: Parse cả ytInitialPlayerResponse ──────────────
    // Tìm block JSON lớn hơn nếu chiến lược 1 thất bại
    const playerResponseRegex = /ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;/;
    const prMatch = scriptContent.match(playerResponseRegex);

    if (prMatch?.[1]) {
      const playerResponse = JSON.parse(prMatch[1]) as YtPlayerResponse;
      const tracks = playerResponse?.captions
        ?.playerCaptionsTracklistRenderer?.captionTracks;

      if (tracks && tracks.length > 0) {
        return tracks.map(mapRawTrackToCaptionTrack);
      }
    }
  } catch (error) {
    // JSON parse có thể fail do regex không capture đúng boundaries
    // Đây là hành vi expected - sẽ fallback sang phương pháp khác
    console.debug(`${LOG_PREFIX} Parse attempt failed (expected):`, error);
  }

  return [];
}

// ============================================================================
// Phương pháp 2: Inject script vào Main World (Fallback)
// ============================================================================
//
// Inject một đoạn script nhỏ vào page context (Main World) để đọc
// window.ytInitialPlayerResponse trực tiếp, rồi gửi data về Content Script
// qua window.postMessage().
//
// Cách inject an toàn trong MV3:
// - Tạo <script> element với textContent (KHÔNG dùng eval hay innerHTML)
// - Append vào document, script sẽ execute ngay trong Main World
// - Remove script element ngay sau khi execute (cleanup)
//
// Communication flow:
//   Main World → window.postMessage() → Content Script (window.onmessage)
//
// postMessage() hoạt động vì Content Script và Main World share cùng
// window object, chỉ khác JavaScript scope.
// ============================================================================

async function extractViaInjectedScript(): Promise<CaptionTrack[]> {
  return new Promise((resolve) => {
    // Timeout safety - không chờ mãi nếu script injection fail
    const timeoutId = setTimeout(() => {
      window.removeEventListener('message', handleMessage);
      console.warn(`${LOG_PREFIX} Inject script timeout`);
      resolve([]);
    }, 5000);

    // ── Listener nhận data từ Main World ──────────────────────────────
    function handleMessage(event: MessageEvent): void {
      // Security: chỉ accept message từ cùng origin
      if (event.origin !== window.location.origin) return;

      // Validate message format
      if (event.data?.type !== 'CHIHAIDAICA_CAPTION_TRACKS') return;

      clearTimeout(timeoutId);
      window.removeEventListener('message', handleMessage);

      const rawTracks = event.data.tracks as RawYouTubeCaptionTrack[] | null;
      if (rawTracks && rawTracks.length > 0) {
        resolve(rawTracks.map(mapRawTrackToCaptionTrack));
      } else {
        resolve([]);
      }
    }

    window.addEventListener('message', handleMessage);

    // ── Inject script vào Main World ─────────────────────────────────
    // Script này chạy trong page context nên có thể access window.ytInitialPlayerResponse
    const scriptEl = document.createElement('script');
    scriptEl.textContent = `
      (function() {
        try {
          var tracks = null;

          // Cách 1: Đọc trực tiếp từ global variable
          if (window.ytInitialPlayerResponse &&
              window.ytInitialPlayerResponse.captions &&
              window.ytInitialPlayerResponse.captions.playerCaptionsTracklistRenderer) {
            tracks = window.ytInitialPlayerResponse.captions
              .playerCaptionsTracklistRenderer.captionTracks || null;
          }

          // Cách 2: Đọc từ ytplayer.config (format cũ hơn)
          if (!tracks && window.ytplayer && window.ytplayer.config &&
              window.ytplayer.config.args) {
            var playerResponse = window.ytplayer.config.args.raw_player_response;
            if (playerResponse && playerResponse.captions) {
              tracks = playerResponse.captions
                .playerCaptionsTracklistRenderer.captionTracks || null;
            }
          }

          // Cách 3: Tìm trong document.ytInitialPlayerResponse (đôi khi YouTube lưu ở đây)
          if (!tracks && document.ytInitialPlayerResponse) {
            var docResponse = document.ytInitialPlayerResponse;
            if (docResponse.captions && docResponse.captions.playerCaptionsTracklistRenderer) {
              tracks = docResponse.captions
                .playerCaptionsTracklistRenderer.captionTracks || null;
            }
          }

          window.postMessage({
            type: 'CHIHAIDAICA_CAPTION_TRACKS',
            tracks: tracks
          }, '*');
        } catch(e) {
          window.postMessage({
            type: 'CHIHAIDAICA_CAPTION_TRACKS',
            tracks: null
          }, '*');
        }
      })();
    `;

    // Inject vào <head> hoặc <document.documentElement>
    (document.head || document.documentElement).appendChild(scriptEl);

    // Cleanup: remove script tag ngay sau khi inject
    // Script đã execute rồi, không cần giữ trong DOM
    scriptEl.remove();
  });
}

// ============================================================================
// Helper: Map YouTube raw data → CaptionTrack interface
// ============================================================================

/**
 * Cấu trúc raw data từ YouTube (không export - chỉ dùng internal).
 */
interface RawYouTubeCaptionTrack {
  baseUrl: string;
  name?: { simpleText?: string; runs?: Array<{ text: string }> };
  vssId?: string;
  languageCode: string;
  kind?: string;
  isTranslatable?: boolean;
}

/**
 * YouTube Player Response structure (partial - chỉ phần captions).
 */
interface YtPlayerResponse {
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: RawYouTubeCaptionTrack[];
    };
  };
}

/**
 * Chuyển đổi raw YouTube caption track data sang CaptionTrack interface.
 * Xử lý các edge cases: name có thể là simpleText hoặc runs format.
 */
function mapRawTrackToCaptionTrack(raw: RawYouTubeCaptionTrack): CaptionTrack {
  // YouTube lưu tên ngôn ngữ theo 2 format khác nhau:
  // 1. { name: { simpleText: "English" } }
  // 2. { name: { runs: [{ text: "English" }] } }
  let languageName = raw.languageCode;
  if (raw.name?.simpleText) {
    languageName = raw.name.simpleText;
  } else if (raw.name?.runs?.[0]?.text) {
    languageName = raw.name.runs[0].text;
  }

  const kind = (raw.kind || '') as CaptionTrack['kind'];

  // Giải mã baseUrl: YouTube thường encode & thành \u0026 hoặc %26 trong JSON
  // Nếu không giải mã, request fetch sẽ bị sai cấu trúc URL
  let decodedBaseUrl = raw.baseUrl || '';
  if (decodedBaseUrl) {
    decodedBaseUrl = decodedBaseUrl.replace(/\\u0026/g, '&').replace(/%26/g, '&');
  }

  return {
    baseUrl: decodedBaseUrl,
    languageCode: raw.languageCode,
    languageName,
    kind,
    isAutoGenerated: kind === 'asr',
  };
}

/**
 * Log chi tiết danh sách caption tracks để debug.
 */
export function logCaptionTracks(tracks: CaptionTrack[]): void {
  console.log(`${LOG_PREFIX} ── Caption Tracks Available ──`);
  tracks.forEach((track, index) => {
    const typeLabel = track.isAutoGenerated ? '🤖 Auto' : '✍️ Manual';
    console.log(
      `${LOG_PREFIX}   [${index}] ${typeLabel} | ${track.languageName} (${track.languageCode})`
    );
  });
  console.log(`${LOG_PREFIX} ─────────────────────────────`);
}
