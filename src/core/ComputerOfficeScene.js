/**
 * ComputerOfficeScene.js - Cozy Retro 90s Computer Office 3D Scene
 * Inspired by Henry Heffernan's interactive 3D desk portfolio.
 * 
 * Features:
 * 1. 3D Office Environment: Wooden desk, retro CRT thick computer monitor, mechanical keyboard, mouse, mug with steam particles, documents, plant, chair.
 * 2. Warm Desk SpotLight & CRT Screen Ambient Glow.
 * 3. Proximity Detection (< 2.5m from chair): Triggers "[E] Ngồi Vào Máy Tính" UI prompt.
 * 4. GSAP / Smooth Lerp Camera Zoom: Smoothly transitions between TPS Room View and FPS CRT Monitor Front View.
 * 5. Seated State & Interactive Windows 98 OS Control (Press [E] to sit, [ESC] to stand up).
 */
import * as THREE from 'three';

export class ComputerOfficeScene {
  constructor(renderer, game) {
    this.renderer = renderer;
    this.game = game;
    this.isActive = false;
    this.isLoaded = false;
    this.isSeatedAtPC = false;
    this.isZooming = false;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);

    // Camera Modes
    // TPS Overview (Standing/Room view looking at the desk)
    this.tpsCamPos = new THREE.Vector3(0, 1.6, 2.8);
    this.tpsCamLookAt = new THREE.Vector3(0, 1.05, -0.4);

    // FPS CRT Monitor Close-up (Seated directly facing CRT screen)
    this.fpsCamPos = new THREE.Vector3(0, 1.16, -0.05);
    this.fpsCamLookAt = new THREE.Vector3(0, 1.16, -0.75);

    this.currentCamPos = this.tpsCamPos.clone();
    this.currentCamLookAt = this.tpsCamLookAt.clone();

    // Lerp Target Vectors for smooth camera transitions
    this.targetCamPos = this.tpsCamPos.clone();
    this.targetCamLookAt = this.tpsCamLookAt.clone();

    // Interactive Desk Chair / PC Center Position
    this.pcCenterPos = new THREE.Vector3(0, 0, -0.5);

    // Lights
    this.spotLight = null;
    this.screenGlowLight = null;
    this.ambientLight = null;

    // Steam particles
    this.steamParticles = [];
    this.steamGroup = null;

    // DOM Elements for Proximity & Exit
    this.proximityPrompt = null;
    this.exitPCBtn = null;
    this.osOverlay = null;

    // Movement / Player controls inside office
    this.playerPos = new THREE.Vector3(0, 0, 1.8);
    this.activeKeys = new Set();

    this._setupScene();
    this._setupEvents();
  }

  /* ============================================================ */
  /* 1. SETUP 3D ROOM, FURNITURE & CRT COMPUTER GEOMETRY          */
  /* ============================================================ */
  _setupScene() {
    // 1. Fog & Scene Background
    this.scene.background = new THREE.Color(0x0a0e17);
    this.scene.fog = new THREE.FogExp2(0x0a0e17, 0.015);

    // 2. Lighting Setup
    this.ambientLight = new THREE.AmbientLight(0xdbeafe, 0.45);
    this.scene.add(this.ambientLight);

    // Desk SpotLight (Warm reading light from top-right)
    this.spotLight = new THREE.SpotLight(0xfff3c4, 2.8, 15, Math.PI / 4, 0.4, 1.5);
    this.spotLight.position.set(1.2, 3.2, 0.5);
    this.spotLight.target.position.set(0, 0.8, -0.5);
    this.spotLight.castShadow = true;
    this.spotLight.shadow.bias = -0.0005;
    this.spotLight.shadow.mapSize.width = 1024;
    this.spotLight.shadow.mapSize.height = 1024;
    this.scene.add(this.spotLight);
    this.scene.add(this.spotLight.target);

    // CRT Screen Front Glow (Cyan Blue accent light)
    this.screenGlowLight = new THREE.PointLight(0x00f5d4, 1.2, 3.0);
    this.screenGlowLight.position.set(0, 1.15, -0.4);
    this.scene.add(this.screenGlowLight);

    // Warm Ambient Lamp Fill
    const fillLight = new THREE.PointLight(0xfbbf24, 0.8, 6.0);
    fillLight.position.set(-1.5, 1.8, 0.5);
    this.scene.add(fillLight);

    // 3. Room Walls & Floor
    this._buildRoomEnvironment();

    // 4. Wooden Desk, Chair & Accessories
    this._buildDeskAndFurniture();

    // 5. Retro 90s CRT Computer & Peripherals
    this._buildRetroCRTComputer();

    // 6. Steaming Coffee Cup
    this._buildCoffeeCupWithSteam();

    // Set initial camera transform
    this.camera.position.copy(this.currentCamPos);
    this.camera.lookAt(this.currentCamLookAt);
  }

  /* --- 3D Room Walls & Wooden Floor --- */
  _buildRoomEnvironment() {
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.85,
      metalness: 0.05
    });

    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x332211,
      roughness: 0.6,
      metalness: 0.1
    });

    // Floor
    const floorGeo = new THREE.PlaneGeometry(12, 12);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Back Wall
    const backWallGeo = new THREE.PlaneGeometry(12, 6);
    const backWall = new THREE.Mesh(backWallGeo, wallMat);
    backWall.position.set(0, 3, -3);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    // Left Wall
    const leftWall = new THREE.Mesh(backWallGeo, wallMat);
    leftWall.position.set(-6, 3, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    // Wall Frame / Poster (Saigon Rush Retro Poster)
    const posterGeo = new THREE.PlaneGeometry(1.4, 2.0);
    const posterMat = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      roughness: 0.4,
      emissive: 0x003b46,
      emissiveIntensity: 0.3
    });
    const poster = new THREE.Mesh(posterGeo, posterMat);
    poster.position.set(-1.8, 2.2, -2.95);
    this.scene.add(poster);
  }

  /* --- Wooden Desk, Chair & Office Props --- */
  _buildDeskAndFurniture() {
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x4a3525,
      roughness: 0.7,
      metalness: 0.05
    });

    const metalLegMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.8
    });

    // Main Desk Top (Surface at Y = 0.8m)
    const deskTopGeo = new THREE.BoxGeometry(2.4, 0.08, 1.2);
    const deskTop = new THREE.Mesh(deskTopGeo, woodMat);
    deskTop.position.set(0, 0.76, -0.6);
    deskTop.castShadow = true;
    deskTop.receiveShadow = true;
    this.scene.add(deskTop);

    // Desk Metal Legs (4 legs)
    const legGeo = new THREE.BoxGeometry(0.08, 0.72, 0.08);
    const legPositions = [
      [-1.1, 0.36, -1.1],
      [1.1, 0.36, -1.1],
      [-1.1, 0.36, -0.1],
      [1.1, 0.36, -0.1]
    ];
    legPositions.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(legGeo, metalLegMat);
      leg.position.set(x, y, z);
      leg.castShadow = true;
      leg.receiveShadow = true;
      this.scene.add(leg);
    });

    // Retro Swivel Chair (Seat at Y = 0.48m)
    const chairGroup = new THREE.Group();
    const leatherMat = new THREE.MeshStandardMaterial({
      color: 0x1e1e24,
      roughness: 0.6,
      metalness: 0.1
    });

    const seatGeo = new THREE.BoxGeometry(0.55, 0.08, 0.55);
    const seat = new THREE.Mesh(seatGeo, leatherMat);
    seat.position.set(0, 0.48, 0.3);
    seat.castShadow = true;
    chairGroup.add(seat);

    const backrestGeo = new THREE.BoxGeometry(0.55, 0.55, 0.08);
    const backrest = new THREE.Mesh(backrestGeo, leatherMat);
    backrest.position.set(0, 0.75, 0.54);
    backrest.castShadow = true;
    chairGroup.add(backrest);

    const chairBaseGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.44, 8);
    const chairBase = new THREE.Mesh(chairBaseGeo, metalLegMat);
    chairBase.position.set(0, 0.22, 0.3);
    chairGroup.add(chairBase);

    this.scene.add(chairGroup);

    // Document Stack / Folders on Left Side of Desk
    const docMatYellow = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.8 });
    const docMatBlue = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.8 });

    for (let i = 0; i < 4; i++) {
      const docGeo = new THREE.BoxGeometry(0.24, 0.025, 0.32);
      const docMesh = new THREE.Mesh(docGeo, i % 2 === 0 ? docMatYellow : docMatBlue);
      docMesh.position.set(-0.85 + (i * 0.01), 0.81 + (i * 0.026), -0.7);
      docMesh.rotation.y = (i * 0.08) - 0.15;
      docMesh.castShadow = true;
      this.scene.add(docMesh);
    }

    // Small Potted Succulent Plant on Right Side
    const potGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.14, 12);
    const potMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.9 });
    const pot = new THREE.Mesh(potGeo, potMat);
    pot.position.set(0.9, 0.87, -0.8);
    pot.castShadow = true;
    this.scene.add(pot);

    const plantGeo = new THREE.DodecahedronGeometry(0.09);
    const plantMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.85 });
    const plant = new THREE.Mesh(plantGeo, plantMat);
    plant.position.set(0.9, 0.98, -0.8);
    plant.castShadow = true;
    this.scene.add(plant);
  }

  /* --- Retro 90s CRT Computer, Monitor, Keyboard & Mouse --- */
  _buildRetroCRTComputer() {
    const crtPlasticMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db, // Retro beige/beige-gray PC plastic
      roughness: 0.75,
      metalness: 0.05
    });

    const darkPlasticMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.6,
      metalness: 0.1
    });

    // 1. Desktop Computer Case Tower (Horizontal Desktop Case under Monitor)
    const pcCaseGeo = new THREE.BoxGeometry(0.65, 0.16, 0.55);
    const pcCase = new THREE.Mesh(pcCaseGeo, crtPlasticMat);
    pcCase.position.set(0, 0.88, -0.7);
    pcCase.castShadow = true;
    pcCase.receiveShadow = true;
    this.scene.add(pcCase);

    // Floppy Drive Slot on PC Case Front
    const floppySlotGeo = new THREE.BoxGeometry(0.18, 0.03, 0.01);
    const floppySlot = new THREE.Mesh(floppySlotGeo, darkPlasticMat);
    floppySlot.position.set(0.18, 0.91, -0.424);
    this.scene.add(floppySlot);

    // PC Power Button LED (Green)
    const powerLedGeo = new THREE.SphereGeometry(0.012, 8, 8);
    const powerLedMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const powerLed = new THREE.Mesh(powerLedGeo, powerLedMat);
    powerLed.position.set(-0.24, 0.9, -0.424);
    this.scene.add(powerLed);

    // 2. Heavy CRT Monitor Housing (Thập niên 90 - Thick curved back)
    const monitorGroup = new THREE.Group();
    monitorGroup.position.set(0, 1.16, -0.7);

    // CRT Monitor Bezel (Outer Shell)
    const bezelGeo = new THREE.BoxGeometry(0.76, 0.56, 0.52);
    const bezel = new THREE.Mesh(bezelGeo, crtPlasticMat);
    bezel.castShadow = true;
    bezel.receiveShadow = true;
    monitorGroup.add(bezel);

    // CRT Tapered Back Hood (Curved Retro CRT Bulge)
    const backHoodGeo = new THREE.BoxGeometry(0.58, 0.44, 0.25);
    const backHood = new THREE.Mesh(backHoodGeo, crtPlasticMat);
    backHood.position.set(0, 0, -0.32);
    backHood.castShadow = true;
    monitorGroup.add(backHood);

    // Glass Screen Frame Rim (Dark Inner Inset)
    const innerRimGeo = new THREE.BoxGeometry(0.62, 0.44, 0.02);
    const innerRim = new THREE.Mesh(innerRimGeo, darkPlasticMat);
    innerRim.position.set(0, 0, 0.251);
    monitorGroup.add(innerRim);

    // 3D Glass Screen Mesh (Curved Glass Surface)
    const screenGeo = new THREE.PlaneGeometry(0.58, 0.40);
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      roughness: 0.15,
      metalness: 0.8,
      emissive: 0x004d40,
      emissiveIntensity: 0.65
    });
    this.screenMesh = new THREE.Mesh(screenGeo, screenMat);
    this.screenMesh.position.set(0, 0, 0.262);
    monitorGroup.add(this.screenMesh);

    // CRT Monitor Brand Logo Badge ("THÁI BÌNH CRT 1998")
    const badgeGeo = new THREE.BoxGeometry(0.12, 0.025, 0.005);
    const badgeMat = new THREE.MeshBasicMaterial({ color: 0x374151 });
    const badge = new THREE.Mesh(badgeGeo, badgeMat);
    badge.position.set(0, -0.23, 0.262);
    monitorGroup.add(badge);

    this.scene.add(monitorGroup);

    // 3. Mechanical Keyboard (Beige Body + Dark Gray Keycaps)
    const kbdBodyGeo = new THREE.BoxGeometry(0.52, 0.03, 0.18);
    const kbdBody = new THREE.Mesh(kbdBodyGeo, crtPlasticMat);
    kbdBody.position.set(0, 0.815, -0.38);
    kbdBody.rotation.x = 0.08; // Slanted keyboard angle
    kbdBody.castShadow = true;
    kbdBody.receiveShadow = true;
    this.scene.add(kbdBody);

    // Keycaps Grid Representation
    const keyGridGeo = new THREE.BoxGeometry(0.48, 0.015, 0.14);
    const keyGrid = new THREE.Mesh(keyGridGeo, darkPlasticMat);
    keyGrid.position.set(0, 0.832, -0.38);
    keyGrid.rotation.x = 0.08;
    this.scene.add(keyGrid);

    // 4. Mousepad & Retro Bi Mouse
    const mousepadGeo = new THREE.PlaneGeometry(0.24, 0.28);
    const mousepadMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
    const mousepad = new THREE.Mesh(mousepadGeo, mousepadMat);
    mousepad.rotation.x = -Math.PI / 2;
    mousepad.position.set(0.42, 0.801, -0.38);
    mousepad.receiveShadow = true;
    this.scene.add(mousepad);

    const mouseGeo = new THREE.BoxGeometry(0.08, 0.04, 0.12);
    const mouse = new THREE.Mesh(mouseGeo, crtPlasticMat);
    mouse.position.set(0.42, 0.82, -0.38);
    mouse.castShadow = true;
    this.scene.add(mouse);
  }

  /* --- Steaming Coffee Cup with Particle Effect --- */
  _buildCoffeeCupWithSteam() {
    const cupGroup = new THREE.Group();
    cupGroup.position.set(-0.48, 0.8, -0.42);

    // Ceramic Mug (White/Cream)
    const mugGeo = new THREE.CylinderGeometry(0.055, 0.045, 0.11, 16);
    const mugMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.1 });
    const mug = new THREE.Mesh(mugGeo, mugMat);
    mug.position.y = 0.055;
    mug.castShadow = true;
    cupGroup.add(mug);

    // Coffee Liquid Surface inside Mug
    const coffeeGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.01, 16);
    const coffeeMat = new THREE.MeshStandardMaterial({ color: 0x3f1d0b, roughness: 0.2 });
    const coffee = new THREE.Mesh(coffeeGeo, coffeeMat);
    coffee.position.y = 0.102;
    cupGroup.add(coffee);

    // Steam Particles System (Floating upward rising smoke)
    this.steamGroup = new THREE.Group();
    this.steamGroup.position.set(-0.48, 0.92, -0.42);

    const particleGeo = new THREE.SphereGeometry(0.012, 6, 6);
    const particleMat = new THREE.MeshBasicMaterial({
      color: 0xe2e8f0,
      transparent: true,
      opacity: 0.4
    });

    for (let i = 0; i < 12; i++) {
      const p = new THREE.Mesh(particleGeo, particleMat.clone());
      p.position.set(
        (Math.random() - 0.5) * 0.04,
        Math.random() * 0.2,
        (Math.random() - 0.5) * 0.04
      );
      p.userData = {
        speedY: 0.06 + Math.random() * 0.08,
        initialY: p.position.y,
        lifetime: Math.random() * 2.0
      };
      this.steamParticles.push(p);
      this.steamGroup.add(p);
    }

    this.scene.add(cupGroup);
    this.scene.add(this.steamGroup);
  }

  /* ============================================================ */
  /* 2. CONTROLS, PROXIMITY DETECTION & EVENT LISTENERS           */
  /* ============================================================ */
  _setupEvents() {
    this.proximityPrompt = document.getElementById('pc-proximity-prompt');
    this.exitPCBtn = document.getElementById('btn-exit-pc');
    this.osOverlay = document.getElementById('crt-os-overlay');

    // Keydown Listener
    window.addEventListener('keydown', (e) => {
      if (!this.isActive) return;

      const key = e.key.toUpperCase();

      // Press 'E' to Sit down & Use PC (if in proximity and not already seated)
      if (key === 'E' && !this.isSeatedAtPC && !this.isZooming) {
        this.sitAtPC();
      }

      // Press 'ESC' to Stand up & Exit PC
      if (key === 'ESCAPE' && this.isSeatedAtPC && !this.isZooming) {
        this.standUpFromPC();
      }
    });

    // Click listener for Exit PC Button
    if (this.exitPCBtn) {
      this.exitPCBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.isSeatedAtPC && !this.isZooming) {
          this.standUpFromPC();
        }
      });
    }

    // Attach Windows 98 Retro OS App Handlers & Playable Minesweeper
    this._setupWin98OSAppHandlers();
  }

  _setupWin98OSAppHandlers() {
    if (this.game && this.game.officeManager) {
      this.game.officeManager.init();
    }

    window.openWin98App = (appId) => {
      if (this.game && this.game.officeManager) {
        this.game.officeManager.openApp(appId);
      }
    };

    window.closeWin98App = (appId) => {
      if (this.game && this.game.officeManager) {
        this.game.officeManager.closeApp(appId);
      }
    };

    window.resetMinesweeper = () => {
      const gridEl = document.getElementById('win98-mines-grid');
      if (!gridEl) return;

      gridEl.innerHTML = '';
      const size = 8;
      const totalMines = 10;
      const mineLocations = new Set();

      while (mineLocations.size < totalMines) {
        mineLocations.add(Math.floor(Math.random() * (size * size)));
      }

      for (let i = 0; i < size * size; i++) {
        const cell = document.createElement('div');
        cell.className = 'mine-cell';
        cell.dataset.index = i;
        const isMine = mineLocations.has(i);

        cell.addEventListener('click', (e) => {
          e.stopPropagation();
          if (cell.classList.contains('revealed')) return;
          cell.classList.add('revealed');
          if (isMine) {
            cell.textContent = '💥';
            cell.style.background = '#ff4d4d';
          } else {
            const row = Math.floor(i / size);
            const col = i % size;
            let count = 0;

            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const r = row + dr;
                const c = col + dc;
                if (r >= 0 && r < size && c >= 0 && c < size) {
                  if (mineLocations.has(r * size + c)) count++;
                }
              }
            }
            cell.textContent = count > 0 ? count : '';
            if (count === 1) cell.style.color = 'blue';
            if (count === 2) cell.style.color = 'green';
            if (count >= 3) cell.style.color = 'red';
          }
        });

        gridEl.appendChild(cell);
      }
    };
  }

  /* --- Enter / Sit at PC Mode (Zoom Camera into CRT Screen) --- */
  sitAtPC() {
    this.isSeatedAtPC = true;
    this.isZooming = true;

    // Target Camera to FPS CRT Screen Position
    this.targetCamPos.copy(this.fpsCamPos);
    this.targetCamLookAt.copy(this.fpsCamLookAt);

    // Hide Proximity Prompt, Show Exit PC Button & OS Overlay
    if (this.proximityPrompt) this.proximityPrompt.classList.add('hidden');
    if (this.exitPCBtn) this.exitPCBtn.classList.remove('hidden');

    // Trigger CRT Screen Emissive Boost
    if (this.screenMesh) {
      this.screenMesh.material.emissiveIntensity = 0.95;
    }

    // Display OS Overlay after smooth zoom
    setTimeout(() => {
      if (this.osOverlay) {
        this.osOverlay.classList.remove('hidden');
        this.osOverlay.classList.add('active');
      }
      this.isZooming = false;
    }, 600);
  }

  /* --- Stand up / Exit PC Mode (Zoom Camera Back to Overview) --- */
  standUpFromPC() {
    this.isSeatedAtPC = false;
    this.isZooming = true;

    // Hide OS Overlay
    if (this.osOverlay) {
      this.osOverlay.classList.remove('active');
      this.osOverlay.classList.add('hidden');
    }

    if (this.exitPCBtn) this.exitPCBtn.classList.add('hidden');

    // Target Camera to TPS Room View Position
    this.targetCamPos.copy(this.tpsCamPos);
    this.targetCamLookAt.copy(this.tpsCamLookAt);

    if (this.screenMesh) {
      this.screenMesh.material.emissiveIntensity = 0.65;
    }

    setTimeout(() => {
      this.isZooming = false;
    }, 600);
  }

  /* ============================================================ */
  /* 3. SCENE LIFECYCLE & UPDATE LOOP                             */
  /* ============================================================ */
  activate() {
    this.isActive = true;
    this.isLoaded = true;
    this.isSeatedAtPC = false;
    this.isZooming = false;

    this.currentCamPos.copy(this.tpsCamPos);
    this.currentCamLookAt.copy(this.tpsCamLookAt);
    this.targetCamPos.copy(this.tpsCamPos);
    this.targetCamLookAt.copy(this.tpsCamLookAt);

    this.camera.position.copy(this.currentCamPos);
    this.camera.lookAt(this.currentCamLookAt);

    if (this.osOverlay) {
      this.osOverlay.classList.remove('active');
      this.osOverlay.classList.add('hidden');
    }
    if (this.exitPCBtn) this.exitPCBtn.classList.add('hidden');
  }

  deactivate() {
    this.isActive = false;
    this.isSeatedAtPC = false;
    if (this.proximityPrompt) this.proximityPrompt.classList.add('hidden');
    if (this.exitPCBtn) this.exitPCBtn.classList.add('hidden');
    if (this.osOverlay) {
      this.osOverlay.classList.remove('active');
      this.osOverlay.classList.add('hidden');
    }
  }

  update(deltaTime = 0.016) {
    if (!this.isActive) return;

    // 1. Smooth Camera Lerp Transition (GSAP style interpolation)
    const lerpFactor = this.isSeatedAtPC ? 0.08 : 0.07;
    this.currentCamPos.lerp(this.targetCamPos, lerpFactor);
    this.currentCamLookAt.lerp(this.targetCamLookAt, lerpFactor);

    this.camera.position.copy(this.currentCamPos);
    this.camera.lookAt(this.currentCamLookAt);

    // 2. Animate Steam Particles from Coffee Cup
    if (this.steamParticles.length > 0) {
      this.steamParticles.forEach((p) => {
        p.position.y += p.userData.speedY * deltaTime;
        p.userData.lifetime += deltaTime;

        // Fade opacity out as particle rises
        const fadeProgress = p.userData.lifetime / 2.0;
        p.material.opacity = Math.max(0, 0.45 * (1.0 - fadeProgress));

        // Reset particle when lifetime ends or too high
        if (p.userData.lifetime >= 2.0 || p.position.y > 0.35) {
          p.position.y = p.userData.initialY;
          p.position.x = (Math.random() - 0.5) * 0.04;
          p.position.z = (Math.random() - 0.5) * 0.04;
          p.userData.lifetime = 0;
          p.material.opacity = 0.45;
        }
      });
    }

    // 3. Proximity Detection (< 2.5m) to show UI Prompt when standing
    if (!this.isSeatedAtPC && !this.isZooming) {
      const distToPC = this.camera.position.distanceTo(this.pcCenterPos);
      if (distToPC < 4.2) {
        if (this.proximityPrompt) this.proximityPrompt.classList.remove('hidden');
      } else {
        if (this.proximityPrompt) this.proximityPrompt.classList.add('hidden');
      }
    }
  }

  render() {
    if (!this.isActive || !this.renderer) return;
    this.renderer.render(this.scene, this.camera);
  }

  handleResize(width, height) {
    if (this.camera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
  }
}
