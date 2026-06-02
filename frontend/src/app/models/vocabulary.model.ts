/**
 * Model cho từ vựng được lưu
 */
export interface Vocabulary {
  id: string;
  word: string;
  meaning: string;
  grammarNote?: string;
  examples: string[];
  contextSentence: string;
  videoId: string;
  timestamp: number;  // Thời điểm trong video (giây)
  language: 'en' | 'zh' | 'ja';
  createdAt: number;  // Unix timestamp
}

/**
 * Model cho transcript item
 */
export interface TranscriptItem {
  text: string;
  start: number;
  duration: number;
}

/**
 * Model cho kết quả dịch từ backend
 */
export interface TranslationResult {
  meaning: string;
  grammar_note?: string;
  examples: string[];
  pronunciation?: string;
}
