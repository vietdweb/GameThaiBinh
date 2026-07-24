# Kế hoạch Phát triển chi tiết - Thái Bình Rush

Tài liệu này vạch ra lộ trình phát triển chi tiết từng bước cho dự án game **Thái Bình Rush**. Kế hoạch được chia thành 6 giai đoạn (Phases) tuần tự, từ khâu thiết lập ban đầu cho đến khi hoàn thiện sản phẩm sẵn sàng ra mắt, đi kèm checklist công việc cụ thể cho lập trình viên.

---

## Phase 1: Thiết lập Dự án & Khung cảnh 3D Cơ bản
**Mục tiêu:** Thiết lập môi trường build, cấu trúc thư mục dự án và hiển thị được một scene 3D cơ bản sử dụng Three.js.

### Checklist công việc chi tiết
- [x] **Task 1.1: Khởi tạo Dự án Vite & Cấu trúc Thư mục**
  - [x] Chạy lệnh khởi tạo Vite project với mẫu Vanilla JS (`npm create vite@latest ./ -- --template vanilla`).
  - [x] Thiết lập file `package.json` và cài đặt thư viện Three.js (`npm install three`).
  - [x] Tạo cấu trúc cây thư mục mã nguồn đầy đủ:
    - Thư mục logic: `src/core/`, `src/entities/`, `src/managers/`, `src/utils/`.
    - Thư mục tài nguyên: `public/models/`, `public/textures/`, `public/audio/`.
  - [x] Tạo file cấu hình Vite (`vite.config.js`) cơ bản để xử lý tối ưu assets tĩnh.
- [x] **Task 1.2: Xãy dựng Giao diện Trang chủ (HTML & CSS)**
  - [x] Tạo file `index.html` chứa thẻ `<canvas id="game-canvas">` toàn màn hình.
  - [x] Tạo cấu trúc các thẻ `div` lớp phủ giao diện (UI Overlays) lồng ghép đè lên Canvas bao gồm:
    - Màn hình tải tài nguyên (Loading Screen).
    - Menu chính (Main Menu) với nút Chơi ngay và Chọn nhân vật.
    - Giao diện chơi game (HUD) hiển thị điểm, số cà phê sữa đá, thanh Fever.
    - Màn hình Game Over hiển thị điểm số, nút Chơi lại và nút Trang chủ.
  - [x] Viết file CSS (`src/style.css`) định dạng các UI Overlays xếp chồng bằng `position: absolute` và thiết kế giao diện thích ứng (responsive) trên cả máy tính lẫn điện thoại.
  - [x] Nhập (Import) font chữ tiếng Việt hiện đại từ Google Fonts (ví dụ: 'Outfit' hoặc 'Inter') để hiển thị chữ đẹp mắt.
- [x] **Task 1.3: Khởi tạo Engine Game & Scene 3D Ban đầu**
  - [x] Viết lớp `src/core/SceneManager.js` để khởi tạo `THREE.WebGLRenderer` (kích hoạt khử răng cưa `antialias`, hỗ trợ đổ bóng `shadowMap`, định dạng màu sắc `sRGBColorSpace`).
  - [x] Khởi tạo `THREE.PerspectiveCamera` và thiết lập vị trí camera nhìn chéo góc từ trên xuống đường chạy.
  - [x] Thiết lập hệ thống ánh sáng: `THREE.AmbientLight` chiếu sáng dịu môi trường và `THREE.DirectionalLight` định hướng tạo bóng đổ sắc nét cho nhân vật/vật cản.
  - [x] Viết hàm tự động cập nhật tỷ lệ khung hình (`onWindowResize`) khi người chơi thay đổi kích thước trình duyệt hoặc xoay màn hình điện thoại.
  - [x] Viết lớp quản lý chính `src/core/Game.js` điều phối vòng lặp `requestAnimationFrame` và tính toán lượng chênh lệch thời gian `deltaTime` giữa các khung hình để đảm bảo chuyển động mượt mà.
  - [x] Cài đặt công cụ debug camera `THREE.OrbitControls` (chỉ kích hoạt ở chế độ phát triển/debug) giúp lập trình viên dễ dàng quan sát scene.

---

## Phase 2: Hệ thống Di chuyển Nhân vật (Bản thử nghiệm Prototype)
**Mục tiêu:** Hiện thực hóa cơ chế di chuyển theo làn của game endless runner bằng các hình khối giả định (cube/sphere placeholder).

### Checklist công việc chi tiết
- [x] **Task 2.1: Tạo Đối tượng Nhân vật & Render Cơ bản**
  - [x] Tạo file `src/entities/Player.js` chứa class `Player` đóng gói nhóm đối tượng `THREE.Group`.
  - [x] Tạo một hình hộp lập phương tạm thời bằng `THREE.BoxGeometry` và `THREE.MeshBasicMaterial` để làm đại diện cho nhân vật chạy.
  - [x] Viết hàm đưa Mesh của nhân vật vào trong Scene chính và định vị nhân vật nằm trên mặt đất.
- [x] **Task 2.2: Lập trình Điều khiển Bàn phím & Chuyển làn**
  - [x] Khai báo các hằng số tọa độ làn đường trong `src/utils/Constants.js` (ví dụ: `LANE_LEFT = -3`, `LANE_CENTER = 0`, `LANE_RIGHT = 3`).
  - [x] Lắng nghe sự kiện bàn phím `keydown` để bắt các phím di chuyển: phím A/D hoặc các mũi tên Trái/Phải.
  - [x] Lập trình logic chuyển làn: Khi bấm chuyển làn, thay đổi làn mục tiêu của nhân vật (giới hạn từ làn Trái ngoài cùng đến làn Phải ngoài cùng).
  - [x] Trong hàm `update(deltaTime)`, sử dụng hàm nội suy `THREE.MathUtils.lerp` để di chuyển tọa độ X của nhân vật từ vị trí hiện tại đến tọa độ X của làn mục tiêu một cách mượt mà.
- [x] **Task 2.3: Xử lý cơ chế Nhảy và Trượt**
  - [x] Thiết lập các biến trạng thái cho nhân vật: `isJumping` (đang nhảy), `isSliding` (đang trượt), `velocityY` (vận tốc trục đứng).
  - [x] Bắt các phím điều khiển Nhảy (phím W / Mũi tên Lên) và Trượt (phím S / Mũi tên Xuống).
  - [x] **Logic Nhảy:** Khi kích hoạt nhảy và nhân vật đang ở trên mặt đất (`isJumping === false`), gán vận tốc nhảy `velocityY = jumpForce`. Trong hàm update, liên tục giảm `velocityY` bởi trọng lực `gravity * deltaTime`, cộng dồn vào tọa độ Y của nhân vật. Khi nhân vật rơi chạm đất (tọa độ Y <= 0), gán lại Y = 0 và kết thúc trạng thái nhảy.
  - [x] **Logic Trượt:** Khi kích hoạt trượt (và nhân vật không ở trạng thái nhảy), đặt `isSliding = true`. Thu nhỏ chiều cao của Mesh nhân vật đi một nửa (ví dụ chỉnh `scale.y = 0.5`) và hạ tọa độ Y xuống một chút để mô phỏng động tác khom người. Sử dụng đếm thời gian (timer) để sau khoảng 0.8 giây sẽ khôi phục lại tỷ lệ chiều cao nhân vật ban đầu và gán lại `isSliding = false`.

---

## Phase 3: Đường chạy Vô tận & Tạo Chướng ngại vật
**Mục tiêu:** Xây dựng hệ thống đường chạy tự động lặp lại và phân bổ ngẫu nhiên chướng ngại vật trên các làn.

### Checklist công việc chi tiết
- [x] **Task 3.1: Hệ thống đường chạy lặp vô tận (Repeating Road)**
  - [x] Tạo file `src/entities/Environment.js` để quản lý các đoạn đường chạy vỉa hè.
  - [x] Định nghĩa kích thước tiêu chuẩn cho một đoạn đường chạy (ví dụ độ dài dọc trục Z là `TILE_LENGTH = 40`).
  - [x] Tạo một mảng lưu trữ 3-4 Mesh đoạn đường và xếp liền kề nối đuôi nhau dọc theo trục âm Z phía trước camera.
  - [x] Trong hàm `update`, di chuyển toàn bộ các đoạn đường này lùi về phía sau camera (cộng tọa độ Z của các đoạn đường) dựa theo tốc độ chạy của game.
  - [x] Khi một đoạn đường trôi ra hoàn toàn phía sau camera (vượt quá khoảng cách quy định), dịch chuyển đoạn đường đó lên đầu hàng đợi phía xa nhất phía trước camera để tạo vòng lặp đường vô tận.
- [x] **Task 3.2: Thiết kế & Quản lý Chướng ngại vật (Obstacle Manager)**
  - [x] Tạo lớp cơ sở `src/entities/Obstacle.js` quản lý vị trí làn đường, Mesh đại diện và thông số hộp va chạm.
  - [x] Tạo các lớp chướng ngại vật cụ thể kế thừa từ lớp cơ sở:
    - `Roadblock` (lô cốt công trình tầm thấp, người chơi phải nhảy qua).
    - `Barrier` (dây cáp/rào cản tầm cao, người chơi phải trượt dưới).
    - `VendorCart` (xe bán bánh mì/hủ tiếu chặn làn đường thường).
  - [x] Lập trình thuật toán sinh chướng ngại vật ngẫu nhiên ở khoảng cách xa phía trước camera (Z âm). Đảm bảo mỗi lượt sinh vật cản luôn tồn tại ít nhất 1 làn đường trống để người chơi tránh được (không tạo chướng ngại vật chặn kín cả 3 làn đồng thời).
  - [x] Hiện thực hóa cơ chế giải phóng bộ nhớ (Garbage Collection): Khi chướng ngại vật trôi qua hoàn toàn phía sau camera, xóa chúng khỏi Scene và giải phóng tài nguyên.
- [x] **Task 3.3: Chướng ngại vật di động (Phương tiện giao thông)**
  - [x] Thiết kế chướng ngại vật dạng xe máy hoặc xe buýt di động di chuyển ngược chiều hoặc cùng chiều với nhân vật.
  - [x] Trong hàm `update` của chướng ngại vật di động, cộng dồn thêm vận tốc chạy riêng của xe đó vào vị trí Z của nó để xe di chuyển trên làn đường một cách sinh động.

---

## Phase 4: Tích hợp Tài nguyên Đồ họa Low-Poly
**Mục tiêu:** Import các mô hình 3D thực tế và gán hoạt ảnh (animations) để tạo không khí đường phố Thái Bình sinh động.

### Checklist công việc chi tiết
- [x] **Task 4.1: Hệ thống Quản lý Tải Tài nguyên & Pipeline Model 3D (Asset Loader)**
  - [x] Tạo module `ModelPipelineManager.js` ([ModelPipelineManager.js](file:///d:/JOB-Ngoai/GAMETULAM/src/managers/ModelPipelineManager.js)) sử dụng `GLTFLoader` và `THREE.LoadingManager` quản lý tiến trình tải 100%.
  - [x] Cấu hình duyện mesh `gltf.scene.traverse`: Bật `castShadow` & `receiveShadow`, ép thuộc tính chất liệu PBR ban đêm (`roughness: 0.7`, `metalness: 0.1`, `DoubleSide`) triệt tiêu hiện tượng bóng như nhựa.
  - [x] Xây dựng thuật toán Clone chính xác: Phân biệt mô hình tĩnh (`model.clone()`) và mô hình nhân vật có xương (`SkeletonUtils.clone()`).
  - [x] Viết hàm `spawnRealModel(modelKey, zOffset, side)` phân bố ngẫu nhiên vị trí vỉa hè, tỉ lệ (0.9 - 1.1) và góc xoay 360°.

- [x] **Task 4.2: Chuẩn bị Kho Tài nguyên Cục bộ (Local Assets)**
  - [x] Sưu tầm các mô hình 3D phong cách low-poly gọn nhẹ, phù hợp cho game web dạng `.glb` lưu vào thư mục `public/models/` (AssetManager có fallback sang procedural model nếu thiếu file GLB).
- [x] **Task 4.3: Tích hợp & Gán hoạt ảnh cho Nhân vật**
  - [x] Nạp mô hình nhân vật GLB đã load vào lớp `Player.js` thay thế cho hình hộp tạm thời của Phase 2 (có fallback procedural).
  - [x] Khởi tạo AssetManager với GLTFLoader hỗ trợ tải GLTF/GLB async.
- [x] **Task 4.4: Trang trí Cảnh quan Đường phố Thái Bình**
  - [x] Đặt ngẫu nhiên các mô hình nhà ống cổ kính, cột đèn đường lên lề đường hai bên của từng đoạn đường tile chạy vô tận.
  - [x] Nạp và rải 100% mô hình Cây Phong 3D GLB thực tế (`maple_tree.glb`) hai bên vỉa hè (`X = ±6.2m`), tự động căn chỉnh tỷ lệ 4.2m thoáng mát tầm nhìn camera và tối ưu 60 FPS.

---

## Phase 5: Logic Game, Điểm số & Chế độ Fever Mode
**Mục tiêu:** Lập trình chi tiết các cơ chế va chạm, tính điểm và bộ tăng tốc Fever Mode độc đáo dựa trên lượng cafe nhặt được.

### Checklist công việc chi tiết
- [x] **Task 5.1: Tạo & Rải Ly Cà phê sữa đá**
  - [x] Tạo lớp `src/entities/Collectible.js` quản lý mô hình ly cà phê sữa đá xoay quanh trục Y trong màn chơi.
  - [x] Thiết lập thuật toán rải cà phê tự động: Sinh các cụm 1-2 ly cà phê liên tiếp trên cùng làn đường.
- [x] **Task 5.2: Phát hiện Va chạm (Collision Detection)**
  - [x] Viết lớp quản lý va chạm `src/managers/CollisionManager.js`.
  - [x] Gán các hộp bao va chạm `THREE.Box3` (AABB) ôm khít quanh mô hình Player và chướng ngại vật.
  - [x] **Logic va chạm nhặt cà phê:** Kiểm tra sphere collision, khi nhân vật trong bán kính thu thập sẽ tự động nhặt ly cà phê.
  - [x] **Logic va chạm chướng ngại vật:** Nếu giao cắt AABB với chướng ngại vật thường → Game Over; nếu Fever Mode → đâm văng vật cản cộng 300 điểm.
- [x] **Task 5.3: Hệ thống Tăng tốc theo Từng mốc**
  - [x] Thiết lập công thức tăng tốc độ game trong Game.js: Cứ mỗi 10 ly cà phê tăng 1 bậc tốc độ.
- [x] **Task 5.4: Kịch bản Fever Mode**
  - [x] Thanh năng lượng Fever Gauge: Mỗi ly cà phê sạc 10%, đủ 100% tự động kích hoạt Fever Mode.
  - [x] Trong trạng thái `FEVER`: tốc độ gấp 1.5x, bất tử đâm văng chướng ngại vật, nam châm hút ly cà phê.
  - [x] Bộ đếm thời gian Fever Mode 7 giây, sau đó trả về trạng thái PLAYING.
  - [x] Phản hồi trực quan: Zoom camera FOV + hệ thống hạt bụi gió Fever particles.

---

## Phase 6: Giao diện UI, Âm thanh & Tối ưu hóa Hoàn thiện
**Mục tiêu:** Thiết lập các màn hình UI hoàn chỉnh, nhạc nền, tích hợp thiết bị di động và tối ưu hiệu năng chạy thực tế.

### Checklist công việc chi tiết
- [x] **Task 6.1: Khung UI Giao diện & Quản lý Trạng thái Game**
  - [x] Hiện thực hóa máy quản lý trạng thái `src/managers/StateMachine.js` quản lý vòng đời game: `MENU`, `PLAYING`, `FEVER`, `GAMEOVER`.
  - [x] Liên kết các sự kiện thay đổi trạng thái với việc ẩn/hiển thị các khung UI HTML tương ứng.
  - [x] Đồng bộ hiển thị HUD: Điểm số, thanh năng lượng Fever Gauge và số lượng ly cafe nhặt được cập nhật real-time.
  - [x] Sử dụng `window.localStorage` để lưu trữ và hiển thị điểm kỷ lục.
- [x] **Task 6.2: Tích hợp Hệ thống Âm thanh**
  - [x] Viết lớp `src/managers/AudioManager.js` tổng hợp âm thanh procedural qua Web Audio API (không cần file .mp3).
  - [x] BGM nhạc nền với melody pentatonic Việt Nam, thay đổi tempo khi vào Fever Mode.
  - [x] SFX đầy đủ: tiếng chuyển làn, nhảy, trượt, nhặt cà phê, kích hoạt Fever, đâm vỡ, Game Over.
  - [x] Nút tắt/bật âm thanh trên Menu và HUD.
- [x] **Task 6.3: Tương thích Di động & Tối ưu hóa Hiệu năng**
  - [x] Lập trình bộ lắng nghe sự kiện cảm ứng `touchstart`/`touchend` để nhận diện vuốt Trái/Phải/Lên/Xuống.
  - [x] Cơ chế dọn dẹp bộ nhớ: Giải phóng Mesh, Geometry, Material khi xóa obstacle/collectible.
  - [x] Cap `deltaTime` ở 50ms để tránh physics bug khi tab bị unfocus.

---

## Phase 7: Power-ups Việt Nam & Hệ thống Chọn Nhân vật (Skins)
**Mục tiêu:** Hoàn thiện các tính năng Power-ups độc đáo và Carousel chọn nhân vật theo yêu cầu trong tài liệu PRD.md.

### Checklist công việc chi tiết
- [x] **Task 7.1: Định nghĩa cấu hình hằng số cho Power-ups & Character Skins**
  - [x] Bổ sung `POWERUP_TYPES` (`SHIELD`, `DOUBLE_SCORE`, `BOOST`), `POWERUP_CONFIG` và `CHARACTERS` `BARISTA`) trong `src/utils/Constants.js`.
- [x] **Task 7.2: Hệ thống Chọn Nhân vật & Skin Models**
  - [x] Xây dựng 3 mô hình 3D xe & trang phục low-poly độc đáo trong `Player.js`: Anh Shipper Công Nghệ (Scooter xanh), Nữ Sinh Áo Dài (Vespa trắng), Anh Chàng Barista (Scooter nâu hoài cổ).
  - [x] Tích hợp hiệu ứng Giáp Nón Lá 3D xoay mượt mà với hào quang vàng kim bao quanh nhân vật.
- [x] **Task 7.3: Mở rộng Collectibles cho 3D Power-ups**
  - [x] Xây dựng 3D Mesh cho Giáp Nón Lá (Cone 3D), Bánh Mì X2 (Bánh mì vàng giòn) và Xe Ôm Boost (Xe máy đỏ phóng tốc) trong `src/entities/Collectible.js`.
- [x] **Task 7.4: Tích hợp SFX cho Power-ups**
  - [x] Thêm âm thanh nhặt Power-up ngân vang, vỡ giáp Nón Lá giòn tan trong `src/managers/AudioManager.js`.
- [x] **Task 7.5: Quản lý Logic Power-ups & Carousel UI**
  - [x] Lập trình Carousel nút Prev/Next chọn nhân vật tại Menu chính, tự động lưu lựa chọn vào `localStorage`.
  - [x] Lập trình đỡ đạn bằng Giáp Nón Lá (nếu có giáp thì đâm chướng ngại vật sẽ vỡ giáp thay vì Game Over).
  - [x] Hiển thị Power-up status badges đếm ngược trên HUD (`#active-powerups`).

---

## Phase 8: Nâng cấp Kỹ thuật Đồ họa Luồng Sáng Đèn Đường & Vật Phẩm X2 Hồng Neon
**Mục tiêu:** Sửa triệt để lỗi luồng sáng đục sệt bằng Custom Vertical Fade Shader, thu gọn chao đèn và đồng bộ emissive hồng neon cho item X2.

### Checklist công việc chi tiết
- [x] **Task 8.1: Shader Luồng Sáng Mờ Mịn `createStylizedStreetlight()`**
  - [x] Thiết kế máng đèn nhỏ gọn thanh mảnh (`0.08m` x `0.16m` x `0.12m`).
  - [x] Viết Custom `ShaderMaterial` với Vertical Alpha Gradient Fade Out (`vY` mờ dần từ `0.12` xuống `0.0`).
  - [x] Cấu hình `THREE.AdditiveBlending`, `depthWrite: false`, `transparent: true`, `side: THREE.DoubleSide`, màu `0xfffee0`.
- [x] **Task 8.2: Đồng bộ Item X2 Hồng Neon Phát Sáng (`createDoubleScoreItem`)**
  - [x] Chất liệu `MeshStandardMaterial` với `emissive: 0xff00ff` & `emissiveIntensity: 0.5` tự phát sáng rực rỡ trong đêm.
  - [x] Quản lý `setBoostEffectActive(false)` và `dispose()` đặt `visible = false` và `scene.remove()` triệt để.

---

## Phase 9: Khôi Phục Nhân Vật Sau Boost & Ổ Bánh Mì Thái Bình X2 3D Chân Thực
**Mục tiêu:** Khôi phục 100% trang phục/mô hình mặc định của người chơi sau khi hết thời gian tăng tốc và thiết kế lại vật phẩm X2 thành Mô hình 3D Ổ Bánh Mì Thái Bình chân thực.

### Checklist công việc chi tiết
- [x] **Task 9.1: Khôi Phục Trang Phục & Màu Sắc Nhân Vật (`restoreOriginalSkin`)**
  - [x] Tự động lưu `originalColor`, `originalEmissive`, `originalScale` trên từng Mesh khi khởi tạo Skin trong `Player.js`.
  - [x] Viết hàm `restoreOriginalSkin()` trả lại màu sắc và trang phục ban đầu cho người chơi ngay khi hết 8 giây Boost / Fever Mode.
- [x] **Task 9.2: Mô Hình 3D Ổ Bánh Mì Thái Bình X2 Chân Thực (`createDoubleScoreItem`)**
  - [x] Vỏ bánh mì 3D nướng vàng ươm (`0xffa726`) với 3 rãnh rạch bánh mì giòn rụm.
  - [x] Nhân bánh 3D đầy đặn: giò lụa hồng nhạt (`0xf48fb1`), thịt nguội đỏ (`0xef5350`), dưa leo & hành ngò xanh tươi (`0x66bb6a`), lát ớt đỏ rực tươi giòn (`0xff1744`).
  - [x] Huy hiệu "X2" hồng/tím neon (`0xff00ff`, `emissiveIntensity: 0.85`) lơ lửng xoay 360° phía trên.

---

## Phase 12: Thêm Nhân Vật Thứ 4 "Đại Gia Đi Ô Tô" (LAMBORGHINI)
**Mục tiêu:** Bổ sung lựa chọn nhân vật thứ 4 đi xe Ô tô 3D thể thao sang trọng kèm hiệu ứng perk +20% điểm số tổng.

### Checklist công việc chi tiết
- [x] **Task 12.1: Cấu hình `Constants.js` & Avatar UI (`style.css`)**
  - [x] Thêm `LAMBORGHINI` với tên "Đại Gia Đi Ô Tô" & perk `scoreMultBonus: 1.2`.
  - [x] Thêm class CSS `.character-avatar.LAMBORGHINI-skin` với icon biểu tượng 🚗.
- [x] **Task 12.2: Lập trình Mô Hình 3D Ô Tô & Quý Ông Lái Xe (`Player.js`)**
  - [x] Thân xe sedan/coupe 3D mượt mà màu xanh navy ánh kim (`0x0d47a1`, `metalness: 0.85`), lưới tản nhiệt mạ vàng và kính chắn gió mờ.
  - [x] 4 bánh xe cao su mâm mạ crom và hệ thống đèn LED pha trắng + đèn hậu đỏ.
  - [x] Nhân vật Quý ông mặc vest xanh thắt cà vạt đỏ đeo kính râm đen ngầu ngồi sau tay lái.

---

## Phase 13: Tích Hợp Snippet Three.js Vào Nhân Vật Anh Chàng Barista
**Mục tiêu:** Tích hợp đoạn code duyệt mesh GLTF & thiết lập thuộc tính vật liệu metallic (`metalness: 1.0`, `roughness: 0.2`, `opacity: 0.8`) từ snippet mẫu của người dùng vào nhân vật Anh Chàng Barista.

### Checklist công việc chi tiết
- [x] **Task 13.1: Nạp GLTF Model Barista & Duyệt Mesh Traversal**
  - [x] Tải mô hình GLTF Barista thông qua `AssetManager`.
  - [x] Gán `metalness = 1.0`, `roughness = 0.2` cho `vanguard_Mesh` và `metalness = 1.0`, `opacity = 0.8` cho các phụ kiện.
  - [x] Căn chỉnh chiều cao chuẩn 1.6m và hạ chân chạm đúng Y = 0.
- [x] **Task 13.2: Nâng Cấp Vật Liệu procedural Barista (`_buildBaristaSkin`)**
  - [x] Áp dụng thuộc tính `metalness: 1.0`, `roughness: 0.2` & `opacity: 0.8` sáng bóng cho xe tay ga Barista.

---

## Phase 14: Thiết Kế Lại 100% Mô Hình 3D Barista Vespa Chi Tiết
**Mục tiêu:** Thay thế mô hình hình hộp đơn điệu cũ bằng mô hình Xe Tay Ga Vespa Nâu Cổ Điển chở khay 3 ly Cà Phê phía sau kết hợp nhân vật Barista mặc áo sơ mi trắng + tạp dề da nâu + mũ nồi Beret nghiêng.

### Checklist công việc chi tiết
- [x] **Task 14.1: Mô Hình Xe Vespa Nâu Cổ Điển & Khay Cà Phê (`_buildBaristaSkin`)**
  - [x] Thân xe Vespa mượt mà màu nâu cà phê bóng mạ kim loại (`0x5d4037`), nẹp crom mạ bóng, đèn pha LED tròn và 2 gương chiếu hậu mạ crom.
  - [x] Yên xe da màu kem (`0xd7ccc8`) chở khay 3 ly Cà Phê sữa đá takeaway phát sáng phía sau.
- [x] **Task 14.2: Nhân Vật Barista Phong Cách 3D**
  - [x] Áo sơ mi trắng cổ cồn (`0xf5f5f5`) phối Tạp dề da da nâu (`0x4e342e`) có dây quàng chéo vai.
  - [x] Cánh tay vươn nắm ghi-đông, đầu có kính cận, tóc uốn xoăn và mũ nồi Beret nghiêng phong cách Pháp (`0x1a237e`).

---

## Phase 15: Tối Ưu Phối Màu Sơn Xe Rực Rỡ & Nổi Bật Ban Đêm
**Mục tiêu:** Cập nhật màu sơn xe Ô tô thể thao và xe Vespa Barista sang tông màu sáng rực rỡ, giúp nổi bật 100% trên nền đường nhựa ban đêm.

### Checklist công việc chi tiết
- [x] **Task 15.1: Đổi Màu Sơn Xe Ô Tô Thể Thao (`_buildCarDriverSkin`)**
  - [x] Chuyển màu thân xe sang Đỏ Sportscar Rực Rỡ (`0xff1744`, `emissive: 0xd50000`) phối lưới tản nhiệt mạ vàng kim (`0xffd600`).
- [x] **Task 15.2: Đổi Màu Sơn Xe Vespa Barista (`_buildBaristaSkin`)**
  - [x] Chuyển màu thân xe Vespa sang Vàng Kem Caramel Tươi Tắn (`0xffb300` / `0xffca28`).

---

## Phase 18: Nâng Cấp Hệ Thống Chướng Ngại Vật & Platforming Nóc Xe
**Mục tiêu:** Phân loại 3 nhóm chướng ngại vật (Thấp - Nhảy qua, Cao - Cúi qua, Dài & Phẳng - Chạy trên nóc) và viết lớp `ObstacleManager` xử lý va chạm AABB +Platforming.

### Checklist công việc chi tiết
- [x] **Task 18.1: Phân Loại Chướng Ngại Vật (`OBSTACLE_CATEGORIES`)**
  - [x] Thấp (`LOW`): Roadblock, CargoCrate (Buộc Nhảy qua, Cúi xuống sẽ bị đâm).
  - [x] Cao (`HIGH`): Barrier, TrafficSign (Buộc Cúi xuống, Nhảy hoặc Đứng sẽ bị đâm).
  - [x] Dài & Phẳng (`LONG_PLATFORM`): Bus, Double Decker, Bike, VendorCart (Có thể Nhảy lên và CHẠY TRÊN NÓC XE).
- [x] **Task 18.2: Viết Lớp `ObstacleManager.js` & Xử Lý Va Chạm Nâng Cao**
  - [x] Khởi tạo `src/managers/ObstacleManager.js` phân bổ ngẫu nhiên 3 loại chướng ngại vật và đảm bảo luôn còn ít nhất 1 làn đường trống.
  - [x] Bounding Box nhân vật khi Cúi xuống (Crouch) thu nhỏ 50% Y (từ 1.6m -> 0.8m).
  - [x] Bounding Box vật thể Cao giữ khoảng trống Y < 1.1m bên dưới để người chơi trượt chui qua an toàn.
  - [x] Kiểm tra tiếp đất `player.y >= roofY` và kẹp vị trí Y khi chạy trên nóc ô tô. Tự động rơi tự do theo trọng lực khi chạy qua hết chiều dài xe.

---

## Phase 19: Đồ Họa AAA Realism, 2 Xe Bus Hà Nội 3.4m & Giày Nhảy Cao Neon
**Mục tiêu:** Nâng cấp đồ họa đêm rực rỡ qua EffectComposer Bloom Pass, ACESFilmicToneMapping, đường nhựa ướt PBR, bổ sung 2 mẫu Xe Bus Hà Nội & VinBus cao 3.4m và Vật phẩm Giày Nhảy Cao Neon.

### Checklist công việc chi tiết
- [x] **Task 19.1: Đồ Họa Đêm Rực Rỡ (Post-processing & PBR Materials)**
  - [x] Cấu hình `EffectComposer` với `UnrealBloomPass` trong `SceneManager.js` tạo hiệu ứng phát sáng rực rỡ cho đèn pha xe, biển LED và vật phẩm.
  - [x] Bật `ACESFilmicToneMapping` và `PCFSoftShadowMap` đổ bóng mịn.
  - [x] Nâng cấp mặt đường nhựa ướt đêm mưa PBR (`roughness: 0.35`, `metalness: 0.18`) bắt phản xạ ánh đèn đường.
- [x] **Task 19.2: Thay Thế Chướng Ngại Vật Xanh Công Cộng PBR**
  - [x] Loại bỏ khối vuông xanh đơn điệu. Thay thế bằng Cụm Thùng Rác Công Cộng Xanh PBR (`BlueTrashCanCluster`) có nắp, bánh xe, tay nắm và độ bóng nhựa phản quang.
- [x] **Task 19.3: Tích Hợp 2 Mô Hình Xe Bus Hà Nội & VinBus (Cao 3.4m)**
  - [x] Mẫu 1: Xe Bus Hà Nội truyền thống Xanh - Vàng (`VEHICLE_HANOI_BUS`) cao 3.4m có biển hiệu tuyến "BUS HÀ NỘI".
  - [x] Mẫu 2: Xe Buýt Điện VinBus Xanh Lá Đậm (`VEHICLE_VINBUS`) cao 3.4m có dải LED Cyan phát sáng rực rỡ.
  - [x] Bounding Box cao 3.4m chặn đứng mọi cú nhảy thường từ mặt đất, chỉ cho phép chạy trên nóc khi đáp từ trên cao hoặc dùng Giày Nhảy Cao.
- [x] **Task 19.4: Vật Phẩm Giày Nhảy Cao Neon Phản Lực (`HIGH_JUMP`)**

---

## Phase 20: Tích Hợp Siêu Xe Lamborghini 3D, Group Pivot Wrapper & Tối Ưu 60 FPS
**Mục tiêu:** Đưa mô hình `lamborghini.glb` làm Siêu Xe Player trực tiếp điều khiển, khắc phục triệt để lỗi xe lộn nhào bằng Group Pivot Wrapper Pattern, sửa đầu xe hướng chuẩn và tối ưu mượt mà 60 FPS.

### Checklist công việc chi tiết
- [x] **Task 20.1: Đăng Ký Mô Hình Lamborghini (`AssetManager.js`)**
  - [x] Nạp `lamborghini.glb` vào game.
- [x] **Task 20.2: Cấu Trúc Bọc Bánh Xe Group Pivot Wrapper Pattern (`Player.js`)**
  - [x] Trích xuất 4 bánh xe (`Object_36`, `Object_37`, `Object_38`, `Object_39`) DUY NHẤT 1 LẦN trong callback `buildCharacterSkin()`.
  - [x] Bọc từng Mesh bánh xe vào một `THREE.Group` Pivot tại vị trí gốc của bánh xe, đưa Mesh bánh xe về tâm (0,0,0) của Group.
  - [x] Phân tách chuyển động: Dùng `wheelMesh.rotateX(rollDelta)` trên Mesh bánh xe bên trong để quay tròn tít mù, và dùng `frontPivot.rotation.y = steerAngle` trên Group cha của 2 bánh trước để bẻ lái rẽ. Triệt tiêu 100% lỗi lộn nhào xe.
- [x] **Task 20.3: Khắc Phục Lỗi Lag GLB 12MB & Tối Ưu 60 FPS**
  - [x] Chuyển toàn bộ 20 vật liệu từ `doubleSided = true` sang `FrontSide` giúp giảm 50% số lượng polygon render trên GPU.
  - [x] Tắt `transparent = true` và bật `depthWrite = true` trên các bộ phận khung xe/bánh xe không phải kính để triệt tiêu lỗi lag do depth-sorting.
  - [x] Tuyệt đối không gọi `model.traverse()` trong vòng lặp render `update()`, duy trì 60 FPS ổn định.
- [x] **Task 20.4: Sửa Hướng Đầu Xe Hướng Về Phía Trước**
  - [x] Cấu hình `carModel.rotation.y = 0;` để đầu xe và đèn pha hướng về phía trước (-Z) theo chiều chạy đường phố.

---

## Phase 21: Nâng Cấp Hệ Thống Âm Thanh AAA (Audio System & Sound Settings)
**Mục tiêu:** Triển khai Audio Control Panel glassmorphism góc trái trên, Volume Slider slide-in, Jukebox chọn 3 track BGM với fade transition, và localStorage persistence theo chuẩn game mobile AAA.

### Checklist công việc chi tiết
- [x] **Task 21.1: AudioManager v2 (`src/managers/AudioManager.js`)**
  - [x] Thêm 3 BGM tracks procedural: `track_1` Pentatonic VN (120 BPM), `track_2` Night City Synthwave (130 BPM), `track_3` Cyberpunk Run (140 BPM).
  - [x] API `setMasterVolume(v)` - điều chỉnh master gain real-time.
  - [x] API `setMuted(bool)` / `toggle()` - Mute/Unmute với fade.
  - [x] API `selectTrack(trackId)` - chuyển bài với Fade-out 400ms → Fade-in 500ms mượt mà.
  - [x] API `duckVolume(ratio, fadeMs)` - Audio Ducking khi Game Over (giảm xuống 12%).
  - [x] API `restoreVolume(fadeMs)` - khôi phục volume bình thường.
  - [x] `saveSettings()` / `loadSettings()` - persist `sgr_audio_muted`, `sgr_audio_volume`, `sgr_audio_track` vào localStorage.
  - [x] BGM gain node riêng (`bgmGainNode`) tách biệt với SFX để fade độc lập.
- [x] **Task 21.2: Audio Control Panel UI (`index.html`)**
  - [x] Panel góc trái trên với 3 buttons: Mute Toggle, Volume, Jukebox.
  - [x] SVG icons cho sound-on và sound-off (gạch chéo đỏ khi muted).
  - [x] Volume Slider slide-in từ bên phải button khi click.
  - [x] Jukebox Modal với 3 track items, now-playing bar, waveform animations.
- [x] **Task 21.3: CSS Glassmorphism AAA (`src/style.css`)**
  - [x] `.audio-control-panel` - fixed góc trái, flex column.
  - [x] `.audio-btn` - glassmorphism hover bounce animation.
  - [x] `.mute-btn.muted` - viền đỏ, glow đỏ khi tắt tiếng.
  - [x] `.mute-ring-indicator` - pulse animation khi đang phát.
  - [x] `.volume-slider-wrap` - max-width transition slide-in/out.
  - [x] Custom range input neon vàng-cam với fill bar gradient.
  - [x] `.jukebox-modal` - overlay slide-up từ góc trái dưới.
  - [x] `.track-item.active` - gradient highlight + waveform animation.
  - [x] `.jukebox-disc-icon` - xoay 360° liên tục.
- [x] **Task 21.4: Game.js Integration (`src/core/Game.js`)**
  - [x] `_setupAudioControlPanel()` - kết nối event listeners đầy đủ.
  - [x] `_syncAudioPanelUI()` - đồng bộ UI với settings từ localStorage khi load game.
  - [x] `_updateJukeboxActiveTrack()` - cập nhật track active và now-playing label.
  - [x] `_setJukeboxOpen()` - toggle jukebox modal.
  - [x] MENU enter: nhạc tự phát nếu chưa phát (không restart).
  - [x] GAMEOVER enter: `duckVolume(0.12)` thay vì `stopBGM()`.
  - [x] PLAYING enter: `restoreVolume()` từ ducking.
  - [x] `startGame()`: nhạc tiếp tục phát mượt mà từ Menu → Gameplay.

---

## Phase 22: Hệ Thống Điều Khiển Di Động Độc Lập Cho Cửa Hàng 3D (`mobile.js`)
**Mục tiêu:** Phát triển riêng module `src/utils/mobile.js` hỗ trợ giao diện cảm ứng di động (Virtual Joystick 360° & Nút Hành Động) cho phép di chuyển nhân vật, trèo lên/xuống xe siêu xe, bật nhảy và quay camera 360° trong map Cửa Hàng 3D (`Shop3DScene`).

### Checklist công việc chi tiết
- [x] **Task 22.1: Module Quản Lý Điều Khiển Mobile (`src/utils/mobile.js`)**
  - [x] Viết lớp `MobileControls` tự động phát hiện thiết bị di động & màn hình cảm ứng.
  - [x] Thiết lập Cần gạt Analog Virtual Joystick 360° góc trái dưới với tính toán vector hướng di chuyển normalized `(dirX, dirZ)` và độ nhạy `intensity`.
  - [x] Xử lý Multi-touch linh hoạt: chạm vuốt nửa màn hình bên phải để xoay góc nhìn camera GTA 360°.
  - [x] Cụm nút hành động góc phải dưới: Nút Nhảy 🦘 (`Space`) và Nút Lái Xe 🏎️ (`[F]`).
- [x] **Task 22.2: Tích Hợp Vào Cửa Hàng 3D (`src/core/Shop3DScene.js`)**
  - [x] Khởi tạo `this.mobileControls = new MobileControls(this)`.
  - [x] Tự động bật `mobileControls.show()` khi vào Shop và `mobileControls.hide()` khi thoát Shop.
  - [x] Tích hợp vector di chuyển Joystick vào luồng vật lý đi bộ và bẻ lái siêu xe trong hàm `update(deltaTime)`.
  - [x] Đồng bộ trạng thái hiển thị nút Lái Xe khi đứng gần xe hoặc đang lái xe.
- [x] **Task 22.3: Định Dạng CSS Glassmorphism Neon (`src/style.css`)**
  - [x] Định dạng UI Joystick & Action Buttons glassmorphic cyan neon glow, `touch-action: none !important`, responsive trên điện thoại.

---

## Phase 23: Bảng Thông Tin Nhân Vật (Player Profile Modal) & HUD Level/EXP/Playtime
**Mục tiêu:** Xây dựng hệ thống HUD Level/EXP/Avatar góc trái và Bảng Thông Tin Nhân Vật (Player Profile Modal) phong cách Cyberpunk Glassmorphism 2 cột, tích hợp Playtime Tracker và quy gom toàn bộ CSS về `src/ui/styles/style.css`.

### Checklist công việc chi tiết
- [x] **Task 23.1: State Management & Playtime Tracker (`src/managers/PlayerManager.js`)**
  - [x] Quản lý Level, EXP, Base64 Avatar, Tên nhân vật, và Thời gian chơi tích lũy (`playtime`).
  - [x] Định dạng đồng hồ đếm `getFormattedPlaytime()` dạng `HH:MM:SS`.
- [x] **Task 23.2: HUD & Character Profile Modal UI (`src/ui/UIManager.js`)**
  - [x] HUD góc trái `player-hud-widget` click mở Modal Profile.
  - [x] Bảng Thông Tin Nhân Vật `profile-modal-card` thiết kế 2 cột Cyberpunk Glassmorphism (`backdrop-filter`, viền neon `#00f5d4`).
  - [x] Cột trái: Avatar lớn với nút "📸 Đổi ảnh đại diện" và Đổi tên nhân vật.
  - [x] Cột phải: Level big badge, thanh EXP, Đồng hồ thời gian chơi (Playtime Tracker), 6 ô Grid trang bị & chỉ số vật phẩm dự phòng.
  - [x] Nút Đóng `X` và nút "ĐỒNG Ý" ở footer.
- [x] **Task 23.3: Tích hợp Game Loop & EXP (`src/core/Game.js`)**
  - [x] Nhặt ly cà phê -> gọi `playerManager.addExp(25)` tăng EXP.
  - [x] Trạng thái PLAYING/FEVER -> tích lũy `playerManager.addPlaytime(deltaTime)`.
- [x] **Task 23.4: Quy gom Style CSS (`src/ui/styles/style.css`)**
  - [x] Quy gom toàn bộ style HUD và Profile Modal về `src/ui/styles/style.css`.

---

## Phase 24: Dọn Dẹp & Đồng Bộ CSS Toàn Dự Án (`src/style.css`)
**Mục tiêu:** Gom toàn bộ nội dung CSS từ các file CSS lẻ/tách biệt (`src/ui/styles/style.css`, `ui.css`) vào duy nhất một stylesheet chính `src/style.css`, dừng import các file trùng lặp cũ, và cập nhật sơ đồ cấu trúc thư mục dự án trong tài liệu kỹ thuật (`TECH_ARCHITECTURE.md`).

### Checklist công việc chi tiết
- [x] **Task 24.1: Gom toàn bộ CSS vào `src/style.css`**
  - [x] Hợp nhất 100% các selector từ `src/ui/styles/style.css` (Profile HUD, Level Badge, EXP Bar, Toast Level Up, Profile Modal 2-column, Playtime Clock, Inventory Grid) vào duy nhất file `src/style.css`.
- [x] **Task 24.2: Dọn dẹp & Ngừng import CSS cũ**
  - [x] Loại bỏ thẻ `<link rel="stylesheet" href="/src/ui/styles/style.css">` khỏi file `index.html`.
  - [x] Cập nhật phương thức `_injectStyleSheet()` trong `src/ui/UIManager.js` chuyển hướng tự động nạp duy nhất `/src/style.css`.
  - [x] Thay thế/Dọn dẹp các file CSS cũ `src/ui/styles/ui.css` và `src/ui/styles/style.css`.
- [x] **Task 24.3: Cập nhật Tài liệu Kiến trúc (`TECH_ARCHITECTURE.md`)**
  - [x] Cập nhật sơ đồ cây thư mục trong `TECH_ARCHITECTURE.md` ghi nhận `src/style.css` là file CSS đồng bộ duy nhất của dự án.

---

## Phase 25: Thiết Kế Đồng Bộ Cụm Nút Phụ Menu Chính (AAA Game Menu Form Redesign)
**Mục tiêu:** Chuẩn hóa toàn bộ 4 nút tính năng phụ của Menu chính (Xem Nhân Vật 360°, Cửa Hàng 3D, Showroom Lamborghini, Thành Phố 3D) về duy nhất một form thiết kế Cyberpunk Glassmorphic 2x2 Grid đẳng cấp game quốc tế.

### Checklist công việc chi tiết
- [x] **Task 25.1: Chuẩn hóa Cấu trúc HTML (`index.html`)**
  - [x] Chuyển đổi cụm 4 nút phụ từ kiểu tự do/inline thành cụm `.menu-secondary-grid` với cấu trúc chuẩn gồm: Container Icon (`sub-btn-icon-wrap`), Tiêu đề (`sub-btn-title`), và Mô tả tính năng (`sub-btn-desc`).
  - [x] Giữ nguyên 100% các ID gốc (`btn-view-360`, `btn-open-shop`, `btn-view-lamborghini`, `btn-open-city`) đảm bảo các hàm xử lý sự kiện trong JS vận hành chính xác.
- [x] **Task 25.2: Thiết kế Style Đồng bộ AAA Game Form (`src/style.css`)**
  - [x] Quy định kích thước đồng bộ 62px height, 16px corner radius, background kính mờ Cyberpunk (`backdrop-filter: blur(12px)`).
  - [x] Tích hợp hiệu ứng vệt sáng quét (Shimmer Sweep) và Micro-animation khi hover (`translateY(-3px)`, `scale(1.02)`).
  - [x] Phối dải màu Accent hài hòa nhưng cùng 1 form thiết kế: Cyan (Nhân vật 360°), Gold (Cửa hàng), Flame Orange (Lamborghini), Electric Cyan (Thành phố 3D).

---

## Phase 26: Thêm Icon Game (Favicon Web App Icon) Cho Trang Web
**Mục tiêu:** Tạo và tích hợp Icon Game (Favicon) chất lượng cao hiển thị trên tab trình duyệt web cho trò chơi **Thái Bình Rush**.

### Checklist công việc chi tiết
- [x] **Task 26.1: Thiết Kế & Khai Báo Favicon Vector (`public/favicon.svg`)**
  - [x] Thiết kế file vector SVG `public/favicon.svg` độ phân giải cao phong cách 3D Cyberpunk Racing Helmet & Năng lượng Sét Vàng - Xanh Neon.
- [x] **Task 26.2: Tích Hợp Vào Trang (`index.html`)**
  - [x] Thêm thẻ `<link rel="icon" type="image/svg+xml" href="/favicon.svg">` và `<link rel="shortcut icon" href="/favicon.svg">` trong `<head>` của `index.html`.

---

## Phase 27: Map 3D Máy Tính Retro CRT 90s & Màn Hình Tương Tác Windows 98 (`ComputerOfficeScene.js`)
**Mục tiêu:** Phát triển Map 3D mới `ComputerOfficeScene.js` dựng góc làm việc máy tính CRT cổ điển thập niên 90 (bàn gỗ, máy CRT, cốc cà phê khói bốc, hồ sơ, chậu cây) hỗ trợ cơ chế nhấn phím `E` để ngồi vào máy tính (Camera Zoom FPS mượt mà) / `ESC` đứng dậy, và hệ điều hành Retro Windows 98 tương tác $100\%$ (mở file, chơi Dò Mìn, xem thông số siêu xe, duyệt web).

### Checklist công việc chi tiết
- [x] **Task 27.1: Dựng Scene 3D Góc Làm Việc Văn Phòng (`src/core/ComputerOfficeScene.js`)**
  - [x] Dựng hình khối 3D bàn gỗ, máy tính CRT dày thập niên 90, bàn phím, chuột, cốc cà phê khói nghi ngút, đống tài liệu & chậu cây cảnh.
  - [x] Ánh sáng SpotLight ấm từ trên bàn chiếu xuống kết hợp ánh sáng hắt dịu Cyan Blue từ màn hình CRT.
  - [x] Bắt khoảng cách $< 2.5m$ hiển thị UI Prompt `[E] NGỒI VÀO MÁY TÍNH`.
  - [x] Xử lý mượt mà chuyển cảnh Camera Lerp (TPS Overview $\leftrightarrow$ FPS CRT Screen View) khi bấm phím `E` / `ESC`.
- [x] **Task 27.2: Quản Lý Chuyển Map (`src/managers/OfficeManager.js`)**
  - [x] Điều phối nạp Map `enterOfficeMap()` và `exitOfficeMap()`, tự động ẩn/hiện Top Currency Bar & Audio Panel chuẩn quy tắc UI HUD Rules.
  - [x] Thiết kế giao diện Windows 98 Retro Teal Desktop với 4 Icon ứng dụng: `TaiLieu.txt` (Notepad), `DoMin.exe` (Game Dò Mìn chơi thật 100%), `XeLambo3D.exe` (Thông số xe), `Internet.exe` (Trình duyệt Netscape).
  - [x] Sắp xếp các app theo hàng dọc bên trái màn hình với SVG icon sắc nét chuẩn Retro Win98.
  - [x] Hiệu ứng hover / click selection hiển thị khung hình vuông xanh đậm (`#000080`) viền nét đứt trắng (`1px dotted #ffffff`) bao quanh icon + nhãn chữ chuẩn Windows 98.
  - [x] Taskbar Start Menu & Đồng hồ thời gian thực.
  - [x] Tích hợp nút `#btn-open-office` ở Menu chính và các nút thoát `#btn-exit-pc`, `#btn-exit-office-3d`.

---

## Phase 28: Nâng Cấp Quầy Ramen Cyberpunk & Trạm Máy Tính Tương Tác Signpost (`Shop3DScene.js`)
**Mục tiêu:** Nâng cấp file `Shop3DScene.js` biến nó thành Quầy Cửa Hàng Ramen Cyberpunk & Cột Biển Hiệu Neon Signpost 4 Hướng Tương Tác đẳng cấp thế giới theo phong cách **ANH Zhou** (`ANH-zhou.com`).

### Checklist công việc chi tiết
- [x] **Task 28.1: Dựng Cảnh Quan 3D Quầy Ramen & Cột Signpost (`src/core/Shop3DScene.js`)**
  - [x] Dựng quầy bán Ramen Cyberpunk đặt ngay trước Căn Nhà Màu Xanh Mái Hồng (`x: 36, z: 36`): Mái che tím/xanh, quầy gỗ có dãy ghế đẩu, biển hiệu Neon "CYBER MOTORS / RAMEN".
  - [x] Dựng Máy Game Arcade Cabinet cổ điển (Projects Station) và Máy Bán Nước Tự Động Cyberpunk Vending Machine (Articles Station).
  - [x] Dựng Cột Đèn Biển Hiệu Signpost đặt trên vỉa hè trước nhà xanh với 4 mũi tên Neon phát sáng: `[PROJECTS]` (Cyan), `[ARTICLES]` (Magenta), `[ABOUT ME]` (Gold), `[CREDITS]` (Electric Blue).
- [x] **Task 28.2: Xử Lý Tương Tác Raycaster & Camera Station Lerp (`Shop3DScene.js`)**
  - [x] Bắt sự kiện hover/click trên 4 biển hiệu bằng Raycaster, tự động đổi màu phát sáng và con trỏ chuột sang pointer.
  - [x] Khi click vào mũi tên, Camera lướt xoay/zoom mượt mà (1.5s Lerp) tiến sát tới trạm tương tác (Màn hình Arcade/PC, Cuộn sổ giới thiệu, Bài viết, Credits).
  - [x] Xử lý phím `ESC` và nút `[ESC] THOÁT TRẠM TƯƠNG TÁC` lùi camera về vị trí ban đầu.
- [x] **Task 28.3: Giao Diện HTML Overlays Trạm Tương Tác (`index.html` & `src/style.css`)**
  - [x] Bổ sung giao diện UI Card cho Projects Station, Articles Station, About Me Profile Scroll và Credits Board.

---

## Phase 29: Hệ Thống "Đô Thị Đuổi Theo" Xe Cẩu 3D Neon Rượt Đuổi (`PursuitManager.js`)
**Mục tiêu:** Xây dựng tính năng rượt đuổi Xe Cẩu Đô Thị Neon 3D xuất hiện dồn dập đằng sau xe người chơi với dàn còi cảnh sát nhấp nháy Đỏ - Xanh, âm thanh Dual-Tone Siren, đồng hồ đếm ngược Cắt Đuôi 15s và phần thưởng hấp dẫn.

### Checklist công việc chi tiết
- [x] **Task 29.1: Cấu hình `Constants.js` & Âm thanh Dual-Tone Siren (`AudioManager.js`)**
  - [x] Khai báo `PURSUIT_CONFIG` với thời gian 15s, thưởng 500 Cà phê & 200 EXP.
  - [x] Viết hàm `playSirenSFX()` và `stopSirenSFX()` tổng hợp tiếng còi hú cảnh sát warble 2.5Hz qua Web Audio API.
- [x] **Task 29.2: Mô Hình Xe Cẩu 3D Neon & Quản Lý Rượt Đuổi (`PursuitManager.js`)**
  - [x] Dựng mô hình 3D Xe Cẩu Đô Thị Cyberpunk với thân xe navy/vàng phản quang, cản bọc thép, cần cẩu móc cứu hộ và 4 bánh xe cao su.
  - [x] Dải đèn Siren Đỏ - Xanh Cyan nhấp nháy liên tục cùng PointLight phản chiếu mặt đường.
  - [x] Vị trí xe cẩu bám sát sau lưng người chơi 5.5m với lerp chuyển làn mượt mà.
  - [x] Đếm ngược 15s Cắt Đuôi: Thành công thưởng `+500 Cà phê` & `+200 EXP`, Thất bại (đâm vật cản khi đang rượt) `GAMEOVER` lập tức!
- [x] **Task 29.3: Giao Diện HUD & Flash Viền Màn Hình (`index.html` & `src/style.css`)**
  - [x] HUD Warning Card glassmorphism với icon 🚨, nhãn "ĐÔ THỊ ĐUỔI THEO!", badge thời gian đếm ngược và progress bar.
  - [x] Hiệu ứng flash viền màn hình Đỏ - Cyan dồn dập và toast thông báo chiến thắng/thất bại.
- [x] **Task 29.4: Tích Hợp Vòng Lập Game Loop (`Game.js`)**
  - [x] Khởi tạo và cập nhật `pursuitManager` trong game loop `_animate()`.
  - [x] Tự động kích hoạt Rượt Đuổi khi đạt mốc 1500m hoặc khi vừa vỡ Giáp Nón Lá.
  - [x] Reset trạng thái rượt đuổi khi ngắt/chơi lại game.

---

## Phase 30: Gara Nâng Cấp Vật Phẩm 5 Cấp & Bộ 4 Vệt Tốc Độ Đuôi Xe 3D (`PowerUpUpgradeManager.js` & `SpeedTrailManager.js`)
**Mục tiêu:** Xây dựng tính năng Gara Nâng Cấp 5 Cấp (+1s/Lv) cho 4 loại vật phẩm và Mở Khóa / Trang Bị 4 Vệt Đuôi Tốc Độ 3D bằng Cà phê.

### Checklist công việc chi tiết
- [x] **Task 30.1: Quản Lý Nâng Cấp Vật Phẩm 5 Cấp (`PowerUpUpgradeManager.js`)**
  - [x] Quản lý 5 Cấp độ (Lv 1 - Lv 5) cho **Giáp Nón Lá**, **Bánh Mì X2**, **Xe Ôm Boost**, **Giày Nhảy Cao**.
  - [x] Mỗi cấp độ nâng cấp cộng thêm **+1 giây hiệu lực** vào thời gian tối đa của vật phẩm.
  - [x] Bảng chi phí nâng cấp tăng dần bằng **Cà phê (Coins)** và lưu trữ dữ liệu vào `localStorage`.
- [x] **Task 30.2: Hệ Thống 4 Vệt Tốc Độ Đuôi Xe 3D (`SpeedTrailManager.js`)**
  - [x] Vệt Sét Cyan (`CYAN_LIGHTNING`): Hạt điện nổ lách tách xanh cyan lấp lánh (300 Cà phê).
  - [x] Vệt Mưa Sao Băng (`METEOR_SHOWER`): Bụi sao vàng kim tỏa sáng rực rỡ (500 Cà phê).
  - [x] Vệt Hoa Sữa (`MILK_FLOWER`): Cánh hoa trắng kem & hạt phấn ngát hương (700 Cà phê).
  - [x] Vệt Bụi Khói Cyberpunk (`CYBER_SMOKE`): Làn khói neon tím/magenta bốc dồn dập (1000 Cà phê).
  - [x] Render particle 3D mượt mà bám sát sau đuôi xe/nhân vật khi di chuyển hoặc Boost.
- [x] **Task 30.3: Giao Diện Garage Modal HTML/CSS (`index.html` & `src/style.css`)**
  - [x] Gara Modal 2 Tab (`#garage-modal`) phong cách Glassmorphism Cyberpunk.
  - [x] Thanh tiến trình 5 nấc Level cho từng vật phẩm và danh sách ô card Vệt Tốc Độ.
- [x] **Task 30.4: Tích Hợp Game Loop & Giao Dịch (`Game.js`)**
  - [x] Tải thời gian hiệu lực nâng cấp khi ăn vật phẩm trong trận đấu.
  - [x] Render animation hạt particle `speedTrailManager.update()` trong `_animate()`.









