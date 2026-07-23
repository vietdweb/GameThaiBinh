import * as THREE from 'three';

/**
 * SpeedTrailManager.js - Quản lý Vệt Tốc Độ 3D Đuôi Xe / Nhân Vật (Speed Trail FX)
 * 4 Vệt Đuôi: Vệt Sét Cyan, Vệt Mưa Sao Băng, Vệt Hoa Sữa, Vệt Bụi Khói Cyberpunk
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
    emissive: 0x00e5ff,
    desc: 'Tia điện nổ lách tách xanh cyan lấp lánh cực ngầu'
  },
  METEOR_SHOWER: {
    id: 'METEOR_SHOWER',
    name: 'Vệt Mưa Sao Băng',
    icon: '🌠',
    price: 500,
    color: 0xffd600,
    emissive: 0xffa726,
    desc: 'Bụi sao vàng kim lấp lánh tỏa sáng rực rỡ'
  },
  MILK_FLOWER: {
    id: 'MILK_FLOWER',
    name: 'Vệt Hoa Sữa',
    icon: '🌸',
    price: 700,
    color: 0xffffff,
    emissive: 0xfff8e7,
    desc: 'Cánh hoa trắng kem & hạt phấn ngát hương dịu mát'
  },
  CYBER_SMOKE: {
    id: 'CYBER_SMOKE',
    name: 'Vệt Bụi Khói Cyberpunk',
    icon: '💨',
    price: 1000,
    color: 0xff00ff,
    emissive: 0xd500f9,
    desc: 'Làn khói neon tím/magenta bốc lên dồn dập'
  }
};

export class SpeedTrailManager {
  constructor(scene, currencyManager) {
    this.scene = scene;
    this.currencyManager = currencyManager;
    this.ownedTrails = this._loadOwnedTrails();
    this.equippedTrail = this._loadEquippedTrail();

    // System Particle Engine
    this.particleGroup = new THREE.Group();
    this.scene.add(this.particleGroup);

    this.particles = [];
    this.maxParticles = 80;
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
   * Khởi tạo Pool Hạt Particle 3D
   */
  _initParticlePool() {
    const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);

    for (let i = 0; i < this.maxParticles; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 1.5,
        transparent: true,
        opacity: 0
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.particleGroup.add(mesh);

      this.particles.push({
        mesh,
        mat,
        active: false,
        life: 0,
        maxLife: 0.6,
        vx: 0,
        vy: 0,
        vz: 0
      });
    }
  }

  /**
   * Bắn thêm 1 hạt particle từ sau đuôi xe/nhân vật
   */
  _spawnParticle(playerPos, trailConfig) {
    const p = this.particles.find(item => !item.active);
    if (!p) return;

    p.active = true;
    p.life = 0;
    p.maxLife = 0.4 + Math.random() * 0.3;

    // Vị trí bắn ra: Ngay sau đuôi nhân vật
    p.mesh.position.set(
      playerPos.x + (Math.random() - 0.5) * 0.5,
      playerPos.y + 0.4 + (Math.random() - 0.5) * 0.3,
      playerPos.z + 0.7 + Math.random() * 0.3
    );

    // Tốc độ văng hạt
    p.vx = (Math.random() - 0.5) * 1.5;
    p.vy = 0.5 + Math.random() * 1.2;
    p.vz = 4.0 + Math.random() * 3.0; // Văng lùi về sau

    p.mat.color.setHex(trailConfig.color);
    p.mat.emissive.setHex(trailConfig.emissive);
    p.mat.opacity = 0.9;
    p.mesh.scale.setScalar(1.0 + Math.random() * 0.8);
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

    // Tần suất sinh hạt (Sinh dày đặc hơn khi đang Boost / Fever)
    const spawnCount = isBoosting ? 3 : 1;
    for (let i = 0; i < spawnCount; i++) {
      this._spawnParticle(playerPos, trailConfig);
    }

    // Cập nhật vị trí & độ mờ từng hạt
    this.particles.forEach(p => {
      if (!p.active) return;

      p.life += deltaTime;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.mesh.visible = false;
        return;
      }

      const progress = p.life / p.maxLife;
      p.mesh.position.x += p.vx * deltaTime;
      p.mesh.position.y += p.vy * deltaTime;
      p.mesh.position.z += p.vz * deltaTime;

      p.mat.opacity = (1.0 - progress) * 0.85;
      const currentScale = (1.0 - progress * 0.5) * 1.2;
      p.mesh.scale.setScalar(currentScale);
    });
  }

  _hideAllParticles() {
    this.particles.forEach(p => {
      p.active = false;
      p.mesh.visible = false;
    });
  }

  dispose() {
    if (this.particleGroup) {
      this.scene.remove(this.particleGroup);
    }
  }
}
