# 🎓 Language Learning App - Version 3.0

Ứng dụng học ngoại ngữ qua video YouTube với AI hỗ trợ.

## ✨ Tính năng

### 🌍 Hỗ trợ 6 ngôn ngữ
- 🇬🇧 English
- 🇨🇳 中文 (Chinese)
- 🇯🇵 日本語 (Japanese)
- 🇰🇷 한국어 (Korean)
- 🇫🇷 Français (French)
- 🇩🇪 Deutsch (German)

### 🎥 Video Player
- Load video từ YouTube
- Hiển thị phụ đề đồng bộ
- Click từ để dịch chi tiết
- Layout giống YouTube

### 🌐 Dịch phụ đề thông minh
- Progressive translation (dịch dần theo tiến độ xem)
- Dịch 20 câu đầu ngay lập tức
- Tự động dịch thêm khi xem tiếp
- Hiển thị bản dịch tiếng Việt cho mọi phụ đề

### 📚 Sổ tay từ vựng
- Lưu từ vựng với ngữ cảnh
- Lọc theo ngôn ngữ
- Tìm kiếm từ vựng
- Export/Import JSON
- Xem lại video tại thời điểm từ xuất hiện

### 🤖 AI Chatbot
- Trợ lý học ngoại ngữ thông minh
- Giải thích ngữ pháp
- Dịch và giải nghĩa từ
- Tư vấn phương pháp học
- Luyện tập hội thoại

## 🚀 Quick Start (Local)

### Prerequisites
- Node.js v18+
- npm hoặc yarn

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Thêm API key vào .env: OPENAI_API_KEY hoặc GEMINI_API_KEY
npm run start:dev
```

Backend chạy tại: http://localhost:3000/api

### Frontend

```bash
cd frontend
npm install
npm start
```

Frontend chạy tại: http://localhost:4200

## 🌐 Deploy lên Cloud (Public URL)

### Khuyên dùng: Vercel + Render (Miễn phí)

**1. Deploy Backend lên Render:**
- Truy cập: https://render.com
- New > Web Service
- Connect GitHub repo
- Root Directory: `backend`
- Build: `npm install`
- Start: `npm run start:prod`
- Add env vars: `OPENAI_API_KEY`, `LLM_PROVIDER=openai`

**2. Deploy Frontend lên Vercel:**
- Truy cập: https://vercel.com
- Import Git repo
- Root Directory: `frontend`
- Framework: Angular
- Build: `npm run build`
- Env var: `API_URL=https://your-backend.onrender.com`

Chi tiết xem: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

## 📱 Sử dụng trên thiết bị khác

Sau khi deploy:
1. Copy URL từ Vercel (ví dụ: `https://your-app.vercel.app`)
2. Mở trên bất kỳ thiết bị nào (điện thoại, tablet, laptop khác)
3. Sử dụng ngay không cần cài đặt!

## 🛠️ Tech Stack

### Frontend
- Angular 17
- TypeScript
- Signals (Reactive State)
- LocalForage (Offline Storage)
- YouTube IFrame API

### Backend
- NestJS
- TypeScript
- OpenAI / Gemini AI
- YouTube Transcript API

## 📦 Project Structure

```
ChiHaiDaiKa/
├── backend/
│   ├── src/
│   │   ├── ai-chat/         # AI chatbot module
│   │   ├── transcript/      # YouTube transcript module
│   │   ├── translate/       # Translation & LLM module
│   │   ├── app.module.ts
│   │   └── main.ts
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   ├── video-player.component.ts
│   │   │   │   ├── vocabulary-list.component.ts
│   │   │   │   └── ai-chat.component.ts
│   │   │   ├── services/
│   │   │   ├── models/
│   │   │   └── app.component.ts
│   │   └── index.html
│   └── package.json
│
└── README.md
```

## 🔑 Environment Variables

### Backend (.env)

```env
# LLM Provider (openai hoặc gemini)
LLM_PROVIDER=openai

# OpenAI
OPENAI_API_KEY=sk-proj-...

# Gemini (alternative)
GEMINI_API_KEY=AIza...

# Server
PORT=3000
FRONTEND_URL=http://localhost:4200
```

### Frontend (environment.ts)

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api'
};
```

## 📖 API Documentation

### GET /api/transcript
Lấy phụ đề từ YouTube video

**Query params:**
- `videoId`: YouTube video ID
- `lang`: Language code (en, zh, ja, ko, fr, de)

### POST /api/translate
Dịch từ theo ngữ cảnh

**Body:**
```json
{
  "word": "hello",
  "context": "Hello, how are you?",
  "language": "en"
}
```

### POST /api/ai-chat
Hỏi AI chatbot

**Body:**
```json
{
  "message": "Giải thích cách dùng present perfect",
  "context": "optional"
}
```

## 🤝 Contributing

1. Fork repo
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 License

MIT License

## 👤 Author

**Đặng Anh Vũ**
- GitHub: [@DangAnhVu020504](https://github.com/DangAnhVu020504)

## ⭐ Show your support

Give a ⭐️ if this project helped you!

---

Made with ❤️ using Angular + NestJS
