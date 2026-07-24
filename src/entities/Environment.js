import * as THREE from 'three';
import { GAME_CONFIG, LANE } from '../utils/Constants.js';
import { createDetailedSidewalkScene } from './NPCManager.js';
import { AssetManager } from '../managers/AssetManager.js';

export class Environment {
  constructor(scene) {
    this.scene = scene;

    // Mảng chứa các đoạn đường chạy (tiles)
    this.segments = [];
    this.roadMaterials = [];
    this.streetLights = [];

    this.segmentLength = GAME_CONFIG.ROAD_SEGMENT_LENGTH;
    this.totalSegments = GAME_CONFIG.VISIBLE_ROAD_SEGMENTS;

    this.init();
  }

  setRoadWetness(wetFactor) {
    const roughness = THREE.MathUtils.lerp(0.8, 0.1, wetFactor);
    const metalness = THREE.MathUtils.lerp(0.1, 0.45, wetFactor);
    this.roadMaterials.forEach(mat => {
      mat.roughness = roughness;
      mat.metalness = metalness;
    });
  }

  setStreetLightsState(turnOn, intensity = 1.0) {
    this.streetLights.forEach(light => {
      if (light.isPointLight || light.isLight) {
        light.intensity = turnOn ? intensity : 0.0;
      } else if (light.material) {
        light.material.emissiveIntensity = turnOn ? 1.0 : 0.0;
      }
    });
  }

  init() {
    // 1. Tạo cụm InstancedMesh gộp hình học cho Cây Phong (maple_tree 5.8m cao vút) & Cây Thông (pine_tree 5.5m)
    this.mapleInstancedSystem = AssetManager.createInstancedTreeGroup('maple_tree', 50, 5.8);
    if (this.mapleInstancedSystem) {
      this.scene.add(this.mapleInstancedSystem.group);
    }

    this.pineInstancedSystem = AssetManager.createInstancedTreeGroup('pine_tree', 50, 5.2);
    if (this.pineInstancedSystem) {
      this.scene.add(this.pineInstancedSystem.group);
    }

    // Khởi tạo các đoạn đường liên kết nối tiếp nhau
    for (let i = 0; i < this.totalSegments; i++) {
      const zPos = 55 - (i * this.segmentLength);
      const segment = this.createSegment(zPos);
      this.scene.add(segment);
      this.segments.push(segment);
    }
  }

  createSegment(zPos) {
    const segment = new THREE.Group();
    segment.position.z = zPos;

    // 1. Mặt đường nhựa (Road) - plane nằm từ local Z=0 đến Z=-segmentLength
    // Tâm plane ở local Z = -segmentLength/2
    const roadGeo = new THREE.PlaneGeometry(9, this.segmentLength);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a24,
      roughness: 0.8,
      metalness: 0.1
    });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0;
    road.position.z = -this.segmentLength / 2;
    road.receiveShadow = true;
    segment.add(road);
    this.roadMaterials.push(roadMat);

    // 2. Vạch chia làn đường đứt quãng màu vàng ấm
    const stripeWidth = 0.15;
    const stripeLength = 4;
    const stripeGap = 3;
    const stripeCount = Math.ceil(this.segmentLength / (stripeLength + stripeGap));
    const stripeMaterial = new THREE.MeshBasicMaterial({ color: 0xffab00 }); // Màu vàng phân làn Việt Nam

    for (let i = 0; i < stripeCount; i++) {
      const z = - (i * (stripeLength + stripeGap)) - (stripeLength / 2);

      // Vạch trái phân cách làn trái và giữa (X = -1.5)
      const stripeLeft = new THREE.Mesh(new THREE.PlaneGeometry(stripeWidth, stripeLength), stripeMaterial);
      stripeLeft.rotation.x = -Math.PI / 2;
      stripeLeft.position.set(-1.5, 0.01, z);
      segment.add(stripeLeft);

      // Vạch phải phân cách làn giữa và phải (X = 1.5)
      const stripeRight = stripeLeft.clone();
      stripeRight.position.set(1.5, 0.01, z);
      segment.add(stripeRight);
    }

    // 3. Vỉa hè hai bên đường (Sidewalks) - màu gạch xám đỏ vỉa hè
    const sidewalkWidth = 4;
    const sidewalkHeight = 0.25;
    const sidewalkGeo = new THREE.BoxGeometry(sidewalkWidth, sidewalkHeight, this.segmentLength);
    const sidewalkMat = new THREE.MeshStandardMaterial({
      color: 0x424250, // Xám xi măng vỉa hè
      roughness: 0.9,
      metalness: 0.1
    });

    // Vỉa hè trái (X = -6.5)
    const sidewalkLeft = new THREE.Mesh(sidewalkGeo, sidewalkMat);
    sidewalkLeft.position.set(-6.5, sidewalkHeight / 2, -this.segmentLength / 2);
    sidewalkLeft.receiveShadow = true;
    segment.add(sidewalkLeft);

    // Vỉa hè phải (X = 6.5)
    const sidewalkRight = sidewalkLeft.clone();
    sidewalkRight.position.set(6.5, sidewalkHeight / 2, -this.segmentLength / 2);
    segment.add(sidewalkRight);

    // 4. Các tòa nhà phố Sài Gòn chân thực (Nhà ống, ban công, mái hiên & biển hiệu)
    this.buildBuildingsForSegment(segment);

    // 5. Cột đèn đường chiếu sáng (Streetlamps)
    this.buildStreetlampsForSegment(segment);

    // 6. Hàng cây xanh vỉa hè rậm rạp phong cách Sài Gòn (Street Trees)
    this.buildTreesForSegment(segment);

    // 7. Người dân Sài Gòn ngồi cà phê vỉa hè ghế nhựa, hút thuốc & tán chuyện (Sidewalk Pedestrians)
    this.buildPedestriansForSegment(segment);

    return segment;
  }

  buildBuildingsForSegment(segment) {
    const buildingColors = [
      0xfbc02d, // Vàng kem kiến trúc Pháp cổ
      0x00acc1, // Xanh lam ngọc
      0xe57373, // Hồng gạch ấm
      0x546e7a, // Xám xanh chung cư
      0x43a047, // Xanh lá mạ
      0xd81b60  // Hồng thẫm
    ];

    const brandSigns = [
      { text: 'BÁNH MÌ THÁI BÌNH 24/7', bg: '#c62828', textCol: '#ffff00' },
      { text: 'CÀ PHÊ THÁI BÌNH 1975', bg: '#e65100', textCol: '#ffffff' },
      { text: 'PHỞ THÌN THÁI BÌNH', bg: '#4e342e', textCol: '#fff8e1' },
      { text: 'HIGHLANDS COFFEE', bg: '#b71c1c', textCol: '#ffffff' },
      { text: 'TRÀ SỮA PHÚC LONG', bg: '#1b5e20', textCol: '#ffffff' },
      { text: 'VIETCOMBANK THÁI BÌNH', bg: '#004d40', textCol: '#76ff03' },
      { text: 'THÁI BÌNH CENTRE', bg: '#d50000', textCol: '#ffea00' },
      { text: 'REX HOTEL THÁI BÌNH', bg: '#ff6f00', textCol: '#ffffff' },
      { text: 'BIDV TOWER THÁI BÌNH', bg: '#0d47a1', textCol: '#ffffff' },
      { text: 'LANDMARK THÁI BÌNH', bg: '#1a237e', textCol: '#ffd600' }
    ];

    const awningColors = [0xff9800, 0x00e676, 0x29b6f6, 0xe91e63];

    const zOffset = 9;
    const numBuildings = Math.floor(this.segmentLength / zOffset);

    for (let i = 0; i < numBuildings; i++) {
      const z = - (i * zOffset) - (zOffset / 2);

      // --- NHÀ BÊN TRÁI ---
      const wL = 3.6 + Math.random() * 1.2;
      const hL = 9 + Math.random() * 8; // Cao 9m - 17m
      const dL = 7.5;
      const brandL = brandSigns[i % brandSigns.length];

      const houseGroupL = this.createRealisticBuilding(wL, hL, dL, buildingColors[i % buildingColors.length], awningColors[i % awningColors.length], false, brandL);
      houseGroupL.position.set(-10 - wL / 2, 0, z);
      segment.add(houseGroupL);

      // --- NHÀ BÊN PHẢI ---
      const wR = 3.6 + Math.random() * 1.2;
      const hR = 9 + Math.random() * 8;
      const dR = 7.5;
      const brandR = brandSigns[(i + 4) % brandSigns.length];

      const houseGroupR = this.createRealisticBuilding(wR, hR, dR, buildingColors[(i + 3) % buildingColors.length], awningColors[(i + 2) % awningColors.length], true, brandR);
      houseGroupR.position.set(10 + wR / 2, 0, z);
      segment.add(houseGroupR);
    }
  }

  _createBuildingTextTexture(text, bgColor = '#c62828', textColor = '#ffffff') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Nền biển hiệu với viền LED
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);

    // Chữ thương hiệu Sài Gòn in hoa phát sáng LED
    ctx.fillStyle = textColor;
    ctx.font = 'bold 38px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 10;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  createRealisticBuilding(w, h, d, mainColor, awningColor, isRightSide, brandInfo) {
    const group = new THREE.Group();

    // 1. Khối nhà chính
    const mainGeo = new THREE.BoxGeometry(w, h, d);
    const mainMat = new THREE.MeshStandardMaterial({ color: mainColor, roughness: 0.7, metalness: 0.1 });
    const mainMesh = new THREE.Mesh(mainGeo, mainMat);
    mainMesh.position.y = h / 2;
    mainMesh.castShadow = true;
    mainMesh.receiveShadow = true;
    group.add(mainMesh);

    // 2. Gờ mái & viền tường tầng trệt
    const ledgeGeo = new THREE.BoxGeometry(w + 0.3, 0.3, d + 0.3);
    const ledgeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const ledge = new THREE.Mesh(ledgeGeo, ledgeMat);
    ledge.position.y = 3.2; // Trên tầng trệt
    group.add(ledge);

    const roofLedge = ledge.clone();
    roofLedge.position.y = h + 0.15;
    group.add(roofLedge);

    // 3. Mái hiên di động cửa hàng (Awnings) ở tầng trệt
    const awningGeo = new THREE.BoxGeometry(0.8, 0.15, d - 1.0);
    const awningMat = new THREE.MeshStandardMaterial({ color: awningColor, roughness: 0.6 });
    const awning = new THREE.Mesh(awningGeo, awningMat);
    const xAwning = isRightSide ? -w / 2 - 0.3 : w / 2 + 0.3;
    awning.position.set(xAwning, 2.8, 0);
    awning.rotation.z = isRightSide ? 0.2 : -0.2;
    group.add(awning);

    // 4. Biển hiệu cửa hàng mặt tiền có chữ thương hiệu Sài Gòn (Storefront Signboard)
    if (brandInfo) {
      const signTex = this._createBuildingTextTexture(brandInfo.text, brandInfo.bg, brandInfo.textCol);
      const signMat = new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide });
      const signGeo = new THREE.PlaneGeometry(d - 1.8, 0.85);
      const sign = new THREE.Mesh(signGeo, signMat);

      // Xoay và gắn biển hiệu lên mặt tường quay ra đường
      sign.rotation.y = isRightSide ? -Math.PI / 2 : Math.PI / 2;
      sign.position.set(isRightSide ? -w / 2 - 0.08 : w / 2 + 0.08, 3.6, 0);
      group.add(sign);

      // Biển hiệu Neon LED trên mái nhà (dành cho tòa nhà cao h >= 13m)
      if (h >= 13) {
        const roofSignTex = this._createBuildingTextTexture(brandInfo.text, brandInfo.bg, brandInfo.textCol);
        const roofSignMat = new THREE.MeshBasicMaterial({ map: roofSignTex, side: THREE.DoubleSide });
        const roofSignGeo = new THREE.PlaneGeometry(d - 2.5, 1.2);
        const roofSign = new THREE.Mesh(roofSignGeo, roofSignMat);
        roofSign.rotation.y = isRightSide ? -Math.PI / 2 : Math.PI / 2;
        roofSign.position.set(isRightSide ? -w / 2 - 0.08 : w / 2 + 0.08, h + 0.9, 0);
        group.add(roofSign);
      }
    }

    // 5. Thêm chi tiết Cửa ra vào & Cửa sổ kính kiến trúc nhiều tầng
    this.addBuildingDetails(group, w, h, d, isRightSide);

    // 6. Bồn nước Inox trên mái nhà (Roof Water Tank)
    const tankGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.0, 10);
    const tankMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, metalness: 0.9, roughness: 0.1 });
    const tank = new THREE.Mesh(tankGeo, tankMat);
    tank.rotation.z = Math.PI / 2;
    tank.position.set(0, h + 0.8, (Math.random() - 0.5) * 2);
    group.add(tank);

    return group;
  }

  /**
   * Tự động thêm Cửa ra vào sát mặt đất & Mảng Cửa sổ kính cho các tầng tòa nhà
   */
  addBuildingDetails(buildingGroup, w, h, d, isRightSide) {
    const wallX = isRightSide ? -w / 2 - 0.03 : w / 2 + 0.03;

    // 1. CỬA RA VÀO MẶT TIỀN TẦNG TRỆT (Entrance Door)
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.6 });
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xffd600, metalness: 0.9, roughness: 0.1 });

    const doorGeo = new THREE.BoxGeometry(0.05, 2.2, 1.3);
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(wallX, 1.1, 0);
    door.castShadow = true;
    buildingGroup.add(door);

    // Tay nắm cửa kim loại đứng
    const handleGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8);
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(wallX + (isRightSide ? -0.04 : 0.04), 1.1, 0.35);
    buildingGroup.add(handle);

    // 2. MẢNG CỬA SỔ KÍNH THEO HÀNG & CỘT CÁC TẦNG (Window Grid)
    // Đặt y ban đầu từ 5.6 trở lên để không bao giờ bị đè vào biển hiệu cửa hàng (nằm ở y = 3.8)
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x80deea,
      roughness: 0.3,
      emissive: 0x006064,
      emissiveIntensity: 0.3
    });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x616161, roughness: 0.5 });

    const numFloors = Math.floor((h - 4.5) / 2.6);
    const numCols = Math.max(2, Math.floor((d - 1.8) / 2.0));

    for (let f = 0; f < numFloors; f++) {
      const y = 5.6 + f * 2.6; // Cao hẳn lên khỏi biển hiệu & mái hiên

      for (let c = 0; c < numCols; c++) {
        const z = - (d - 1.8) / 2 + (c + 0.5) * ((d - 1.8) / numCols);

        // Kính cửa sổ
        const glassGeo = new THREE.BoxGeometry(0.04, 1.15, 0.85);
        const glass = new THREE.Mesh(glassGeo, windowMat);
        glass.position.set(wallX, y, z);
        buildingGroup.add(glass);

        // Khung viền cửa sổ
        const frameGeo = new THREE.BoxGeometry(0.07, 1.28, 0.98);
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.set(wallX, y, z);
        buildingGroup.add(frame);
      }
    }
  }

  buildStreetlampsForSegment(segment) {
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x757575, metalness: 0.8, roughness: 0.2 });
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffeb3b });
    const lampHeight = 4.5;

    const poleGeo = new THREE.CylinderGeometry(0.08, 0.12, lampHeight, 8);
    const armGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8);
    const bulbGeo = new THREE.SphereGeometry(0.18, 8, 8);

    const zPositions = [-5, -this.segmentLength + 10];

    zPositions.forEach(z => {
      const poleL = new THREE.Mesh(poleGeo, lampMat);
      poleL.position.set(-4.6, lampHeight / 2, z);
      poleL.castShadow = true;
      segment.add(poleL);

      const armL = new THREE.Mesh(armGeo, lampMat);
      armL.rotation.z = Math.PI / 2;
      armL.position.set(-4.2, lampHeight - 0.1, z);
      segment.add(armL);

      const bulbL = new THREE.Mesh(bulbGeo, bulbMat);
      bulbL.position.set(-3.8, lampHeight - 0.2, z);
      segment.add(bulbL);

      const poleR = poleL.clone();
      poleR.position.x = 4.6;
      segment.add(poleR);

      const armR = armL.clone();
      armR.position.x = 4.2;
      segment.add(armR);

      const bulbR = bulbL.clone();
      bulbR.position.x = 3.8;
      segment.add(bulbR);
    });
  }

  buildTreesForSegment(segment) {
    // Luân phiên ngẫu nhiên giữa Cây Phong (Maple) và Cây Thông (Pine) đan xen 2 bên đường phố
    segment.treeConfigs = [
      { type: 'maple', localX: -5.2, localZ: -10, scale: 0.9 + Math.random() * 0.15, rotY: Math.random() * Math.PI * 2 },
      { type: 'pine',  localX: 5.2,  localZ: -10, scale: 0.9 + Math.random() * 0.15, rotY: Math.random() * Math.PI * 2 },
      { type: 'pine',  localX: -5.2, localZ: -28, scale: 0.9 + Math.random() * 0.15, rotY: Math.random() * Math.PI * 2 },
      { type: 'maple', localX: 5.2,  localZ: -28, scale: 0.9 + Math.random() * 0.15, rotY: Math.random() * Math.PI * 2 }
    ];
  }



  buildPedestriansForSegment(segment) {
    // Rải các cụm cảnh NPC vỉa hè (uống cà phê, bàn ghế nhựa choe loe, tán chuyện)
    const zPositions = [-6, -22, -34];

    zPositions.forEach((z, idx) => {
      // Bên trái vỉa hè (X = -5.3)
      if (idx % 2 === 0) {
        const sceneCoffee = createDetailedSidewalkScene('coffee');
        sceneCoffee.position.set(-5.3, 0, z);
        sceneCoffee.rotation.y = Math.PI / 2;
        segment.add(sceneCoffee);
      } else {
        const sceneChat = createDetailedSidewalkScene('chatting');
        sceneChat.position.set(-5.4, 0, z);
        sceneChat.rotation.y = Math.PI * 0.3;
        segment.add(sceneChat);
      }

      // Bên phải vỉa hè (X = 5.3)
      if (idx % 2 === 1) {
        const sceneCoffeeR = createDetailedSidewalkScene('coffee');
        sceneCoffeeR.position.set(5.3, 0, z - 4);
        sceneCoffeeR.rotation.y = -Math.PI / 2;
        segment.add(sceneCoffeeR);
      } else {
        const sceneChatR = createDetailedSidewalkScene('chatting');
        sceneChatR.position.set(5.4, 0, z - 4);
        sceneChatR.rotation.y = -Math.PI * 0.4;
        segment.add(sceneChatR);
      }
    });
  }

  createPedestrianCoffeeGroup() {
    const group = new THREE.Group();

    // 1. Bàn cà phê gỗ vỉa hè (Low Coffee Table)
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.7 });
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.55), tableMat);
    tableTop.position.set(0, 0.4, 0);
    tableTop.castShadow = true;
    group.add(tableTop);

    for (let lx = -0.2; lx <= 0.2; lx += 0.4) {
      for (let lz = -0.2; lz <= 0.2; lz += 0.4) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8), tableMat);
        leg.position.set(lx, 0.2, lz);
        group.add(leg);
      }
    }

    // 2. Ly Cà phê sữa đá 3D nhỏ trên bàn (Mini Coffee Cup)
    const cupMat = new THREE.MeshBasicMaterial({ color: 0xffecb3 });
    const miniCup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.04, 0.14, 10), cupMat);
    miniCup.position.set(0.08, 0.48, 0.05);
    group.add(miniCup);

    // Ống hút xanh lá
    const strawMat = new THREE.MeshBasicMaterial({ color: 0x4caf50 });
    const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.18, 6), strawMat);
    straw.rotation.z = -0.3;
    straw.position.set(0.1, 0.55, 0.05);
    group.add(straw);

    // 3. Ghế nhựa đỏ & Người ngồi uống cà phê (Person Sitting on Red Plastic Stool)
    const stoolMat = new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.4 });
    const stool = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.35), stoolMat);
    stool.position.set(-0.45, 0.15, 0);
    stool.castShadow = true;
    group.add(stool);

    // Người ngồi (Sitting Person)
    const person = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffcc80, roughness: 0.8 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0x0288d1, roughness: 0.6 }); // Áo thun xanh dương
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.7 }); // Quần jeans tối màu

    // Thân áo
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.45, 0.22), shirtMat);
    torso.position.set(0, 0.5, 0);
    torso.castShadow = true;
    person.add(torso);

    // Đầu & Tóc
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), skinMat);
    head.position.set(0, 0.8, 0);
    head.castShadow = true;
    person.add(head);

    const hairMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.125, 12, 12), hairMat);
    hair.position.set(0, 0.83, -0.02);
    person.add(hair);

    // Quần & Đùi ngồi
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.38), pantsMat);
    legs.position.set(0.08, 0.3, 0);
    person.add(legs);

    // Tay cầm ly cà phê
    const armGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8);
    const armR = new THREE.Mesh(armGeo, skinMat);
    armR.position.set(0.18, 0.52, 0.12);
    armR.rotation.z = -0.8;
    armR.rotation.x = 0.5;
    person.add(armR);

    person.position.set(-0.45, 0, 0);
    group.add(person);

    // Ghế nhựa xanh & Người ngồi thứ 2 đối diện
    const stool2Mat = new THREE.MeshStandardMaterial({ color: 0x1976d2, roughness: 0.4 });
    const stool2 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.35), stool2Mat);
    stool2.position.set(0.45, 0.15, 0);
    group.add(stool2);

    const person2 = person.clone();
    person2.rotation.y = Math.PI;
    person2.position.set(0.45, 0, 0);
    group.add(person2);

    return group;
  }

  createPedestrianSmoker() {
    const group = new THREE.Group();

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffcc80, roughness: 0.8 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0xfbc02d, roughness: 0.6 }); // Áo vàng ấm
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1565c0, roughness: 0.7 }); // Quần jeans xanh

    // Thân đứng
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.55, 0.22), shirtMat);
    torso.position.set(0, 0.95, 0);
    torso.castShadow = true;
    group.add(torso);

    // Chân đứng
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.68, 0.2), pantsMat);
    legs.position.set(0, 0.34, 0);
    legs.castShadow = true;
    group.add(legs);

    // Đầu & Nón kết cap
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), skinMat);
    head.position.set(0, 1.32, 0);
    head.castShadow = true;
    group.add(head);

    const capMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.5 });
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 12), capMat);
    cap.position.set(0, 1.36, -0.01);
    group.add(cap);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.14), capMat);
    visor.position.set(0, 1.34, 0.12);
    group.add(visor);

    // Tay giơ điếu thuốc lá đang phát sáng (Glowing Cigarette)
    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.32, 8), skinMat);
    armR.position.set(0.18, 1.1, 0.08);
    armR.rotation.z = -1.1;
    armR.rotation.x = 0.4;
    group.add(armR);

    // Điếu thuốc lá trắng nhỏ với đầu đỏ phát sáng LED (Lit Cigarette Tip)
    const cigGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.1, 6);
    const cigMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const cig = new THREE.Mesh(cigGeo, cigMat);
    cig.rotation.z = Math.PI / 2;
    cig.position.set(0.28, 1.25, 0.16);
    group.add(cig);

    const tipMat = new THREE.MeshBasicMaterial({ color: 0xff3d00 });
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), tipMat);
    tip.position.set(0.33, 1.25, 0.16);
    group.add(tip);

    // Làn khói thuốc trắng nhẹ bốc lên
    const smokeMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee, transparent: true, opacity: 0.45 });
    for (let s = 0; s < 3; s++) {
      const smokePuff = new THREE.Mesh(new THREE.SphereGeometry(0.03 + s * 0.025, 6, 6), smokeMat);
      smokePuff.position.set(0.35 + s * 0.04, 1.32 + s * 0.08, 0.16);
      group.add(smokePuff);
    }

    return group;
  }

  createChattingGroup() {
    const group = new THREE.Group();

    // Người 1 (Áo đỏ)
    const person1 = this.createPedestrianSmoker();
    person1.position.set(-0.3, 0, 0);
    person1.rotation.y = 0.6;
    group.add(person1);

    // Người 2 (Áo trắng)
    const person2 = this.createPedestrianSmoker();
    person2.position.set(0.3, 0, 0.1);
    person2.rotation.y = -0.8;
    group.add(person2);

    return group;
  }

  update(deltaTime, currentSpeed) {
    // Di chuyển các đoạn đường lùi lại (theo trục +Z) tương ứng với tốc độ game
    this.segments.forEach(segment => {
      segment.position.z += currentSpeed * deltaTime;

      if (segment.position.z > 55) {
        segment.position.z -= this.segmentLength * this.totalSegments;
      }
    });

    // Cập nhật ma trận vị trí InstancedMesh duy nhất cho Cây Phong & Cây Thông trên GPU (60 FPS!)
    if (this.mapleInstancedSystem || this.pineInstancedSystem) {
      let mapleIndex = 0;
      let pineIndex = 0;

      this.segments.forEach(segment => {
        if (segment.treeConfigs) {
          segment.treeConfigs.forEach(cfg => {
            const worldX = cfg.localX;
            const worldY = 0;
            const worldZ = segment.position.z + cfg.localZ;

            if (cfg.type === 'maple' && this.mapleInstancedSystem) {
              this.mapleInstancedSystem.setInstanceTransform(
                mapleIndex,
                worldX, worldY, worldZ,
                cfg.scale,
                cfg.rotY
              );
              mapleIndex++;
            } else if (cfg.type === 'pine' && this.pineInstancedSystem) {
              this.pineInstancedSystem.setInstanceTransform(
                pineIndex,
                worldX, worldY, worldZ,
                cfg.scale,
                cfg.rotY
              );
              pineIndex++;
            }
          });
        }
      });

      if (this.mapleInstancedSystem) this.mapleInstancedSystem.updateInstances(mapleIndex);
      if (this.pineInstancedSystem) this.pineInstancedSystem.updateInstances(pineIndex);
    }
  }

  dispose() {
    if (this.mapleInstancedSystem) {
      this.scene.remove(this.mapleInstancedSystem.group);
      this.mapleInstancedSystem.instancedMeshes.forEach(im => {
        im.geometry.dispose();
        if (Array.isArray(im.material)) im.material.forEach(m => m.dispose());
        else im.material.dispose();
      });
      this.mapleInstancedSystem = null;
    }

    if (this.pineInstancedSystem) {
      this.scene.remove(this.pineInstancedSystem.group);
      this.pineInstancedSystem.instancedMeshes.forEach(im => {
        im.geometry.dispose();
        if (Array.isArray(im.material)) im.material.forEach(m => m.dispose());
        else im.material.dispose();
      });
      this.pineInstancedSystem = null;
    }

    this.segments.forEach(segment => {
      this.scene.remove(segment);
      segment.traverse((child) => {
        if (child.isMesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    });
    this.segments = [];
  }
}

/**
 * Nâng cấp Mô hình Cột Đèn Đường Công Cộng Stylized 3D
 * - Thân cột thuôn nhỏ gọn thanh mảnh
 * - Chao đèn nón cụt nhỏ gọn (0.08m đỉnh, 0.16m đáy) ôm sát đỉnh cột
 * - Custom Shader Material luồng sáng mờ ảo 100% xuyên thấu, mờ dần theo chiều dọc (Vertical Fade Out)
 * @returns {THREE.Group}
 */
export function createStylizedStreetlight() {
  const group = new THREE.Group();

  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x212121, // Xám đen bóng bẩy
    metalness: 0.85,
    roughness: 0.3
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0x90a4ae,
    metalness: 0.9,
    roughness: 0.15
  });

  const height = 4.5;

  // 1. Đế cột đèn nhỏ nhắn
  const baseGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.35, 12);
  const baseMesh = new THREE.Mesh(baseGeo, metalMat);
  baseMesh.position.y = 0.175;
  baseMesh.castShadow = true;
  group.add(baseMesh);

  // 2. Thân cột chính thuôn mảnh
  const poleGeo = new THREE.CylinderGeometry(0.045, 0.08, height - 0.35, 12);
  const poleMesh = new THREE.Mesh(poleGeo, metalMat);
  poleMesh.position.y = 0.35 + (height - 0.35) / 2;
  poleMesh.castShadow = true;
  group.add(poleMesh);

  // 3. Khớp nối uốn 90 độ gọn gàng
  const jointGeo = new THREE.SphereGeometry(0.07, 12, 12);
  const jointMesh = new THREE.Mesh(jointGeo, chromeMat);
  jointMesh.position.set(0, height, 0);
  group.add(jointMesh);

  const armLength = 0.75;
  const armGeo = new THREE.CylinderGeometry(0.035, 0.04, armLength, 12);
  const armMesh = new THREE.Mesh(armGeo, metalMat);
  armMesh.rotation.z = Math.PI / 2;
  armMesh.position.set(armLength / 2, height, 0);
  armMesh.castShadow = true;
  group.add(armMesh);

  // 4. Chao đèn / Hộp đèn công cộng nhỏ gọn thanh mảnh
  const hoodTopRadius = 0.08;
  const hoodBottomRadius = 0.16;
  const hoodHeight = 0.12;
  const hoodGeo = new THREE.CylinderGeometry(hoodTopRadius, hoodBottomRadius, hoodHeight, 12);
  const hoodMesh = new THREE.Mesh(hoodGeo, metalMat);
  hoodMesh.position.set(armLength, height - 0.06, 0);
  hoodMesh.castShadow = true;
  group.add(hoodMesh);

  // Mặt bóng phát sáng sáng rực
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfffee0 });
  const bulbGeo = new THREE.CylinderGeometry(hoodBottomRadius * 0.9, hoodBottomRadius * 0.9, 0.02, 12);
  const bulbMesh = new THREE.Mesh(bulbGeo, bulbMat);
  bulbMesh.position.set(armLength, height - 0.12, 0);
  group.add(bulbMesh);

  // 5. Luồng Nón Sáng Mờ Mịn Kỹ Thuật Đồ Họa (Vertical Gradient Alpha Fade Out Shader)
  const coneHeight = 4.0;
  const coneGeo = new THREE.CylinderGeometry(hoodBottomRadius, 1.25, coneHeight, 16, 1, true);

  const fadeShaderMat = new THREE.ShaderMaterial({
    uniforms: {
      lightColor: { value: new THREE.Color(0xfffee0) },
      maxOpacity: { value: 0.12 }
    },
    vertexShader: `
      varying float vY;
      void main() {
        vY = position.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 lightColor;
      uniform float maxOpacity;
      varying float vY;
      void main() {
        float factor = clamp((vY + 2.0) / 4.0, 0.0, 1.0);
        float alpha = maxOpacity * factor * factor;
        gl_FragColor = vec4(lightColor, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  const lightConeMesh = new THREE.Mesh(coneGeo, fadeShaderMat);
  lightConeMesh.position.set(armLength, height - 0.12 - coneHeight / 2, 0);
  group.add(lightConeMesh);

  return group;
}
