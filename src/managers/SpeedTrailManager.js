import * as THREE from 'three';

/**
 * SpeedTrailManager.js - Quản lý Vệt Tốc Độ 3D Đuôi Xe / Nhân Vật (Speed Trail FX)
 * 4 Vệt Đuôi: Vệt Sét Cyan, Vệt Mưa Sao Băng, Vệt Hoa Sữa, Vệt Bụi Khói Cyberpunk
 * Sử dụng 100% Kỹ thuật 3D Mesh Geometry & Material Shaders của Three.js
 */
export const SPEED_TRAIL_TYPES = {
  NONE: {
    id: 'NONE',
    name: 'Mặc Định (Không Vệt)',
    icon: '🚫',
    price: 0,
    desc: 'Không sử dụng vệt đuôi hiệu ứng'
  },
  CYAN_LIGHTNING: {
    id: 'CYAN_LIGHTNING',
    name: 'Vệt Sét Cyan',
    icon: '⚡',
    price: 300,
    color: 0x00f5d4,
    emissive: 0x00ffff,
    emissiveIntensity: 3.5,
    desc: 'Tia điện nổ lách tách xanh cyan lấp lánh cực ngầu'
  },
  METEOR_SHOWER: {
    id: 'METEOR_SHOWER',
    name: 'Vệt Mưa Sao Băng',
    icon: '🌠',
    price: 500,
    color: 0xffd600,
    emissive: 0xff9100,
    emissiveIntensity: 3.0,
    desc: 'Bụi sao vàng kim lấp lánh tỏa sáng rực rỡ'
  },
  MILK_FLOWER: {
    id: 'MILK_FLOWER',
    name: 'Vệt Hoa Sữa',
    icon: '🌸',
    price: 700,
    color: 0xffffff,
    emissive: 0xfff8e7,
    emissiveIntensity: 2.2,
    desc: 'Cánh hoa trắng kem & hạt phấn ngát hương dịu mát'
  },
  CYBER_SMOKE: {
    id: 'CYBER_SMOKE',
    name: 'Vệt Bụi Khói Cyberpunk',
    icon: '💨',
    price: 1000,
    color: 0xff00ff,
    emissive: 0x7928ca,
    emissiveIntensity: 3.2,
    desc: 'Làn khói neon tím/magenta bốc lên dồn dập'
  }
};

export class SpeedTrailManager {
  constructor(scene, currencyManager) {
    this.scene = scene;
    this.currencyManager = currencyManager;
    this.ownedTrails = this._loadOwnedTrails();
    this.equippedTrail = this._loadEquippedTrail();

    // Group chứa hạt 3D trong Scene
    this.particleGroup = new THREE.Group();
    this.scene.add(this.particleGroup);

    this.particles = [];
    this.maxParticles = 120; // 120 Hạt Mesh 3D cho độ dày rực rỡ
    this._initParticlePool();
  }

  _loadOwnedTrails() {
    try {
      const data = localStorage.getItem('sgr_owned_trails');
      return data ? JSON.parse(data) : ['NONE'];
    } catch (e) {
      return ['NONE'];
    }
  }

  _saveOwnedTrails() {
    try {
      localStorage.setItem('sgr_owned_trails', JSON.stringify(this.ownedTrails));
    } catch (e) {
      console.warn('[SpeedTrailManager] Failed to save owned trails:', e);
    }
  }

  _loadEquippedTrail() {
    try {
      const trail = localStorage.getItem('sgr_equipped_trail');
      return trail && SPEED_TRAIL_TYPES[trail] ? trail : 'NONE';
    } catch (e) {
      return 'NONE';
    }
  }

  _saveEquippedTrail() {
    try {
      localStorage.setItem('sgr_equipped_trail', this.equippedTrail);
    } catch (e) {
      console.warn('[SpeedTrailManager] Failed to save equipped trail:', e);
    }
  }

  isOwned(trailId) {
    return this.ownedTrails.includes(trailId);
  }

  buyTrail(trailId) {
    const config = SPEED_TRAIL_TYPES[trailId];
    if (!config) return { success: false, reason: 'INVALID_TRAIL' };
    if (this.isOwned(trailId)) return { success: false, reason: 'ALREADY_OWNED' };

    if (!this.currencyManager.hasEnoughCoins(config.price)) {
      return { success: false, reason: 'NOT_ENOUGH_COFFEE' };
    }

    this.currencyManager.deductCoins(config.price);
    this.ownedTrails.push(trailId);
    this._saveOwnedTrails();
    this.equipTrail(trailId);
    return { success: true };
  }

  equipTrail(trailId) {
    if (this.isOwned(trailId) || trailId === 'NONE') {
      this.equippedTrail = trailId;
      this._saveEquippedTrail();
      return true;
    }
    return false;
  }

  /**
   * Khởi tạo Particle Pool với 4 loại Khối Hình Học 3D độc bản
   */
  _initParticlePool() {
    // 4 Geometries cho 4 hiệu ứng
    this.geometries = {
      CYAN_LIGHTNING: new THREE.TetrahedronGeometry(0.14),     // Kim tự tháp điện sét
      METEOR_SHOWER: new THREE.IcosahedronGeometry(0.15),      // Viên sao băng 20 mặt
      MILK_FLOWER: new THREE.ConeGeometry(0.12, 0.22, 5),      // Cánh hoa nón 5 cạnh
      CYBER_SMOKE: new THREE.DodecahedronGeometry(0.18)        // Khối khói neon 12 mặt
    };

    for (let i = 0; i < this.maxParticles; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 2.0,
        roughness: 0.2,
        metalness: 0.1,
        transparent: true,
        opacity: 0
      });

      // Mặc định tạo bằng Tetrahedron
      const mesh = new THREE.Mesh(this.geometries.CYAN_LIGHTNING, mat);
      mesh.visible = false;
      this.particleGroup.add(mesh);

      this.particles.push({
        mesh,
        mat,
        active: false,
        life: 0,
        maxLife: 0.6,
        type: 'CYAN_LIGHTNING',
        vx: 0,
        vy: 0,
        vz: 0,
        rotSpeedX: 0,
        rotSpeedY: 0,
        rotSpeedZ: 0
      });
    }
  }

  /**
   * Bắn thêm 1 hạt particle 3D rực rỡ từ đuôi xe/nhân vật
   */
  _spawnParticle(playerPos, trailConfig) {
    const p = this.particles.find(item => !item.active);
    if (!p) return;

    p.active = true;
    p.life = 0;
    p.type = trailConfig.id;

    // Gán Geometry đúng theo loại hiệu ứng đã mua
    if (this.geometries[trailConfig.id]) {
      p.mesh.geometry = this.geometries[trailConfig.id];
    }

    // Thiết lập màu sắc & độ phát sáng Emissive của Three.js
    p.mat.color.setHex(trailConfig.color);
    p.mat.emissive.setHex(trailConfig.emissive);
    p.mat.emissiveIntensity = trailConfig.emissiveIntensity || 2.5;

    // Tốc độ xoay 3D
    p.rotSpeedX = (Math.random() - 0.5) * 12.0;
    p.rotSpeedY = (Math.random() - 0.5) * 12.0;
    p.rotSpeedZ = (Math.random() - 0.5) * 12.0;

    // Tự tùy biến tính chất vật lý & đường đi cho từng hiệu ứng
    if (trailConfig.id === 'CYAN_LIGHTNING') {
      // ⚡ Vệt Sét Cyan: Bắn giật zigzag điện dồn dập
      p.maxLife = 0.35 + Math.random() * 0.2;
      p.mesh.position.set(
        playerPos.x + (Math.random() - 0.5) * 0.7,
        playerPos.y + 0.35 + (Math.random() - 0.5) * 0.4,
        playerPos.z + 0.6 + Math.random() * 0.4
      );
      p.vx = (Math.random() - 0.5) * 3.5;
      p.vy = (Math.random() - 0.5) * 2.5;
      p.vz = 5.0 + Math.random() * 4.0;
      p.mat.opacity = 1.0;
      p.mesh.scale.setScalar(1.2 + Math.random() * 0.8);
    } else if (trailConfig.id === 'METEOR_SHOWER') {
      // 🌠 Vệt Mưa Sao Băng: Đuôi đuôi sao vàng rực tỏa bụi sao
      p.maxLife = 0.55 + Math.random() * 0.3;
      p.mesh.position.set(
        playerPos.x + (Math.random() - 0.5) * 0.4,
        playerPos.y + 0.4 + (Math.random() - 0.5) * 0.3,
        playerPos.z + 0.7 + Math.random() * 0.5
      );
      p.vx = (Math.random() - 0.5) * 1.8;
      p.vy = 0.8 + Math.random() * 1.5;
      p.vz = 4.5 + Math.random() * 3.5;
      p.mat.opacity = 0.95;
      p.mesh.scale.setScalar(1.4 + Math.random() * 0.9);
    } else if (trailConfig.id === 'MILK_FLOWER') {
      // 🌸 Vệt Hoa Sữa: Cánh hoa trắng kem múa lượn nhẹ nhàng trong gió
      p.maxLife = 0.7 + Math.random() * 0.3;
      p.mesh.position.set(
        playerPos.x + (Math.random() - 0.5) * 0.6,
        playerPos.y + 0.5 + (Math.random() - 0.5) * 0.4,
        playerPos.z + 0.8 + Math.random() * 0.4
      );
      p.vx = (Math.random() - 0.5) * 2.2;
      p.vy = 1.2 + Math.random() * 1.8; // Bay bổng lên trên
      p.vz = 3.0 + Math.random() * 2.5;
      p.mat.opacity = 0.9;
      p.mesh.scale.setScalar(1.0 + Math.random() * 0.6);
    } else if (trailConfig.id === 'CYBER_SMOKE') {
      // 💨 Vệt Bụi Khói Cyberpunk: Khói tím phình to bốc dồn dập từ ống xả
      p.maxLife = 0.6 + Math.random() * 0.3;
      p.mesh.position.set(
        playerPos.x + (Math.random() - 0.5) * 0.3,
        playerPos.y + 0.3 + (Math.random() - 0.5) * 0.2,
        playerPos.z + 0.6 + Math.random() * 0.3
      );
      p.vx = (Math.random() - 0.5) * 1.2;
      p.vy = 0.6 + Math.random() * 1.2;
      p.vz = 4.0 + Math.random() * 3.0;
      p.mat.opacity = 0.85;
      p.mesh.scale.setScalar(0.8); // Bắt đầu nhỏ và phình to dần
    }

    p.mesh.visible = true;
  }

  /**
   * Cập nhật animation particle trail trong Game Loop
   */
  update(deltaTime, playerPos, isBoosting = false) {
    if (!playerPos || this.equippedTrail === 'NONE') {
      this._hideAllParticles();
      return;
    }

    const trailConfig = SPEED_TRAIL_TYPES[this.equippedTrail];
    if (!trailConfig) return;

    // Tần suất sinh hạt (Sinh dày đặc hơn 3 lần khi đang Boost / Fever)
    const spawnCount = isBoosting ? 4 : 2;
    for (let i = 0; i < spawnCount; i++) {
      this._spawnParticle(playerPos, trailConfig);
    }

    // Cập nhật vị trí, góc xoay & độ mờ từng hạt
    this.particles.forEach(p => {
      if (!p.active) return;

      p.life += deltaTime;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.mesh.visible = false;
        return;
      }

      const progress = p.life / p.maxLife;

      // Di chuyển theo vận tốc
      p.mesh.position.x += p.vx * deltaTime;
      p.mesh.position.y += p.vy * deltaTime;
      p.mesh.position.z += p.vz * deltaTime;

      // Xoay 3D sinh động
      p.mesh.rotation.x += p.rotSpeedX * deltaTime;
      p.mesh.rotation.y += p.rotSpeedY * deltaTime;
      p.mesh.rotation.z += p.rotSpeedZ * deltaTime;

      // Scale & Alpha Fade theo loại hiệu ứng
      if (p.type === 'CYBER_SMOKE') {
        // Khói phình to gấp 3 lần rồi mờ dần
        const currentScale = 0.8 + progress * 2.5;
        p.mesh.scale.setScalar(currentScale);
        p.mat.opacity = (1.0 - progress) * 0.8;
      } else if (p.type === 'CYAN_LIGHTNING') {
        // Sét nhấp nháy giật tưng tưng
        p.mat.opacity = Math.random() > 0.3 ? (1.0 - progress) : 0.2;
        p.mesh.scale.setScalar((1.0 - progress * 0.4) * 1.3);
      } else {
        // Sao băng & Hoa sữa: Mờ dần êm ái
        p.mat.opacity = (1.0 - progress) * 0.9;
        p.mesh.scale.setScalar((1.0 - progress * 0.3) * 1.2);
      }
    });
  }

  _hideAllParticles() {
    this.particles.forEach(p => {
      p.active = false;
      p.mesh.visible = false;
    });
  }

  clear() {
    this._hideAllParticles();
  }

  reset() {
    this._hideAllParticles();
  }

  dispose() {
    if (this.particleGroup) {
      this.scene.remove(this.particleGroup);
    }
  }
}
