import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VocabularyService } from '../services/vocabulary.service';
import { Vocabulary } from '../models/vocabulary.model';

@Component({
  selector: 'app-vocabulary-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="vocabulary-list-container">
      <div class="card">
        <div class="header">
          <h2>📚 Sổ Tay Từ Vựng</h2>
          <div class="header-actions">
            <button class="btn btn-secondary" (click)="exportData()">
              📥 Export JSON
            </button>
            <button class="btn btn-secondary" (click)="fileInput.click()">
              📤 Import JSON
            </button>
            <input
              #fileInput
              type="file"
              accept=".json"
              style="display: none"
              (change)="importData($event)"
            />
          </div>
        </div>

        <!-- Search -->
        <div class="search-box mt-2">
          <input
            type="text"
            class="input"
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
            placeholder="🔍 Tìm kiếm từ vựng..."
          />
        </div>

        <!-- Stats -->
        <div class="stats mt-2">
          <div class="stat-item">
            <span class="stat-label">Tổng số từ:</span>
            <span class="stat-value">{{ totalWords() }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">🇬🇧 English:</span>
            <span class="stat-value">{{ wordsByLanguage('en') }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">🇨🇳 中文:</span>
            <span class="stat-value">{{ wordsByLanguage('zh') }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">🇯🇵 日本語:</span>
            <span class="stat-value">{{ wordsByLanguage('ja') }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">🇰🇷 한국어:</span>
            <span class="stat-value">{{ wordsByLanguage('ko') }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">🇫🇷 Français:</span>
            <span class="stat-value">{{ wordsByLanguage('fr') }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">🇩🇪 Deutsch:</span>
            <span class="stat-value">{{ wordsByLanguage('de') }}</span>
          </div>
        </div>

        <!-- Filter -->
        <div class="filter mt-2">
          <button
            class="filter-btn"
            [class.active]="filterLanguage() === 'all'"
            (click)="setFilter('all')"
          >
            Tất cả
          </button>
          <button
            class="filter-btn"
            [class.active]="filterLanguage() === 'en'"
            (click)="setFilter('en')"
          >
            🇬🇧 English
          </button>
          <button
            class="filter-btn"
            [class.active]="filterLanguage() === 'zh'"
            (click)="setFilter('zh')"
          >
            🇨🇳 中文
          </button>
          <button
            class="filter-btn"
            [class.active]="filterLanguage() === 'ja'"
            (click)="setFilter('ja')"
          >
            🇯🇵 日本語
          </button>
          <button
            class="filter-btn"
            [class.active]="filterLanguage() === 'ko'"
            (click)="setFilter('ko')"
          >
            🇰🇷 한국어
          </button>
          <button
            class="filter-btn"
            [class.active]="filterLanguage() === 'fr'"
            (click)="setFilter('fr')"
          >
            🇫🇷 Français
          </button>
          <button
            class="filter-btn"
            [class.active]="filterLanguage() === 'de'"
            (click)="setFilter('de')"
          >
            🇩🇪 Deutsch
          </button>
        </div>

        <!-- Vocabulary List -->
        <div class="vocabulary-list mt-2">
          @if (vocabularyService.isLoading()) {
            <div class="text-center">
              <span class="loading"></span>
              <p>Đang tải...</p>
            </div>
          } @else if (filteredVocabularies().length === 0) {
            <div class="empty-state">
              <p>📝 Chưa có từ vựng nào</p>
              <p class="text-secondary">Hãy xem video và lưu từ vựng mới!</p>
            </div>
          } @else {
            @for (vocab of filteredVocabularies(); track vocab.id) {
              <div class="vocab-card">
                <div class="vocab-header">
                  <div class="vocab-word">
                    {{ vocab.word }}
                    <span class="badge badge-primary">{{ getLanguageLabel(vocab.language) }}</span>
                  </div>
                  <button class="btn-delete" (click)="deleteVocab(vocab.id)">
                    🗑️
                  </button>
                </div>

                <div class="vocab-meaning">
                  {{ vocab.meaning }}
                </div>

                @if (vocab.grammarNote) {
                  <div class="vocab-grammar">
                    <strong>Ngữ pháp:</strong> {{ vocab.grammarNote }}
                  </div>
                }

                <div class="vocab-context">
                  <strong>Ngữ cảnh:</strong> {{ vocab.contextSentence }}
                </div>

                @if (vocab.examples.length > 0) {
                  <div class="vocab-examples">
                    <strong>Ví dụ:</strong>
                    <ul>
                      @for (example of vocab.examples; track $index) {
                        <li>{{ example }}</li>
                      }
                    </ul>
                  </div>
                }

                <div class="vocab-footer">
                  <span class="vocab-date">
                    {{ formatDate(vocab.createdAt) }}
                  </span>
                  <button
                    class="btn btn-secondary btn-sm"
                    (click)="openVideoAtTimestamp(vocab.videoId, vocab.timestamp)"
                  >
                    ▶️ Xem lại video
                  </button>
                </div>
              </div>
            }
          }
        </div>

        <!-- Clear All -->
        @if (totalWords() > 0) {
          <div class="mt-3 text-center">
            <button class="btn btn-danger" (click)="clearAll()">
              🗑️ Xóa tất cả từ vựng
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .vocabulary-list-container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 20px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    .header h2 {
      margin: 0;
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }

    .stats {
      display: flex;
      gap: 20px;
      padding: 16px;
      background: #f8fafc;
      border-radius: 8px;
      flex-wrap: wrap;
    }

    .stat-item {
      display: flex;
      gap: 8px;
    }

    .stat-label {
      color: #64748b;
    }

    .stat-value {
      font-weight: 600;
      color: #2563eb;
    }

    .filter {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .filter-btn {
      padding: 8px 16px;
      border: 1px solid #e2e8f0;
      background: white;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .filter-btn:hover {
      background: #f8fafc;
    }

    .filter-btn.active {
      background: #2563eb;
      color: white;
      border-color: #2563eb;
    }

    .vocabulary-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .vocab-card {
      padding: 20px;
      background: #f8fafc;
      border-radius: 8px;
      border-left: 4px solid #2563eb;
      transition: all 0.2s;
    }

    .vocab-card:hover {
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      transform: translateY(-2px);
    }

    .vocab-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .vocab-word {
      font-size: 24px;
      font-weight: 600;
      color: #1e293b;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-delete {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      transition: background 0.2s;
    }

    .btn-delete:hover {
      background: #fee2e2;
    }

    .vocab-meaning {
      font-size: 18px;
      color: #475569;
      margin-bottom: 12px;
    }

    .vocab-grammar {
      padding: 12px;
      background: #fef3c7;
      border-radius: 6px;
      margin-bottom: 12px;
      font-size: 14px;
    }

    .vocab-context {
      padding: 12px;
      background: white;
      border-radius: 6px;
      margin-bottom: 12px;
      font-size: 14px;
      font-style: italic;
    }

    .vocab-examples {
      font-size: 14px;
      margin-bottom: 12px;
    }

    .vocab-examples ul {
      margin-top: 8px;
      padding-left: 20px;
    }

    .vocab-examples li {
      margin-bottom: 4px;
      color: #475569;
    }

    .vocab-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
    }

    .vocab-date {
      font-size: 12px;
      color: #94a3b8;
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #94a3b8;
    }

    .empty-state p:first-child {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .text-secondary {
      color: #94a3b8;
    }
  `],
})
export class VocabularyListComponent {
  searchQuery = signal('');
  filterLanguage = signal<'all' | 'en' | 'zh' | 'ja' | 'ko' | 'fr' | 'de'>('all');

  constructor(public vocabularyService: VocabularyService) {
    // Reload data mỗi khi component được tạo
    this.vocabularyService.loadVocabularies();
  }

  // Computed signals
  filteredVocabularies = computed(() => {
    let vocabs = this.vocabularyService.vocabularies();
    const filter = this.filterLanguage(); // Đọc signal
    const search = this.searchQuery(); // Đọc signal

    // Filter by language
    if (filter !== 'all') {
      vocabs = vocabs.filter(v => v.language === filter);
    }

    // Filter by search query
    if (search) {
      const query = search.toLowerCase();
      vocabs = vocabs.filter(
        v => v.word.toLowerCase().includes(query) ||
             v.meaning.toLowerCase().includes(query)
      );
    }

    return vocabs;
  });

  totalWords = computed(() => this.vocabularyService.vocabularies().length);

  wordsByLanguage(lang: 'en' | 'zh' | 'ja' | 'ko' | 'fr' | 'de'): number {
    return this.vocabularyService.vocabularies().filter(v => v.language === lang).length;
  }

  onSearch(): void {
    // Signal sẽ tự động trigger recomputation
  }

  setFilter(lang: 'all' | 'en' | 'zh' | 'ja' | 'ko' | 'fr' | 'de'): void {
    console.log('🔍 Đổi filter sang:', lang);
    this.filterLanguage.set(lang);
  }

  getLanguageLabel(lang: string): string {
    const labels = {
      en: '🇬🇧 EN',
      zh: '🇨🇳 ZH',
      ja: '🇯🇵 JA',
      ko: '🇰🇷 KO',
      fr: '🇫🇷 FR',
      de: '🇩🇪 DE',
    };
    return labels[lang as keyof typeof labels] || lang;
  }

  formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  async deleteVocab(id: string): Promise<void> {
    if (confirm('Bạn có chắc muốn xóa từ này?')) {
      await this.vocabularyService.deleteVocabulary(id);
    }
  }

  async clearAll(): Promise<void> {
    if (confirm('Bạn có chắc muốn xóa TẤT CẢ từ vựng? Hành động này không thể hoàn tác!')) {
      await this.vocabularyService.clearAll();
    }
  }

  openVideoAtTimestamp(videoId: string, timestamp: number): void {
    const url = `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(timestamp)}s`;
    window.open(url, '_blank');
  }

  exportData(): void {
    const json = this.vocabularyService.exportToJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vocabulary_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async importData(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      await this.vocabularyService.importFromJson(text);
      alert('✓ Import thành công!');
    } catch (error) {
      alert('✗ Lỗi: File JSON không hợp lệ');
    }

    // Reset input
    input.value = '';
  }
}
