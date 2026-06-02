# 🚀 Hướng dẫn Deploy

## Lựa chọn 1: Cloud Deployment (Miễn phí + Vĩnh viễn)

### Backend trên Render.com

1. Truy cập: https://render.com
2. Đăng ký/Đăng nhập
3. New > Web Service
4. Connect GitHub: `DangAnhVu020504/LearningLangaugeYoutube`
5. Branch: `Version-3.0`
6. Cấu hình:
   - **Name**: language-learning-backend
   - **Root Directory**: `backend`
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm run start:prod`
7. Environment Variables:
   ```
   NODE_ENV=production
   PORT=3000
   OPENAI_API_KEY=sk-proj-...
   LLM_PROVIDER=openai
   FRONTEND_URL=https://your-frontend.vercel.app
   ```
8. Click **Create Web Service**
9. Đợi deploy xong → Copy URL backend

### Frontend trên Vercel

1. Truy cập: https://vercel.com
2. Đăng ký/Đăng nhập
3. New Project > Import Git Repository
4. Chọn: `DangAnhVu020504/LearningLangaugeYoutube`
5. Cấu hình:
   - **Framework Preset**: Angular
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/language-learning-frontend`
6. Environment Variables:
   ```
   API_URL=https://your-backend.onrender.com
   ```
7. Click **Deploy**
8. Đợi deploy xong → Copy URL frontend

### Cập nhật CORS

Sau khi deploy, cập nhật backend `main.ts`:

```typescript
app.enableCors({
  origin: 'https://your-frontend.vercel.app',
  credentials: true,
});
```

Push lại code và Render sẽ tự động redeploy.

---

## Lựa chọn 2: ngrok (Local + Public URL tạm thời)

### Cài đặt ngrok

1. Download: https://ngrok.com/download
2. Giải nén và thêm vào PATH
3. Đăng ký tài khoản: https://dashboard.ngrok.com/signup
4. Copy authtoken: https://dashboard.ngrok.com/get-started/your-authtoken
5. Chạy: `ngrok authtoken YOUR_AUTH_TOKEN`

### Chạy Backend + Frontend

**Terminal 1 - Backend:**
```bash
cd backend
npm run start:dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

**Terminal 3 - Expose Backend:**
```bash
ngrok http 3000
```
→ Copy URL: `https://xxxx.ngrok-free.app`

**Terminal 4 - Expose Frontend:**
```bash
ngrok http 4200
```
→ Copy URL: `https://yyyy.ngrok-free.app`

### Cấu hình

1. Cập nhật `frontend/src/app/services/api.service.ts`:
   ```typescript
   private readonly API_URL = 'https://xxxx.ngrok-free.app/api';
   ```

2. Cập nhật `backend/src/main.ts`:
   ```typescript
   app.enableCors({
     origin: 'https://yyyy.ngrok-free.app',
     credentials: true,
   });
   ```

3. Restart cả backend và frontend

### Share Link

Chia sẻ: `https://yyyy.ngrok-free.app`

**Lưu ý:** 
- Link ngrok chỉ hoạt động khi máy tính đang bật
- Free plan: Link đổi mỗi khi restart
- Paid plan: Link cố định

---

## Lựa chọn 3: Deploy Full Stack trên Netlify

1. Build frontend:
   ```bash
   cd frontend
   npm run build
   ```

2. Copy backend vào frontend build:
   ```bash
   mkdir dist/language-learning-frontend/api
   xcopy /E /I backend dist\language-learning-frontend\api
   ```

3. Tạo `netlify.toml`:
   ```toml
   [build]
     command = "cd frontend && npm run build"
     publish = "frontend/dist/language-learning-frontend"

   [[redirects]]
     from = "/api/*"
     to = "/.netlify/functions/:splat"
     status = 200
   ```

4. Deploy:
   ```bash
   npm install -g netlify-cli
   netlify login
   netlify deploy --prod
   ```

---

## 📱 Test trên thiết bị khác

1. Mở URL trên điện thoại/tablet
2. Kiểm tra:
   - Load video YouTube
   - Dịch phụ đề
   - Lưu từ vựng
   - AI chatbot

---

## 🔒 Bảo mật

**Production checklist:**
- [ ] Đổi API keys sang environment variables
- [ ] Enable HTTPS only
- [ ] Giới hạn CORS origins
- [ ] Rate limiting
- [ ] Input validation
- [ ] Error logging (Sentry)

---

## 💰 Chi phí

**Miễn phí:**
- Vercel: 100GB bandwidth/tháng
- Render: 750 giờ/tháng
- Netlify: 100GB bandwidth/tháng

**Nếu vượt quota:**
- Vercel Pro: $20/tháng
- Render Starter: $7/tháng
- Netlify Pro: $19/tháng

---

## ❓ Troubleshooting

**CORS errors:**
```typescript
// backend/src/main.ts
app.enableCors({
  origin: ['https://your-frontend.vercel.app', 'http://localhost:4200'],
  credentials: true,
});
```

**API not found:**
- Kiểm tra API_URL trong frontend
- Kiểm tra backend đang chạy
- Kiểm tra routes trong backend

**Environment variables:**
- Render: Dashboard > Environment > Add Variable
- Vercel: Settings > Environment Variables
