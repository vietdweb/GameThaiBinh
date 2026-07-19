import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AssetManager } from './AssetManager.js';

export class CharacterViewerManager {
  constructor(renderer, game) {
    this.renderer = renderer;
    this.game = game;
    this.isActive = false;

    // 1. Scene, Camera & Controls độc lập cho Phòng Xem 360°
    this.viewerScene = new THREE.Scene();
    this.viewerCamera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    this.viewerCamera.position.set(0, 1.3, 4.2);

    this.controls = null;
    this.currentModelGroup = new THREE.Group();
    this.viewerScene.add(this.currentModelGroup);

    this.autoRotateEnabled = true;

    this._setupShowroomEnvironment();
    this._setupControls();
  }

  /**
   * Khởi tạo bục đứng Showroom & hệ thống chiếu sáng studio chuyên nghiệp
   */
  _setupShowroomEnvironment() {
    // Phông nền phòng trưng bày Showroom (Sleek Dark Cyberpunk)
    this.viewerScene.background = new THREE.Color(0x0b0e14);
    this.viewerScene.fog = new THREE.FogExp2(0x0b0e14, 0.08);

    // Bục đứng trưng bày (Showroom Pedestal Podium)
    const podiumGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.15, 48);
    const podiumMat = new THREE.MeshStandardMaterial({
      color: 0x161b26,
      roughness: 0.3,
      metalness: 0.8
    });
    const podium = new THREE.Mesh(podiumGeo, podiumMat);
    podium.position.y = -0.075;
    podium.receiveShadow = true;
    this.viewerScene.add(podium);

    // Vòng đèn Neon phát sáng viền bục
    const ringGeo = new THREE.RingGeometry(1.58, 1.63, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.001;
    this.viewerScene.add(ring);

    // Tấm nền sàn phản chiếu bóng nhẹ
    const floorGeo = new THREE.PlaneGeometry(30, 30);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x07090e,
      roughness: 0.6,
      metalness: 0.4
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.08;
    floor.receiveShadow = true;
    this.viewerScene.add(floor);

    // Ánh sáng Trưng bày Chuyên nghiệp (Showroom Studio Lighting)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.viewerScene.add(ambientLight);

    // Đèn chính (Key Directional Light)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(3, 5, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    this.viewerScene.add(keyLight);

    // Đèn viền xanh cyan (Rim SpotLight)
    const rimLight = new THREE.SpotLight(0x00e5ff, 3.5);
    rimLight.position.set(-4, 3, -3);
    rimLight.lookAt(0, 0.8, 0);
    this.viewerScene.add(rimLight);

    // Đèn vàng nhấn chi tiết (Accent Gold Light)
    const fillLight = new THREE.DirectionalLight(0xffd700, 0.8);
    fillLight.position.set(-3, 2, 3);
    this.viewerScene.add(fillLight);
  }

  /**
   * Thiết lập OrbitControls xoay tự do 720° (chuột + cảm ứng)
   */
  _setupControls() {
    this.controls = new OrbitControls(this.viewerCamera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 2.0;
    this.controls.minDistance = 1.6;
    this.controls.maxDistance = 6.5;

    // Mở toàn bộ góc xoay dọc (0 → π) - xoay tự do 720°
    this.controls.minPolarAngle = 0;
    this.controls.maxPolarAngle = Math.PI;

    // Không giới hạn góc xoay ngang (mặc định đã tự do)
    this.controls.minAzimuthAngle = -Infinity;
    this.controls.maxAzimuthAngle = Infinity;

    // Bật cảm ứng đa điểm chạm
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_ROTATE
    };

    this.controls.target.set(0, 0.8, 0);
    this.controls.enabled = false;
  }

  /**
   * Mở Phòng Xem 360° cho Nhân Vật / Siêu Xe được chọn
   */
  openViewer(skinId, skinInfo = {}) {
    this.isActive = true;

    // Dọn dẹp mô hình cũ
    while (this.currentModelGroup.children.length > 0) {
      const child = this.currentModelGroup.children[0];
      this.currentModelGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
    }

    // Tải mô hình 3D từ AssetManager
    const modelKey = skinId === 'car_driver' ? 'lamborghini' : (skinId === 'ao_dai' ? 'student' : skinId);
    const rawModel = AssetManager.getModel(modelKey) || AssetManager.getModel('student');

    if (rawModel) {
      const modelClone = rawModel.clone();
      modelClone.rotation.set(0, 0, 0);

      // Tối ưu hóa vật liệu 3D cho phòng xem
      modelClone.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach(mat => {
              mat.side = THREE.FrontSide;
              if (mat.emissive) {
                mat.emissive.setHex(0x000000);
                mat.emissiveIntensity = 0;
              }
              const name = (mat.name || '').toLowerCase();
              if (!name.includes('glass') && mat.transparent) {
                mat.transparent = false;
                mat.depthWrite = true;
              }
            });
          }
        }
      });

      // Căn chỉnh tỉ lệ và vị trí đặt lên bục đứng
      const bbox = new THREE.Box3().setFromObject(modelClone);
      const size = bbox.getSize(new THREE.Vector3());

      if (skinId === 'car_driver') {
        const targetWidth = 1.85;
        const scaleFactor = targetWidth / size.x;
        modelClone.scale.set(scaleFactor, scaleFactor, scaleFactor);

        const scaledBbox = new THREE.Box3().setFromObject(modelClone);
        const scaledCenter = scaledBbox.getCenter(new THREE.Vector3());
        modelClone.position.x = -scaledCenter.x;
        modelClone.position.z = -scaledCenter.z;
        modelClone.position.y = -scaledBbox.min.y;

        this.controls.target.set(0, 0.45, 0);
        this.viewerCamera.position.set(0, 1.4, 4.5);
      } else {
        const targetHeight = 1.6;
        const scaleFactor = targetHeight / size.y;
        modelClone.scale.set(scaleFactor, scaleFactor, scaleFactor);

        const scaledBbox = new THREE.Box3().setFromObject(modelClone);
        modelClone.position.y = -scaledBbox.min.y;

        this.controls.target.set(0, 0.8, 0);
        this.viewerCamera.position.set(0, 1.2, 3.8);
      }

      this.currentModelGroup.add(modelClone);
    }

    // Kích hoạt OrbitControls
    this.controls.enabled = true;
    this.controls.autoRotate = this.autoRotateEnabled;
    this.controls.update();

    // Cập nhật thông tin UI
    const titleElem = document.getElementById('viewer-char-name');
    const descElem = document.getElementById('viewer-char-desc');
    if (titleElem) titleElem.textContent = (skinInfo.name || 'NHÂN VẬT').toUpperCase();
    if (descElem) descElem.textContent = skinInfo.desc || 'Xoay 360° để ngắm nhìn chi tiết 3D!';

    // Hiển thị Overlay UI (xóa hidden để kết hợp với active từ _showScreen)
    const panel = document.getElementById('character-viewer-panel');
    if (panel) {
      panel.classList.remove('hidden');
    }
  }

  /**
   * Đóng Phòng Xem 360° và quay về Menu
   */
  closeViewer() {
    this.isActive = false;

    // Tắt OrbitControls
    if (this.controls) {
      this.controls.enabled = false;
    }

    // Ẩn Overlay UI (thêm hidden để CSS display:none ẩn hon toàn)
    const panel = document.getElementById('character-viewer-panel');
    if (panel) {
      panel.classList.add('hidden');
      panel.classList.remove('active');
    }
  }

  /**
   * Bật/tắt tự động xoay showroom
   */
  toggleAutoRotate() {
    this.autoRotateEnabled = !this.autoRotateEnabled;
    if (this.controls) {
      this.controls.autoRotate = this.autoRotateEnabled;
    }
    return this.autoRotateEnabled;
  }

  /**
   * Reset góc nhìn Camera về mặc định
   */
  resetCamera() {
    if (this.controls) {
      this.controls.reset();
    }
  }

  /**
   * Cập nhật kích thước khung nhìn khi đổi kích thước màn hình
   */
  onWindowResize(width, height) {
    if (this.viewerCamera) {
      this.viewerCamera.aspect = width / height;
      this.viewerCamera.updateProjectionMatrix();
    }
  }

  /**
   * Vòng lặp cập nhật OrbitControls khi đang ở màn hình xem 360°
   */
  update() {
    if (!this.isActive) return;
    if (this.controls && this.controls.enabled) {
      this.controls.update();
    }
  }

  /**
   * Render Scene trưng bày 360°
   */
  render() {
    if (!this.isActive) return;
    this.renderer.render(this.viewerScene, this.viewerCamera);
  }
}
