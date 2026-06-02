import { Component, signal, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { VocabularyService } from '../services/vocabulary.service';
import { SpeechService } from '../services/speech.service';
import { TranscriptItem } from '../models/vocabulary.model';

declare var YT: any;

@Component({
  selector: 'app-video-player',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="video-player-container">
      <!-- Input URL -->
      <div class="card">
        <h2>🎥 Nhập Link YouTube</h2>
        <div class="flex gap-2 mt-2">
          <input
            type="text"
            class="input"
            [(ngModel)]="youtubeUrl"
            placeholder="https://www.youtube.com/watch?v=..."
            (keyup.enter)="loadVideo()"
          />
          <select class="input" [(ngModel)]="selectedLanguage" style="max-width: 150px;">
            <option value="en">🇬🇧 English</option>
            <option value="zh">🇨🇳 中文</option>
            <option value="ja">🇯🇵 日本語</option>
          </select>
          <button class="btn btn-primary" (click)="loadVideo()" [disabled]="isLoading()">
            @if (isLoading()) {
              <span class="loading"></span>
            }
            Tải Video
          </button>
        </div>
        @if (errorMessage()) {
          <div class="error-message mt-2">{{ errorMessage() }}</div>
        }
      </div>

      @if (videoId()) {
        <div class="video-content">
          <!-- YouTube Player -->
          <div class="video-section">
            <div id="youtube-player"></div>
          </div>

          <!-- Transcript & Translation -->
          <div class="transcript-section">
            <div class="card">
              <h3>📝 Phụ đề</h3>
              <div class="transcript-container">
                @for (item of transcript(); track $index) {
                  <div 
                    class="transcript-item"
                    [class.active]="$index === currentTranscriptIndex()"
                  >
                    <div class="transcript-text">
                      @for (word of tokenizeText(item.text); track $index) {
                        <span 
                          class="word"
                          (click)="onWordClick(word, item.text)"
                        >{{ word }}</span>
                      }
                    </div>
                    <div class="transcript-time">
                      {{ formatTime(item.start) }}
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Translation Popup -->
            @if (showTranslation()) {
              <div class="translation-popup">
                <div class="translation-content">
                  <div class="translation-header">
                    <h3>{{ selectedWord() }}</h3>
                    <button class="btn-close" (click)="closeTranslation()">✕</button>
                  </div>

                  @if (isTranslating()) {
                    <div class="text-center">
                      <span class="loading"></span>
                      <p>Đang dịch...</p>
                    </div>
                  } @else if (translation()) {
                    <div class="translation-body">
                      <div class="meaning">
                        <strong>Nghĩa:</strong> {{ translation()!.meaning }}
                      </div>

                      @if (translation()!.pronunciation) {
                        <div class="pronunciation">
                          <strong>Phát âm:</strong> {{ translation()!.pronunciation }}
                        </div>
                      }

                      @if (translation()!.grammar_note) {
                        <div class="grammar-note">
                          <strong>Ngữ pháp:</strong> {{ translation()!.grammar_note }}
                        </div>
                      }

                      <div class="examples">
                        <strong>Ví dụ:</strong>
                        <ul>
                          @for (example of translation()!.examples; track $index) {
                            <li>{{ example }}</li>
                          }
                        </ul>
                      </div>

                      <div class="context">
                        <strong>Ngữ cảnh:</strong>
                        <p>{{ selectedContext() }}</p>
                      </div>

                      <div class="actions mt-2">
                        <button class="btn btn-secondary" (click)="speakWord()">
                          🔊 Nghe phát âm
                        </button>
                        <button 
                          class="btn btn-success" 
                          (click)="saveWord()"
                          [disabled]="isWordSaved()"
                        >
                          {{ isWordSaved() ? '✓ Đã lưu' : '💾 Lưu từ vựng' }}
                        </button>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .video-player-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
    }

    .video-content {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 20px;
    }

    @media (max-width: 968px) {
      .video-content {
        grid-template-columns: 1fr;
      }
    }

    #youtube-player {
      width: 100%;
      aspect-ratio: 16/9;
      background: #000;
      border-radius: 8px;
    }

    .transcript-container {
      max-height: 500px;
      overflow-y: auto;
      padding: 10px;
    }

    .transcript-item {
      padding: 12px;
      margin-bottom: 8px;
      border-radius: 6px;
      background: #f8fafc;
      cursor: pointer;
      transition: all 0.2s;
    }

    .transcript-item:hover {
      background: #e2e8f0;
    }

    .transcript-item.active {
      background: #dbeafe;
      border-left: 3px solid #2563eb;
    }

    .transcript-text {
      margin-bottom: 4px;
      line-height: 1.6;
    }

    .word {
      display: inline-block;
      padding: 2px 4px;
      margin: 0 2px;
      border-radius: 3px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .word:hover {
      background: #fef3c7;
    }

    .transcript-time {
      font-size: 12px;
      color: #64748b;
    }

    .translation-popup {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .translation-content {
      background: white;
      border-radius: 12px;
      max-width: 600px;
      width: 100%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);
    }

    .translation-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #e2e8f0;
    }

    .translation-header h3 {
      margin: 0;
      color: #2563eb;
    }

    .btn-close {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #64748b;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
    }

    .btn-close:hover {
      background: #f1f5f9;
    }

    .translation-body {
      padding: 20px;
    }

    .translation-body > div {
      margin-bottom: 16px;
    }

    .meaning {
      font-size: 18px;
      color: #1e293b;
    }

    .pronunciation {
      color: #7c3aed;
      font-style: italic;
    }

    .grammar-note {
      padding: 12px;
      background: #fef3c7;
      border-radius: 6px;
      border-left: 3px solid #f59e0b;
    }

    .examples ul {
      margin-top: 8px;
      padding-left: 20px;
    }

    .examples li {
      margin-bottom: 4px;
      color: #475569;
    }

    .context {
      padding: 12px;
      background: #f1f5f9;
      border-radius: 6px;
    }

    .context p {
      margin-top: 8px;
      color: #475569;
      font-style: italic;
    }

    .actions {
      display: flex;
      gap: 12px;
    }

    .error-message {
      color: #ef4444;
      padding: 12px;
      background: #fee2e2;
      border-radius: 6px;
      border-left: 3px solid #ef4444;
    }
  `],
})
export class VideoPlayerComponent implements OnDestroy {
  // Signals
  youtubeUrl = '';
  selectedLanguage = 'en';
  videoId = signal<string | null>(null);
  transcript = signal<TranscriptItem[]>([]);
  currentTranscriptIndex = signal<number>(-1);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  
  // Translation
  showTranslation = signal(false);
  selectedWord = signal('');
  selectedContext = signal('');
  translation = signal<any>(null);
  isTranslating = signal(false);

  private player: any;
  private updateInterval: any;

  constructor(
    private apiService: ApiService,
    private vocabularyService: VocabularyService,
    private speechService: SpeechService,
  ) {
    // Initialize YouTube Player khi videoId thay đổi
    effect(() => {
      const id = this.videoId();
      if (id) {
        this.initYouTubePlayer(id);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    if (this.player) {
      this.player.destroy();
    }
  }

  /**
   * Load video và transcript
   */
  loadVideo(): void {
    const videoId = this.extractVideoId(this.youtubeUrl);
    if (!videoId) {
      this.errorMessage.set('URL YouTube không hợp lệ');
      return;
    }

    this.errorMessage.set(null);
    this.isLoading.set(true);
    this.videoId.set(videoId);

    // Lấy transcript
    this.apiService.getTranscript(videoId, this.selectedLanguage).subscribe({
      next: (response) => {
        this.transcript.set(response.transcript);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(
          error.error?.message || 'Không thể lấy phụ đề. Vui lòng chọn video có phụ đề (CC).'
        );
        this.isLoading.set(false);
      },
    });
  }

  /**
   * Extract video ID từ URL
   */
  private extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Khởi tạo YouTube Player
   */
  private initYouTubePlayer(videoId: string): void {
    // Đợi YouTube API load xong
    if (typeof YT === 'undefined' || !YT.Player) {
      setTimeout(() => this.initYouTubePlayer(videoId), 100);
      return;
    }

    // Destroy player cũ nếu có
    if (this.player) {
      this.player.destroy();
    }

    this.player = new YT.Player('youtube-player', {
      videoId: videoId,
      playerVars: {
        autoplay: 0,
        controls: 1,
      },
      events: {
        onReady: () => this.startTimeTracking(),
      },
    });
  }

  /**
   * Theo dõi thời gian video để đồng bộ phụ đề
   */
  private startTimeTracking(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(() => {
      if (this.player && this.player.getCurrentTime) {
        const currentTime = this.player.getCurrentTime();
        this.updateCurrentTranscript(currentTime);
      }
    }, 100);
  }

  /**
   * Cập nhật phụ đề hiện tại
   */
  private updateCurrentTranscript(currentTime: number): void {
    const items = this.transcript();
    const index = items.findIndex(
      (item) => currentTime >= item.start && currentTime < item.start + item.duration
    );
    
    if (index !== -1 && index !== this.currentTranscriptIndex()) {
      this.currentTranscriptIndex.set(index);
    }
  }

  /**
   * Tokenize text thành các từ
   */
  tokenizeText(text: string): string[] {
    if (this.selectedLanguage === 'en') {
      // Tiếng Anh: Tách bằng khoảng trắng
      return text.split(/\s+/).filter(w => w.length > 0);
    } else {
      // Tiếng Trung/Nhật: Tách theo ký tự (hoặc gọi API tokenize)
      // TODO: Gọi API backend để phân từ chính xác hơn
      return text.split('');
    }
  }

  /**
   * Xử lý click vào từ
   */
  onWordClick(word: string, context: string): void {
    // Loại bỏ dấu câu
    const cleanWord = word.replace(/[.,!?;:'"]/g, '');
    if (!cleanWord) return;

    this.selectedWord.set(cleanWord);
    this.selectedContext.set(context);
    this.showTranslation.set(true);
    this.isTranslating.set(true);
    this.translation.set(null);

    // Gọi API dịch
    this.apiService.translateWord(cleanWord, context, this.selectedLanguage as any).subscribe({
      next: (response) => {
        this.translation.set(response);
        this.isTranslating.set(false);
      },
      error: (error) => {
        this.translation.set({
          meaning: 'Không thể dịch từ này',
          examples: [],
        });
        this.isTranslating.set(false);
      },
    });
  }

  /**
   * Đóng popup dịch
   */
  closeTranslation(): void {
    this.showTranslation.set(false);
  }

  /**
   * Phát âm từ
   */
  speakWord(): void {
    this.speechService.speak(this.selectedWord(), this.selectedLanguage as any);
  }

  /**
   * Lưu từ vựng
   */
  async saveWord(): Promise<void> {
    const trans = this.translation();
    if (!trans) return;

    await this.vocabularyService.saveVocabulary({
      word: this.selectedWord(),
      meaning: trans.meaning,
      grammarNote: trans.grammar_note,
      examples: trans.examples,
      contextSentence: this.selectedContext(),
      videoId: this.videoId()!,
      timestamp: this.player?.getCurrentTime() || 0,
      language: this.selectedLanguage as any,
    });

    alert('✓ Đã lưu từ vựng!');
  }

  /**
   * Kiểm tra từ đã được lưu chưa
   */
  isWordSaved(): boolean {
    return this.vocabularyService.isWordSaved(
      this.selectedWord(),
      this.videoId() || ''
    );
  }

  /**
   * Format thời gian
   */
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
