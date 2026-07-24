import * as THREE from 'three';

/**
 * TrophyHallManager.js - Quản lý Kệ Trưng Bày Cúp 3D (Phòng Truyền Thống 3D)
 * 
 * 🏆 Cúp Vàng Tay Lái Lụa (Golden Driver) - Mở khóa khi Highscore >= 3,000m
 * ☕ Cúp Vua Cà Phê (Coffee King) - Mở khóa khi Tổng Cà Phê sự nghiệp >= 200
 * 🏎️ Cúp Siêu Xe Lamborghini (Supercar Collector) - Mở khóa khi sở hữu Lamborghini V12
 */
export class TrophyHallManager {
  constructor(game) {
    this.game = game;
    this.currencyManager = game ? game.currencyManager : null;

    this.trophies = this._loadTrophyData();
    this.shelfMeshes = []; // Lưu các Mesh 3D trên kệ cúp
  }

  _loadTrophyData() {
    return [
      {
        id: 'golden_driver',
        name: '🏆 Cúp Vàng Tay Lái Lụa',
        desc: 'Đạt điểm Kỷ Lục Đường Phố trên 3,000m',
        icon: '🏆',
        unlocked: (highScore = 0) => highScore >= 3000,
        color: 0xffd600,
        emissive: 0xff9100
      },
      {
        id: 'coffee_king',
        name: '☕ Cúp Vua Cà Phê Thái Bình',
        desc: 'Tích lũy tổng số 200 ly Cà phê sự nghiệp',
        icon: '☕',
        unlocked: () => {
          const total = parseInt(localStorage.getItem('sgr_total_coffees_collected') || '0', 10);
          return total >= 200;
        },
        color: 0x00f5d4,
        emissive: 0x00b894
      },
      {
        id: 'supercar',
        name: '🏎️ Cúp Đẳng Cấp Siêu Xe',
        desc: 'Sở hữu Siêu Xe Lamborghini V12 hoặc skin đặc biệt',
        icon: '🏎️',
        unlocked: () => {
          const owned = JSON.parse(localStorage.getItem('sgr_owned_skins') || '[]');
          return owned.includes('LAMBORGHINI') || owned.includes('LAMBORGHINI_V12');
        },
        color: 0xff0055,
        emissive: 0xaa00ff
      }
    ];
  }

  init() {
    this._setupUIEvents();
  }

  /* ============================================================ */
  /* 🎨 PROCEDURAL 3D TROPHY MESH BUILDER                         */
  /* ============================================================ */
  create3DTrophyShelf(scene, position = new THREE.Vector3(0, 0, 0)) {
    if (!scene) return null;

    const shelfGroup = new THREE.Group();
    shelfGroup.position.copy(position);

    // 1. Kệ Gỗ Trưng Bày (Wood / Glass Shelf Base)
    const shelfGeo = new THREE.BoxGeometry(3.6, 0.12, 0.8);
    const shelfMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.3,
      metalness: 0.8
    });
    const shelfMesh = new THREE.Mesh(shelfGeo, shelfMat);
    shelfMesh.castShadow = true;
    shelfMesh.receiveShadow = true;
    shelfGroup.add(shelfMesh);

    // 2. Dựng 3 Cúp 3D đặt lên Kệ
    const highScore = parseInt(localStorage.getItem('sgr_highscore') || '0', 10);
    const trophyPositions = [-1.1, 0, 1.1];

    this.trophies.forEach((t, i) => {
      const isUnlocked = t.unlocked(highScore);
      const trophyMesh = this._buildSingle3DTrophyMesh(t, isUnlocked);
      trophyMesh.position.set(trophyPositions[i], 0.06, 0);
      shelfGroup.add(trophyMesh);

      this.shelfMeshes.push({
        group: trophyMesh,
        unlocked: isUnlocked
      });
    });

    scene.add(shelfGroup);
    return shelfGroup;
  }

  _buildSingle3DTrophyMesh(trophyConfig, isUnlocked) {
    const group = new THREE.Group();

    const color = isUnlocked ? trophyConfig.color : 0x475569;
    const emissive = isUnlocked ? trophyConfig.emissive : 0x000000;
    const emissiveIntensity = isUnlocked ? 1.8 : 0;

    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity,
      roughness: isUnlocked ? 0.15 : 0.8,
      metalness: isUnlocked ? 0.9 : 0.1
    });

    // Đế cúp (Base)
    const baseGeo = new THREE.CylinderGeometry(0.22, 0.28, 0.15, 16);
    const baseMesh = new THREE.Mesh(baseGeo, mat);
    baseMesh.position.y = 0.075;
    group.add(baseMesh);

    // Thân cúp (Column)
    const colGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.35, 16);
    const colMesh = new THREE.Mesh(colGeo, mat);
    colMesh.position.y = 0.325;
    group.add(colMesh);

    // Chén Cúp (Cup Sphere)
    const cupGeo = new THREE.ConeGeometry(0.24, 0.3, 16);
    const cupMesh = new THREE.Mesh(cupGeo, mat);
    cupMesh.position.y = 0.6;
    group.add(cupMesh);

    // Biểu tượng đỉnh Cúp (Star / Crystal)
    const topGeo = new THREE.OctahedronGeometry(0.12);
    const topMesh = new THREE.Mesh(topGeo, mat);
    topMesh.position.y = 0.82;
    group.add(topMesh);

    return group;
  }

  update(deltaTime = 0.016) {
    // Xoay nhẹ các Cúp 3D trên kệ
    if (this.shelfMeshes.length > 0) {
      this.shelfMeshes.forEach(t => {
        if (t.unlocked && t.group) {
          t.group.rotation.y += deltaTime * 0.8;
        }
      });
    }
  }

  /* ============================================================ */
  /* 🖼️ UI MODAL & EVENT BINDINGS                                 */
  /* ============================================================ */
  _setupUIEvents() {
    document.addEventListener('click', (e) => {
      // Mở Modal Phòng Truyền Thống
      const btnOpen = e.target.closest('#btn-open-trophy-hall') || e.target.closest('.sub-trophy-hall');
      if (btnOpen) {
        e.stopPropagation();
        this.openModal();
      }

      // Đóng Modal
      const btnClose = e.target.closest('#btn-close-trophy-hall');
      if (btnClose) {
        e.stopPropagation();
        this.closeModal();
      }
    });
  }

  openModal() {
    const modal = document.getElementById('trophy-hall-modal');
    if (modal) {
      this.updateUI();
      modal.style.display = 'flex';
    }
  }

  closeModal() {
    const modal = document.getElementById('trophy-hall-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  updateUI() {
    const container = document.getElementById('trophy-hall-list');
    if (!container) return;

    container.innerHTML = '';
    const highScore = parseInt(localStorage.getItem('sgr_highscore') || '0', 10);

    this.trophies.forEach(t => {
      const isUnlocked = t.unlocked(highScore);

      const card = document.createElement('div');
      card.style.cssText = `
        background: rgba(15, 23, 42, 0.88);
        border: 2px solid ${isUnlocked ? '#ffd600' : '#334155'};
        border-radius: 14px;
        padding: 16px;
        display: flex;
        align-items: center;
        gap: 16px;
        box-shadow: ${isUnlocked ? '0 0 20px rgba(255,214,0,0.3)' : '0 4px 12px rgba(0,0,0,0.5)'};
      `;

      card.innerHTML = `
        <div style="font-size: 40px; filter: ${isUnlocked ? 'none' : 'grayscale(100%) opacity(0.4)'};">${t.icon}</div>
        <div style="flex: 1;">
          <div style="font-weight: 800; font-size: 16px; color: ${isUnlocked ? '#ffd600' : '#94a3b8'}; margin-bottom: 4px;">${t.name}</div>
          <div style="font-size: 12px; color: #cbd5e1;">${t.desc}</div>
        </div>
        <div>
          <span style="font-size: 12px; font-weight: 900; padding: 6px 14px; border-radius: 20px; ${isUnlocked ? 'background: #ffd600; color: #0f172a;' : 'background: #334155; color: #64748b;'}">
            ${isUnlocked ? '✨ ĐÃ MỞ KHÓA' : '🔒 KHÓA'}
          </span>
        </div>
      `;

      container.appendChild(card);
    });
  }
}
