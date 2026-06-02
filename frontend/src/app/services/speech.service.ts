import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SpeechService {
  private synth: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    this.synth = window.speechSynthesis;
    this.loadVoices();
  }

  /**
   * Load danh sách giọng đọc
   */
  private loadVoices(): void {
    this.voices = this.synth.getVoices();
    
    // Chrome cần load voices bất đồng bộ
    if (this.voices.length === 0) {
      this.synth.onvoiceschanged = () => {
        this.voices = this.synth.getVoices();
      };
    }
  }

  /**
   * Phát âm từ vựng
   */
  speak(text: string, language: 'en' | 'zh' | 'ja' = 'en'): void {
    // Dừng phát âm hiện tại nếu có
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Chọn giọng đọc phù hợp với ngôn ngữ
    const voice = this.getVoiceForLanguage(language);
    if (voice) {
      utterance.voice = voice;
    }

    // Cấu hình
    utterance.lang = this.getLanguageCode(language);
    utterance.rate = 0.9;  // Tốc độ đọc chậm hơn một chút
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    this.synth.speak(utterance);
  }

  /**
   * Dừng phát âm
   */
  stop(): void {
    this.synth.cancel();
  }

  /**
   * Kiểm tra trình duyệt có hỗ trợ không
   */
  isSupported(): boolean {
    return 'speechSynthesis' in window;
  }

  /**
   * Lấy giọng đọc phù hợp với ngôn ngữ
   */
  private getVoiceForLanguage(language: 'en' | 'zh' | 'ja'): SpeechSynthesisVoice | null {
    const langCode = this.getLanguageCode(language);
    
    // Tìm giọng đọc native
    let voice = this.voices.find(v => v.lang.startsWith(langCode) && v.localService);
    
    // Nếu không có, tìm giọng đọc online
    if (!voice) {
      voice = this.voices.find(v => v.lang.startsWith(langCode));
    }

    return voice || null;
  }

  /**
   * Convert language code
   */
  private getLanguageCode(language: 'en' | 'zh' | 'ja'): string {
    const codes = {
      en: 'en-US',
      zh: 'zh-CN',
      ja: 'ja-JP',
    };
    return codes[language];
  }

  /**
   * Lấy danh sách giọng đọc có sẵn
   */
  getAvailableVoices(language?: 'en' | 'zh' | 'ja'): SpeechSynthesisVoice[] {
    if (!language) {
      return this.voices;
    }

    const langCode = this.getLanguageCode(language);
    return this.voices.filter(v => v.lang.startsWith(langCode));
  }
}
