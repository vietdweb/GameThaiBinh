import * as THREE from 'three';
import { LANE, POWERUP_TYPES } from '../utils/Constants.js';

export class Collectible {
  constructor(scene, laneIndex, spawnZ, type = 'COFFEE') {
    this.scene = scene;
    this.type = type;
    this.isCollected = false;
    this.isAlive = true;

    // Vị trí làn đường (0=Trái, 1=Giữa, 2=Phải)
    const lanePositions = [LANE.LEFT, LANE.CENTER, LANE.RIGHT];
    this.laneX = lanePositions[laneIndex] || LANE.CENTER;

    // Thời gian lượn sóng
    this.bobTime = Math.random() * Math.PI * 2;
    this.bobSpeed = 2.5;
    this.bobAmplitude = 0.2;
    this.baseY = 1.2;

    // Bán kính thu thập
    this.collectRadius = 1.8;
    // Lực nam châm Fever Mode / Boost
    this.magnetStrength = 18;

    this.meshGroup = new THREE.Group();
    this.buildMesh();

    this.meshGroup.position.set(this.laneX, this.baseY, spawnZ);
    this.scene.add(this.meshGroup);

    // Bounding sphere
    this.position = this.meshGroup.position;
  }

  buildMesh() {
    if (this.type === POWERUP_TYPES.SHIELD) {
      this._buildShieldMesh();
    } else if (this.type === POWERUP_TYPES.DOUBLE_SCORE) {
      this._buildDoubleScoreMesh();
    } else if (this.type === POWERUP_TYPES.BOOST) {
      this._buildBoostMesh();
    } else if (this.type === POWERUP_TYPES.HIGH_JUMP) {
      this._buildHighJumpMesh();
    } else {
      this._buildCoffeeMesh();
    }
  }

  _buildCoffeeMesh() {
    // 1. Thân ly nhựa mang đi trong suốt cao cấp (Premium Takeaway Cup)
    const cupGeo = new THREE.CylinderGeometry(0.34, 0.24, 0.75, 16);
    const cupMat = new THREE.MeshStandardMaterial({
      color: 0xecfeff,
      transparent: true,
      opacity: 0.65,
      roughness: 0.05,
      metalness: 0.1,
    });
    const cup = new THREE.Mesh(cupGeo, cupMat);
    cup.position.y = 0.35;
    cup.castShadow = true;
    this.meshGroup.add(cup);

    // Vành mép ly nhựa dầy dặn mạ nhựa trong
    const rimGeo = new THREE.TorusGeometry(0.345, 0.025, 8, 20);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.72;
    this.meshGroup.add(rim);

    // 2. TẦNG SỮA ĐẶC ĐÁY LY (Layer 1: Sweet Condensed Milk Layer)
    const milkGeo = new THREE.CylinderGeometry(0.26, 0.22, 0.22, 16);
    const milkMat = new THREE.MeshStandardMaterial({ color: 0xfff8e1, roughness: 0.6 }); // Màu kem sữa đặc béo ngậy
    const milkLayer = new THREE.Mesh(milkGeo, milkMat);
    milkLayer.position.y = 0.11;
    this.meshGroup.add(milkLayer);

    // 3. TẦNG CÀ PHÊ NÂU ĐẬM ĐÀ BÊN TRÊN (Layer 2: Rich Espresso Layer)
    const coffeeGeo = new THREE.CylinderGeometry(0.31, 0.255, 0.48, 16);
    const coffeeMat = new THREE.MeshStandardMaterial({ color: 0x3e1c08, roughness: 0.5 }); // Cà phê Espresso nâu thẫm
    const coffeeLayer = new THREE.Mesh(coffeeGeo, coffeeMat);
    coffeeLayer.position.y = 0.45;
    this.meshGroup.add(coffeeLayer);

    // 4. Các viên đá pha lê trong suốt nổi bên trên (Crystal Ice Cubes)
    const iceMat = new THREE.MeshStandardMaterial({
      color: 0xe0f7fa,
      transparent: true,
      opacity: 0.8,
      roughness: 0.1,
      metalness: 0.2
    });
    for (let i = 0; i < 4; i++) {
      const iceGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
      const ice = new THREE.Mesh(iceGeo, iceMat);
      const angle = (i / 4) * Math.PI * 2;
      ice.position.set(
        Math.cos(angle) * 0.14,
        0.66,
        Math.sin(angle) * 0.14
      );
      ice.rotation.set(Math.random() * 0.5, angle, Math.random() * 0.5);
      this.meshGroup.add(ice);
    }

    // 5. Nắp vòm cầu trong suốt (Transparent Dome Lid)
    const lidGeo = new THREE.SphereGeometry(0.34, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    const lidMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      roughness: 0.1
    });
    const lid = new THREE.Mesh(lidGeo, lidMat);
    lid.position.y = 0.72;
    this.meshGroup.add(lid);

    // 6. Logo Sticker "SAIGON COFFEE" tròn màu vàng chói rực rỡ mặt trước ly
    const stickerGeo = new THREE.CircleGeometry(0.15, 16);
    const stickerMat = new THREE.MeshBasicMaterial({ color: 0xffd600, side: THREE.DoubleSide });
    const sticker = new THREE.Mesh(stickerGeo, stickerMat);
    sticker.position.set(0, 0.42, 0.29);
    this.meshGroup.add(sticker);

    // 7. Ống hút thẳng đứng màu xanh tươi (Straight Green Straw as shown in image)
    const strawGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.95, 8);
    const strawMat = new THREE.MeshStandardMaterial({ color: 0x00e676, roughness: 0.3 });
    const straw = new THREE.Mesh(strawGeo, strawMat);
    straw.position.set(0, 0.95, 0); // Thẳng đứng chính giữa nắp vòm chuẩn như ảnh!
    this.meshGroup.add(straw);

    // 8. Quả cầu hào quang siêu nhạt mờ mỏng nhẹ (Whisper Faint Glow Sphere)
    const glowGeo = new THREE.SphereGeometry(0.68, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xfff8e1,
      transparent: true,
      opacity: 0.025,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.y = 0.45;
    this.meshGroup.add(glow);
    this.glowMesh = glow;
    this.glowMat = glowMat;

    this.meshGroup.scale.set(0.85, 0.85, 0.85); // Kích thước gọn gàng, tinh tế và chuẩn nét 0.85x
  }

  _buildShieldMesh() {
    // 1. Quả cầu năng lượng Hologram Cyan phát sáng 3D (Glowing Plasma Shield Orb)
    const sphereGeo = new THREE.SphereGeometry(0.42, 24, 24);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    this.meshGroup.add(sphere);

    // 2. Vòng đai hào quang kim cương xoay nghiêng (Equatorial Diamond Energy Ring)
    const ringGeo = new THREE.TorusGeometry(0.55, 0.035, 12, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffd600,
      transparent: true,
      opacity: 0.95
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 3;
    this.meshGroup.add(ring);
    this.ringMesh = ring;

    // 3. Lưới ma trận năng lượng bên trong (Energy Matrix)
    const matrixGeo = new THREE.IcosahedronGeometry(0.44, 1);
    const matrixMat = new THREE.MeshBasicMaterial({
      color: 0xffea00,
      wireframe: true,
      transparent: true,
      opacity: 0.6
    });
    const matrix = new THREE.Mesh(matrixGeo, matrixMat);
    this.meshGroup.add(matrix);
    this.matrixMesh = matrix;
  }

  _buildDoubleScoreMesh() {
    const { group: itemGroup, glowMat } = createDoubleScoreItem();
    this.meshGroup.add(itemGroup);
    this.glowMat = glowMat;
    const lastChild = itemGroup.children[itemGroup.children.length - 1];
    if (lastChild) {
      this.glowMesh = lastChild;
    }
  }

  _buildBoostMesh() {
    // 3D Mô hình Xe Máy Ôm Siêu Tốc đỏ rực rỡ, thiết kế to, đẹp, nổi bật trên đường
    const bikeGroup = new THREE.Group();

    // 1. Thân xe máy đỏ sport
    const bodyGeo = new THREE.BoxGeometry(0.55, 0.65, 1.4);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xff1744,
      emissive: 0xd50000,
      emissiveIntensity: 0.4,
      roughness: 0.2,
      metalness: 0.8
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0.45, 0);
    body.castShadow = true;
    bikeGroup.add(body);

    // 2. Yên xe đen
    const seatGeo = new THREE.BoxGeometry(0.48, 0.15, 0.65);
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.8 });
    const seat = new THREE.Mesh(seatGeo, seatMat);
    seat.position.set(0, 0.8, 0.1);
    bikeGroup.add(seat);

    // 3. Bánh xe mạ crom
    const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.2, 12);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });

    const frontWheel = new THREE.Mesh(wheelGeo, wheelMat);
    frontWheel.rotation.z = Math.PI / 2;
    frontWheel.position.set(0, 0.28, -0.5);
    bikeGroup.add(frontWheel);

    const backWheel = frontWheel.clone();
    backWheel.position.set(0, 0.28, 0.5);
    bikeGroup.add(backWheel);

    // 4. Đèn pha LED trước phát sáng siêu rực
    const lightGeo = new THREE.BoxGeometry(0.25, 0.2, 0.1);
    const lightMat = new THREE.MeshStandardMaterial({
      color: 0xffea00,
      emissive: 0xffea00,
      emissiveIntensity: 1.5
    });
    const light = new THREE.Mesh(lightGeo, lightMat);
    light.position.set(0, 0.65, -0.72);
    bikeGroup.add(light);

    // 5. Tay lái mạ bạc
    const barGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.7, 8);
    const barMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, metalness: 0.9, roughness: 0.1 });
    const bar = new THREE.Mesh(barGeo, barMat);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 0.85, -0.4);
    bikeGroup.add(bar);

    // 6. Ống bô lửa siêu tốc phía sau
    const exhaustGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 8);
    const exhaustMat = new THREE.MeshStandardMaterial({ color: 0xffab00, emissive: 0xff6d00, emissiveIntensity: 0.8 });
    const exhaust = new THREE.Mesh(exhaustGeo, exhaustMat);
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(0.25, 0.35, 0.7);
    bikeGroup.add(exhaust);

    bikeGroup.scale.set(1.3, 1.3, 1.3); // Tăng kích thước gấp 1.3 lần để người chơi nhìn rõ tuyệt đối
    this.meshGroup.add(bikeGroup);

    // Hào quang vệt lửa đỏ rực rỡ khổng lồ
    const glowGeo = new THREE.SphereGeometry(1.2, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xff3d00,
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    this.meshGroup.add(glow);
    this.glowMat = glowMat;
  }

  _buildHighJumpMesh() {
    const group = new THREE.Group();

    // 1. Giày Sneaker Tương Lai Neon Cyan (Future Neon Sneaker)
    const shoeMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00b0ff,
      emissiveIntensity: 0.6,
      roughness: 0.25,
      metalness: 0.7
    });
    const soleMat = new THREE.MeshStandardMaterial({
      color: 0x00e676,
      emissive: 0x00e676,
      emissiveIntensity: 0.8,
      roughness: 0.1
    });

    const shoeGroup = new THREE.Group();

    // Đế giày nhảy cao phản quang
    const soleGeo = new THREE.BoxGeometry(0.42, 0.12, 0.85);
    const sole = new THREE.Mesh(soleGeo, soleMat);
    sole.position.y = 0.06;
    sole.castShadow = true;
    shoeGroup.add(sole);

    // Thân giày Sneaker thể thao
    const upperGeo = new THREE.BoxGeometry(0.38, 0.38, 0.75);
    const upper = new THREE.Mesh(upperGeo, shoeMat);
    upper.position.set(0, 0.28, -0.05);
    upper.castShadow = true;
    shoeGroup.add(upper);

    // Mũi giày thon nhọn
    const toeGeo = new THREE.ConeGeometry(0.2, 0.35, 8);
    const toe = new THREE.Mesh(toeGeo, shoeMat);
    toe.rotation.x = -Math.PI / 2;
    toe.position.set(0, 0.18, -0.48);
    shoeGroup.add(toe);

    // 2 Ống Phản Lực Nhỏ Ở Đáy Giày (Twin Rocket Thrusters)
    const thrusterGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.22, 10);
    const thrusterMat = new THREE.MeshStandardMaterial({ color: 0xffea00, emissive: 0xff6d00, emissiveIntensity: 1.2 });
    for (let t of [-0.12, 0.12]) {
      const thruster = new THREE.Mesh(thrusterGeo, thrusterMat);
      thruster.position.set(t, 0.02, 0.25);
      shoeGroup.add(thruster);
    }

    shoeGroup.rotation.x = -Math.PI / 8;
    group.add(shoeGroup);

    // 2. Hệ Thống Hạt Hào Quang Ánh Sáng Xanh Neon (Cyan Particle Aura Ring)
    const particleCount = 24;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = 0.65 + Math.random() * 0.1;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x00e5ff,
      size: 0.09,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(geometry, pMat);
    group.add(particles);

    // 3. Quả Cầu Hào Quang Xanh rực rỡ
    const glowGeo = new THREE.SphereGeometry(0.75, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    const glowSphere = new THREE.Mesh(glowGeo, glowMat);
    group.add(glowSphere);

    this.meshGroup.add(group);
    this.glowMat = glowMat;
  }

  update(deltaTime, currentSpeed, playerPosition, isFeverActive) {
    if (!this.isAlive) return;

    // Di chuyển theo tốc độ game
    this.meshGroup.position.z += currentSpeed * deltaTime;

    // Hiệu ứng lượn sóng lên xuống
    this.bobTime += this.bobSpeed * deltaTime;
    this.meshGroup.position.y = this.baseY + Math.sin(this.bobTime) * this.bobAmplitude;

    // Xoay liên tục
    this.meshGroup.rotation.y += 1.8 * deltaTime;

    // Nhấp nháy hào quang siêu mờ mỏng nhẹ
    if (this.glowMat) {
      this.glowMat.opacity = 0.018 + 0.015 * Math.abs(Math.sin(this.bobTime * 2));
    }

    // === Nam châm Fever Mode / Boost ===
    if (isFeverActive && playerPosition) {
      const dx = playerPosition.x - this.meshGroup.position.x;
      const dy = playerPosition.y - this.meshGroup.position.y;
      const dz = playerPosition.z - this.meshGroup.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < 10) {
        const force = (this.magnetStrength * deltaTime) / Math.max(dist, 0.5);
        this.meshGroup.position.x += dx * force;
        this.meshGroup.position.z += dz * force;
        this.meshGroup.position.y += dy * force * 0.5;
      }
    }
  }

  checkCollection(playerPos) {
    if (!this.isAlive || this.isCollected) return false;

    const dx = playerPos.x - this.meshGroup.position.x;
    const dy = playerPos.y - this.meshGroup.position.y;
    const dz = playerPos.z - this.meshGroup.position.z;
    const distSq = dx * dx + dy * dy + dz * dz;

    return distSq < this.collectRadius * this.collectRadius;
  }

  /**
   * Bật / Tắt hiệu ứng quầng sáng vòng vàng Boost của vật phẩm
   * Khi isActive === false, opacity được giảm mượt về 0, gán visible = false và xóa khỏi scene
   * @param {boolean} isActive 
   */
  setBoostEffectActive(isActive) {
    this.isBoostEffectActive = isActive;
    if (!isActive && this.glowMesh) {
      this.glowMesh.visible = false;
      if (this.glowMesh.parent) {
        this.glowMesh.parent.remove(this.glowMesh);
      }
    }
  }

  collect() {
    if (this.isCollected) return;
    this.isCollected = true;
    this.isAlive = false;
    this.setBoostEffectActive(false);
    this.dispose();
  }

  dispose() {
    this.isAlive = false;
    if (this.glowMesh) {
      this.glowMesh.visible = false;
      if (this.glowMesh.parent) {
        this.glowMesh.parent.remove(this.glowMesh);
      }
    }
    this.scene.remove(this.meshGroup);
    this.meshGroup.traverse(child => {
      if (child.isMesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}

/**
 * Tạo Mô hình 3D Ổ Bánh Mì Sài Gòn X2 Chân Thực (Item Double Score)
 * - Vỏ bánh mì 3D nướng giòn vàng ươm với 3 rãnh rạch bánh mì Sài Gòn truyền thống
 * - Nhân bánh mì đầy đặn: giò lụa hồng nhạt, thịt nguội đỏ tươi, dưa leo & ngò xanh tươi, lát ớt đỏ rực
 * - Huy hiệu chữ "X2" 3D màu hồng/tím neon rực rỡ lơ lửng phát sáng phía trên
 * - Hào quang lấp lánh mờ ấm áp (opacity 0.25, AdditiveBlending)
 * @returns { { group: THREE.Group, glowMat: THREE.Material } }
 */
export function createDoubleScoreItem() {
  const group = new THREE.Group();
  const breadGroup = new THREE.Group();

  // 1. Vỏ Bánh Mì Sài Gòn Nóng Giòn Vàng Ươm 3D (Golden Crisp Bánh Mì Crust)
  const crustGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.78, 16);
  const crustMat = new THREE.MeshStandardMaterial({
    color: 0xffa726,       // Vàng ươm bánh mì nướng giòn
    roughness: 0.5,
    metalness: 0.05
  });
  const crust = new THREE.Mesh(crustGeo, crustMat);
  crust.rotation.z = Math.PI / 2; // Nằm ngang
  crust.castShadow = true;
  breadGroup.add(crust);

  // Đầu bánh mì khum vuốt mỏng 2 bên (Tapered ends)
  const tipGeo = new THREE.SphereGeometry(0.19, 12, 12);
  const tipL = new THREE.Mesh(tipGeo, crustMat);
  tipL.position.x = -0.36;
  tipL.scale.set(0.6, 0.95, 0.95);
  breadGroup.add(tipL);

  const tipR = tipL.clone();
  tipR.position.x = 0.36;
  breadGroup.add(tipR);

  // 3 Đường rạch rãnh bánh mì truyền thống Sài Gòn (Score slits)
  const slitMat = new THREE.MeshStandardMaterial({
    color: 0xfff8e1,
    emissive: 0xffe082,
    emissiveIntensity: 0.4,
    roughness: 0.4
  });
  for (let s = -1; s <= 1; s++) {
    const slitGeo = new THREE.BoxGeometry(0.16, 0.03, 0.08);
    const slit = new THREE.Mesh(slitGeo, slitMat);
    slit.position.set(s * 0.2, 0.16, 0.12);
    slit.rotation.z = Math.PI / 12;
    breadGroup.add(slit);
  }

  // 2. Nhân Bánh Mì Việt Nam Đầy Đặn & Chân Thực 3D (Rich Vietnamese Fillings)
  // Dải giò lụa / chả lụa hồng nhạt
  const hamGeo = new THREE.BoxGeometry(0.68, 0.05, 0.22);
  const hamMat = new THREE.MeshStandardMaterial({ color: 0xf48fb1, roughness: 0.6 });
  const ham = new THREE.Mesh(hamGeo, hamMat);
  ham.position.set(0, 0.08, 0.14);
  breadGroup.add(ham);

  // Dải thịt nguội / pâté đỏ hồng
  const meatGeo = new THREE.BoxGeometry(0.64, 0.04, 0.2);
  const meatMat = new THREE.MeshStandardMaterial({ color: 0xef5350, roughness: 0.5 });
  const meat = new THREE.Mesh(meatGeo, meatMat);
  meat.position.set(0, 0.05, 0.15);
  breadGroup.add(meat);

  // Cọng dưa leo & hành ngò xanh tươi
  const cucumberGeo = new THREE.BoxGeometry(0.66, 0.04, 0.1);
  const cucumberMat = new THREE.MeshStandardMaterial({ color: 0x66bb6a, roughness: 0.4 });
  const cucumber = new THREE.Mesh(cucumberGeo, cucumberMat);
  cucumber.position.set(0, 0.11, 0.12);
  breadGroup.add(cucumber);

  // 2 Lát ớt đỏ rực tươi giòn (Red Chili Slices)
  const chiliMat = new THREE.MeshStandardMaterial({ color: 0xff1744, emissive: 0xd50000, emissiveIntensity: 0.3 });
  for (let c = -1; c <= 1; c += 2) {
    const chili = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 8), chiliMat);
    chili.rotation.x = Math.PI / 4;
    chili.position.set(c * 0.18, 0.13, 0.18);
    breadGroup.add(chili);
  }

  breadGroup.position.y = -0.1;
  group.add(breadGroup);

  // 3. Huy Hiệu "X2" Neon Hồng/Tím Phát Sáng Rực Rỡ Lơ Lửng Phía Trên
  const badgeGroup = new THREE.Group();
  const textMat = new THREE.MeshStandardMaterial({
    color: 0xff00ff,
    emissive: 0xff00ff,
    emissiveIntensity: 0.85,
    roughness: 0.1,
    metalness: 0.3
  });

  // Chữ 'X' cách điệu
  const xGroup = new THREE.Group();
  const barGeo = new THREE.BoxGeometry(0.055, 0.28, 0.07);
  const bar1 = new THREE.Mesh(barGeo, textMat);
  bar1.rotation.z = Math.PI / 4;
  const bar2 = new THREE.Mesh(barGeo, textMat);
  bar2.rotation.z = -Math.PI / 4;
  xGroup.add(bar1);
  xGroup.add(bar2);
  xGroup.position.set(-0.11, 0, 0);
  badgeGroup.add(xGroup);

  // Số '2' cách điệu
  const num2Group = new THREE.Group();
  const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.045, 0.07), textMat);
  topBar.position.set(0, 0.11, 0);
  const diagBar = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.18, 0.07), textMat);
  diagBar.rotation.z = -Math.PI / 6;
  diagBar.position.set(0, 0.01, 0);
  const botBar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.045, 0.07), textMat);
  botBar.position.set(0, -0.11, 0);

  num2Group.add(topBar);
  num2Group.add(diagBar);
  num2Group.add(botBar);
  num2Group.position.set(0.11, 0, 0);
  badgeGroup.add(num2Group);

  badgeGroup.position.set(0, 0.42, 0);
  group.add(badgeGroup);

  // 4. Hào Quang Bánh Mì Nóng Giòn Mờ Ấm Áp (Golden Radiant Halo)
  const glowGeo = new THREE.SphereGeometry(0.68, 20, 20);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xffb74d,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });
  const glowSphere = new THREE.Mesh(glowGeo, glowMat);
  group.add(glowSphere);

  return { group, glowMat };
}

