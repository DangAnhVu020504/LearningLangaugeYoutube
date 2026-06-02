import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VideoPlayerComponent } from './components/video-player.component';
import { VocabularyListComponent } from './components/vocabulary-list.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, VideoPlayerComponent, VocabularyListComponent],
  template: `
    <div class="app">
      <!-- Header -->
      <header class="header">
        <div class="container">
          <h1>🎓 Language Learning App</h1>
          <p class="subtitle">Học ngoại ngữ qua video YouTube</p>
        </div>
      </header>

      <!-- Navigation -->
      <nav class="nav">
        <div class="container">
          <button
            class="nav-btn"
            [class.active]="currentTab() === 'video'"
            (click)="currentTab.set('video')"
          >
            🎥 Video Player
          </button>
          <button
            class="nav-btn"
            [class.active]="currentTab() === 'vocabulary'"
            (click)="currentTab.set('vocabulary')"
          >
            📚 Sổ Tay Từ Vựng
          </button>
        </div>
      </nav>

      <!-- Content -->
      <main class="main">
        @if (currentTab() === 'video') {
          <app-video-player />
        } @else {
          <app-vocabulary-list />
        }
      </main>

      <!-- Footer -->
      <footer class="footer">
        <div class="container text-center">
          <p>
            Made with ❤️ using Angular + NestJS
          </p>
          <p class="text-secondary">
            Hỗ trợ: 🇬🇧 English | 🇨🇳 中文 | 🇯🇵 日本語
          </p>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .app {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 20px;
      text-align: center;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    }

    .header h1 {
      margin: 0;
      font-size: 36px;
      font-weight: 700;
    }

    .subtitle {
      margin-top: 8px;
      font-size: 18px;
      opacity: 0.9;
    }

    .nav {
      background: white;
      border-bottom: 1px solid #e2e8f0;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    }

    .nav .container {
      display: flex;
      gap: 8px;
      padding: 12px 20px;
    }

    .nav-btn {
      padding: 12px 24px;
      border: none;
      background: transparent;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      color: #64748b;
    }

    .nav-btn:hover {
      background: #f8fafc;
      color: #2563eb;
    }

    .nav-btn.active {
      background: #2563eb;
      color: white;
    }

    .main {
      flex: 1;
      padding: 20px 0;
    }

    .footer {
      background: #1e293b;
      color: white;
      padding: 30px 20px;
      margin-top: 60px;
    }

    .footer p {
      margin: 4px 0;
    }

    .text-secondary {
      opacity: 0.7;
      font-size: 14px;
    }

    @media (max-width: 768px) {
      .header h1 {
        font-size: 28px;
      }

      .subtitle {
        font-size: 16px;
      }

      .nav .container {
        flex-direction: column;
      }

      .nav-btn {
        width: 100%;
      }
    }
  `],
})
export class AppComponent {
  currentTab = signal<'video' | 'vocabulary'>('video');
}
