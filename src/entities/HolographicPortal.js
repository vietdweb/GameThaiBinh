import * as THREE from 'three';

/**
 * HolographicPortal.js - Cổng Dịch Chuyển 3D Hologram Trụ Đứng (Palace Portal Station)
 * 1. Nhiều vòng neon đồng tâm (Multiple Glowing Concentric Rings) xoay mượt mà dọc trục Y
 * 2. Lõi trụ năng lượng mờ emissive cyan 0x00f5d4 trong suốt
 * 3. Hạt lốc xoáy THREE.Points hút năng lượng bay ngược lên phía trên
 * 4. Phát hiện va chạm khoảng cách < 1.5m để hiện Prompt & kích hoạt dịch chuyển [E]
 */
export class HolographicPortal {
  constructor(scene, position = new THREE.Vector3(0, 0, 24), onTeleportTrigger = null) {
    this.scene = scene;
    this.position = position.clone();
    this.onTeleportTrigger = onTeleportTrigger;

    this.group = new THREE.Group();
    this.group.position.copy(this.position);

    this.rings = [];
    this.particlesMesh = null;
    this.particlePositions = null;
    this.particleVelocities = null;
    this.numParticles = 240;

    this.triggerRadius = 1.6;
    this.isPlayerNear = false;
    this.teleportCooldown = false;

    this._initPortalStructure();
    this._initSwirlingParticles();

    if (this.scene) {
      this.scene.add(this.group);
    }
  }

  _initPortalStructure() {
    // 1. Đế cổng phát sáng (Base Ring Platform)
    const baseGeo = new THREE.CylinderGeometry(2.4, 2.7, 0.25, 32);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x0b132b,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0x00f5d4,
      emissiveIntensity: 0.3
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.12;
    baseMesh.receiveShadow = true;
    this.group.add(baseMesh);

    // Vòng phát sáng mặt đất
    const groundRingGeo = new THREE.RingGeometry(1.2, 2.5, 32);
    const groundRingMat = new THREE.MeshBasicMaterial({
      color: 0x00f5d4,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    const groundRing = new THREE.Mesh(groundRingGeo, groundRingMat);
    groundRing.rotation.x = -Math.PI / 2;
    groundRing.position.y = 0.26;
    this.group.add(groundRing);

    // 2. Lõi trụ Hologram mờ trong suốt (Inner Cylinder Beam)
    const cylinderGeo = new THREE.CylinderGeometry(1.6, 1.6, 5.0, 32, 1, true);
    const cylinderMat = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      emissive: 0x00f5d4,
      emissiveIntensity: 0.7,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      roughness: 0.1
    });
    this.coreCylinder = new THREE.Mesh(cylinderGeo, cylinderMat);
    this.coreCylinder.position.y = 2.75;
    this.group.add(this.coreCylinder);

    // 3. Các vòng Neon Rings đồng tâm xoay quanh trục Y ở các độ cao khác nhau (Multiple Glowing Neon Rings)
    const ringHeights = [0.6, 1.3, 2.0, 2.7, 3.4, 4.1, 4.8];
    ringHeights.forEach((h, idx) => {
      const radius = 1.65 + Math.sin(idx * 0.8) * 0.15;
      const ringGeo = new THREE.TorusGeometry(radius, 0.04, 12, 48);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0x00f5d4,
        emissive: 0x00f5d4,
        emissiveIntensity: 1.2,
        transparent: true,
        opacity: 0.85,
        roughness: 0.1
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = h;
      this.group.add(ringMesh);

      this.rings.push({
        mesh: ringMesh,
        rotSpeed: (idx % 2 === 0 ? 1 : -1) * (0.8 + idx * 0.2),
        bobSpeed: 1.5 + idx * 0.3,
        baseY: h
      });
    });

    // 4. Ánh sáng phát từ tâm cổng
    this.portalLight = new THREE.PointLight(0x00f5d4, 3.5, 12);
    this.portalLight.position.set(0, 2.5, 0);
    this.group.add(this.portalLight);
  }

  _initSwirlingParticles() {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.numParticles * 3);
    const angles = new Float32Array(this.numParticles);
    const radii = new Float32Array(this.numParticles);
    const heights = new Float32Array(this.numParticles);

    for (let i = 0; i < this.numParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.2 + Math.random() * 1.3;
      const height = Math.random() * 5.0;

      angles[i] = angle;
      radii[i] = radius;
      heights[i] = height;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Texture tròn nhỏ phát sáng
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.4, 'rgba(0, 245, 212, 0.8)');
    grad.addColorStop(1, 'rgba(0, 245, 212, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(32, 32, 32, 0, Math.PI * 2);
    ctx.fill();

    const particleTexture = new THREE.CanvasTexture(canvas);

    const mat = new THREE.PointsMaterial({
      color: 0x00f5d4,
      size: 0.25,
      map: particleTexture,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particlesMesh = new THREE.Points(geo, mat);
    this.group.add(this.particlesMesh);

    this.particleMeta = { angles, radii, heights };
  }

  update(deltaTime, playerPosition) {
    // 1. Xoay các vòng rings đồng tâm
    const time = performance.now() * 0.001;
    this.rings.forEach(r => {
      r.mesh.rotation.z += r.rotSpeed * deltaTime;
      r.mesh.position.y = r.baseY + Math.sin(time * r.bobSpeed) * 0.08;
    });

    if (this.coreCylinder) {
      this.coreCylinder.rotation.y += 0.5 * deltaTime;
    }

    // 2. Cập nhật hạt lốc xoáy bay ngược lên trên (+Y)
    if (this.particlesMesh && this.particleMeta) {
      const posAttr = this.particlesMesh.geometry.attributes.position;
      const { angles, radii, heights } = this.particleMeta;

      for (let i = 0; i < this.numParticles; i++) {
        angles[i] += (1.5 + (1.5 - radii[i]) * 2.0) * deltaTime; // Xoáy nhanh hơn ở gần lõi
        heights[i] += (1.2 + Math.random() * 0.5) * deltaTime;   // Bay vút lên trên

        if (heights[i] > 5.2) {
          heights[i] = 0.2;
          radii[i] = 0.2 + Math.random() * 1.3;
          angles[i] = Math.random() * Math.PI * 2;
        }

        posAttr.setXYZ(
          i,
          Math.cos(angles[i]) * radii[i],
          heights[i],
          Math.sin(angles[i]) * radii[i]
        );
      }
      posAttr.needsUpdate = true;
    }

    // 3. Kiểm tra khoảng cách va chạm với người chơi
    if (playerPosition) {
      const dist = new THREE.Vector2(playerPosition.x, playerPosition.z).distanceTo(
        new THREE.Vector2(this.position.x, this.position.z)
      );

      this.isPlayerNear = dist <= this.triggerRadius;
    }

    return this.isPlayerNear;
  }

  triggerTeleport() {
    if (this.teleportCooldown) return;
    this.teleportCooldown = true;

    if (typeof this.onTeleportTrigger === 'function') {
      this.onTeleportTrigger();
    }

    setTimeout(() => {
      this.teleportCooldown = false;
    }, 2000);
  }

  destroy() {
    if (this.group && this.scene) {
      this.scene.remove(this.group);
    }
  }
}
