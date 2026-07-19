# Walkthrough - Sài Gòn Rush: Hoàn thành Phase 1 đến Phase 6

## Tổng quan
Game **Sài Gòn Rush** đã được implement đầy đủ từ Phase 1 đến Phase 6. Dưới đây là tóm tắt tất cả các thay đổi.

---

## Phase 1 - 3: Cơ bản (đã hoàn thành trước)
- Vite project setup, Three.js scene
- Player (shipper xe máy), điều khiển bàn phím
- Đường chạy vô tận, chướng ngại vật ngẫu nhiên

---

## Phase 4: Tích hợp Tài nguyên

### AssetManager.js
- GLTFLoader hỗ trợ tải GLTF/GLB bất đồng bộ
- Hệ thống caching - clone model đã tải thay vì load lại
- Fallback tự động sang procedural model nếu thiếu file GLB

### Player.js
- Sửa bug: scene.add(meshGroup) luôn được gọi dù dùng GLB hay procedural
- jump() giờ trả về true/false để AudioManager biết khi nào phát SFX

---

## Phase 5: Ly Cà Phê & Va Chạm

### Collectible.js (MỚI)
- Ly cà phê sữa đá 3D với: thân ly trong suốt, cà phê nâu, đá viên, nắp nhựa, ống hút xanh
- Hiệu ứng lượn sóng lên xuống (bobbing) theo sin(time)
- Xoay liên tục 360° quanh trục Y để thu hút sự chú ý
- Nam châm Fever Mode: Khi Fever active, ly cà phê trong bán kính 10m bị hút về phía nhân vật
- Hào quang phát sáng cam nhấp nháy

### CollisionManager.js (MỚI)
- checkPlayerObstacles() - AABB intersection, hitbox thu nhỏ -0.15
- checkPlayerCollectibles() - Sphere radius check (bán kính 1.8m)
- filterOutOfBounds() - Dọn dẹp entities đã ra ngoài camera

---

## Phase 6: StateMachine, Audio & Mobile

### StateMachine.js (MỚI)
- Transitions có validation: LOADING→MENU→PLAYING↔FEVER→GAMEOVER
- onEnter/onExit callbacks, forceState() cho debug/reset

### AudioManager.js (MỚI)
- 100% procedural - không cần file .mp3 bên ngoài
- Web Audio API: Oscillator + GainNode + envelopes
- BGM nhạc nền thang Pentatonic (120 BPM)
- BGM Fever Mode tốc độ 200 BPM sôi động hơn
- SFX: nhảy, trượt, chuyển làn, nhặt cà phê, kích hoạt Fever, smash, game over

### Game.js (CẬP NHẬT TOÀN BỘ)
- Tích hợp StateMachine thay thế string-based state
- Swipe Controls: touchstart/touchend với threshold 40px và 400ms timeout
- Fever Particles: 200 hạt màu cam-đỏ-vàng tái sinh xung quanh nhân vật
- deltaTime được cap ở 50ms để tránh physics glitch

---

## Sửa lỗi Khoảng Trống Đường

### Environment.js
- Đổi vị trí khởi tạo từ Z=40 → Z=20
- Ngưỡng tái chế đổi từ Z>40 → Z>25

### Obstacle.js
- Xóa 2 dòng code thừa nằm ngoài scope của Roadblock.initMesh() gây lỗi JS syntax

---

## Hướng dẫn Kiểm tra
Mở trình duyệt: http://localhost:3001/

### Điều khiển
- A/← : Chuyển làn trái
- D/→ : Chuyển làn phải
- W/↑/Space : Nhảy
- S/↓ : Trượt
- Mobile: Vuốt 4 hướng

### Phím Debug
- C: Giả lập nhặt cà phê
- F: Kích hoạt Fever Mode
- G: Giả lập Game Over
