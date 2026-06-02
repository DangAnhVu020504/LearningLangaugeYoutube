# Frontend - Language Learning App

## ⚠️ Lưu ý quan trọng

Do Angular cần cấu trúc project phức tạp và nhiều file cấu hình, **khuyến nghị sử dụng file `app.html`** ở thư mục gốc thay vì setup Angular đầy đủ.

## 🚀 Cách sử dụng nhanh

### Option 1: Sử dụng app.html (Khuyến nghị)

Mở file `../app.html` trong trình duyệt - Đây là phiên bản standalone hoàn chỉnh với:
- ✅ Giao diện đầy đủ
- ✅ Tất cả tính năng
- ✅ Không cần build
- ✅ Hoạt động ngay lập tức

### Option 2: Setup Angular đầy đủ (Nâng cao)

Nếu bạn muốn sử dụng Angular đầy đủ:

1. **Cài Angular CLI:**
   ```bash
   npm install -g @angular/cli
   ```

2. **Tạo project mới:**
   ```bash
   ng new language-learning-app --standalone --routing=false
   cd language-learning-app
   ```

3. **Copy các component:**
   - Copy `src/app/components/` vào project mới
   - Copy `src/app/services/` vào project mới
   - Copy `src/app/models/` vào project mới
   - Copy `src/app/app.component.ts` vào project mới

4. **Chạy:**
   ```bash
   ng serve
   ```

## 🐛 Lỗi TypeScript đã được sửa

Lỗi `Cannot find type definition file for 'youtube'` đã được sửa bằng cách:
- ✅ Thêm `"types": []` vào `tsconfig.json`
- ✅ Tạo file `src/youtube.d.ts` với type definitions
- ✅ Thêm `"skipLibCheck": true`

## 📝 Files quan trọng

- `src/youtube.d.ts` - Type definitions cho YouTube IFrame API
- `tsconfig.json` - Cấu hình TypeScript
- `tsconfig.app.json` - Cấu hình TypeScript cho app

## 💡 Khuyến nghị

**Sử dụng `../app.html`** - Đây là giải pháp đơn giản nhất và hoạt động tốt nhất cho dự án này!

File `app.html` có:
- ✅ Giao diện đẹp
- ✅ Đầy đủ tính năng
- ✅ Không cần cấu hình
- ✅ Không cần build
- ✅ Chạy trực tiếp trong trình duyệt
