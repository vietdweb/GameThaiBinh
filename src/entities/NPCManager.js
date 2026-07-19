import * as THREE from 'three';

/**
 * createDetailedSidewalkScene - Dựng cụm nhân vật NPC vỉa hè cùng bàn ghế nhựa, ly cà phê & mắt mũi khuôn mặt chi tiết
 * Phong cách Low-poly cao cấp (flatShading: true, roughness: 0.6, Mắt mũi 3D, khớp nối 2 phân đoạn & kiểu tóc).
 * @param {'coffee' | 'chatting'} actionType Kịch bản vỉa hè ('coffee' hoặc 'chatting')
 * @returns {THREE.Group} Cụm cảnh vỉa hè 3D hoàn chỉnh
 */
export function createDetailedSidewalkScene(actionType = 'coffee') {
  const sceneGroup = new THREE.Group();

  // Bảng chất liệu & màu sắc
  const skinMat     = new THREE.MeshStandardMaterial({ color: 0xffcc80, roughness: 0.6, flatShading: true }); // Da sáng
  const skinMatDark = new THREE.MeshStandardMaterial({ color: 0xf5b041, roughness: 0.6, flatShading: true }); // Da ngăm
  const hairMatDark = new THREE.MeshStandardMaterial({ color: 0x1f1f2e, roughness: 0.7, flatShading: true }); // Tóc đen
  const hairMatBrown= new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.7, flatShading: true }); // Tóc nâu
  const eyeMat      = new THREE.MeshBasicMaterial({ color: 0x111111 });                                       // Mắt đen 3D
  const shirtBlue   = new THREE.MeshStandardMaterial({ color: 0x0288d1, roughness: 0.6, flatShading: true }); // Áo xanh
  const shirtRed    = new THREE.MeshStandardMaterial({ color: 0xe53935, roughness: 0.6, flatShading: true }); // Áo đỏ
  const pantsJeans  = new THREE.MeshStandardMaterial({ color: 0x1565c0, roughness: 0.6, flatShading: true }); // Quần jeans
  const pantsDark   = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.6, flatShading: true }); // Quần đen
  const shoeMat     = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, flatShading: true }); // Giày thể thao trắng
  const stoolMatRed = new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.5, flatShading: true }); // Ghế nhựa đỏ
  const stoolMatBlue= new THREE.MeshStandardMaterial({ color: 0x1976d2, roughness: 0.5, flatShading: true }); // Ghế nhựa xanh
  const tableMatWood= new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.7, flatShading: true }); // Bàn gỗ/nhựa

  // =========================================================
  // 1. DỰNG BÀN GHẾ NHỰA & LY CÀ PHÊ CÓ ỐNG HÚT (TABLE & STOOLS)
  // =========================================================
  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.55), tableMatWood);
  tableTop.position.set(0, 0.42, 0);
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  sceneGroup.add(tableTop);

  const tablePillar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8), tableMatWood);
  tablePillar.position.set(0, 0.2, 0);
  tablePillar.castShadow = true;
  sceneGroup.add(tablePillar);

  const tableBase = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, 0.4), tableMatWood);
  tableBase.position.set(0, 0.015, 0);
  tableBase.receiveShadow = true;
  sceneGroup.add(tableBase);

  // Ly cà phê sữa đá 3D nhỏ có ống hút xanh
  const cupMat = new THREE.MeshStandardMaterial({ color: 0xffecb3, roughness: 0.3, flatShading: true });
  const strawMat = new THREE.MeshBasicMaterial({ color: 0x4caf50 });

  const createCoffeeCup = (x, z) => {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.04, 0.14, 8), cupMat);
    cup.position.set(x, 0.51, z);
    cup.castShadow = true;

    const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.18, 6), strawMat);
    straw.position.set(x + 0.02, 0.58, z + 0.01);
    straw.rotation.z = -0.3;
    sceneGroup.add(cup);
    sceneGroup.add(straw);
  };

  createCoffeeCup(0.08, 0.06);
  if (actionType === 'chatting') {
    createCoffeeCup(-0.1, -0.08);
  }

  // Ghế nhựa vỉa hè 4 chân choe loe
  const createPlasticStool = (mat, posX, posZ) => {
    const stoolGroup = new THREE.Group();

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 0.36), mat);
    seat.position.y = 0.3;
    seat.castShadow = true;
    seat.receiveShadow = true;
    stoolGroup.add(seat);

    const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8);
    const legPositions = [
      { x: -0.14, z: -0.14, rx: -0.12, rz: -0.12 },
      { x: 0.14,  z: -0.14, rx: -0.12, rz: 0.12 },
      { x: -0.14, z: 0.14,  rx: 0.12,  rz: -0.12 },
      { x: 0.14,  z: 0.14,  rx: 0.12,  rz: 0.12 }
    ];

    legPositions.forEach(lp => {
      const leg = new THREE.Mesh(legGeo, mat);
      leg.position.set(lp.x, 0.15, lp.z);
      leg.rotation.x = lp.rx;
      leg.rotation.z = lp.rz;
      leg.castShadow = true;
      stoolGroup.add(leg);
    });

    stoolGroup.position.set(posX, 0, posZ);
    return stoolGroup;
  };

  // =========================================================
  // 2. DỰNG MÔ HÌNH NHÂN VẬT NPC CHI TIẾT (MẮT MŨI & TÓC 3D)
  // =========================================================
  const createDetailedNPCModel = (shirtMaterial, hairMaterial, currentSkinMat, isRightHandRaising = false, hasCap = false) => {
    const npc = new THREE.Group();

    // 2a. Thân áo (Torso) + 2 Vai áo riêng biệt
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.44, 0.22), shirtMaterial);
    torso.position.set(0, 0.52, 0);
    torso.castShadow = true;
    torso.receiveShadow = true;
    npc.add(torso);

    const sleeveL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.14), shirtMaterial);
    sleeveL.position.set(-0.18, 0.68, 0);
    sleeveL.castShadow = true;
    npc.add(sleeveL);

    const sleeveR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.14), shirtMaterial);
    sleeveR.position.set(0.18, 0.68, 0);
    sleeveR.castShadow = true;
    npc.add(sleeveR);

    // 2b. Đầu màu da + 2 MẮT ĐEN 3D SINH ĐỘNG (Eyes Details)
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.24), currentSkinMat);
    head.position.set(0, 0.84, 0);
    head.castShadow = true;
    npc.add(head);

    // Mắt Trái & Mắt Phải
    const eyeGeo = new THREE.BoxGeometry(0.04, 0.04, 0.03);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.065, 0.86, 0.125);
    npc.add(eyeL);

    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.065, 0.86, 0.125);
    npc.add(eyeR);

    // Tóc khối hoặc Nón lưỡi trai biến thể
    if (hasCap) {
      const capMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.5, flatShading: true });
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.26), capMat);
      cap.position.set(0, 0.96, 0);
      npc.add(cap);

      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 0.14), capMat);
      visor.position.set(0, 0.94, 0.14);
      npc.add(visor);
    } else {
      const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.26), hairMaterial);
      hairTop.position.set(0, 0.95, -0.01);
      npc.add(hairTop);

      const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.08), hairMaterial);
      hairBack.position.set(0, 0.86, -0.1);
      npc.add(hairBack);

      // Tóc mái trước che nhẹ trán
      const hairBangs = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.06), hairMaterial);
      hairBangs.position.set(0, 0.93, 0.1);
      npc.add(hairBangs);
    }

    // 2c. Chân 2 phân đoạn (Đùi & Bắp chân) + Giày trắng
    for (let side of [-1, 1]) {
      const legGroup = new THREE.Group();

      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.32), pantsJeans);
      thigh.position.set(side * 0.09, 0.32, 0.16);
      thigh.castShadow = true;
      legGroup.add(thigh);

      const calf = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.26, 0.11), pantsJeans);
      calf.position.set(side * 0.09, 0.15, 0.28);
      calf.castShadow = true;
      legGroup.add(calf);

      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.16), shoeMat);
      shoe.position.set(side * 0.09, 0.03, 0.3);
      shoe.castShadow = true;
      legGroup.add(shoe);

      npc.add(legGroup);
    }

    // 2d. Tay 2 phân đoạn (Cánh tay & Cẳng tay)
    const armLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.08), currentSkinMat);
    armLeft.position.set(-0.21, 0.52, 0.08);
    armLeft.rotation.x = 0.3;
    armLeft.castShadow = true;
    npc.add(armLeft);

    const armRight = new THREE.Group();
    const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.08), currentSkinMat);
    upperArm.position.set(0.21, 0.6, 0.08);
    upperArm.rotation.x = isRightHandRaising ? 0.8 : 0.4;
    upperArm.castShadow = true;
    armRight.add(upperArm);

    const foreArm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.2, 0.07), currentSkinMat);
    foreArm.position.set(0.21, 0.68, isRightHandRaising ? 0.22 : 0.16);
    foreArm.rotation.x = isRightHandRaising ? 1.4 : 0.8;
    foreArm.rotation.z = -0.3;
    foreArm.castShadow = true;
    armRight.add(foreArm);

    npc.add(armRight);
    return npc;
  };

  // =========================================================
  // 3. ĐẶT TƯ THẾ NHÂN VẬT THEO KỊCH BẢN (ACTION POSES)
  // =========================================================
  if (actionType === 'coffee') {
    const stool = createPlasticStool(stoolMatRed, -0.45, 0);
    sceneGroup.add(stool);

    const npcCoffee = createDetailedNPCModel(shirtBlue, hairMatDark, skinMat, true, false);
    npcCoffee.position.set(-0.45, 0.02, -0.05);
    sceneGroup.add(npcCoffee);
  } else {
    const stoolL = createPlasticStool(stoolMatRed, -0.45, 0);
    sceneGroup.add(stoolL);

    const npc1 = createDetailedNPCModel(shirtBlue, hairMatDark, skinMat, true, false);
    npc1.position.set(-0.45, 0.02, -0.05);
    sceneGroup.add(npc1);

    const stoolR = createPlasticStool(stoolMatBlue, 0.45, 0);
    sceneGroup.add(stoolR);

    const npc2 = createDetailedNPCModel(shirtRed, hairMatBrown, skinMatDark, false, true);
    npc2.position.set(0.45, 0.02, -0.05);
    npc2.rotation.y = Math.PI; // Xoay đối diện
    sceneGroup.add(npc2);
  }

  return sceneGroup;
}

export const createNPC = createDetailedSidewalkScene;
