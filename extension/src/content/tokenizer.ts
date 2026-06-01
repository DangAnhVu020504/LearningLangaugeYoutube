// ============================================================================
// Tokenizer - Tách câu phụ đề thành từng từ riêng lẻ
// ============================================================================
//
// Nhiệm vụ:
// 1. Tách câu phụ đề thành mảng các tokens (từ vựng)
// 2. Tạo DOM elements (<span>) cho mỗi token
// 3. Gắn event listeners (hover, click) cho tương tác từ điển
//
// ── TOKENIZATION STRATEGY ─────────────────────────────────────────────────
//
// Đối với tiếng Anh và các ngôn ngữ dùng khoảng trắng:
//   Input:  "Hello, I'm learning English!"
//   Output: ["Hello,", "I'm", "learning", "English!"]
//
// Giữ nguyên dấu câu gắn liền với từ (cho ngữ cảnh tự nhiên).
// Phần "clean word" (không dấu câu) sẽ được gửi tới API dịch ở Phase 4.
//
// Đối với CJK (Trung/Nhật/Hàn) — cần tokenizer đặc biệt ở Phase 4.
// Phase 3 này xử lý space-delimited languages trước.
//
// ========================================================================



/**
 * Một token (từ) đã được tách từ câu phụ đề.
 */
export interface Token {
  /** Từ gốc (giữ nguyên dấu câu), ví dụ: "Hello," */
  original: string;

  /** Từ đã clean (bỏ dấu câu), ví dụ: "Hello" — dùng để tra từ điển */
  cleanWord: string;

  /** Index vị trí trong câu (0-based) */
  index: number;
}

/**
 * Tách câu phụ đề thành mảng tokens.
 *
 * Chiến lược đơn giản nhưng hiệu quả cho space-delimited languages:
 * 1. Split theo whitespace
 * 2. Filter empty strings
 * 3. Tạo clean word (bỏ dấu câu đầu/cuối)
 *
 * @param text - Nội dung phụ đề cần tokenize
 * @returns Mảng Token objects
 */
export function tokenize(text: string): Token[] {
  if (!text || !text.trim()) return [];

  const words = text.split(/\s+/).filter(w => w.length > 0);

  return words.map((word, index) => ({
    original: word,
    cleanWord: cleanWord(word),
    index,
  }));
}

/**
 * Loại bỏ dấu câu ở đầu và cuối từ.
 *
 * Ví dụ:
 *   "Hello,"  → "Hello"
 *   "(world)" → "world"
 *   "it's"    → "it's"  (giữ nguyên apostrophe giữa từ)
 *   "..."     → ""
 */
function cleanWord(word: string): string {
  // Bỏ dấu câu ở đầu và cuối, giữ apostrophe/hyphen giữa từ
  return word
    .replace(/^[^\p{L}\p{N}]+/u, '')   // Bỏ non-letter/number ở đầu
    .replace(/[^\p{L}\p{N}]+$/u, '');   // Bỏ non-letter/number ở cuối
}

/**
 * Tạo DOM elements cho một câu phụ đề đã tokenize.
 * Mỗi từ được bọc trong <span> với class và data attributes.
 *
 * HTML output ví dụ:
 * ```html
 * <span class="chdc-word" data-index="0" data-word="hello">Hello,</span>
 * <span class="chdc-word-space"> </span>
 * <span class="chdc-word" data-index="1" data-word="i'm">I'm</span>
 * ...
 * ```
 *
 * @param tokens - Mảng tokens đã tách
 * @param sentenceText - Câu gốc (dùng cho contextual translation)
 * @param onWordHover - Callback khi hover vào từ
 * @param onWordClick - Callback khi click vào từ
 * @returns DocumentFragment chứa tất cả span elements
 */
export function createTokenizedElements(
  tokens: Token[],
  sentenceText: string,
  onWordHover: (token: Token, element: HTMLSpanElement, sentence: string) => void,
  onWordClick: (token: Token, element: HTMLSpanElement, sentence: string) => void
): DocumentFragment {
  const fragment = document.createDocumentFragment();

  tokens.forEach((token, i) => {
    // ── Tạo <span> cho từ ──────────────────────────────────────────
    const span = document.createElement('span');
    span.className = 'chdc-word';
    span.textContent = token.original;
    span.dataset.index = token.index.toString();
    span.dataset.word = token.cleanWord.toLowerCase();

    // ── Event: Hover (mouseenter) ──────────────────────────────────
    span.addEventListener('mouseenter', () => {
      span.classList.add('chdc-word--hover');
      onWordHover(token, span, sentenceText);
    });

    // ── Event: Mouse leave ─────────────────────────────────────────
    span.addEventListener('mouseleave', () => {
      span.classList.remove('chdc-word--hover');
    });

    // ── Event: Click ───────────────────────────────────────────────
    span.addEventListener('click', (e) => {
      e.stopPropagation(); // Ngăn click propagate lên video player
      e.preventDefault();

      // Toggle active state
      const wasActive = span.classList.contains('chdc-word--active');

      // Remove active from tất cả words khác
      document.querySelectorAll('.chdc-word--active').forEach(el => {
        el.classList.remove('chdc-word--active');
      });

      if (!wasActive) {
        span.classList.add('chdc-word--active');
        onWordClick(token, span, sentenceText);
      }
    });

    fragment.appendChild(span);

    // ── Thêm khoảng trắng giữa các từ (trừ từ cuối) ───────────────
    if (i < tokens.length - 1) {
      const space = document.createElement('span');
      space.className = 'chdc-word-space';
      space.textContent = ' ';
      fragment.appendChild(space);
    }
  });

  return fragment;
}
