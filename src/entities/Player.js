import * as THREE from 'three';
import { LANE, PHYSICS, CHARACTERS } from '../utils/Constants.js';
import { AssetManager } from '../managers/AssetManager.js';

export class Player {
  constructor(scene, skinId = 'shipper') {
    this.scene = scene;
    this.skinId = skinId;

    // Quản lý vị trí làn đường
    this.currentLaneIndex = 1; // 0: Trái, 1: Giữa, 2: Phải
    this.targetLaneX = LANE.CENTER;

    // Trạng thái vật lý & Đứng trên nóc xe (Platforming)
    this.isJumping = false;
    this.isSliding = false;
    this.velocityY = 0;
    this.slideTimer = 0;
    this.currentPlatformY = 0; // Cao độ mặt đất tạm thời khi chạy trên nóc ô tô / xe buýt

    // Giáp Nón Lá
    this.hasShield = false;
    this.shieldMeshGroup = null;
    this.shieldRotation = 0;

    // === BỔ SUNG QUẢN LÝ CÀ PHÊ & TỐC ĐỘ ===
    this.coffeeCount = 0;
    this.speedTier = 1;

    // Các biến lưu trữ kích thước hình học gốc
    this.originalHeight = 1.6;

    // Biến quản lý chuyển động bánh xe & đánh lái Siêu Xe (Group Pivot Wrapper Pattern)
    this.carFrontWheelPivots = [];
    this.carAllWheelMeshes = [];
    this.currentSteerAngle = 0;
    this.carWheelRollAngle = 0;

    // Nhóm đối tượng chứa toàn bộ Mesh nhân vật
    this.meshGroup = new THREE.Group();
    this.visualGroup = new THREE.Group();
    this.meshGroup.add(this.visualGroup);

    this.boundingBox = new THREE.Box3();

    this.init();
  }

  init() {
    this.buildCharacterSkin(this.skinId);
    this.buildShieldMesh();

    // Căn chỉnh vị trí ban đầu của group
    this.meshGroup.position.set(LANE.CENTER, PHYSICS.PLAYER_GROUND_Y, 0);

    // Thêm nhân vật vào scene chính
    this.scene.add(this.meshGroup);

    // Cập nhật bounding box ban đầu
    this.updateBoundingBox();
  }

  setSkin(skinId) {
    this.skinId = skinId;
    // Dọn dẹp visualGroup cũ
    while (this.visualGroup.children.length > 0) {
      const child = this.visualGroup.children[0];
      this.visualGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    }
    this.buildCharacterSkin(skinId);
  }
  // code viet anh fix start
  buildCharacterSkin(skinId) {
    // Lấy cấu hình trực tiếp từ Constants.js dựa vào id (hoặc modelKey)
    const config = Object.values(CHARACTERS).find(c => c.id === skinId || c.modelKey === skinId);

    if (!config) {
      if (typeof this._buildShipperSkin === 'function') this._buildShipperSkin();
      return;
    }

    // 1. NẾU LÀ SKIN VẼ BẰNG THREE.JS THỦ CÔNG (Shipper / Barista)
    if (config.customBuild && typeof this[config.customBuild] === 'function') {
      this[config.customBuild]();
      this.saveOriginalMaterials();
      return;
    }

    // 2. NẾU LÀ SKIN LOAD TỪ FILE GLB (Student / Lamborghini / Cyberpsycho / Orion Skylark...)
    const modelKey = config.modelKey || skinId;
    const rawModel = AssetManager.getModel(modelKey);

    if (!rawModel) {
      if (typeof this._buildShipperSkin === 'function') this._buildShipperSkin();
      return;
    }

    const modelClone = rawModel.clone();

    // A. Xử lý Vật liệu (Material & Shadow)
    modelClone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        if (config.isCar && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach(mat => {
            mat.side = THREE.FrontSide;
            if (mat.emissive) { mat.emissive.setHex(0x000000); mat.emissiveIntensity = 0; }
            const matName = (mat.name || '').toLowerCase();
            const nodeName = (child.name || '').toLowerCase();
            if (!matName.includes('glass') && !nodeName.includes('glass') && mat.transparent) {
              mat.transparent = false;
              mat.depthWrite = true;
            }
          });
        }
      }
    });

    // B. Căn chỉnh Kích thước (Scale) & Vị trí
    const bbox = new THREE.Box3().setFromObject(modelClone);
    const size = bbox.getSize(new THREE.Vector3());

    if (size.y > 0) {
      if (config.targetHeight) {
        const scaleFactor = config.targetHeight / size.y;
        modelClone.scale.set(scaleFactor, scaleFactor, scaleFactor);
      } else if (config.targetWidth) {
        const scaleFactor = config.targetWidth / size.x;
        modelClone.scale.set(scaleFactor, scaleFactor, scaleFactor);
      } else if (config.scale) {
        modelClone.scale.set(...config.scale);
      }

      const scaledBbox = new THREE.Box3().setFromObject(modelClone);
      const scaledCenter = scaledBbox.getCenter(new THREE.Vector3());

      if (config.isCar) {
        modelClone.position.x = -scaledCenter.x;
        modelClone.position.z = -scaledCenter.z;
      }
      modelClone.position.y = -scaledBbox.min.y;
    }

    // C. Xoay hướng xe
    if (config.rotationY !== undefined) {
      modelClone.rotation.y = config.rotationY;
    }

    // D. Hoàn tất & Render
    if (config.isCar) this.carShadowMesh = null;
    this.visualGroup.add(modelClone);
    this.saveOriginalMaterials();
  }

  saveOriginalMaterials() {
    this.visualGroup.traverse((child) => {
      if (!child.isMesh || !child.material || Array.isArray(child.material)) return;
      child.material = child.material.clone();
      const { color, emissive, emissiveIntensity } = child.material;
      if (color) child.userData.originalColor = color.clone();
      if (emissive) {
        child.userData.originalEmissive = emissive.clone();
        child.userData.originalEmissiveIntensity = emissiveIntensity || 0;
      }
    });
  }

  restoreOriginalSkin() {
    this.stopSliding?.();
    this.visualGroup.scale.set(1.0, 1.0, 1.0);
    this.visualGroup.rotation.set(0, 0, 0);

    this.visualGroup.traverse((child) => {
      const mat = child.material;
      if (!child.isMesh || !mat) return;

      if (child.userData.originalColor) mat.color?.copy(child.userData.originalColor);
      if (mat.emissive) {
        mat.emissive.copy(child.userData.originalEmissive || new THREE.Color(0x000000));
        mat.emissiveIntensity = child.userData.originalEmissiveIntensity ?? 0;
      }
    });

    if (this.boostAuraRing) {
      this.boostAuraRing.visible = false;
      if (this.boostAuraRing.material) this.boostAuraRing.material.opacity = 0;
    }
  } // code viet anh fix end

  _buildShipperSkin() {
    // 1. Thân xe tay ga công nghệ khí động học (Sleek Tech Scooter / Motorbike)
    const bikeMat = new THREE.MeshStandardMaterial({ color: 0x0091ea, roughness: 0.25, metalness: 0.65 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.15, metalness: 0.95 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1f1f2e, roughness: 0.8, metalness: 0.2 });

    // Khung thân chính thon vuốt (Curved Aerodynamic Body Frame)
    const bodyGeo = new THREE.CylinderGeometry(0.24, 0.28, 1.45, 14);
    const body = new THREE.Mesh(bodyGeo, bikeMat);
    body.rotation.x = Math.PI / 2;
    body.position.set(0, 0.42, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    this.visualGroup.add(body);

    // Mặt nạ trước thon vút (Front Fairing Cowl)
    const cowlGeo = new THREE.ConeGeometry(0.25, 0.65, 12);
    const cowl = new THREE.Mesh(cowlGeo, bikeMat);
    cowl.rotation.x = -Math.PI / 3;
    cowl.position.set(0, 0.58, -0.65);
    cowl.castShadow = true;
    this.visualGroup.add(cowl);

    // Ghi-đông tay lái & Kính chiếu hậu (Chrome Handlebars & Mirrors)
    const handlebar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.62, 10), chromeMat);
    handlebar.rotation.z = Math.PI / 2;
    handlebar.position.set(0, 0.88, -0.55);
    this.visualGroup.add(handlebar);

    for (let m = -1; m <= 1; m += 2) {
      const mirrorStem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6), chromeMat);
      mirrorStem.position.set(m * 0.3, 0.98, -0.55);
      mirrorStem.rotation.z = m * 0.3;
      this.visualGroup.add(mirrorStem);

      const mirrorHead = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), darkMat);
      mirrorHead.scale.set(1, 0.7, 0.2);
      mirrorHead.position.set(m * 0.35, 1.08, -0.55);
      this.visualGroup.add(mirrorHead);
    }

    // Đèn LED pha kép đôi siêu sáng (Dual LED Headlights)
    const lightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.5 });
    for (let l = -1; l <= 1; l += 2) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), lightMat);
      lamp.position.set(l * 0.1, 0.62, -0.82);
      this.visualGroup.add(lamp);
    }

    // 2. Bánh xe mâm đúc thể thao & Vỏ cao su (Sport Alloy Wheels & Rubber Tires)
    for (let w = -1; w <= 1; w += 2) {
      const zWheel = w * 0.62;
      const tire = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.08, 12, 24), darkMat);
      tire.rotation.y = Math.PI / 2;
      tire.position.set(0, 0.28, zWheel);
      tire.castShadow = true;
      this.visualGroup.add(tire);

      // Mâm mạ chrome 5 chấu thể thao (5-Spoke Alloy Rim)
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 12), chromeMat);
      rim.rotation.z = Math.PI / 2;
      rim.position.set(0, 0.28, zWheel);
      this.visualGroup.add(rim);
    }

    // 3. Thùng giao hàng Shipper công nghệ vuông vắn có nhãn phát sáng (Tech Delivery Box)
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x00c853, roughness: 0.4, metalness: 0.1 });
    const deliveryBox = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.58, 0.52), boxMat);
    deliveryBox.position.set(0, 0.88, 0.42);
    deliveryBox.castShadow = true;
    this.visualGroup.add(deliveryBox);

    // Tem nhãn logo phát sáng trên thùng hàng
    const badgeMat = new THREE.MeshStandardMaterial({ color: 0xffd600, emissive: 0xffab00, emissiveIntensity: 0.8 });
    const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.22), badgeMat);
    badge.position.set(0, 0.88, 0.69);
    this.visualGroup.add(badge);

    // 4. Nhân vật Anh Shipper (Delivery Rider Character)
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffcc80, roughness: 0.8 });
    const jacketMat = new THREE.MeshStandardMaterial({ color: 0x00b0ff, roughness: 0.5 }); // Áo khoác xanh công nghệ
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.7 }); // Quần jeans
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0x0288d1, roughness: 0.3, metalness: 0.5 }); // Mũ bảo hiểm Fullface
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.85 }); // Kính chắn gió đen bóng

    // Thân người ngồi lái hơi chúi về trước
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.55, 12), jacketMat);
    torso.position.set(0, 0.88, -0.15);
    torso.rotation.x = 0.2;
    torso.castShadow = true;
    this.visualGroup.add(torso);

    // Chân ngồi gác lên sàn xe
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.35, 0.42), pantsMat);
    legs.position.set(0, 0.55, -0.1);
    this.visualGroup.add(legs);

    // Cánh tay cầm ghi-đông
    for (let a = -1; a <= 1; a += 2) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.38, 8), jacketMat);
      arm.position.set(a * 0.22, 0.82, -0.36);
      arm.rotation.x = -0.7;
      arm.rotation.z = a * 0.2;
      this.visualGroup.add(arm);
    }

    // Đầu & Mũ bảo hiểm Fullface cá tính
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 16), helmetMat);
    helmet.position.set(0, 1.25, -0.22);
    helmet.castShadow = true;
    this.visualGroup.add(helmet);

    // Kính chắn gió đen bóng cá tính của nón bảo hiểm
    const visor = new THREE.Mesh(new THREE.SphereGeometry(0.192, 16, 16, 0, Math.PI, 0, Math.PI / 2), visorMat);
    visor.rotation.x = Math.PI / 4;
    visor.position.set(0, 1.25, -0.22);
    this.visualGroup.add(visor);
  }

  _buildAoDaiSkin() {
    // 1. Thân Scooter trắng ngọc trai
    const bikeGeo = new THREE.BoxGeometry(0.48, 0.58, 1.5);
    const bikeMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.1, metalness: 0.3 });
    const bike = new THREE.Mesh(bikeGeo, bikeMat);
    bike.position.set(0, 0.38, 0);
    bike.castShadow = true;
    this.visualGroup.add(bike);

    // 2. Yên xe màu nâu đậm
    const seatGeo = new THREE.BoxGeometry(0.42, 0.15, 0.7);
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.8 });
    const seat = new THREE.Mesh(seatGeo, seatMat);
    seat.position.set(0, 0.7, 0.1);
    this.visualGroup.add(seat);

    // 3. Nhân vật Nữ sinh Áo Dài trắng
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const bodyGeo = new THREE.CylinderGeometry(0.18, 0.25, 0.9, 12);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 1.0, 0);
    body.castShadow = true;
    this.visualGroup.add(body);

    const headGeo = new THREE.SphereGeometry(0.18, 12, 12);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc80 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 1.5, 0);
    head.castShadow = true;
    this.visualGroup.add(head);

    // Tóc dài đen thả vai
    const hairGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.6, 12);
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 1.45, 0.05);
    this.visualGroup.add(hair);

    // 4. Nón Lá nhỏ đội đầu
    const nonLaGeo = new THREE.ConeGeometry(0.35, 0.2, 16);
    const nonLaMat = new THREE.MeshStandardMaterial({ color: 0xfff59d, roughness: 0.6 });
    const nonLa = new THREE.Mesh(nonLaGeo, nonLaMat);
    nonLa.position.set(0, 1.65, 0);
    this.visualGroup.add(nonLa);
  }

  _buildBaristaSkin() {
    const baristaGroup = new THREE.Group();

    // =========================================================
    // 1. MÔ HÌNH XE TAY GA VESPA NÂU CỔ ĐIỂN (COFFEE VESPA SCOOTER)
    // =========================================================
    // Thân dưới xe Vespa uốn cong mượt mà (Caramel Cream Gold Body)
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xffb300,       // Vàng kem caramel rực rỡ tươi sáng
      metalness: 0.75,
      roughness: 0.2
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xf5f5f5,
      metalness: 0.95,
      roughness: 0.1
    });
    const blackRubberMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.8 });

    // Thân xe chính
    const mainBody = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 1.4, 16), bodyMat);
    mainBody.rotation.x = Math.PI / 2;
    mainBody.position.set(0, 0.45, 0);
    mainBody.castShadow = true;
    mainBody.receiveShadow = true;
    baristaGroup.add(mainBody);

    // Mặt nạ đầu xe Vespa uốn khum phía trước
    const frontFairing = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.3, 0.65, 16), bodyMat);
    frontFairing.position.set(0, 0.58, -0.65);
    frontFairing.rotation.x = Math.PI / 12;
    frontFairing.castShadow = true;
    baristaGroup.add(frontFairing);

    // Viền crom mạ bóng dọc mặt nạ
    const trimStrip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.05), chromeMat);
    trimStrip.position.set(0, 0.58, -0.81);
    baristaGroup.add(trimStrip);

    // Đèn pha tròn cổ điển phát sáng ấm áp
    const headlightGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.1, 16);
    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffecb3,
      emissiveIntensity: 1.0,
      roughness: 0.1
    });
    const headlight = new THREE.Mesh(headlightGeo, headlightMat);
    headlight.rotation.x = Math.PI / 2;
    headlight.position.set(0, 0.78, -0.78);
    baristaGroup.add(headlight);

    // Ghi-đông tay lái & 2 gương chiếu hậu tròn mạ crom
    const handlebar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.72, 12), chromeMat);
    handlebar.rotation.z = Math.PI / 2;
    handlebar.position.set(0, 0.88, -0.55);
    baristaGroup.add(handlebar);

    // 2 Tay cầm đen
    const gripL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.14, 12), blackRubberMat);
    gripL.rotation.z = Math.PI / 2;
    gripL.position.set(-0.35, 0.88, -0.55);
    baristaGroup.add(gripL);
    const gripR = gripL.clone();
    gripR.position.x = 0.35;
    baristaGroup.add(gripR);

    // 2 Gương chiếu hậu mạ crom
    const mirrorStemGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.22, 8);
    const mirrorGlassGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.03, 12);
    const mirrorMat = new THREE.MeshStandardMaterial({ color: 0xe0f7fa, metalness: 0.9, roughness: 0.1 });

    const mirrorLGroup = new THREE.Group();
    const stemL = new THREE.Mesh(mirrorStemGeo, chromeMat);
    stemL.rotation.z = -Math.PI / 6;
    mirrorLGroup.add(stemL);
    const glassL = new THREE.Mesh(mirrorGlassGeo, mirrorMat);
    glassL.rotation.x = Math.PI / 2;
    glassL.position.set(-0.06, 0.12, 0);
    mirrorLGroup.add(glassL);
    mirrorLGroup.position.set(-0.32, 0.95, -0.55);
    baristaGroup.add(mirrorLGroup);

    const mirrorRGroup = mirrorLGroup.clone();
    mirrorRGroup.position.x = 0.32;
    mirrorRGroup.rotation.y = Math.PI;
    baristaGroup.add(mirrorRGroup);

    // Yên xe bọc da màu kem (Cream Tan Leather Seat)
    const seatMat = new THREE.MeshStandardMaterial({ color: 0xd7ccc8, roughness: 0.6 });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.75), seatMat);
    seat.position.set(0, 0.76, 0.1);
    baristaGroup.add(seat);

    // 2 Bánh xe mâm mạ crom
    const wheelGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.18, 16);
    const wheelRimMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.95, roughness: 0.1 });

    const wheelLGroup = new THREE.Group();
    const tireF = new THREE.Mesh(wheelGeo, blackRubberMat);
    tireF.rotation.z = Math.PI / 2;
    tireF.castShadow = true;
    wheelLGroup.add(tireF);
    const rimF = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.19, 12), wheelRimMat);
    rimF.rotation.z = Math.PI / 2;
    wheelLGroup.add(rimF);

    wheelLGroup.position.set(0, 0.26, -0.65);
    baristaGroup.add(wheelLGroup);

    const wheelRGroup = wheelLGroup.clone();
    wheelRGroup.position.z = 0.65;
    baristaGroup.add(wheelRGroup);

    // =========================================================
    // 2. KHAY GIÁ CHỞ CÀ PHÊ PHÍA SAU YÊN XE (TAKEOUT COFFEE RACK)
    // =========================================================
    const rackGroup = new THREE.Group();
    const rackFrameMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.7 });
    const rackBase = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.48), rackFrameMat);
    rackBase.position.set(0, 0.8, 0.62);
    rackGroup.add(rackBase);

    // 3 Ly Cà Phê sữa đá nắp cam phát sáng
    const cupMat = new THREE.MeshStandardMaterial({ color: 0xff6f00, emissive: 0xff8f00, emissiveIntensity: 0.4, roughness: 0.3 });
    const lidMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });

    const cupPositions = [
      { x: -0.16, z: 0.58 },
      { x: 0.16, z: 0.58 },
      { x: 0, z: 0.72 }
    ];

    cupPositions.forEach(cp => {
      const cupG = new THREE.Group();
      const cupBody = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.18, 12), cupMat);
      cupBody.position.y = 0.09;
      cupG.add(cupBody);

      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 12), lidMat);
      lid.position.y = 0.19;
      cupG.add(lid);

      cupG.position.set(cp.x, 0.84, cp.z);
      rackGroup.add(cupG);
    });

    baristaGroup.add(rackGroup);

    // =========================================================
    // 3. NHÂN VẬT ANH CHÀNG BARISTA 3D CỰC PHONG CÁCH
    // =========================================================
    const driverGroup = new THREE.Group();

    // Torso Áo sơ mi trắng
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.6 });
    const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.48, 0.36), shirtMat);
    shirt.position.set(0, 1.08, -0.12);
    shirt.castShadow = true;
    driverGroup.add(shirt);

    // Tạp dề da Barista màu nâu chéo dây vai (Brown Leather Apron)
    const apronMat = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.5 });
    const apron = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.42, 0.06), apronMat);
    apron.position.set(0, 1.05, -0.31);
    driverGroup.add(apron);

    // 2 Cánh tay vươn ra nắm ghi-đông
    const armMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.6 });
    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.45, 8), armMat);
    armL.rotation.x = -Math.PI / 3;
    armL.position.set(-0.25, 1.02, -0.32);
    driverGroup.add(armL);

    const armR = armL.clone();
    armR.position.x = 0.25;
    driverGroup.add(armR);

    // Đầu & Mặt người
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffd180, roughness: 0.6 });
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 14), skinMat);
    headMesh.position.set(0, 1.45, -0.18);
    headMesh.castShadow = true;
    driverGroup.add(headMesh);

    // Mắt & Kính cận nhẹ/phong cách Barista
    const glassesMat = new THREE.MeshStandardMaterial({ color: 0x212121, metalness: 0.8, roughness: 0.2 });
    const glasses = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.06), glassesMat);
    glasses.position.set(0, 1.47, -0.33);
    driverGroup.add(glasses);

    // Tóc xoăn màu nâu đen
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x271c19, roughness: 0.8 });
    const hair = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2, 1), hairMat);
    hair.position.set(0, 1.56, -0.16);
    driverGroup.add(hair);

    // Mũ nồi Beret nghiêng phong cách Pháp
    const beretMat = new THREE.MeshStandardMaterial({ color: 0x1a237e, roughness: 0.5 });
    const beret = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.09, 14), beretMat);
    beret.position.set(-0.04, 1.62, -0.18);
    beret.rotation.z = -0.18;
    driverGroup.add(beret);

    baristaGroup.add(driverGroup);

    this.visualGroup.add(baristaGroup);
  }

  buildShieldMesh() {
    this.shieldMeshGroup = new THREE.Group();

    // 1. Khối cầu khiên năng lượng Hologram trong suốt (Translucent Plasma Energy Dome)
    const sphereGeo = new THREE.SphereGeometry(1.25, 32, 32);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.position.set(0, 0.85, 0);
    this.shieldMeshGroup.add(sphere);

    // 2. Lưới ma trận năng lượng kim cương xoay 3D (Energy Wireframe Matrix)
    const gridGeo = new THREE.IcosahedronGeometry(1.28, 2);
    const gridMat = new THREE.MeshBasicMaterial({
      color: 0xffea00,
      wireframe: true,
      transparent: true,
      opacity: 0.55
    });
    this.shieldGrid = new THREE.Mesh(gridGeo, gridMat);
    this.shieldGrid.position.set(0, 0.85, 0);
    this.shieldMeshGroup.add(this.shieldGrid);

    // 3. Vòng đai hào quang năng lượng xoay quanh xích đạo (Equatorial Energy Ring)
    const ringGeo = new THREE.TorusGeometry(1.32, 0.04, 16, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffd600,
      transparent: true,
      opacity: 0.95
    });
    this.shieldRing = new THREE.Mesh(ringGeo, ringMat);
    this.shieldRing.position.set(0, 0.85, 0);
    this.shieldRing.rotation.x = Math.PI / 2 + 0.2;
    this.shieldMeshGroup.add(this.shieldRing);

    this.shieldMeshGroup.visible = false;
    this.meshGroup.add(this.shieldMeshGroup);
  }

  // --- HỆ THỐNG KHIÊN BẢO VỆ CHUẨN ĐÉT KHỚP VỚI OBSTACLE MANAGER ---
  enableShield() {
    this.hasShield = true;
    if (this.shieldMeshGroup) {
      this.shieldMeshGroup.visible = true;
    }
  }

  consumeShield() {
    this.hasShield = false;
    if (this.shieldMeshGroup) {
      this.shieldMeshGroup.visible = false;
    }
  }

  // --- HỆ THỐNG ĐẾM CÀ PHÊ & KÍCH HOẠT TĂNG TỐC ---
  collectCoffee(coffeesPerTier = 10, onSpeedUp) {
    this.coffeeCount++;
    if (this.coffeeCount >= coffeesPerTier) {
      this.coffeeCount = 0;
      this.speedTier++;
      if (typeof onSpeedUp === 'function') {
        onSpeedUp(this.speedTier);
      }
    }
    return this.coffeeCount;
  }

  moveLeft() {
    if (this.currentLaneIndex > 0) {
      this.currentLaneIndex--;
      this.updateTargetLane();
    }
  }

  moveRight() {
    if (this.currentLaneIndex < 2) {
      this.currentLaneIndex++;
      this.updateTargetLane();
    }
  }

  updateTargetLane() {
    const lanes = [LANE.LEFT, LANE.CENTER, LANE.RIGHT];
    this.targetLaneX = lanes[this.currentLaneIndex];
  }

  jump() {
    if (this.isSliding) {
      this.stopSliding();
    }
    if (!this.isJumping) {
      this.isJumping = true;
      const force = this.isHighJumpActive ? PHYSICS.HIGH_JUMP_FORCE : PHYSICS.JUMP_FORCE;
      this.velocityY = force;
      return true;
    }
    return false;
  }

  enableHighJump() {
    this.isHighJumpActive = true;
  }

  disableHighJump() {
    this.isHighJumpActive = false;
  }

  slide() {
    if (this.isJumping) {
      this.velocityY = -PHYSICS.JUMP_FORCE * 0.8;
      this.isJumping = false;
      this.isSliding = true;
      this.slideTimer = PHYSICS.SLIDE_DURATION;
      this.visualGroup.scale.y = 0.5;
    }
    else if (!this.isSliding) {
      this.isSliding = true;
      this.slideTimer = PHYSICS.SLIDE_DURATION;
      this.visualGroup.scale.y = 0.5;
    }
  }

  stopSliding() {
    this.isSliding = false;
    this.slideTimer = 0;
    this.visualGroup.scale.y = 1.0;
  }

  _buildCarDriverSkin() {
    const carGroup = new THREE.Group();

    // 1. Thân xe Ô tô thể thao / Coupe sang trọng (Crimson Racing Red Metallic Body)
    const carBodyGeo = new THREE.BoxGeometry(1.15, 0.55, 2.1);
    const carBodyMat = new THREE.MeshStandardMaterial({
      color: 0xff1744,      // Đỏ Sportscar Rực Rỡ nổi bật 100% trong đêm
      emissive: 0xd50000,
      emissiveIntensity: 0.25,
      metalness: 0.85,
      roughness: 0.18
    });
    const carBody = new THREE.Mesh(carBodyGeo, carBodyMat);
    carBody.position.set(0, 0.42, 0);
    carBody.castShadow = true;
    carBody.receiveShadow = true;
    carGroup.add(carBody);

    // Mũi ca-pô vuốt hơi thấp ở phía trước
    const hoodGeo = new THREE.BoxGeometry(1.12, 0.35, 0.7);
    const hood = new THREE.Mesh(hoodGeo, carBodyMat);
    hood.position.set(0, 0.35, -0.9);
    hood.castShadow = true;
    carGroup.add(hood);

    // Lưới tản nhiệt mạ kim mạ vàng phía trước ca-pô
    const grilleGeo = new THREE.BoxGeometry(0.75, 0.18, 0.06);
    const grilleMat = new THREE.MeshStandardMaterial({ color: 0xffd600, metalness: 0.9, roughness: 0.1 });
    const grille = new THREE.Mesh(grilleGeo, grilleMat);
    grille.position.set(0, 0.32, -1.26);
    carGroup.add(grille);

    // 2. Mui xe & Kính chắn gió mờ sang trọng (Windshield & Roof)
    const roofGeo = new THREE.BoxGeometry(1.02, 0.45, 0.95);
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0xd50000,
      metalness: 0.7,
      roughness: 0.2
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 0.85, 0.05);
    carGroup.add(roof);

    // Kính chắn gió trước & sau (Windshield Glass)
    const glassGeo = new THREE.BoxGeometry(0.96, 0.36, 0.98);
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x80deea,
      transparent: true,
      opacity: 0.55,
      roughness: 0.1,
      metalness: 0.9
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.set(0, 0.86, 0.05);
    carGroup.add(glass);

    // 3. Đèn Pha LED Trước & Đèn Hậu Đỏ Phát Sáng
    const lightMatHead = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x80deea,
      emissiveIntensity: 0.9,
      roughness: 0.1
    });
    const lightMatTail = new THREE.MeshStandardMaterial({
      color: 0xff1744,
      emissive: 0xd50000,
      emissiveIntensity: 0.8,
      roughness: 0.1
    });

    // 2 Đèn pha trước
    const headL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.06), lightMatHead);
    headL.position.set(-0.42, 0.42, -1.26);
    carGroup.add(headL);
    const headR = headL.clone();
    headR.position.x = 0.42;
    carGroup.add(headR);

    // 2 Đèn hậu sau
    const tailL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.06), lightMatTail);
    tailL.position.set(-0.42, 0.46, 1.06);
    carGroup.add(tailL);
    const tailR = tailL.clone();
    tailR.position.x = 0.42;
    carGroup.add(tailR);

    // 4. Bánh Xe Ô Tô Cao Su Mâm Mạ Crom (4 Wheels)
    const wheelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.18, 16);
    const wheelTireMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.8 });
    const wheelRimMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.9, roughness: 0.1 });

    const wheelPositions = [
      { x: -0.58, z: -0.7 },
      { x: 0.58, z: -0.7 },
      { x: -0.58, z: 0.7 },
      { x: 0.58, z: 0.7 }
    ];

    wheelPositions.forEach(pos => {
      const wGroup = new THREE.Group();
      const tire = new THREE.Mesh(wheelGeo, wheelTireMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wGroup.add(tire);

      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.19, 12), wheelRimMat);
      rim.rotation.z = Math.PI / 2;
      wGroup.add(rim);

      wGroup.position.set(pos.x, 0.24, pos.z);
      carGroup.add(wGroup);
    });

    // 5. Nhân Vật Người Đàn Ông Lái Xe Ngồi Trong Xe (Male Businessman Driver)
    const driverGroup = new THREE.Group();

    // Đầu & Tóc nam quý ông
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.6 });
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), headMat);
    headMesh.position.set(0, 0.98, -0.1);
    driverGroup.add(headMesh);

    // Tóc tỉa vuốt đen lịch lãm
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.5 });
    const hairMesh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.26), hairMat);
    hairMesh.position.set(0, 1.08, -0.11);
    driverGroup.add(hairMesh);

    // Kính râm đen ngầu
    const glassesMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.1 });
    const glasses = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.08), glassesMat);
    glasses.position.set(0, 1.0, -0.22);
    driverGroup.add(glasses);

    // Vai & Áo Vest đen thắt cà vạt đỏ sang trọng
    const suitMat = new THREE.MeshStandardMaterial({ color: 0x1a237e, roughness: 0.5 });
    const suit = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.35, 0.3), suitMat);
    suit.position.set(0, 0.72, -0.05);
    driverGroup.add(suit);

    const tieMat = new THREE.MeshStandardMaterial({ color: 0xd50000, roughness: 0.3 });
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.05), tieMat);
    tie.position.set(0, 0.72, -0.21);
    driverGroup.add(tie);

    carGroup.add(driverGroup);

    this.visualGroup.add(carGroup);
  }

  updateBoundingBox() {
    const pos = this.meshGroup.position;
    const height = this.isSliding ? (this.originalHeight * 0.5) : this.originalHeight;

    // Cập nhật trực tiếp 0ms lag không cần duyệt lại toàn bộ cây Mesh
    this.boundingBox.min.set(pos.x - 0.35, pos.y, pos.z - 0.6);
    this.boundingBox.max.set(pos.x + 0.35, pos.y + height, pos.z + 0.6);
  }

  update(deltaTime, currentSpeed = 15.0) {
    // 1. Chuyển làn mượt mà (Lerp vị trí X)
    this.meshGroup.position.x = THREE.MathUtils.lerp(
      this.meshGroup.position.x,
      this.targetLaneX,
      deltaTime * LANE.SWITCH_SPEED
    );

    // 2. Xử lý logic Nhảy vật lý & Đứng trên nóc xe (Platforming)
    const effectiveGroundY = PHYSICS.PLAYER_GROUND_Y + this.currentPlatformY;

    if (this.isJumping) {
      this.velocityY -= PHYSICS.GRAVITY * deltaTime;
      this.meshGroup.position.y += this.velocityY * deltaTime;

      // Chỉ kiểm tra tiếp đất khi đang RƠI XUỐNG (velocityY <= 0) VÀ Y <= effectiveGroundY
      if (this.velocityY <= 0 && this.meshGroup.position.y <= effectiveGroundY) {
        this.meshGroup.position.y = effectiveGroundY;
        this.isJumping = false;
        this.velocityY = 0;
      }
    } else if (this.meshGroup.position.y > effectiveGroundY + 0.01) {
      // Đang rơi tự do off-platform
      this.velocityY -= PHYSICS.GRAVITY * deltaTime;
      this.meshGroup.position.y += this.velocityY * deltaTime;

      if (this.meshGroup.position.y <= effectiveGroundY) {
        this.meshGroup.position.y = effectiveGroundY;
        this.velocityY = 0;
      }
    } else {
      this.meshGroup.position.y = effectiveGroundY;
      this.velocityY = 0;
    }

    // 3. Xử lý logic Trượt
    if (this.isSliding) {
      this.slideTimer -= deltaTime * 1000;
      if (this.slideTimer <= 0) {
        this.stopSliding();
      }
    }



    // 4. HIỆU ỨNG NGHIÊNG NHÂN VẬT & XE THEO QUÁN TÍNH DI CHUYỂN (VEHICLE & CHARACTER TILTING & STEERING YAW)
    // 4a. Nghiêng trục Z (cuộn thân) & xoay nhẹ Y (bẻ đầu lái) khi chuyển làn Trái / Phải
    const dx = this.targetLaneX - this.meshGroup.position.x;
    let targetRotationZ = 0;
    let targetRotationY = 0;

    if (dx < -0.08) {
      targetRotationZ = -0.28; // Nghiêng cuộn Z mạnh mẽ sang trái (-0.28 rad)
      targetRotationY = 0.18;   // Bẻ đầu xe Y hướng sang trái (+0.18 rad)
    } else if (dx > 0.08) {
      targetRotationZ = 0.28;  // Nghiêng cuộn Z mạnh mẽ sang phải (+0.28 rad)
      targetRotationY = -0.18;  // Bẻ đầu xe Y hướng sang phải (-0.18 rad)
    }

    // 4b. Nghiêng trục X khi Nhảy lên / Rơi xuống / Trượt
    let targetRotationX = 0;
    if (this.isSliding) {
      targetRotationX = 0.30; // Chúi người thấp khi trượt dưới rào chắn
    } else if (this.isJumping) {
      if (this.velocityY > 0) {
        targetRotationX = -0.18; // Ngửa nhẹ người khi lao vút lên không trung
      } else {
        targetRotationX = 0.20;  // Chúi nhẹ người về phía trước chuẩn bị tiếp đất
      }
    }

    // 4c. Áp dụng LERP (Nội suy mượt mà các góc xoay Z, Y & X đuổi theo targetRotation)
    const lerpSpeed = Math.min(1.0, deltaTime * 14);
    this.visualGroup.rotation.z = THREE.MathUtils.lerp(this.visualGroup.rotation.z, targetRotationZ, lerpSpeed);
    this.visualGroup.rotation.y = THREE.MathUtils.lerp(this.visualGroup.rotation.y, targetRotationY, lerpSpeed);
    this.visualGroup.rotation.x = THREE.MathUtils.lerp(this.visualGroup.rotation.x, targetRotationX, lerpSpeed);

    // 4. Xoay đa chiều mượt mà cho các tầng khiên bảo vệ 3D
    if (this.hasShield && this.shieldMeshGroup) {
      this.shieldRotation += deltaTime * 2.5;
      this.shieldMeshGroup.rotation.y = this.shieldRotation;
      if (this.shieldGrid) this.shieldGrid.rotation.y = -this.shieldRotation * 1.6;
      if (this.shieldRing) this.shieldRing.rotation.z = this.shieldRotation * 2.8;
    }

    // 5. Cập nhật Hộp bao va chạm ở vị trí mới
    this.updateBoundingBox();
  }

  dispose() {
    this.scene.remove(this.meshGroup);
    this.meshGroup.traverse((child) => {
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
