import * as THREE from 'three';

/**
 * ExhaustFlameBoostEffect - Quản lý Hiệu ứng Vệt Lửa Phụt Từ Ống Xả Xe Mô Tô khi Tăng Tốc
 * Module chuẩn Three.js tối ưu mượt mà 60 FPS bằng Object Pool & AdditiveBlending.
 */
export class ExhaustFlameBoostEffect {
  /**
   * Khởi tạo hệ thống hạt vệt lửa đuôi xe
   * @param {THREE.Scene} scene 
   */
  constructor(scene) {
    this.scene = scene;
    this.isActive = false;

    // Số lượng hạt trong Particle Pool
    this.particleCount = 180;

    // Vị trí lệch của ống xả phía sau bánh xe mô tô
    this.exhaustOffset = new THREE.Vector3(0, 0.38, 0.68);

    this.particleGroup = new THREE.Group();
    this.scene.add(this.particleGroup);

    this._initParticlePool();
  }

  /**
   * Khởi tạo bộ nhớ đệm hạt (Particle Pool) dùng lại 100% không rác
   */
  _initParticlePool() {
    const geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);
    this.sizes = new Float32Array(this.particleCount);

    // Mảng lưu trữ trạng thái vòng đời (Lifespan) và Vận tốc (Velocities)
    this.lifespans = new Float32Array(this.particleCount);
    this.maxLifespans = new Float32Array(this.particleCount);
    this.velocities = new Float32Array(this.particleCount * 3);

    // Bảng màu lửa và khí xả nén: Cam lửa rực, Vàng rọi chói, Cyan neon & Trắng nhiệt độ cao
    this.palette = [
      new THREE.Color(0xff3d00), // Cam lửa rực
      new THREE.Color(0xffd600), // Vàng kim chói
      new THREE.Color(0x00e5ff), // Xanh Cyan neon
      new THREE.Color(0xffffff)  // Trắng nhiệt độ cao
    ];

    for (let i = 0; i < this.particleCount; i++) {
      this.maxLifespans[i] = 0.25 + Math.random() * 0.35; // Thời gian sống ngắn (0.25s - 0.6s)
      this.lifespans[i] = Math.random() * this.maxLifespans[i]; // Khởi tạo ngẫu nhiên để rải đều

      this._resetParticle(i, new THREE.Vector3(0, 0, 0));
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    // Chất liệu bán trong suốt phát sáng với AdditiveBlending
    this.material = new THREE.PointsMaterial({
      size: 0.25,
      vertexColors: true,
      transparent: true,
      opacity: 0.0, // Ẩn khi chưa boost
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    this.particlesMesh = new THREE.Points(geometry, this.material);
    this.particleGroup.add(this.particlesMesh);
  }

  /**
   * Reset 1 hạt về gốc ống xả đuôi xe với vận tốc mới
   */
  _resetParticle(i, basePos) {
    // Vị trí xuất phát tại đầu ống xả đuôi xe
    const spreadX = (Math.random() - 0.5) * 0.14;
    const spreadY = (Math.random() - 0.5) * 0.12;
    const spreadZ = Math.random() * 0.1;

    this.positions[i * 3] = basePos.x + this.exhaustOffset.x + spreadX;
    this.positions[i * 3 + 1] = basePos.y + this.exhaustOffset.y + spreadY;
    this.positions[i * 3 + 2] = basePos.z + this.exhaustOffset.z + spreadZ;

    // Màu hạt rực rỡ ngẫu nhiên
    const col = this.palette[Math.floor(Math.random() * this.palette.length)];
    this.colors[i * 3] = col.r;
    this.colors[i * 3 + 1] = col.g;
    this.colors[i * 3 + 2] = col.b;

    // Kích thước hạt
    this.sizes[i] = 0.18 + Math.random() * 0.22;

    // Vận tốc: Bắn giật mạnh ra phía sau (+Z) và bốc nhẹ lên trên (+Y)
    this.velocities[i * 3] = (Math.random() - 0.5) * 1.2;          // Tản ra hai bên
    this.velocities[i * 3 + 1] = 1.2 + Math.random() * 2.2;        // Bốc lên trên (+Y)
    this.velocities[i * 3 + 2] = 15.0 + Math.random() * 18.0;       // Phụt mạnh ra sau (+Z)

    this.lifespans[i] = 0.0;
  }

  /**
   * Kích hoạt hoặc ngắt hiệu ứng tăng tốc phụt lửa đuôi xe
   * @param {boolean} active 
   */
  triggerSpeedBoost(active) {
    this.isActive = active;
  }

  /**
   * Cập nhật chuyển động và vòng đời hạt trong Game Loop
   * @param {number} deltaTime 
   * @param {THREE.Vector3} playerPos Vị trí hiện tại của nhân vật/xe
   */
  update(deltaTime, playerPos) {
    const targetOpacity = this.isActive ? 0.95 : 0.0;
    this.material.opacity = THREE.MathUtils.lerp(this.material.opacity, targetOpacity, deltaTime * 10.0);

    if (this.material.opacity < 0.01) return;

    const basePos = playerPos || new THREE.Vector3(0, 0, 0);

    for (let i = 0; i < this.particleCount; i++) {
      this.lifespans[i] += deltaTime;

      // Nếu hết lifespan -> Reset hạt mới về điểm xả
      if (this.lifespans[i] >= this.maxLifespans[i]) {
        this._resetParticle(i, basePos);
        continue;
      }

      // Cập nhật vị trí hạt di chuyển ra sau và bốc lên trên
      this.positions[i * 3] += this.velocities[i * 3] * deltaTime;
      this.positions[i * 3 + 1] += this.velocities[i * 3 + 1] * deltaTime;
      this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * deltaTime;

      // Hạt thu nhỏ và mờ dần về cuối vòng đời
      const lifeRatio = 1.0 - (this.lifespans[i] / this.maxLifespans[i]);
      this.sizes[i] = (0.18 + Math.random() * 0.1) * lifeRatio;
    }

    this.particlesMesh.geometry.attributes.position.needsUpdate = true;
    this.particlesMesh.geometry.attributes.color.needsUpdate = true;
    this.particlesMesh.geometry.attributes.size.needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.particleGroup);
    if (this.particlesMesh) {
      this.particlesMesh.geometry.dispose();
      this.material.dispose();
    }
  }
}
