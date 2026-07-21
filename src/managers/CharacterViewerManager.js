import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AssetManager } from './AssetManager.js';

export class CharacterViewerManager {
  constructor(renderer, game) {
    this.renderer = renderer;
    this.game = game;
    this.isActive = false;

    this.viewerScene = new THREE.Scene();
    this.viewerCamera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    this.viewerCamera.position.set(0, 1.3, 4.2);

    this.controls = null;
    this.autoRotateEnabled = true;

    this.currentModelGroup = new THREE.Group();
    this.viewerScene.add(this.currentModelGroup);

    this._setupShowroomEnvironment();
  }

  _setupShowroomEnvironment() {
    this.viewerScene.background = new THREE.Color(0x0b0e14);
    this.viewerScene.fog = new THREE.FogExp2(0x0b0e14, 0.08);

    const podiumGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.15, 48);
    const podiumMat = new THREE.MeshStandardMaterial({ color: 0x161b26, roughness: 0.3, metalness: 0.8 });
    const podium = new THREE.Mesh(podiumGeo, podiumMat);
    podium.position.y = -0.075;
    podium.receiveShadow = true;
    this.viewerScene.add(podium);

    const ringGeo = new THREE.RingGeometry(1.58, 1.63, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.001;
    this.viewerScene.add(ring);

    const floorGeo = new THREE.PlaneGeometry(30, 30);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x07090e, roughness: 0.6, metalness: 0.4 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.08;
    floor.receiveShadow = true;
    this.viewerScene.add(floor);

    this.viewerScene.add(new THREE.AmbientLight(0xffffff, 0.7));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(3, 5, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    this.viewerScene.add(keyLight);

    const rimLight = new THREE.SpotLight(0x00e5ff, 3.5);
    rimLight.position.set(-4, 3, -3);
    rimLight.lookAt(0, 0.8, 0);
    this.viewerScene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xffd700, 0.8);
    fillLight.position.set(-3, 2, 3);
    this.viewerScene.add(fillLight);
  }

  /**
   * Tao OrbitControls sau khi panel visible.
   *
   * FIX CHINH:
   * - Bind vao #viewer-drag-area (z-902) thay vi panel hoac canvas
   * - viewer-drag-area la vung TRONG SUOT chi danh cho drag/xoay
   * - Cac UI button (z-912) nam TREN drag area -> van nhan click binh thuong
   * - setPointerCapture chi anh huong drag-area, KHONG chiem events cua buttons
   */
  _createControls() {
    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }

    // Dung drag area la element nhan events cua OrbitControls
    const dragArea = document.getElementById('viewer-drag-area');
    const domElem = dragArea || this.renderer.domElement;

    this.controls = new OrbitControls(this.viewerCamera, domElem);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.autoRotate = this.autoRotateEnabled;
    this.controls.autoRotateSpeed = 2.0;
    this.controls.minDistance = 1.6;
    this.controls.maxDistance = 6.5;

    // Xoay tu do 720 do
    this.controls.minPolarAngle = 0;
    this.controls.maxPolarAngle = Math.PI;
    this.controls.minAzimuthAngle = -Infinity;
    this.controls.maxAzimuthAngle = Infinity;

    // Cam ung: 1 ngon xoay, 2 ngon zoom
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_ROTATE
    };

    this.controls.enabled = true;
  }

  openViewer(skinId, skinInfo = {}) {
    this.isActive = true;

    // Don dep model cu
    while (this.currentModelGroup.children.length > 0) {
      const child = this.currentModelGroup.children[0];
      this.currentModelGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
    }

    // Load model
    const modelKey = skinId === 'car_driver' ? 'lamborghini' : skinId;
    const rawModel = AssetManager.getModel(modelKey) || AssetManager.getModel('student');

    let targetPos = new THREE.Vector3(0, 0.8, 0);
    let cameraPos = new THREE.Vector3(0, 1.2, 3.8);

    if (rawModel) {
      const modelClone = rawModel.clone();
      modelClone.rotation.set(0, 0, 0);

      modelClone.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach(mat => {
              mat.side = THREE.FrontSide;
              if (mat.emissive) { mat.emissive.setHex(0x000000); mat.emissiveIntensity = 0; }
              const name = (mat.name || '').toLowerCase();
              if (!name.includes('glass') && mat.transparent) { mat.transparent = false; mat.depthWrite = true; }
            });
          }
        }
      });

      const bbox = new THREE.Box3().setFromObject(modelClone);
      const size = bbox.getSize(new THREE.Vector3());

      if (skinId === 'lamborghini' || skinId === 'cyberpsycho_car') {
        const scaleFactor = 1.85 / size.x;
        modelClone.scale.setScalar(scaleFactor);
        const sb = new THREE.Box3().setFromObject(modelClone);
        const sc = sb.getCenter(new THREE.Vector3());
        modelClone.position.set(-sc.x, -sb.min.y, -sc.z);
        targetPos.set(0, 0.45, 0);
        cameraPos.set(0, 1.4, 4.5);
      } else {
        const scaleFactor = 1.6 / size.y;
        modelClone.scale.setScalar(scaleFactor);
        const sb = new THREE.Box3().setFromObject(modelClone);
        modelClone.position.y = -sb.min.y;
      }

      this.currentModelGroup.add(modelClone);
    }

    // 1. Hien thi panel truoc
    const panel = document.getElementById('character-viewer-panel');
    if (panel) panel.classList.remove('hidden');

    // 2. Tao controls SAU KHI panel visible (drag-area moi co the nhan events)
    this._createControls();

    // 3. Ap dung vi tri camera
    this.controls.target.copy(targetPos);
    this.viewerCamera.position.copy(cameraPos);
    this.controls.update();

    // Cap nhat UI text
    const titleElem = document.getElementById('viewer-char-name');
    const descElem = document.getElementById('viewer-char-desc');
    if (titleElem) titleElem.textContent = (skinInfo.name || 'NHAN VAT').toUpperCase();
    if (descElem) descElem.textContent = skinInfo.desc || 'Keo chuot / Vuot 1 ngon: xoay 720!';
  }

  closeViewer() {
    this.isActive = false;

    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }

    const panel = document.getElementById('character-viewer-panel');
    if (panel) {
      panel.classList.add('hidden');
      panel.classList.remove('active');
    }
  }

  toggleAutoRotate() {
    this.autoRotateEnabled = !this.autoRotateEnabled;
    if (this.controls) this.controls.autoRotate = this.autoRotateEnabled;
    return this.autoRotateEnabled;
  }

  resetCamera() {
    if (this.controls) this.controls.reset();
  }

  onWindowResize(width, height) {
    if (this.viewerCamera) {
      this.viewerCamera.aspect = width / height;
      this.viewerCamera.updateProjectionMatrix();
    }
  }

  update() {
    if (!this.isActive || !this.controls) return;
    this.controls.update();
  }

  render() {
    if (!this.isActive) return;
    this.renderer.render(this.viewerScene, this.viewerCamera);
  }
}
