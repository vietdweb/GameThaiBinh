import * as THREE from 'three';
import { MobileControls } from '../utils/mobile.js';

/**
 * RoguelikeArenaScene.js - Bản đồ Chiến đấu 3D Roguelike (Lấy cảm hứng từ game DISORDER)
 * 1. Dark Cyber-Dungeon Arena: Sương mù dày 0x0b0d17, sàn bê tông cốt thép loang lổ vết dầu, hàng rào lưới thép B40.
 * 2. Dynamic Electric Lightning Arcs VFX: Các tia sét điện neon nhấp nháy xẹt qua arena ngẫu nhiên.
 * 3. Sóng Quái Vật (Wave System): AI quái vật cận chiến Cyber-Beast tràn ra từ bóng tối tiến về người chơi.
 * 4. Hệ thống Combat & Particle: Khóa mục tiêu, xả súng plasma, nổ tia lửa & mảnh vụn văng tung tóe, số sát thương bay (Floating Damage Numbers).
 */
export class RoguelikeArenaScene {
  constructor(renderer, game) {
    this.renderer = renderer;
    this.game = game;
    this.isActive = false;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

    // Camera Orbit & Lock-on System
    this.cameraYaw = 0;
    this.cameraPitch = 0.35;
    this.cameraDistance = 8.5;
    this.isPointerDown = false;
    this.previousPointerPos = { x: 0, y: 0 };
    this.currentLookAt = new THREE.Vector3(0, 1.2, 0);

    // Controls
    this.activeKeys = new Set();
    this.mobileControls = new MobileControls(this);

    // Player State
    this.playerPos = new THREE.Vector3(0, 0, 0);
    this.playerMesh = null;
    this.playerHp = 1000;
    this.playerMaxHp = 1000;
    this.playerShield = 500;
    this.playerMaxShield = 500;
    this.moveSpeed = 12.0;

    // Monsters & Wave System
    this.monsters = [];
    this.currentWave = 1;
    this.totalWaves = 5;
    this.isWaveInProgress = false;
    this.monstersRemainingInWave = 0;

    // Projectiles & Particles
    this.projectiles = [];
    this.impactParticles = [];
    this.lightningArcs = [];
    this.lightningTimer = 0;

    // Arena Bounds
    this.arenaRadius = 38.0;

    this._initEnvironment();
    this._initLighting();
    this._initArenaStructures();
    this._initPlayer();
    this._setupInputListeners();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  onWindowResize() {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  /* 🌌 1. MÔI TRƯỜNG DARK CYBER-DUNGEON */
  _initEnvironment() {
    this.scene.background = new THREE.Color(0x0b0d17);
    this.scene.fog = new THREE.FogExp2(0x0b0d17, 0.03);
  }

  /* 💡 2. ÁNH SÁNG VÀ NEON GLOW */
  _initLighting() {
    const ambientLight = new THREE.AmbientLight(0x1a233a, 1.2);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00f5d4, 1.5);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);

    const redSpot = new THREE.PointLight(0xff0055, 3.0, 30);
    redSpot.position.set(-25, 6, -25);
    this.scene.add(redSpot);

    const cyanSpot = new THREE.PointLight(0x00f5d4, 3.0, 30);
    cyanSpot.position.set(25, 6, 25);
    this.scene.add(cyanSpot);
  }

  /* 🏗️ 3. SÀN BÊ TÔNG VẾT DẦU LOANG & HÀNG RÀO LƯỚI THÉP B40 */
  _initArenaStructures() {
    // Sàn bê tông cốt thép loang lổ (Industrial Concrete Floor)
    const floorGeo = new THREE.CircleGeometry(this.arenaRadius, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.85,
      metalness: 0.25
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    this.scene.add(floorMesh);

    // Các vết dầu loang (Oil Stains) trên sàn
    const stainMat = new THREE.MeshBasicMaterial({
      color: 0x070a12,
      transparent: true,
      opacity: 0.75
    });
    for (let i = 0; i < 16; i++) {
      const stainR = 2.5 + Math.random() * 5.0;
      const stain = new THREE.Mesh(new THREE.CircleGeometry(stainR, 16), stainMat);
      stain.rotation.x = -Math.PI / 2;
      const ang = Math.random() * Math.PI * 2;
      const dist = Math.random() * (this.arenaRadius - 8);
      stain.position.set(Math.cos(ang) * dist, 0.01, Math.sin(ang) * dist);
      this.scene.add(stain);
    }

    // Hàng rào lưới thép B40 bao quanh (B40 Industrial Wire Mesh Fence)
    const fenceGroup = new THREE.Group();
    const segments = 32;
    const fenceRadius = this.arenaRadius - 0.5;

    const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
    const wireMat = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      emissive: 0x00f5d4,
      emissiveIntensity: 0.4,
      wireframe: true,
      transparent: true,
      opacity: 0.65
    });

    for (let i = 0; i < segments; i++) {
      const angle1 = (i / segments) * Math.PI * 2;
      const angle2 = ((i + 1) / segments) * Math.PI * 2;

      const p1 = new THREE.Vector3(Math.cos(angle1) * fenceRadius, 0, Math.sin(angle1) * fenceRadius);
      const p2 = new THREE.Vector3(Math.cos(angle2) * fenceRadius, 0, Math.sin(angle2) * fenceRadius);

      // Trụ sắt B40
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 4.5, 8), postMat);
      post.position.set(p1.x, 2.25, p1.z);
      fenceGroup.add(post);

      // Tấm lưới B40 giăng giữa 2 trụ
      const width = p1.distanceTo(p2);
      const fencePlane = new THREE.Mesh(new THREE.PlaneGeometry(width, 4.2, 12, 8), wireMat);
      fencePlane.position.set((p1.x + p2.x) / 2, 2.1, (p1.z + p2.z) / 2);

      const midAngle = (angle1 + angle2) / 2;
      fencePlane.rotation.y = -midAngle + Math.PI / 2;
      fenceGroup.add(fencePlane);
    }
    this.scene.add(fenceGroup);
  }

  /* 👤 4. NHÂN VẬT ANIME CYBER WARRIOR */
  _initPlayer() {
    this.playerGroup = new THREE.Group();

    // Body Capsule
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x00f5d4, roughness: 0.3, metalness: 0.7 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.35, 1.6, 16), bodyMat);
    body.position.y = 0.8;
    body.castShadow = true;
    this.playerGroup.add(body);

    // Head / Helmet
    const headMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.9 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 16), headMat);
    head.position.y = 1.75;
    this.playerGroup.add(head);

    // Cyber Visor Glow
    const visorMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.2), visorMat);
    visor.position.set(0, 1.75, 0.22);
    this.playerGroup.add(visor);

    // Plasma Cannon Weapon
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 });
    this.gunMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.85), gunMat);
    this.gunMesh.position.set(0.45, 1.1, 0.35);
    this.playerGroup.add(this.gunMesh);

    this.playerPos.set(0, 0, 0);
    this.playerGroup.position.copy(this.playerPos);
    this.scene.add(this.playerGroup);
  }

  /* 🎮 5. ĐIỀU KHIỂN & INPUT LISTENERS */
  _setupInputListeners() {
    window.addEventListener('keydown', (e) => {
      if (!this.isActive) return;
      this.activeKeys.add(e.code);

      if (e.code === 'KeyE' || e.code === 'Space') {
        this._shootPlasmaBeam();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (!this.isActive) return;
      this.activeKeys.delete(e.code);
    });

    window.addEventListener('pointerdown', (e) => {
      if (!this.isActive) return;
      if (e.target.closest('#roguelike-hud, .mobile-btn')) return;

      if (e.button === 0) { // Click chuột trái để bắn
        this._shootPlasmaBeam();
      } else if (e.button === 2) { // Click chuột phải xoay camera
        this.isPointerDown = true;
        this.previousPointerPos = { x: e.clientX, y: e.clientY };
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isActive || !this.isPointerDown) return;
      const deltaX = e.clientX - this.previousPointerPos.x;
      const deltaY = e.clientY - this.previousPointerPos.y;

      this.cameraYaw -= deltaX * 0.005;
      this.cameraPitch = Math.max(0.1, Math.min(1.2, this.cameraPitch + deltaY * 0.005));

      this.previousPointerPos = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('pointerup', () => {
      this.isPointerDown = false;
    });

    window.addEventListener('contextmenu', (e) => {
      if (this.isActive) e.preventDefault();
    });
  }

  startArena() {
    this.isActive = true;
    this.playerHp = this.playerMaxHp;
    this.playerShield = this.playerMaxShield;
    this.currentWave = 1;
    this.monsters.forEach(m => this.scene.remove(m.mesh));
    this.monsters = [];

    this._updateHUD();
    this._startNextWave();
  }

  _startNextWave() {
    this.isWaveInProgress = true;
    const numMonsters = 4 + this.currentWave * 3;
    this.monstersRemainingInWave = numMonsters;

    this._showWaveBanner(`WAVE ${this.currentWave} / ${this.totalWaves}`);

    for (let i = 0; i < numMonsters; i++) {
      setTimeout(() => {
        if (this.isActive) this._spawnCyberMonster();
      }, i * 400);
    }
  }

  /* 👾 6. SINH AI QUÁI VẬT CYBER-BEAST */
  _spawnCyberMonster() {
    const angle = Math.random() * Math.PI * 2;
    const spawnDist = 18.0 + Math.random() * 12.0;
    const spawnX = Math.cos(angle) * spawnDist;
    const spawnZ = Math.sin(angle) * spawnDist;

    const monsterGroup = new THREE.Group();

    // Body
    const monsterMat = new THREE.MeshStandardMaterial({
      color: 0xe11d48,
      emissive: 0x9f1239,
      emissiveIntensity: 0.5,
      roughness: 0.4
    });
    const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75, 1), monsterMat);
    body.position.y = 0.75;
    body.castShadow = true;
    monsterGroup.add(body);

    // Glowing Eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfff176 });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), eyeMat);
    eyeL.position.set(-0.25, 0.9, 0.65);
    monsterGroup.add(eyeL);

    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), eyeMat);
    eyeR.position.set(0.25, 0.9, 0.65);
    monsterGroup.add(eyeR);

    monsterGroup.position.set(spawnX, 0, spawnZ);
    this.scene.add(monsterGroup);

    this.monsters.push({
      mesh: monsterGroup,
      hp: 200 + this.currentWave * 50,
      maxHp: 200 + this.currentWave * 50,
      speed: 4.5 + Math.random() * 1.5,
      attackCooldown: 0
    });
  }

  /* 🔫 7. BẮN ĐẠN PLASMA & PARTICLES INTERACTION */
  _shootPlasmaBeam() {
    if (!this.playerGroup) return;

    const shootDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerGroup.rotation.y);
    const origin = this.playerGroup.position.clone().add(new THREE.Vector3(0, 1.1, 0));

    // Create Plasma Projectile Mesh
    const projGeo = new THREE.SphereGeometry(0.22, 12, 12);
    const projMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
    const projMesh = new THREE.Mesh(projGeo, projMat);
    projMesh.position.copy(origin);
    this.scene.add(projMesh);

    this.projectiles.push({
      mesh: projMesh,
      velocity: shootDir.multiplyScalar(42.0),
      life: 1.5
    });

    this.game?.audioManager?.playCoin?.();
  }

  /* ⚡ 8. TẠO TIA SẾT ĐIỆN VẬT LÝ NHẤP NHÁY (Lightning Arcs VFX) */
  _triggerRandomLightningArc() {
    const startX = (Math.random() - 0.5) * this.arenaRadius * 1.6;
    const startZ = (Math.random() - 0.5) * this.arenaRadius * 1.6;

    const points = [];
    let cur = new THREE.Vector3(startX, 8.0 + Math.random() * 4.0, startZ);
    points.push(cur.clone());

    for (let i = 0; i < 5; i++) {
      cur.x += (Math.random() - 0.5) * 4.0;
      cur.y -= 1.5 + Math.random() * 1.0;
      cur.z += (Math.random() - 0.5) * 4.0;
      points.push(cur.clone());
    }

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: 0x00f5d4, linewidth: 2.5 });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);

    setTimeout(() => {
      this.scene.remove(line);
    }, 120);
  }

  /* 💥 9. NỔ TIA LỬA & MẢNH VỤN VĂNG TUNG TÓE */
  _createImpactSparks(position) {
    const sparkCount = 20;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(sparkCount * 3);
    const velocities = [];

    for (let i = 0; i < sparkCount; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 12.0,
        Math.random() * 10.0 + 2.0,
        (Math.random() - 0.5) * 12.0
      ));
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xff0055,
      size: 0.28,
      transparent: true,
      opacity: 1.0
    });

    const pMesh = new THREE.Points(geo, mat);
    this.scene.add(pMesh);

    this.impactParticles.push({
      mesh: pMesh,
      velocities,
      life: 0.45
    });
  }

  /* 🔢 10. FLOATING DAMAGE NUMBERS UI */
  _showFloatingDamage(damage, position) {
    const screenPos = position.clone();
    screenPos.project(this.camera);

    const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;

    const el = document.createElement('div');
    el.className = 'floating-damage-num';
    el.textContent = `-${damage}`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    document.getElementById('floating-damage-container')?.appendChild(el);

    setTimeout(() => {
      el.remove();
    }, 800);
  }

  /* 🔄 11. VÒNG LẶP UPDATE & RENDER ARENA */
  update(deltaTime) {
    if (!this.isActive) return;

    // 1. Di chuyển Player (WASD / Mũi tên)
    const moveDir = new THREE.Vector3(0, 0, 0);

    // Mobile Joystick support
    if (this.mobileControls && this.mobileControls.joystickVec) {
      moveDir.x += this.mobileControls.joystickVec.x;
      moveDir.z += this.mobileControls.joystickVec.y;
    }

    if (this.activeKeys.has('KeyW') || this.activeKeys.has('ArrowUp')) moveDir.z -= 1;
    if (this.activeKeys.has('KeyS') || this.activeKeys.has('ArrowDown')) moveDir.z += 1;
    if (this.activeKeys.has('KeyA') || this.activeKeys.has('ArrowLeft')) moveDir.x -= 1;
    if (this.activeKeys.has('KeyD') || this.activeKeys.has('ArrowRight')) moveDir.x += 1;

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      const moveAngle = Math.atan2(moveDir.x, moveDir.z) + this.cameraYaw;
      const finalDir = new THREE.Vector3(Math.sin(moveAngle), 0, Math.cos(moveAngle));

      this.playerPos.addScaledVector(finalDir, this.moveSpeed * deltaTime);

      // Giới hạn phạm vi Arena
      if (this.playerPos.length() > this.arenaRadius - 1.5) {
        this.playerPos.setLength(this.arenaRadius - 1.5);
      }

      this.playerGroup.position.copy(this.playerPos);
      this.playerGroup.rotation.y = moveAngle;
    }

    // 2. Camera Orbit Lock-on Player
    const camX = this.playerPos.x + Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDistance;
    const camY = this.playerPos.y + Math.sin(this.cameraPitch) * this.cameraDistance + 1.6;
    const camZ = this.playerPos.z + Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDistance;

    this.camera.position.set(camX, camY, camZ);
    this.currentLookAt.lerp(new THREE.Vector3(this.playerPos.x, 1.2, this.playerPos.z), 0.1);
    this.camera.lookAt(this.currentLookAt);

    // 3. Cập nhật Đạn Plasma
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.mesh.position.addScaledVector(p.velocity, deltaTime);
      p.life -= deltaTime;

      // Va chạm với Quái
      let hit = false;
      for (let j = this.monsters.length - 1; j >= 0; j--) {
        const m = this.monsters[j];
        if (p.mesh.position.distanceTo(m.mesh.position) < 1.2) {
          hit = true;
          const damage = 85 + Math.floor(Math.random() * 40);
          m.hp -= damage;

          this._createImpactSparks(p.mesh.position);
          this._showFloatingDamage(damage, m.mesh.position);

          if (m.hp <= 0) {
            this.scene.remove(m.mesh);
            this.monsters.splice(j, 1);
            this.monstersRemainingInWave--;
          }
          break;
        }
      }

      if (hit || p.life <= 0 || p.mesh.position.length() > this.arenaRadius) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }

    // 4. Cập nhật Hạt Sparks
    for (let i = this.impactParticles.length - 1; i >= 0; i--) {
      const p = this.impactParticles[i];
      p.life -= deltaTime;
      const posAttr = p.mesh.geometry.attributes.position;

      for (let k = 0; k < p.velocities.length; k++) {
        p.velocities[k].y -= 25.0 * deltaTime;
        posAttr.setXYZ(
          k,
          posAttr.getX(k) + p.velocities[k].x * deltaTime,
          posAttr.getY(k) + p.velocities[k].y * deltaTime,
          posAttr.getZ(k) + p.velocities[k].z * deltaTime
        );
      }
      posAttr.needsUpdate = true;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.impactParticles.splice(i, 1);
      }
    }

    // 5. Cập nhật AI Quái đuổi theo Player
    this.monsters.forEach(m => {
      const dir = new THREE.Vector3().subVectors(this.playerPos, m.mesh.position);
      dir.y = 0;
      if (dir.length() > 0.8) {
        dir.normalize();
        m.mesh.position.addScaledVector(dir, m.speed * deltaTime);
        m.mesh.rotation.y = Math.atan2(dir.x, dir.z);
      } else {
        // Quái tấn công Player
        m.attackCooldown -= deltaTime;
        if (m.attackCooldown <= 0) {
          m.attackCooldown = 1.0;
          this.takeDamage(25);
        }
      }
    });

    // 6. Kiểm tra hoàn tất Wave Quái
    if (this.isWaveInProgress && this.monstersRemainingInWave <= 0 && this.monsters.length === 0) {
      this.isWaveInProgress = false;
      if (this.currentWave < this.totalWaves) {
        this.currentWave++;
        setTimeout(() => this._startNextWave(), 1500);
      } else {
        this._showWaveBanner('🏆 CHIẾN THẮNG ARENA ROGUELIKE!');
      }
    }

    // 7. Tia sét điện chớp sáng ngẫu nhiên
    this.lightningTimer += deltaTime;
    if (this.lightningTimer > 1.2 && Math.random() < 0.25) {
      this.lightningTimer = 0;
      this._triggerRandomLightningArc();
    }

    this._updateHUD();
  }

  takeDamage(amount) {
    if (this.playerShield > 0) {
      this.playerShield -= amount;
      if (this.playerShield < 0) {
        this.playerHp += this.playerShield;
        this.playerShield = 0;
      }
    } else {
      this.playerHp -= amount;
    }

    if (this.playerHp <= 0) {
      this.playerHp = 0;
      this._handleGameOver();
    }

    this._updateHUD();
  }

  _handleGameOver() {
    this.isActive = false;
    this.game?.stateMachine?.transition('GAMEOVER');
  }

  _updateHUD() {
    const hpBar = document.getElementById('roguelike-hp-fill');
    const shieldBar = document.getElementById('roguelike-shield-fill');
    const waveText = document.getElementById('roguelike-wave-info');

    if (hpBar) hpBar.style.width = `${(this.playerHp / this.playerMaxHp) * 100}%`;
    if (shieldBar) shieldBar.style.width = `${(this.playerShield / this.playerMaxShield) * 100}%`;
    if (waveText) waveText.textContent = `WAVE ${this.currentWave}/${this.totalWaves} - QUÁI CÒN LẠI: ${this.monstersRemainingInWave}`;
  }

  _showWaveBanner(text) {
    const banner = document.getElementById('roguelike-wave-banner');
    if (banner) {
      banner.textContent = text;
      banner.classList.add('show');
      setTimeout(() => banner.classList.remove('show'), 2000);
    }
  }

  exitArena() {
    this.isActive = false;
    this.game?.stateMachine?.transition('MENU');
  }

  render() {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
