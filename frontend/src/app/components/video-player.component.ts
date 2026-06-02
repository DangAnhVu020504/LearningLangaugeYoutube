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
            <option value="ko">🇰🇷 한국어</option>
            <option value="fr">🇫🇷 Français</option>
            <option value="de">🇩🇪 Deutsch</option>
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
            <div class="card" style="height: 100%; display: flex; flex-direction: column; background: #0f0f0f; border: none;">
              <h3 style="color: #f1f1f1; padding: 16px; margin: 0; border-bottom: 1px solid #272727;">📝 Phụ đề</h3>
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
                    
                    <!-- Hiển thị bản dịch cho TẤT CẢ phụ đề -->
                    @if (transcriptTranslations().has($index)) {
                      <div class="transcript-translation">
                        🇻🇳 {{ transcriptTranslations().get($index) }}
                      </div>
                    } @else {
                      <div class="transcript-translation-loading">
                        <span class="loading-dots">⏳ Đang dịch...</span>
                      </div>
                    }
                    
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
      max-width: 100%;
      margin: 0;
      padding: 0;
      background: #0f0f0f;
    }

    .video-content {
      display: grid;
      grid-template-columns: 1fr 400px;
      gap: 24px;
      height: calc(100vh - 180px);
      padding: 24px;
      align-items: start;
    }

    @media (max-width: 1400px) {
      .video-content {
        grid-template-columns: 1fr 350px;
      }
    }

    @media (max-width: 968px) {
      .video-content {
        grid-template-columns: 1fr;
        height: auto;
      }
    }

    .video-section {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    #youtube-player {
      width: 100%;
      height: 0;
      padding-bottom: 56.25%;
      background: #000;
      border-radius: 12px;
      overflow: hidden;
      position: relative;
    }

    #youtube-player iframe {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }

    .transcript-section {
      width: 100%;
      height: 100%;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .transcript-container {
      height: 100%;
      overflow-y: auto;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .transcript-item {
      padding: 12px;
      margin-bottom: 0;
      border-radius: 8px;
      background: #272727;
      cursor: pointer;
      transition: all 0.2s;
      border: 2px solid transparent;
    }

    .transcript-item:hover {
      background: #3f3f3f;
    }

    .transcript-item.active {
      background: #3f3f3f;
      border-color: #2563eb;
    }

    .transcript-text {
      margin-bottom: 4px;
      line-height: 1.6;
      color: #f1f1f1;
      font-size: 14px;
    }

    .transcript-translation {
      margin: 8px 0 4px 0;
      padding: 8px;
      background: rgba(37, 99, 235, 0.1);
      border-left: 3px solid #2563eb;
      border-radius: 4px;
      color: #93c5fd;
      font-size: 13px;
      line-height: 1.5;
      font-style: italic;
    }

    .transcript-translation-loading {
      margin: 8px 0 4px 0;
      padding: 8px;
      background: rgba(148, 163, 184, 0.1);
      border-left: 3px solid #64748b;
      border-radius: 4px;
      color: #94a3b8;
      font-size: 13px;
      font-style: italic;
    }

    .loading-dots {
      animation: blink 1.4s infinite;
    }

    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .word {
      display: inline-block;
      padding: 2px 4px;
      margin: 0 2px;
      border-radius: 3px;
      cursor: pointer;
      transition: background 0.2s;
      color: #f1f1f1;
    }

    .word:hover {
      background: #065fd4;
      color: white;
    }

    .transcript-time {
      font-size: 11px;
      color: #aaa;
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
  transcriptTranslations = signal<Map<number, string>>(new Map()); // Lưu bản dịch của từng transcript item
  currentTranscriptIndex = signal<number>(-1);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  
  // Translation
  showTranslation = signal(false);
  selectedWord = signal('');
  selectedContext = signal('');
  translation = signal<any>(null);
  isTranslating = signal(false);

  // Progressive translation tracking
  private translatingItems = new Set<number>();
  private lastTranslatedIndex = -1; // Theo dõi item cuối đã dịch
  private readonly INITIAL_BATCH = 20; // Dịch 20 câu đầu
  private readonly PROGRESSIVE_BATCH = 10; // Dịch thêm 10 câu mỗi lần

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
        
        // Bắt đầu dịch 20 câu đầu tiên
        this.translateInitialBatch();
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
    console.log('🎬 Đang khởi tạo YouTube Player cho video:', videoId);
    
    // Đợi YouTube API load xong
    if (typeof YT === 'undefined' || !YT.Player) {
      console.log('⏳ Đợi YouTube API...');
      setTimeout(() => this.initYouTubePlayer(videoId), 100);
      return;
    }

    // Destroy player cũ nếu có
    if (this.player) {
      console.log('🗑️ Hủy player cũ');
      try {
        this.player.destroy();
      } catch (e) {
        console.warn('Lỗi khi destroy player:', e);
      }
      this.player = null;
    }

    // Đợi DOM element sẵn sàng
    const element = document.getElementById('youtube-player');
    if (!element) {
      console.log('⏳ Đợi DOM element...');
      setTimeout(() => this.initYouTubePlayer(videoId), 100);
      return;
    }

    console.log('✅ Tạo YouTube Player mới');
    try {
      this.player = new YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: (event: any) => {
            console.log('✅ YouTube Player sẵn sàng');
            this.startTimeTracking();
          },
          onError: (event: any) => {
            console.error('❌ Lỗi YouTube Player:', event.data);
            this.errorMessage.set('Lỗi khi tải video. Vui lòng kiểm tra URL.');
          },
        },
      });
    } catch (error) {
      console.error('❌ Lỗi khi tạo player:', error);
      this.errorMessage.set('Không thể khởi tạo video player');
    }
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
   * Cập nhật phụ đề hiện tại và trigger progressive translation
   */
  private updateCurrentTranscript(currentTime: number): void {
    const items = this.transcript();
    const index = items.findIndex(
      (item) => currentTime >= item.start && currentTime < item.start + item.duration
    );
    
    if (index !== -1 && index !== this.currentTranscriptIndex()) {
      this.currentTranscriptIndex.set(index);
      
      // Kiểm tra xem có cần dịch batch tiếp theo không
      // Khi đọc được câu thứ 10, 20, 30... dịch thêm 10 câu tiếp
      if (index > 0 && index % 10 === 0 && index > this.lastTranslatedIndex) {
        this.translateNextBatch();
      }
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

    try {
      // Lấy timestamp hiện tại từ video player
      let timestamp = 0;
      try {
        if (this.player && typeof this.player.getCurrentTime === 'function') {
          timestamp = this.player.getCurrentTime();
        }
      } catch (e) {
        console.warn('Không thể lấy timestamp từ video player:', e);
      }

      await this.vocabularyService.saveVocabulary({
        word: this.selectedWord(),
        meaning: trans.meaning,
        grammarNote: trans.grammar_note,
        examples: trans.examples,
        contextSentence: this.selectedContext(),
        videoId: this.videoId()!,
        timestamp: timestamp,
        language: this.selectedLanguage as any,
      });

      console.log('✓ Đã lưu từ vựng:', this.selectedWord());
      alert('✓ Đã lưu từ vựng!');
      
      // Force update UI
      this.closeTranslation();
    } catch (error) {
      console.error('Lỗi khi lưu từ vựng:', error);
      alert('✗ Lỗi khi lưu từ vựng: ' + error);
    }
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

  /**
   * Dịch 20 câu đầu tiên
   */
  private async translateInitialBatch(): Promise<void> {
    const items = this.transcript();
    const batchSize = Math.min(this.INITIAL_BATCH, items.length);
    
    console.log(`🌐 Bắt đầu dịch ${batchSize} câu đầu tiên...`);
    
    for (let i = 0; i < batchSize; i++) {
      await this.translateTranscriptItem(i, items[i].text);
      
      // Delay 300ms giữa các request
      if (i < batchSize - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    this.lastTranslatedIndex = batchSize - 1;
    console.log(`✅ Đã dịch xong ${batchSize} câu đầu tiên!`);
  }

  /**
   * Dịch batch tiếp theo (10 câu)
   */
  private async translateNextBatch(): Promise<void> {
    const items = this.transcript();
    const startIndex = this.lastTranslatedIndex + 1;
    const endIndex = Math.min(startIndex + this.PROGRESSIVE_BATCH, items.length);
    
    if (startIndex >= items.length) {
      return; // Đã dịch hết
    }
    
    console.log(`🌐 Dịch batch tiếp theo: từ ${startIndex} đến ${endIndex - 1}`);
    
    for (let i = startIndex; i < endIndex; i++) {
      await this.translateTranscriptItem(i, items[i].text);
      
      // Delay 300ms giữa các request
      if (i < endIndex - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    this.lastTranslatedIndex = endIndex - 1;
    console.log(`✅ Đã dịch xong batch đến câu ${endIndex - 1}`);
  }

  /**
   * Dịch transcript item
   */
  private async translateTranscriptItem(index: number, text: string): Promise<void> {
    // Nếu đã có bản dịch hoặc đang dịch thì bỏ qua
    if (this.transcriptTranslations().has(index) || this.translatingItems.has(index)) {
      return;
    }

    // Đánh dấu đang dịch
    this.translatingItems.add(index);

    try {
      // Tạo prompt đơn giản để dịch
      const prompt = `Dịch câu sau sang tiếng Việt (chỉ trả về bản dịch, không giải thích):
"${text}"

Bản dịch:`;

      const response = await this.apiService.askAI(prompt).toPromise();
      
      if (response && response.success) {
        // Lưu bản dịch
        const translations = this.transcriptTranslations();
        translations.set(index, response.response.trim());
        this.transcriptTranslations.set(new Map(translations));
      }
    } catch (error) {
      console.error(`Lỗi khi dịch transcript #${index}:`, error);
      // Set bản dịch lỗi để không retry
      const translations = this.transcriptTranslations();
      translations.set(index, '[Lỗi dịch]');
      this.transcriptTranslations.set(new Map(translations));
    } finally {
      this.translatingItems.delete(index);
    }
  }
}
