// ============================================================================
// Subtitle Renderer - Render phụ đề song ngữ đè lên YouTube Video Player
// ============================================================================
//
// Nhiệm vụ:
// 1. Tạo DOM overlay container bên trong #movie_player
// 2. Render dòng 1 (original) với tokenized words
// 3. Render dòng 2 (translation) — Phase 3: placeholder, Phase 4: real translation
// 4. Update nội dung khi segment thay đổi (smooth transition)
// 5. Ẩn YouTube native captions khi extension active
//
// ── CÁCH ĐẶT OVERLAY ─────────────────────────────────────────────────────
//
// YouTube DOM structure cho video player:
//   #movie_player (.html5-video-player) ← position: relative
//     └── .html5-video-container
//           └── video.html5-main-video
//     └── .ytp-caption-window-container  ← YouTube native captions
//     └── .ytp-chrome-bottom             ← Controls bar
//
// Chúng ta chèn overlay container vào #movie_player:
//   #movie_player
//     └── .chdc-subtitle-container       ← OUR OVERLAY (position: absolute)
//
// Position absolute + bottom: 60px đặt overlay TRÊN controls bar.
// z-index: 60 (YouTube controls là 63) → overlay dưới controls.
//
// ========================================================================

import type { TranscriptSegment } from '../types/transcript';
import { tokenize, createTokenizedElements, Token } from './tokenizer';

const LOG_PREFIX = '[ChiHaiDaiCa][Renderer]';

// ── DOM References ────────────────────────────────────────────────────────
let overlayContainer: HTMLDivElement | null = null;
let originalLine: HTMLDivElement | null = null;
let translationLine: HTMLDivElement | null = null;
let tooltipElement: HTMLDivElement | null = null;
let currentRenderedText: string = '';
let videoElement: HTMLVideoElement | null = null;

/**
 * Khởi tạo subtitle overlay.
 * Tạo DOM elements và chèn vào #movie_player.
 *
 * @param video - HTMLVideoElement để link auto-pause behavior
 * @returns true nếu khởi tạo thành công
 */
export function initSubtitleOverlay(video: HTMLVideoElement): boolean {
  // Cleanup overlay cũ nếu có (SPA navigation)
  destroySubtitleOverlay();

  videoElement = video;

  // ── Tìm #movie_player (parent container) ──────────────────────────
  // Cần chèn overlay vào đây vì nó có position: relative
  const moviePlayer = findMoviePlayer(video);
  if (!moviePlayer) {
    console.error(`${LOG_PREFIX} ❌ Không tìm thấy #movie_player`);
    return false;
  }

  // ── Tạo overlay container ──────────────────────────────────────────
  overlayContainer = document.createElement('div');
  overlayContainer.className = 'chdc-subtitle-container';
  overlayContainer.id = 'chdc-subtitle-container';

  // ── Tạo dòng 1: Phụ đề gốc (original + tokenized) ────────────────
  originalLine = document.createElement('div');
  originalLine.className = 'chdc-subtitle-line chdc-subtitle-original';
  originalLine.id = 'chdc-subtitle-original';

  // ── Tạo dòng 2: Phụ đề dịch (translation) ────────────────────────
  translationLine = document.createElement('div');
  translationLine.className = 'chdc-subtitle-line chdc-subtitle-translation';
  translationLine.id = 'chdc-subtitle-translation';
  translationLine.textContent = ''; // Phase 4 sẽ populate

  // ── Tạo tooltip (cho hover dictionary) ────────────────────────────
  tooltipElement = document.createElement('div');
  tooltipElement.className = 'chdc-word-tooltip';
  tooltipElement.id = 'chdc-word-tooltip';
  tooltipElement.innerHTML = `
    <div class="chdc-word-tooltip__word"></div>
    <div class="chdc-word-tooltip__meaning">Đang tra từ...</div>
    <div class="chdc-word-tooltip__context"></div>
  `;

  // ── Assemble DOM tree ─────────────────────────────────────────────
  overlayContainer.appendChild(originalLine);
  overlayContainer.appendChild(translationLine);
  overlayContainer.appendChild(tooltipElement);

  // ── Chèn vào movie player ─────────────────────────────────────────
  moviePlayer.appendChild(overlayContainer);

  // ── Đánh dấu active (để ẩn YouTube native captions) ───────────────
  moviePlayer.classList.add('chdc-active');

  // ── Ngăn click trên overlay propagate tới video ────────────────────
  overlayContainer.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  console.log(`${LOG_PREFIX} ✅ Subtitle overlay đã được tạo`);
  return true;
}

/**
 * Tìm #movie_player element (parent của video player).
 * Thử nhiều cách vì YouTube có thể thay đổi structure.
 */
function findMoviePlayer(video: HTMLVideoElement): HTMLElement | null {
  // Cách 1: Tìm trực tiếp bằng ID
  const byId = document.getElementById('movie_player');
  if (byId) return byId;

  // Cách 2: Tìm từ video element đi lên
  let parent = video.parentElement;
  while (parent) {
    if (parent.id === 'movie_player' ||
        parent.classList.contains('html5-video-player')) {
      return parent;
    }
    parent = parent.parentElement;
  }

  // Cách 3: Query selector
  const byClass = document.querySelector('.html5-video-player');
  return byClass as HTMLElement | null;
}

/**
 * Render phụ đề cho một segment.
 * Được gọi mỗi khi subtitle-sync tìm được segment mới.
 *
 * @param segment - TranscriptSegment cần hiển thị, null để ẩn
 */
export function renderSubtitle(segment: TranscriptSegment | null): void {
  if (!overlayContainer || !originalLine) return;

  // ── Ẩn overlay khi không có segment ─────────────────────────────
  if (!segment) {
    if (overlayContainer.classList.contains('chdc-subtitle-container--visible')) {
      overlayContainer.classList.remove('chdc-subtitle-container--visible');
      currentRenderedText = '';
    }
    return;
  }

  // ── Skip nếu đang render cùng text (tránh re-render không cần thiết) ──
  if (segment.text === currentRenderedText) return;

  currentRenderedText = segment.text;

  // ── Tokenize và render dòng original ──────────────────────────────
  const tokens = tokenize(segment.text);

  // Clear nội dung cũ
  originalLine.innerHTML = '';

  // Tạo tokenized elements với event handlers
  const elements = createTokenizedElements(
    tokens,
    segment.text,
    handleWordHover,
    handleWordClick
  );

  originalLine.appendChild(elements);

  // ── Cập nhật dòng translation (placeholder Phase 3) ───────────────
  if (translationLine) {
    // Phase 4 sẽ gọi API dịch và cập nhật dòng này
    // Phase 3: hiển thị placeholder hoặc để trống
    translationLine.textContent = '';
  }

  // ── Hiển thị overlay ──────────────────────────────────────────────
  if (!overlayContainer.classList.contains('chdc-subtitle-container--visible')) {
    overlayContainer.classList.add('chdc-subtitle-container--visible');
  }

  // ── Ẩn tooltip nếu đang hiện ──────────────────────────────────────
  hideTooltip();
}

/**
 * Cập nhật dòng phụ đề dịch (gọi từ Phase 4 khi có kết quả dịch).
 */
export function updateTranslationLine(translatedText: string): void {
  if (translationLine) {
    translationLine.textContent = translatedText;
  }
}

// ============================================================================
// Word Interaction Handlers
// ============================================================================

/**
 * Xử lý khi hover vào một từ.
 * Phase 3: Chỉ highlight. Phase 4: Sẽ gọi API tra từ điển.
 */
function handleWordHover(token: Token, element: HTMLSpanElement, sentence: string): void {
  // Skip nếu từ quá ngắn hoặc chỉ là dấu câu
  if (token.cleanWord.length < 2) return;

  // Hiển thị tooltip tại vị trí từ
  showTooltip(token, element, sentence);
}

/**
 * Xử lý khi click vào một từ.
 * Auto-pause video khi click để người dùng có thời gian đọc.
 */
function handleWordClick(token: Token, _element: HTMLSpanElement, _sentence: string): void {
  if (token.cleanWord.length < 2) return;

  // ── Auto-pause video ──────────────────────────────────────────────
  if (videoElement && !videoElement.paused) {
    videoElement.pause();
    console.log(`${LOG_PREFIX} ⏸ Auto-pause: clicked "${token.cleanWord}"`);
  }

  // Phase 4: Sẽ gọi API dịch từ dựa trên ngữ cảnh câu
  console.log(
    `${LOG_PREFIX} 📖 Word clicked: "${token.cleanWord}" (original: "${token.original}")`
  );
}

// ============================================================================
// Tooltip
// ============================================================================

/**
 * Hiển thị tooltip tra từ tại vị trí element.
 */
function showTooltip(token: Token, element: HTMLSpanElement, sentence: string): void {
  if (!tooltipElement || !overlayContainer) return;

  // Cập nhật nội dung tooltip
  const wordEl = tooltipElement.querySelector('.chdc-word-tooltip__word');
  const meaningEl = tooltipElement.querySelector('.chdc-word-tooltip__meaning');
  const contextEl = tooltipElement.querySelector('.chdc-word-tooltip__context');

  if (wordEl) wordEl.textContent = token.cleanWord;
  if (meaningEl) meaningEl.textContent = '🔍 Click để tra từ điển...'; // Phase 4
  if (contextEl) contextEl.textContent = `"${sentence}"`;

  // Tính vị trí tooltip (căn giữa trên từ)
  const wordRect = element.getBoundingClientRect();
  const containerRect = overlayContainer.getBoundingClientRect();

  const left = wordRect.left - containerRect.left + wordRect.width / 2;
  tooltipElement.style.left = `${left}px`;

  // Show
  tooltipElement.classList.add('chdc-word-tooltip--visible');
}

/**
 * Ẩn tooltip.
 */
function hideTooltip(): void {
  if (tooltipElement) {
    tooltipElement.classList.remove('chdc-word-tooltip--visible');
  }
}

/**
 * Hủy bỏ subtitle overlay (cleanup khi chuyển video).
 */
export function destroySubtitleOverlay(): void {
  if (overlayContainer) {
    // Remove class active
    const moviePlayer = overlayContainer.parentElement;
    if (moviePlayer) {
      moviePlayer.classList.remove('chdc-active');
    }

    overlayContainer.remove();
    overlayContainer = null;
    originalLine = null;
    translationLine = null;
    tooltipElement = null;
    currentRenderedText = '';
    videoElement = null;
    console.log(`${LOG_PREFIX} 🧹 Subtitle overlay đã được cleanup`);
  }
}
