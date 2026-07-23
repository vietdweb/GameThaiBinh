import * as THREE from 'three';
import { PURSUIT_CONFIG } from '../utils/Constants.js';

/**
 * PursuitManager - Quản lý Hệ thống "Đô Thị Đuổi Theo" & Boss Event
 * Tạo và điều khiển 3D Xe Cảnh Sát Cứu Hộ Cyberpunk (Cyber Police Heavy Interceptor) rượt đuổi siêu đẹp
 */
export class PursuitManager {
  constructor(game) {
    this.game = game;
    this.state = 'IDLE'; // IDLE, PURSUING, ESCAPED, CAUGHT
    this.timer = 0;
    this.followDistance = PURSUIT_CONFIG.FOLLOW_DISTANCE || 5.5;

    // 3D Mesh
    this.meshGroup = new THREE.Group();
    this.meshGroup.visible = false;
    this.game.sceneManager.scene.add(this.meshGroup);

    // References cho hiệu ứng động
    this.redSirenLight = null;
    this.blueSirenLight = null;
    this.sirenPointLight = null;
    this.sirenTimer = 0;
    this.scannerMesh = null;
    this.craneGroup = null;
    this.wheels = [];
    this.strobeLights = [];

    this._buildTowTruckMesh();
  }

  /**
   * Khởi tạo Mô hình 3D Xe Cảnh Sát Cứu Hộ Cyberpunk Siêu Đẹp (Cyber Police Heavy Interceptor)
   */
  _buildTowTruckMesh() {
    // Dọn dẹp mesh cũ nếu có
    while (this.meshGroup.children.length > 0) {
      const obj = this.meshGroup.children[0];
      this.meshGroup.remove(obj);
    }
    this.wheels = [];
    this.strobeLights = [];

    // --- 1. THÂN XE SIÊU CẤP (CYBER INTERCEPTOR CHASSIS) ---
    // Khung gầm thấp & đệm xe bọc thép
    const baseGeo = new THREE.BoxGeometry(2.3, 0.5, 4.8);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      metalness: 0.9,
      roughness: 0.15
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.55;
    base.castShadow = true;
    base.receiveShadow = true;
    this.meshGroup.add(base);

    // Thân xe chính với đường cắt vát Cyber Carbon
    const bodyShape = new THREE.BoxGeometry(2.2, 1.1, 4.4);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Carbon đen bóng Cyberpunk
      metalness: 0.85,
      roughness: 0.2
    });
    const body = new THREE.Mesh(bodyShape, bodyMat);
    body.position.set(0, 1.1, -0.1);
    body.castShadow = true;
    this.meshGroup.add(body);

    // Dải sơn Neon Cảnh Sát 2 bên hông (Cyber Police Cyan Line)
    const stripeGeo = new THREE.BoxGeometry(2.24, 0.12, 4.42);
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      emissive: 0x00f5d4,
      emissiveIntensity: 0.8
    });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.set(0, 1.25, -0.1);
    this.meshGroup.add(stripe);

    // Cabin góc cạnh phong cách Xe Bọc Thép Cảnh Sát SWAT 2077
    const cabinGeo = new THREE.BoxGeometry(2.0, 0.95, 2.0);
    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.7,
      roughness: 0.3
    });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 1.85, -0.7);
    cabin.castShadow = true;
    this.meshGroup.add(cabin);

    // Mái cabin vát nghiêng thể thao
    const roofGeo = new THREE.BoxGeometry(1.9, 0.2, 1.8);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.1 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 2.35, -0.7);
    this.meshGroup.add(roof);

    // Kính chắn gió mạ Titan Cyan Phản Quang Phát Sáng
    const windshieldGeo = new THREE.BoxGeometry(1.85, 0.65, 1.5);
    const windshieldMat = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      metalness: 0.95,
      roughness: 0.05,
      transparent: true,
      opacity: 0.75,
      emissive: 0x00b0ff,
      emissiveIntensity: 0.3
    });
    const windshield = new THREE.Mesh(windshieldGeo, windshieldMat);
    windshield.position.set(0, 1.95, -0.75);
    this.meshGroup.add(windshield);

    // --- 2. CẢN TRƯỚC BỌC THÉP HẦM HỐ & LASER SCANNER KHAI HỎA ---
    const heavyBumperGeo = new THREE.BoxGeometry(2.45, 0.55, 0.5);
    const heavyBumperMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.9,
      roughness: 0.1
    });
    const heavyBumper = new THREE.Mesh(heavyBumperGeo, heavyBumperMat);
    heavyBumper.position.set(0, 0.55, -2.4);
    this.meshGroup.add(heavyBumper);

    // Thanh quét Laser Cảnh Sát Red Scanner Strip (Quét qua quét lại như KITT)
    const scannerSlotGeo = new THREE.BoxGeometry(1.6, 0.1, 0.12);
    const scannerSlotMat = new THREE.MeshStandardMaterial({ color: 0x050505 });
    const scannerSlot = new THREE.Mesh(scannerSlotGeo, scannerSlotMat);
    scannerSlot.position.set(0, 0.65, -2.66);
    this.meshGroup.add(scannerSlot);

    const scannerMeshGeo = new THREE.BoxGeometry(0.35, 0.08, 0.14);
    const scannerMeshMat = new THREE.MeshStandardMaterial({
      color: 0xff0033,
      emissive: 0xff0033,
      emissiveIntensity: 3.5
    });
    this.scannerMesh = new THREE.Mesh(scannerMeshGeo, scannerMeshMat);
    this.scannerMesh.position.set(0, 0.65, -2.67);
    this.meshGroup.add(this.scannerMesh);

    // Đèn pha Matrix LED Kép Rực Rỡ (Quad LED Matrix)
    const quadHeadlightGeo = new THREE.BoxGeometry(0.5, 0.22, 0.1);
    const quadHeadlightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 3.0
    });
    const leftHL = new THREE.Mesh(quadHeadlightGeo, quadHeadlightMat);
    leftHL.position.set(-0.85, 0.8, -2.42);
    const rightHL = leftHL.clone();
    rightHL.position.x = 0.85;
    this.meshGroup.add(leftHL);
    this.meshGroup.add(rightHL);

    // --- 3. CẦN CẨU THỦY LỰC ĐÔI & MÓC PLASMA (DUAL HYDRAULIC CRANE & PLASMA HOOK) ---
    this.craneGroup = new THREE.Group();
    this.craneGroup.position.set(0, 1.3, 1.2);
    this.meshGroup.add(this.craneGroup);

    // Bệ xoay cần cẩu thép mạ crom
    const craneBaseGeo = new THREE.CylinderGeometry(0.65, 0.75, 0.3, 16);
    const craneBaseMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 });
    const craneBase = new THREE.Mesh(craneBaseGeo, craneBaseMat);
    this.craneGroup.add(craneBase);

    // 2 Cánh tay thủy lực song song (Double Boom Arms)
    const armGeo = new THREE.BoxGeometry(0.18, 1.8, 0.22);
    const armMat = new THREE.MeshStandardMaterial({
      color: 0xff1744, // Đỏ neon cảnh báo
      metalness: 0.7,
      roughness: 0.2,
      emissive: 0xd50000,
      emissiveIntensity: 0.4
    });

    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.4, 0.9, 0.2);
    leftArm.rotation.x = -Math.PI / 4;
    this.craneGroup.add(leftArm);

    const rightArm = leftArm.clone();
    rightArm.position.x = 0.4;
    this.craneGroup.add(rightArm);

    // Trục Piston Crom mạ sáng bóng
    const pistonGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.4, 12);
    const pistonMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1.0, roughness: 0.05 });
    const piston = new THREE.Mesh(pistonGeo, pistonMat);
    piston.position.set(0, 0.6, 0.5);
    piston.rotation.x = -Math.PI / 3;
    this.craneGroup.add(piston);

    // Móc Plasma Cứu Hộ Lơ Lửng Phát Sáng Vàng Rực Rỡ
    const plasmaClawGeo = new THREE.TorusGeometry(0.28, 0.07, 12, 24);
    const plasmaClawMat = new THREE.MeshStandardMaterial({
      color: 0xffd600,
      emissive: 0xffd600,
      emissiveIntensity: 2.2,
      metalness: 0.9
    });
    const plasmaClaw = new THREE.Mesh(plasmaClawGeo, plasmaClawMat);
    plasmaClaw.rotation.x = Math.PI / 2;
    plasmaClaw.position.set(0, 0.9, 0.95);
    this.craneGroup.add(plasmaClaw);

    // Ống Xả Đôi Phụt Vệt Lửa Nitro (Dual Exhaust Stacks)
    const exhaustGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.2, 12);
    const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.95, roughness: 0.1 });

    const leftExhaust = new THREE.Mesh(exhaustGeo, exhaustMat);
    leftExhaust.position.set(-0.95, 1.9, 0.2);
    const rightExhaust = leftExhaust.clone();
    rightExhaust.position.x = 0.95;
    this.meshGroup.add(leftExhaust);
    this.meshGroup.add(rightExhaust);

    // Ngọn lửa Nitro rực rỡ ở đầu ống xả (Nitro Flames)
    const flameGeo = new THREE.ConeGeometry(0.14, 0.5, 8);
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      emissive: 0x00f5d4,
      emissiveIntensity: 3.0,
      transparent: true,
      opacity: 0.9
    });
    const leftFlame = new THREE.Mesh(flameGeo, flameMat);
    leftFlame.position.set(-0.95, 2.65, 0.2);
    const rightFlame = leftFlame.clone();
    rightFlame.position.x = 0.95;
    this.meshGroup.add(leftFlame);
    this.meshGroup.add(rightFlame);

    // --- 4. DẢI ĐÈN CÒI CẢNH SÁT V-SHAPE CỰC ĐẲNG CẤP (V-SHAPED CROWN SIREN LIGHTBAR) ---
    const lightbarWingGeo = new THREE.BoxGeometry(0.8, 0.14, 0.25);

    // Đèn Đỏ (Red Siren)
    const sirenRedMat = new THREE.MeshStandardMaterial({
      color: 0xff0033,
      emissive: 0xff0033,
      emissiveIntensity: 2.0
    });
    this.redSirenLight = new THREE.Mesh(lightbarWingGeo, sirenRedMat);
    this.redSirenLight.position.set(-0.45, 2.48, -0.7);
    this.meshGroup.add(this.redSirenLight);

    // Đèn Cyan (Cyan Siren)
    const sirenBlueMat = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      emissive: 0x00f5d4,
      emissiveIntensity: 2.0
    });
    this.blueSirenLight = new THREE.Mesh(lightbarWingGeo, sirenBlueMat);
    this.blueSirenLight.position.set(0.45, 2.48, -0.7);
    this.meshGroup.add(this.blueSirenLight);

    // Đèn chớp Strobe 2 bên hông vè bánh xe
    const strobeGeo = new THREE.BoxGeometry(0.1, 0.15, 0.6);
    const strobeLeftRed = new THREE.Mesh(strobeGeo, sirenRedMat.clone());
    strobeLeftRed.position.set(-1.16, 1.2, -0.5);
    const strobeRightBlue = new THREE.Mesh(strobeGeo, sirenBlueMat.clone());
    strobeRightBlue.position.set(1.16, 1.2, -0.5);
    this.meshGroup.add(strobeLeftRed);
    this.meshGroup.add(strobeRightBlue);
    this.strobeLights.push(strobeLeftRed, strobeRightBlue);

    // PointLight rực rỡ tỏa sáng chiếu thẳng xuống mặt đường
    this.sirenPointLight = new THREE.PointLight(0xff0033, 4.5, 18);
    this.sirenPointLight.position.set(0, 2.7, -0.7);
    this.meshGroup.add(this.sirenPointLight);

    // --- 5. 6 BÁNH XE MONSTER HIGH-TECH (6 MONSTER TIRES WITH CYBER RIMS) ---
    const wheelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.4, 20);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9, metalness: 0.1 });
    const rimCapGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.42, 16);
    const rimCapMat = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      emissive: 0x00f5d4,
      emissiveIntensity: 1.2,
      metalness: 0.9
    });

    const wheelPositions = [
      [-1.15, 0.48, -1.5], // Bánh trước trái
      [1.15, 0.48, -1.5],  // Bánh trước phải
      [-1.15, 0.48, 0.5],  // Bánh giữa trái
      [1.15, 0.48, 0.5],   // Bánh giữa phải
      [-1.15, 0.48, 1.6],  // Bánh sau trái
      [1.15, 0.48, 1.6]    // Bánh sau phải
    ];

    wheelPositions.forEach(([x, y, z]) => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(x, y, z);

      const tire = new THREE.Mesh(wheelGeo, wheelMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wheelGroup.add(tire);

      const rim = new THREE.Mesh(rimCapGeo, rimCapMat);
      rim.rotation.z = Math.PI / 2;
      wheelGroup.add(rim);

      this.meshGroup.add(wheelGroup);
      this.wheels.push(tire);
    });
  }

  /**
   * Kích hoạt Chế độ Rượt Đuổi (Pursuit Mode)
   */
  triggerPursuit() {
    if (this.state === 'PURSUING') return;

    this.state = 'PURSUING';
    this.timer = PURSUIT_CONFIG.DURATION;
    this.meshGroup.visible = true;

    // Vị trí xuất hiện ban đầu: Ngay sau đuôi xe người chơi
    if (this.game.player && this.game.player.meshGroup) {
      const playerPos = this.game.player.meshGroup.position;
      this.meshGroup.position.set(playerPos.x, playerPos.y, playerPos.z + this.followDistance + 6);
    }

    // Kích hoạt còi hú SFX
    if (this.game.audioManager) {
      this.game.audioManager.playSirenSFX();
    }

    // Kích hoạt còi hú SFX
    if (this.game.audioManager) {
      this.game.audioManager.playSirenSFX();
    }
  }

  /**
   * Cập nhật logic rượt đuổi trong Game Loop
   */
  update(deltaTime) {
    if (this.state === 'IDLE') return;

    if (!this.game.player || !this.game.player.meshGroup) return;
    const playerPos = this.game.player.meshGroup.position;

    // 1. Nhấp nháy Đèn Còi Cảnh Sát Siren & Laser Scanner Sweep
    this.sirenTimer += deltaTime * 14;
    const pulse = Math.sin(this.sirenTimer);

    // Laser Red Scanner quét qua quét lại ở cản trước
    if (this.scannerMesh) {
      this.scannerMesh.position.x = Math.sin(this.sirenTimer * 1.2) * 0.65;
    }

    // Cần cẩu nhún nhẹ nhịp nhàng
    if (this.craneGroup) {
      this.craneGroup.rotation.z = Math.sin(this.sirenTimer * 0.8) * 0.04;
    }

    // Còi Siren nhấp nháy Đỏ - Cyan liên tục
    if (this.redSirenLight && this.blueSirenLight && this.sirenPointLight) {
      if (pulse > 0) {
        this.redSirenLight.material.emissiveIntensity = 3.5;
        this.blueSirenLight.material.emissiveIntensity = 0.1;
        this.sirenPointLight.color.setHex(0xff0033);
        if (this.strobeLights[0]) this.strobeLights[0].material.emissiveIntensity = 3.0;
        if (this.strobeLights[1]) this.strobeLights[1].material.emissiveIntensity = 0.1;
      } else {
        this.redSirenLight.material.emissiveIntensity = 0.1;
        this.blueSirenLight.material.emissiveIntensity = 3.5;
        this.sirenPointLight.color.setHex(0x00f5d4);
        if (this.strobeLights[0]) this.strobeLights[0].material.emissiveIntensity = 0.1;
        if (this.strobeLights[1]) this.strobeLights[1].material.emissiveIntensity = 3.0;
      }
    }

    // Quay 6 bánh xe khi xe chạy
    const wheelSpin = deltaTime * (this.game.gameSpeed || 15) * 1.5;
    this.wheels.forEach(w => w.rotateX(wheelSpin));

    // 2. State Logic
    if (this.state === 'PURSUING') {
      // Đếm ngược thời gian Cắt Đuôi
      this.timer -= deltaTime;
      if (this.timer <= 0) {
        this.timer = 0;
        this._escapedSuccessfully();
        return;
      }

      // Xe cẩu duy trì khoảng cách đằng sau Player
      const targetZ = playerPos.z + this.followDistance;
      const targetX = playerPos.x;

      // Nội suy di chuyển mượt mà (Lerp)
      this.meshGroup.position.z = THREE.MathUtils.lerp(this.meshGroup.position.z, targetZ, deltaTime * 6);
      this.meshGroup.position.x = THREE.MathUtils.lerp(this.meshGroup.position.x, targetX, deltaTime * 8);
      this.meshGroup.position.y = playerPos.y; // Cùng độ cao
    } else if (this.state === 'ESCAPED') {
      // Xe cẩu thụt lùi xa dần ra phía sau
      this.meshGroup.position.z += deltaTime * 20;
      if (this.meshGroup.position.z > playerPos.z + 35) {
        this.reset();
      }
    }
  }

  /**
   * Người chơi cắt đuôi thành công! (Survived 15s)
   */
  _escapedSuccessfully() {
    this.state = 'ESCAPED';

    // Tắt còi hú
    if (this.game.audioManager) {
      this.game.audioManager.stopSirenSFX();
    }

    // Cộng thưởng Cà phê & EXP
    if (this.game.currencyManager) {
      this.game.currencyManager.addCoins(PURSUIT_CONFIG.REWARD_COINS);
    }
    if (this.game.playerManager) {
      this.game.playerManager.addExp(PURSUIT_CONFIG.REWARD_EXP);
    }
  }

  /**
   * Xử lý va chạm chướng ngại vật khi đang bị rượt đuổi
   * @returns {boolean} True nếu va chạm khiến người chơi bị bắt
   */
  onPlayerHitObstacle() {
    if (this.state === 'PURSUING') {
      this.state = 'CAUGHT';
      if (this.game.audioManager) {
        this.game.audioManager.stopSirenSFX();
        this.game.audioManager.playCrash();
      }
      return true; // Ép Game Over lập tức!
    }
    return false;
  }

  /**
   * Reset trạng thái Pursuit Manager khi ngắt/chơi lại game
   */
  reset() {
    this.state = 'IDLE';
    this.timer = 0;
    this.meshGroup.visible = false;

    if (this.game.audioManager) {
      this.game.audioManager.stopSirenSFX();
    }
  }
}

