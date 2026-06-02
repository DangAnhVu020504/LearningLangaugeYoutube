import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Floating Button -->
    <button 
      class="ai-chat-button"
      (click)="toggleChat()"
      [class.active]="isOpen()"
    >
      @if (!isOpen()) {
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          <path d="M8 10h.01M12 10h.01M16 10h.01"></path>
        </svg>
      } @else {
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      }
      <span class="ai-badge">AI</span>
    </button>

    <!-- Chat Window -->
    @if (isOpen()) {
      <div class="ai-chat-window">
        <!-- Header -->
        <div class="chat-header">
          <div class="header-content">
            <div class="avatar">🤖</div>
            <div>
              <h3>AI Assistant</h3>
              <p class="status">Trợ lý học ngoại ngữ</p>
            </div>
          </div>
          <button class="btn-close-chat" (click)="toggleChat()">✕</button>
        </div>

        <!-- Messages -->
        <div class="chat-messages" #messagesContainer>
          @if (messages().length === 0) {
            <div class="welcome-message">
              <div class="welcome-icon">👋</div>
              <h4>Chào bạn!</h4>
              <p>Tôi là trợ lý AI. Tôi có thể giúp bạn:</p>
              <ul>
                <li>💬 Giải thích ngữ pháp</li>
                <li>📝 Dịch và giải nghĩa từ</li>
                <li>🎯 Luyện tập hội thoại</li>
                <li>📚 Tư vấn học tập</li>
              </ul>
              <p class="hint">Hãy hỏi tôi bất cứ điều gì!</p>
            </div>
          }

          @for (msg of messages(); track msg.timestamp) {
            <div class="message" [class.user]="msg.role === 'user'" [class.assistant]="msg.role === 'assistant'">
              <div class="message-avatar">
                {{ msg.role === 'user' ? '👤' : '🤖' }}
              </div>
              <div class="message-content">
                <div class="message-text">{{ msg.content }}</div>
                <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
              </div>
            </div>
          }

          @if (isTyping()) {
            <div class="message assistant">
              <div class="message-avatar">🤖</div>
              <div class="message-content">
                <div class="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Input -->
        <div class="chat-input-container">
          @if (errorMessage()) {
            <div class="error-banner">
              {{ errorMessage() }}
              <button (click)="errorMessage.set(null)">✕</button>
            </div>
          }
          
          <div class="chat-input-wrapper">
            <textarea
              class="chat-input"
              [(ngModel)]="userInput"
              placeholder="Nhập câu hỏi của bạn..."
              (keydown.enter)="onEnter($any($event))"
              rows="1"
              #inputArea
            ></textarea>
            <button 
              class="btn-send"
              (click)="sendMessage()"
              [disabled]="!userInput.trim() || isTyping()"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .ai-chat-button {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      transition: all 0.3s ease;
    }

    .ai-chat-button:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
    }

    .ai-chat-button.active {
      background: #ef4444;
    }

    .ai-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #10b981;
      color: white;
      font-size: 10px;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 10px;
      border: 2px solid white;
    }

    .ai-chat-window {
      position: fixed;
      bottom: 100px;
      right: 24px;
      width: 400px;
      height: 600px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      z-index: 999;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: slideUp 0.3s ease;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 768px) {
      .ai-chat-window {
        width: calc(100vw - 32px);
        height: calc(100vh - 120px);
        right: 16px;
        bottom: 90px;
      }
    }

    .chat-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-content {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .avatar {
      width: 40px;
      height: 40px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }

    .chat-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }

    .status {
      margin: 0;
      font-size: 12px;
      opacity: 0.9;
    }

    .btn-close-chat {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }

    .btn-close-chat:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .welcome-message {
      text-align: center;
      padding: 40px 20px;
      color: #64748b;
    }

    .welcome-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .welcome-message h4 {
      color: #1e293b;
      margin-bottom: 8px;
    }

    .welcome-message ul {
      list-style: none;
      padding: 0;
      margin: 16px 0;
    }

    .welcome-message li {
      padding: 8px;
      text-align: left;
    }

    .hint {
      font-size: 14px;
      font-style: italic;
      margin-top: 16px;
    }

    .message {
      display: flex;
      gap: 8px;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .message-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      flex-shrink: 0;
    }

    .message-content {
      flex: 1;
      max-width: 80%;
    }

    .message-text {
      padding: 12px 16px;
      border-radius: 12px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .message.user {
      flex-direction: row-reverse;
    }

    .message.user .message-content {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .message.user .message-text {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .message.assistant .message-text {
      background: white;
      color: #1e293b;
      border: 1px solid #e2e8f0;
    }

    .message-time {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 4px;
      padding: 0 4px;
    }

    .typing-indicator {
      display: flex;
      gap: 4px;
      padding: 12px 16px;
      background: white;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
    }

    .typing-indicator span {
      width: 8px;
      height: 8px;
      background: #94a3b8;
      border-radius: 50%;
      animation: typing 1.4s infinite;
    }

    .typing-indicator span:nth-child(2) {
      animation-delay: 0.2s;
    }

    .typing-indicator span:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes typing {
      0%, 60%, 100% {
        transform: translateY(0);
      }
      30% {
        transform: translateY(-10px);
      }
    }

    .chat-input-container {
      border-top: 1px solid #e2e8f0;
      background: white;
      padding: 12px;
    }

    .error-banner {
      background: #fee2e2;
      color: #ef4444;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .error-banner button {
      background: none;
      border: none;
      color: #ef4444;
      cursor: pointer;
      font-size: 16px;
      padding: 0;
      width: 20px;
      height: 20px;
    }

    .chat-input-wrapper {
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }

    .chat-input {
      flex: 1;
      padding: 12px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      font-size: 14px;
      resize: none;
      font-family: inherit;
      max-height: 120px;
    }

    .chat-input:focus {
      outline: none;
      border-color: #667eea;
    }

    .btn-send {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
    }

    .btn-send:hover:not(:disabled) {
      transform: scale(1.1);
    }

    .btn-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `],
})
export class AiChatComponent {
  isOpen = signal(false);
  messages = signal<ChatMessage[]>([]);
  userInput = '';
  isTyping = signal(false);
  errorMessage = signal<string | null>(null);

  constructor(private apiService: ApiService) {}

  toggleChat(): void {
    this.isOpen.update(v => !v);
  }

  onEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  async sendMessage(): Promise<void> {
    const input = this.userInput.trim();
    if (!input || this.isTyping()) return;

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };
    this.messages.update(msgs => [...msgs, userMessage]);
    this.userInput = '';
    this.errorMessage.set(null);

    // Show typing indicator
    this.isTyping.set(true);

    try {
      // Call API to get AI response
      // TODO: Replace with actual API endpoint
      const response = await this.getAIResponse(input);

      // Add AI response
      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };
      this.messages.update(msgs => [...msgs, aiMessage]);
    } catch (error) {
      console.error('Lỗi khi gọi AI:', error);
      this.errorMessage.set('Không thể kết nối đến AI. Vui lòng thử lại.');
    } finally {
      this.isTyping.set(false);
      this.scrollToBottom();
    }
  }

  private async getAIResponse(prompt: string): Promise<string> {
    try {
      const response = await this.apiService.askAI(prompt).toPromise();
      
      if (response && response.success) {
        return response.response;
      } else {
        throw new Error('AI không thể trả lời');
      }
    } catch (error) {
      console.error('Lỗi API:', error);
      throw new Error('Không thể kết nối đến AI service');
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const container = document.querySelector('.chat-messages');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }

  formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
