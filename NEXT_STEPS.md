# 🚀 Next Steps - Hoàn tất Deployment

## ✅ Đã hoàn thành
- [x] Tạo nhánh Version-3.0 trên GitHub
- [x] Cấu hình frontend API URL: `https://learninglangaugeyoutube.onrender.com/api`
- [x] Fix lỗi build Render (thêm `npm run build` command)
- [x] Cấu hình CORS cho phép frontend gọi API
- [x] Push code lên GitHub

## 📋 Các bước tiếp theo

### Bước 1: Cấu hình Environment Variables trên Render

1. Truy cập Render dashboard: https://dashboard.render.com/
2. Chọn service: `language-learning-backend`
3. Vào tab **Environment**
4. Thêm các biến sau:

```
OPENAI_API_KEY=your-groq-api-key-here
LLM_PROVIDER=openai
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

5. Click **Save Changes** → Render sẽ tự động redeploy

### Bước 2: Kiểm tra Backend hoạt động

Sau khi Render deploy xong, kiểm tra:

```bash
curl https://learninglangaugeyoutube.onrender.com/api
```

Hoặc mở trong trình duyệt: https://learninglangaugeyoutube.onrender.com/api

Nếu thấy thông báo hoặc API đang chạy → Backend đã sẵn sàng ✅

### Bước 3: Deploy Frontend lên Vercel

#### Option A: Deploy qua Vercel Dashboard

1. Truy cập: https://vercel.com
2. Đăng nhập bằng GitHub
3. Click **Add New** → **Project**
4. Chọn repository: `DangAnhVu020504/LearningLangaugeYoutube`
5. Cấu hình:
   - **Framework Preset**: Angular
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/language-learning-frontend`
6. **Environment Variables** (không cần - đã hardcode API URL)
7. Click **Deploy**
8. Đợi 2-3 phút → Copy URL frontend

#### Option B: Deploy qua CLI

```bash
# Cài đặt Vercel CLI
npm install -g vercel

# Đăng nhập
vercel login

# Deploy
cd frontend
vercel --prod

# Làm theo hướng dẫn:
# - Chọn scope: your-account
# - Link to existing project? N
# - Project name: learning-language-youtube
# - Directory: frontend
# - Build Command: npm run build
# - Output Directory: dist/language-learning-frontend
```

### Bước 4: Cập nhật FRONTEND_URL trên Render

1. Sau khi có URL Vercel (ví dụ: `https://learning-language-youtube.vercel.app`)
2. Quay lại Render dashboard
3. Cập nhật `FRONTEND_URL`:
   ```
   FRONTEND_URL=https://learning-language-youtube.vercel.app
   ```
4. Save → Render redeploy

### Bước 5: Test ứng dụng

Mở URL Vercel và kiểm tra:

- [ ] Video YouTube load được
- [ ] Transcript hiển thị
- [ ] Dịch tiếng Việt xuất hiện dưới transcript
- [ ] Thêm từ vào vocabulary list
- [ ] Lọc ngôn ngữ hoạt động (EN, ZH, JA, KO, FR, DE)
- [ ] AI chatbot trả lời câu hỏi
- [ ] Chuyển tab giữa Video Player và Vocabulary List không mất dữ liệu

### Bước 6: Test trên điện thoại

1. Mở URL Vercel trên điện thoại
2. Kiểm tra responsive design
3. Test các chức năng chính

## 🔧 Troubleshooting

### Lỗi CORS khi gọi API từ Frontend

**Triệu chứng:** Console báo "CORS policy blocked"

**Giải pháp:**
1. Kiểm tra `FRONTEND_URL` trên Render đúng với URL Vercel
2. Kiểm tra backend code đã cập nhật CORS (đã fix trong commit mới nhất)
3. Restart backend service trên Render

### Backend deployment failed

**Triệu chứng:** Build fail với lỗi "Cannot find module"

**Giải pháp:**
1. Render sẽ tự động redeploy sau khi push code mới
2. Kiểm tra logs trên Render dashboard
3. Đảm bảo `render.yaml` có `buildCommand: npm ci && npm run build`

### Frontend deployment failed

**Triệu chứng:** Vercel build fail

**Giải pháp:**
```bash
# Test build local trước
cd frontend
npm run build

# Nếu build thành công → deploy lại
vercel --prod
```

### API calls returning 404

**Triệu chứng:** Frontend gọi API nhưng trả về 404

**Giải pháp:**
1. Kiểm tra backend đang chạy: `https://learninglangaugeyoutube.onrender.com/api`
2. Kiểm tra `api.service.ts` có đúng URL không
3. Kiểm tra OPENAI_API_KEY đã được set trên Render chưa

## 📱 Chia sẻ link với người khác

Sau khi deploy xong, share URL Vercel:

```
https://your-app-name.vercel.app
```

**Lưu ý:**
- Link hoạt động 24/7, không cần máy tính bật
- Miễn phí với giới hạn: 100GB bandwidth/tháng
- Backend Render có thể "sleep" sau 15 phút không dùng (free plan)
  → Lần đầu load có thể chậm ~30s

## 🎉 Hoàn thành!

Khi tất cả checklist ✅ → Ứng dụng đã sẵn sàng sử dụng trên internet!

---

## 📞 Cần hỗ trợ?

Nếu gặp lỗi, cung cấp:
1. Screenshot lỗi
2. Console logs (F12 → Console)
3. URL đang test
4. Bước nào trong quy trình
