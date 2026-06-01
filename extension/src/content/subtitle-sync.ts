// ============================================================================
// Subtitle Sync - Đồng bộ phụ đề theo thời gian video
// ============================================================================
//
// Nhiệm vụ: Tìm đúng TranscriptSegment cần hiển thị tại mỗi thời điểm
// video.currentTime.
//
// ── THUẬT TOÁN ────────────────────────────────────────────────────────────
//
// Transcript segments đã được sắp xếp theo startTime tăng dần.
// Sử dụng Binary Search để tìm segment chứa currentTime:
//   segment.startTime <= currentTime < segment.endTime
//
// Optimization: Cache vị trí (index) của segment cuối cùng tìm được.
// Vì video phát tuần tự, segment tiếp theo thường chỉ cách 0-2 vị trí.
// → Kiểm tra vùng lân cận (neighborhood check) trước khi binary search.
//
// Tại sao không dùng linear search?
// - Một video 1h có ~2000 segments
// - Binary search: O(log n) = ~11 so sánh
// - Linear search: O(n) = tới 2000 so sánh mỗi 250ms → lãng phí
//
// ========================================================================

import type { TranscriptSegment } from '../types/transcript';

const LOG_PREFIX = '[ChiHaiDaiCa][SubSync]';

/**
 * SubtitleSync class quản lý việc tìm segment tại thời điểm hiện tại.
 * Sử dụng caching và neighborhood search để tối ưu performance.
 */
export class SubtitleSync {
  private segments: TranscriptSegment[] = [];
  private lastIndex: number = -1;
  private lastSegment: TranscriptSegment | null = null;

  /**
   * Load segments mới (khi chuyển video hoặc đổi ngôn ngữ).
   */
  setSegments(segments: TranscriptSegment[]): void {
    this.segments = segments;
    this.lastIndex = -1;
    this.lastSegment = null;
    console.log(`${LOG_PREFIX} Loaded ${segments.length} segments`);
  }

  /**
   * Tìm segment cần hiển thị tại thời điểm currentTime.
   *
   * @param currentTime - Thời gian hiện tại của video (giây)
   * @returns TranscriptSegment nếu tìm được, null nếu không có segment nào
   *
   * Thuật toán:
   * 1. Kiểm tra segment hiện tại (cache hit) → O(1)
   * 2. Kiểm tra segment kế tiếp (sequential play) → O(1)
   * 3. Binary search toàn bộ mảng → O(log n)
   */
  findSegmentAtTime(currentTime: number): TranscriptSegment | null {
    if (this.segments.length === 0) return null;

    // ── Cache hit: vẫn đang trong segment hiện tại ────────────────────
    if (this.lastSegment && this.isTimeInSegment(currentTime, this.lastSegment)) {
      return this.lastSegment;
    }

    // ── Neighborhood check: segment kế tiếp (video phát tuần tự) ──────
    if (this.lastIndex >= 0) {
      // Kiểm tra segment ngay sau
      const nextIndex = this.lastIndex + 1;
      if (nextIndex < this.segments.length) {
        const nextSeg = this.segments[nextIndex];
        if (this.isTimeInSegment(currentTime, nextSeg)) {
          this.lastIndex = nextIndex;
          this.lastSegment = nextSeg;
          return nextSeg;
        }
      }

      // Kiểm tra 2-3 segment xung quanh (user seek nhẹ)
      for (let offset = -2; offset <= 3; offset++) {
        if (offset === 0 || offset === 1) continue; // đã check ở trên
        const idx = this.lastIndex + offset;
        if (idx >= 0 && idx < this.segments.length) {
          if (this.isTimeInSegment(currentTime, this.segments[idx])) {
            this.lastIndex = idx;
            this.lastSegment = this.segments[idx];
            return this.segments[idx];
          }
        }
      }
    }

    // ── Binary Search: user seek xa hoặc lần đầu ─────────────────────
    const index = this.binarySearchSegment(currentTime);

    if (index >= 0) {
      this.lastIndex = index;
      this.lastSegment = this.segments[index];
      return this.segments[index];
    }

    // Không có segment nào tại thời điểm này (khoảng trống giữa 2 segments)
    this.lastSegment = null;
    return null;
  }

  /**
   * Kiểm tra currentTime có nằm trong segment không.
   * Thêm tolerance nhỏ (50ms) cho floating point precision.
   */
  private isTimeInSegment(time: number, segment: TranscriptSegment): boolean {
    const TOLERANCE = 0.05; // 50ms tolerance
    return time >= segment.startTime - TOLERANCE && time < segment.endTime + TOLERANCE;
  }

  /**
   * Binary Search tìm segment chứa currentTime.
   *
   * @returns index của segment tìm được, -1 nếu không có
   */
  private binarySearchSegment(currentTime: number): number {
    let low = 0;
    let high = this.segments.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const seg = this.segments[mid];

      if (currentTime < seg.startTime) {
        high = mid - 1;
      } else if (currentTime >= seg.endTime) {
        low = mid + 1;
      } else {
        // currentTime nằm trong [startTime, endTime)
        return mid;
      }
    }

    return -1; // Không tìm thấy
  }

  /**
   * Reset state (khi chuyển video).
   */
  reset(): void {
    this.segments = [];
    this.lastIndex = -1;
    this.lastSegment = null;
  }

  /**
   * Lấy tổng số segments.
   */
  getSegmentCount(): number {
    return this.segments.length;
  }
}
