// ============================================================================
// Service Worker (Background) - Chrome Extension MV3
// ============================================================================
// Trong Manifest V3, background script chạy dưới dạng Service Worker.
// Điều này có nghĩa:
//
// 1. KHÔNG có persistent state - Worker có thể bị Chrome terminate bất cứ lúc nào
//    (thường sau 30 giây không hoạt động hoặc 5 phút tối đa)
// 2. KHÔNG có access tới DOM - Worker chạy trong context riêng
// 3. Tất cả state cần persist phải dùng chrome.storage API
// 4. Worker tự restart khi có event (message, alarm, etc.)
//
// Trách nhiệm:
// Phase 1: Nhận messages từ Content Script và log để debug
// Phase 2: Fetch + parse YouTube transcript XML
// ========================================================================

import {
  MessageType,
  ExtensionMessage,
  VideoDetectedPayload,
  VideoTimeUpdatePayload,
  NavigationChangedPayload,
  FetchTranscriptPayload,
  TranscriptResultPayload,
} from '../types/messages';
import { fetchAndParseTranscript } from './transcript-parser';

const LOG_PREFIX = '[ChiHaiDaiCa][SW]';

// ============================================================================
// Service Worker Lifecycle Events
// ============================================================================

/**
 * `install` event - fired khi extension được cài đặt hoặc update.
 * Dùng để khởi tạo dữ liệu mặc định trong storage.
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log(`${LOG_PREFIX} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`${LOG_PREFIX} 📦 Extension installed/updated`);
  console.log(`${LOG_PREFIX}    Reason: ${details.reason}`);
  console.log(`${LOG_PREFIX} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  if (details.reason === 'install') {
    // Khởi tạo storage mặc định cho lần cài đặt đầu tiên
    chrome.storage.local.set({
      settings: {
        subtitleLanguage: 'vi',    // Ngôn ngữ phụ đề mặc định
        autoSync: true,             // Tự động đồng bộ phụ đề
        fontSize: 16,               // Cỡ chữ phụ đề
      },
      stats: {
        videosWatched: 0,
        wordsLearned: 0,
        installDate: Date.now(),
      },
    });
    console.log(`${LOG_PREFIX} ✅ Default settings đã được lưu vào storage`);
  }
});

// ============================================================================
// Message Handler - Nhận messages từ Content Script
// ============================================================================

/**
 * Xử lý tất cả messages gửi từ Content Script.
 * Sử dụng pattern matching trên message.type để route tới handler tương ứng.
 *
 * @param message - Message object từ Content Script
 * @param sender - Thông tin về tab/content script gửi message
 * @param sendResponse - Callback để gửi response ngược lại (synchronous)
 * @returns true nếu sẽ gọi sendResponse async, false/void nếu sync
 */
chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ): boolean | void => {
    const tabId = sender.tab?.id ?? 'unknown';
    const tabUrl = sender.tab?.url ?? 'unknown';

    console.log(
      `${LOG_PREFIX} 📨 Message từ tab ${tabId}: ${message.type}`
    );

    switch (message.type) {
      // ── Video được phát hiện ────────────────────────────────────────
      case MessageType.VIDEO_DETECTED:
        handleVideoDetected(
          message.payload as VideoDetectedPayload,
          tabId
        );
        sendResponse({ status: 'acknowledged' });
        break;

      // ── Time update ─────────────────────────────────────────────────
      case MessageType.VIDEO_TIME_UPDATE:
        handleTimeUpdate(message.payload as VideoTimeUpdatePayload);
        // Không cần response cho time updates (high frequency)
        break;

      // ── Navigation changed ──────────────────────────────────────────
      case MessageType.NAVIGATION_CHANGED:
        handleNavigationChanged(
          message.payload as NavigationChangedPayload,
          tabId
        );
        sendResponse({ status: 'acknowledged' });
        break;

      // ── Phase 2: Fetch transcript ─────────────────────────────────
      // IMPORTANT: Return true để giữ sendResponse channel mở cho async
      case MessageType.FETCH_TRANSCRIPT:
        handleFetchTranscript(
          message.payload as FetchTranscriptPayload,
          sendResponse
        );
        // Return true = chúng ta sẽ gọi sendResponse ASYNC
        // Điều này giữ message channel mở cho đến khi fetch xong
        return true;



      // ── Unknown message ─────────────────────────────────────────────
      default:
        console.warn(
          `${LOG_PREFIX} ⚠️ Unknown message type: ${message.type}`,
          { tabUrl }
        );
        break;
    }

    // Return false = chúng ta sẽ KHÔNG gọi sendResponse async
    // (ngoại trừ FETCH_TRANSCRIPT đã return true ở trên)
    return false;
  }
);

// ============================================================================
// Message Handlers
// ============================================================================

/**
 * Xử lý khi Content Script phát hiện video mới.
 * Phase 1: Chỉ log. Phase 2+: Sẽ fetch transcript, khởi tạo subtitle sync.
 */
function handleVideoDetected(
  payload: VideoDetectedPayload,
  tabId: number | string
): void {
  console.log(`${LOG_PREFIX} 🎬 Video detected trên tab ${tabId}:`);
  console.log(`${LOG_PREFIX}    ID: ${payload.videoId}`);
  console.log(`${LOG_PREFIX}    Title: ${payload.title}`);
  console.log(`${LOG_PREFIX}    URL: ${payload.videoUrl}`);
}

/**
 * Xử lý time update từ video.
 * Phase 1: Chỉ log. Phase 3: Sẽ dùng để sync subtitle rendering.
 */
function handleTimeUpdate(payload: VideoTimeUpdatePayload): void {
  // Không log time updates để tránh spam console của Service Worker
  // Uncomment dòng dưới nếu cần debug:
  // console.log(`${LOG_PREFIX} ⏱ ${payload.videoId}: ${payload.currentTime.toFixed(1)}s`);

  // Suppress unused variable warning - sẽ dùng ở Phase 3
  void payload;
}

/**
 * Xử lý khi YouTube SPA navigate sang trang mới.
 */
function handleNavigationChanged(
  payload: NavigationChangedPayload,
  tabId: number | string
): void {
  console.log(`${LOG_PREFIX} 🧭 Navigation trên tab ${tabId}:`);
  console.log(`${LOG_PREFIX}    Old: ${payload.oldUrl}`);
  console.log(`${LOG_PREFIX}    New: ${payload.newUrl}`);
}

// ============================================================================
// Phase 2: Fetch Transcript
// ============================================================================

/**
 * Fetch và parse transcript khi Content Script yêu cầu.
 *
 * Đây là handler ASYNC - sử dụng sendResponse callback sau khi
 * fetch xong. Trong onMessage listener, case này return true
 * để giữ message channel mở.
 *
 * Tại sao return true?
 * - chrome.runtime.onMessage mặc định đóng channel ngay khi callback return
 * - Nếu muốn gọi sendResponse sau một async operation (như fetch),
 *   phải return true để báo Chrome giữ channel mở
 */
async function handleFetchTranscript(payload: FetchTranscriptPayload, sendResponse: (response: TranscriptResultPayload) => void): Promise<void> {
  console.log(`${LOG_PREFIX} 📥 Fetching transcript: ${payload.languageName}`);

  try {
    const transcriptData = await fetchAndParseTranscript(
      payload.baseUrl,
      payload.videoId,
      payload.languageCode,
      payload.languageName,
      payload.isAutoGenerated
    );

    console.log(`${LOG_PREFIX} ✅ Transcript parsed: ${transcriptData.segments.length} segments`);

    // QUAN TRỌNG NHẤT: Bọc dữ liệu trả về theo đúng định dạng
    sendResponse({
      success: true,
      data: transcriptData,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`${LOG_PREFIX} ❌ Fetch transcript thất bại:`, errorMessage);

    sendResponse({
      success: false,
      error: errorMessage,
    });
  }
}