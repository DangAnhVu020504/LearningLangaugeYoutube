// ============================================================================
// DOM Observer Utilities - Xử lý YouTube SPA Navigation
// ============================================================================
// YouTube là Single Page Application (SPA). Khi người dùng click vào video
// khác, trang KHÔNG reload mà chỉ thay đổi DOM dynamically.
// File này cung cấp các utility dựa trên MutationObserver API để:
//   1. Chờ một element xuất hiện trong DOM (waitForElement)
//   2. Phát hiện khi YouTube navigate sang trang mới (observeUrlChange)

const LOG_PREFIX = '[ChiHaiDaiCa][DOMObserver]';

/**
 * Chờ một DOM element xuất hiện dựa trên CSS selector.
 *
 * Cách hoạt động:
 * 1. Kiểm tra ngay xem element đã tồn tại chưa (querySelector)
 * 2. Nếu chưa → tạo MutationObserver theo dõi toàn bộ DOM tree
 * 3. Mỗi khi DOM thay đổi → kiểm tra lại selector
 * 4. Khi tìm thấy → resolve Promise, disconnect observer
 * 5. Nếu quá timeout → reject Promise
 *
 * Tại sao dùng MutationObserver thay vì setInterval?
 * - MutationObserver là event-driven (reactive): chỉ chạy callback khi DOM thực sự thay đổi
 * - setInterval là polling: chạy liên tục dù DOM không đổi → lãng phí CPU
 * - MutationObserver chính xác hơn: phát hiện ngay lập tức khi element xuất hiện
 *
 * @param selector - CSS selector cho element cần tìm
 * @param timeoutMs - Thời gian chờ tối đa (ms), mặc định 15 giây
 * @returns Promise resolve với element tìm được
 */
export function waitForElement<T extends Element = Element>(
  selector: string,
  timeoutMs: number = 15000
): Promise<T> {
  return new Promise((resolve, reject) => {
    // ── Bước 1: Kiểm tra ngay - element có thể đã tồn tại ──────────
    const existing = document.querySelector<T>(selector);
    if (existing) {
      console.log(`${LOG_PREFIX} Element "${selector}" đã tồn tại trong DOM`);
      resolve(existing);
      return;
    }

    console.log(`${LOG_PREFIX} Đang chờ element "${selector}" xuất hiện...`);

    // ── Bước 2: Thiết lập timeout ───────────────────────────────────
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    // ── Bước 3: Tạo MutationObserver ────────────────────────────────
    // Theo dõi thay đổi trên toàn bộ DOM tree (childList + subtree)
    const observer = new MutationObserver((_mutations) => {
      const element = document.querySelector<T>(selector);
      if (element) {
        console.log(`${LOG_PREFIX} Element "${selector}" đã xuất hiện!`);
        // Cleanup: ngắt observer và clear timeout
        observer.disconnect();
        if (timeoutId) clearTimeout(timeoutId);
        resolve(element);
      }
    });

    // Observe toàn bộ document body:
    // - childList: theo dõi thêm/xóa child nodes
    // - subtree: theo dõi toàn bộ cây DOM con, không chỉ children trực tiếp
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // ── Bước 4: Timeout safety ──────────────────────────────────────
    timeoutId = setTimeout(() => {
      observer.disconnect();
      reject(
        new Error(
          `${LOG_PREFIX} Timeout: Không tìm thấy "${selector}" sau ${timeoutMs}ms`
        )
      );
    }, timeoutMs);
  });
}

/**
 * Theo dõi thay đổi URL trong YouTube SPA.
 *
 * YouTube sử dụng History API (pushState/replaceState) để navigate
 * giữa các trang mà không reload. Có 3 cách phát hiện:
 *
 * 1. `yt-navigate-finish`: Custom event của YouTube, fired khi
 *    navigation hoàn tất. Đây là cách đáng tin cậy nhất vì YouTube
 *    tự fire event này.
 *
 * 2. `popstate`: Fired khi user nhấn Back/Forward button.
 *    Không fired khi code gọi pushState/replaceState.
 *
 * 3. MutationObserver trên <title>: Backup plan - khi YouTube
 *    navigate, title tag luôn thay đổi. Đây là fallback nếu
 *    yt-navigate-finish không hoạt động (YouTube có thể thay đổi).
 *
 * @param callback - Hàm được gọi khi URL thay đổi, nhận (newUrl, oldUrl)
 * @returns Hàm cleanup để ngắt tất cả listeners
 */
export function observeUrlChange(
  callback: (newUrl: string, oldUrl: string) => void
): () => void {
  let currentUrl = window.location.href;

  /**
   * Kiểm tra URL có thay đổi không, nếu có thì gọi callback.
   * Dùng closure để giữ reference tới currentUrl.
   */
  const checkUrlChange = (): void => {
    const newUrl = window.location.href;
    if (newUrl !== currentUrl) {
      const oldUrl = currentUrl;
      currentUrl = newUrl;
      console.log(`${LOG_PREFIX} URL changed: ${oldUrl} → ${newUrl}`);
      callback(newUrl, oldUrl);
    }
  };

  // ── Listener 1: YouTube custom event ────────────────────────────────
  // Đây là cách chính xác nhất cho YouTube SPA navigation
  const onYtNavigate = (): void => {
    // Delay nhỏ để đảm bảo URL đã được update
    setTimeout(checkUrlChange, 100);
  };
  document.addEventListener('yt-navigate-finish', onYtNavigate);

  // ── Listener 2: Browser back/forward ────────────────────────────────
  const onPopState = (): void => {
    checkUrlChange();
  };
  window.addEventListener('popstate', onPopState);

  // ── Listener 3: Fallback - theo dõi <title> change ─────────────────
  // YouTube luôn update <title> khi navigate sang video mới
  const titleElement = document.querySelector('title');
  let titleObserver: MutationObserver | null = null;

  if (titleElement) {
    titleObserver = new MutationObserver(() => {
      // Delay vì title có thể thay đổi trước URL
      setTimeout(checkUrlChange, 200);
    });
    titleObserver.observe(titleElement, {
      childList: true,    // <title>text</title> - text là child node
      characterData: true, // Text content thay đổi
      subtree: true,
    });
  }

  console.log(`${LOG_PREFIX} URL observer đã được thiết lập`);

  // ── Cleanup function ────────────────────────────────────────────────
  // Trả về hàm để caller có thể ngắt tất cả listeners khi cần
  return () => {
    document.removeEventListener('yt-navigate-finish', onYtNavigate);
    window.removeEventListener('popstate', onPopState);
    if (titleObserver) {
      titleObserver.disconnect();
    }
    console.log(`${LOG_PREFIX} URL observer đã được cleanup`);
  };
}

/**
 * Trích xuất Video ID từ YouTube URL.
 *
 * YouTube URL có nhiều dạng:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://www.youtube.com/watch?v=VIDEO_ID&list=...
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 *
 * @param url - YouTube URL cần parse
 * @returns Video ID hoặc null nếu không tìm được
 */
export function extractVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);

    // Dạng: youtube.com/watch?v=VIDEO_ID
    if (urlObj.searchParams.has('v')) {
      return urlObj.searchParams.get('v');
    }

    // Dạng: youtu.be/VIDEO_ID
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1) || null;
    }

    // Dạng: youtube.com/embed/VIDEO_ID
    const embedMatch = urlObj.pathname.match(/\/embed\/([a-zA-Z0-9_-]+)/);
    if (embedMatch) {
      return embedMatch[1];
    }

    return null;
  } catch {
    console.warn(`${LOG_PREFIX} Không thể parse URL: ${url}`);
    return null;
  }
}
