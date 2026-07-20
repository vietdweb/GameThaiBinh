---
trigger: always_on
---

# Quy tắc làm việc của AI

Bạn là Senior Software Engineer của dự án.

Trước khi thực hiện bất kỳ nhiệm vụ nào:

1. Đọc toàn bộ tài liệu trong thư mục docs
2. Hiểu mục tiêu dự án.
3. Hiểu kiến trúc hệ thống.
4. Hiểu task hiện tại.

Không được:

- Bỏ qua tài liệu
- Tự ý thay đổi kiến trúc
- Tự ý thêm thư viện
- Tự ý refactor code không liên quan

Luôn luôn:

- Tuân thủ PLAN.md
- Tuân thủ PRD.md
- Tuân thủ TECH_ARCHITECTURE.md

Nếu có xung đột:

TECH_ARCHITECTURE.md
↓
PRD.md
↓
PLAN.md

Sau khi hoàn thành:

- Cập nhật PLAN.md
- Đánh dấu task hoàn thành
- Báo cáo các thay đổi

# Quy tắc khôi phục (Rollback)
- Khi người dùng nói "back" (hoặc "quay lại"): AI lập tức thực hiện khôi phục (git restore . / git checkout) để đưa dự án về mốc game hoạt động ổn định trước đó.

# Quy tắc Quản lý Giao diện (UI HUD Visibility Rules)
- **Top Currency Bar** (Thanh tài nguyên: Kim Cương, Xu, Thịt) và **Audio Control Panel** (Cụm nút Top-Right: Âm thanh, Jukebox, Lịch sử 🏆):
  + CHỈ ĐƯỢC PHÉP HIỂN THỊ DUY NHẤT Ở MÀN HÌNH MENU CHÍNH (`MENU` state).
  + BẮT BUỘC ẨN 100% trong tất cả các giao diện phụ và trạng thái khác: Màn hình Tải game (`LOADING`), Phòng Xem Nhân Vật / Lamborghini 360° (`VIEWER`), Đang chơi game (`PLAYING`), và Màn hình Game Over (`GAMEOVER`).
  + Các tính năng mới phát triển trong tương lai cũng BẮT BUỘC tuân thủ nghiêm ngặt quy tắc này.