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

# Bộ Quy Tắc Lập Trình Phòng Thủ & Bảo Vệ Game (Defensive Coding & Zero-Bug Rules)
- **BẮT BUỘC KIỂM TRA TÁC ĐỘNG (NO REGRESSION)**: Luôn luôn kiểm tra kỹ lưỡng mỗi khi phát triển/sửa đổi tính năng mới xem có ảnh hưởng gì tới vận hành của game hay không, có làm hỏng game hay tạo ra bug mới hay không.

--------------------------------------------------
📌 RULE 1: PHÒNG THỦ DOM & DỰ PHÒNG SỰ KIỆN (DOM DEFENSIVE CODING)
- KHÔNG BAO GIỜ gán `.addEventListener()` trực tiếp lên các phần tử DOM mà không thông qua câu lệnh kiểm tra an toàn `if (element)`.
- Tất cả các nút bấm UI (Start, Restart, Home, History, Jukebox, Audio controls) PHẢI được bọc kiểm tra an toàn trước khi gán sự kiện.
- Khuyến khích sử dụng cơ chế Ủy quyền sự kiện (Event Delegation) trên `document` hoặc `window` đối với các phần tử UI linh hoạt để đảm bảo luôn bắt được click kể cả khi DOM bị re-render hoặc chưa load xong.

--------------------------------------------------
📌 RULE 2: QUẢN LÝ TIẾN TRÌNH LOADING & BẤT ĐỒNG BỘ (ASYNCHRONOUS & ASSET LOADING)
- Hàm Nạp Asset 3D (GLTF/OBJ Loader), Audio Loader và Tải tài nguyên phải LUÔN CÓ khối `try...catch...finally` hoặc callback `.catch()`.
- Thanh Tiến Trình Loading (ProgressBar) PHẢI có cơ chế Timeout dự phòng (Fallback Timeout 5-8 giây): Nếu nạp asset bị hỏng/kẹt, hệ thống phải tự động hoàn tất thanh loading hoặc hiển thị thông báo lỗi rõ ràng thay vì đơ kẹt màn hình ở 0% hay % giữa chừng.
- Đảm bảo luồng chuyển trạng thái Game State Machine (ví dụ: LOADING -> MENU -> PLAYING) KHÔNG BAO GIỜ bị chặn đứng bởi một ngoại lệ JavaScript unhandled.

--------------------------------------------------
📌 RULE 3: ĐẢM BẢO TƯƠNG TÁC GIAO DIỆN UI (UI OVERLAY & POINTER EVENTS)
- Tất cả các cụm điều khiển UI cố định trên màn hình (Top-Left, Top-Right, Top-Center) PHẢI luôn được gán `z-index` đủ cao (ví dụ: `z-index: 1000;`) và `pointer-events: auto !important` để không bị lớp phủ Canvas 3D hoặc backdrop ẩn che mất tương tác click.
- Khi ẩn/hiện các Panel/Modal UI (Menu, History, Jukebox), phải quản lý rõ ràng thuộc tính CSS `display` (flex/block/none) và `pointer-events` tương ứng.

--------------------------------------------------
📌 RULE 4: NGUYÊN TẮC BẢO BẰNG VÀ KIỂM TRA MÃ NGUỒN (REGRESSION TESTING & IMPACT AUDIT)
- Mỗi khi nâng cấp hoặc sửa đổi một tính năng mới (ví dụ: Audio, Asset, UI), PHẢI rà soát toàn bộ file liên quan (như `Game.js`, `UIManager.js`, `AudioManager.js`) để đảm bảo KHÔNG làm gãy các luồng khởi tạo (init) cũ.
- Giữ mã nguồn mô-đun hóa sạch sẻ, tách biệt giữa logic tính toán render 3D và logic tương tác DOM UI.