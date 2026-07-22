/**
 * City3DScene.js - 3D City Open World Explorer Scene
 * Features:
 * 1. Lazy Loading /models/city.glb via GLTFLoader on Demand (0ms upfront web load time)
 * 2. Full 3D Player Character Movement Controller (Baby Goku, Cyber Heroine, Shadow Ninja)
 * 3. GTA & Roblox 360° Dynamic Orbit Camera
 * 4. Realistic Directional Sunlight & Cyan Fog Environment
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MobileControls } from '../utils/mobile.js';

export class City3DScene {
    constructor(renderer, game) {
        this.renderer = renderer;
        this.game = game;
        this.isActive = false;
        this.isLoaded = false;
        this.isLoading = false;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 3000);

        // Orbit Camera Settings
        this.cameraYaw = 0;
        this.cameraPitch = 0.42;
        this.cameraDistance = 12.0;
        this.isPointerDown = false;
        this.previousPointerPos = { x: 0, y: 0 };
        this.targetLookAt = new THREE.Vector3();
        this.currentLookAt = new THREE.Vector3();

        // Physics & Controls
        this.groundY = 0.0;
        this.spawnPoint = new THREE.Vector3(6.2, 0.05, -23.8);
        this.playerPos = this.spawnPoint.clone();
        this.playerMesh = null;
        this.leftLegGroup = null;
        this.rightLegGroup = null;
        this.leftArmGroup = null;
        this.rightArmGroup = null;
        this.cloakTailMesh = null;

        this.velocityY = 0;
        this.gravity = -24.0;
        this.jumpForce = 9.0;
        this.isGrounded = true;
        this.moveSpeed = 8.5;
        this.playerWalkTimer = 0;
        this.activeKeys = new Set();

        this.bounds = { minX: -250, maxX: 250, minZ: -250, maxZ: 250 };
        this.cityModel = null;
        this.babyGokuGltf = null;
        this.fallbackGroundPlane = null;

        this._setupScene();
        this._setupControls();
        this._setupMouseCameraControls();

        this.mobileControls = new MobileControls(this);
    }

    /* ☀️ THIẾT LẬP BẦU TRỜI & ÁNH SÁNG COASTAL CITY */
    _setupScene() {
        this.scene.background = new THREE.Color(0x8ad2f1);
        this.scene.fog = new THREE.FogExp2(0x8ad2f1, 0.003);

        // Hemisphere Light (Cyan Sky + Soft Ground)
        const hemiLight = new THREE.HemisphereLight(0x8ad2f1, 0x334155, 1.0);
        hemiLight.position.set(0, 100, 0);
        this.scene.add(hemiLight);

        // Sunlight Directional Light với PCFSoftShadowMap
        const sunLight = new THREE.DirectionalLight(0xfff8e7, 1.8);
        sunLight.position.set(60, 120, 50);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 400;
        sunLight.shadow.camera.left = -150;
        sunLight.shadow.camera.right = 150;
        sunLight.shadow.camera.top = 150;
        sunLight.shadow.camera.bottom = -150;
        sunLight.shadow.bias = -0.0005;
        this.scene.add(sunLight);

        // Mặt đất dự phòng 3D màu tối (Dark Slate Ground)
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
        this.fallbackGroundPlane = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), groundMat);
        this.fallbackGroundPlane.rotation.x = -Math.PI / 2;
        this.fallbackGroundPlane.position.y = -0.05;
        this.fallbackGroundPlane.receiveShadow = true;
        this.scene.add(this.fallbackGroundPlane);
    }

    /* 🌆 LAZY LOAD MAP CITY.GLB KHI NGƯỜI CHƠI CLICK VÀO MAP */
    loadCity(onProgress, onLoadComplete) {
        if (this.isLoaded) {
            if (onLoadComplete) onLoadComplete();
            return;
        }
        if (this.isLoading) return;

        this.isLoading = true;

        // Khởi tạo DRACOLoader giải mã GLTF/GLB
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        dracoLoader.setDecoderConfig({ type: 'js' });

        const loader = new GLTFLoader();
        loader.setDRACOLoader(dracoLoader);

        // Tải Model City.glb bất đồng bộ
        loader.load(
            '/models/city.glb',
            (gltf) => {
                this.cityModel = gltf.scene;
                this.cityModel.position.set(0, 0, 0);

                this.cityModel.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                if (gltf.animations && gltf.animations.length > 0) {
                    this.cityMixer = new THREE.AnimationMixer(this.cityModel);
                    gltf.animations.forEach(clip => {
                        this.cityMixer.clipAction(clip).play();
                    });
                }

                // Xóa bỏ mặt đất dự phòng khi city.glb tải xong
                if (this.fallbackGroundPlane) {
                    this.scene.remove(this.fallbackGroundPlane);
                    this.fallbackGroundPlane = null;
                }

                this.scene.add(this.cityModel);
                console.log('🌆 Model City.glb đã nạp thành công 100%!');

                // Tải nhân vật 3D Baby Goku / Skins
                this._loadBabyGokuModel(() => {
                    this.isLoaded = true;
                    this.isLoading = false;
                    this._initPlayer();
                    if (onLoadComplete) onLoadComplete();
                });
            },
            (xhr) => {
                if (xhr.lengthComputable && onProgress) {
                    const percent = Math.floor((xhr.loaded / xhr.total) * 100);
                    onProgress(percent);
                }
            },
            (error) => {
                console.warn('⚠️ Lỗi nạp /models/city.glb:', error);
                this._createFallbackProceduralCity();
                this._loadBabyGokuModel(() => {
                    this.isLoaded = true;
                    this.isLoading = false;
                    this._initPlayer();
                    if (onLoadComplete) onLoadComplete();
                });
            }
        );
    }

    _loadBabyGokuModel(onComplete) {
        const loader = new GLTFLoader();
        loader.load(
            '/models/baby_goku.glb',
            (gltf) => {
                this.babyGokuGltf = gltf;
                if (onComplete) onComplete();
            },
            undefined,
            (err) => {
                console.warn('⚠️ Could not load baby_goku.glb in City, fallback to 3D Goku model:', err);
                if (onComplete) onComplete();
            }
        );
    }

    /* 🏬 THÀNH PHỐ 3D CẦU TRÚC PHỐ XÁ DỰ PHÒNG KHI CITY.GLB ĐANG NẠP */
    _createFallbackProceduralCity() {
        const cityGroup = new THREE.Group();

        // Đường phố chính xám Slate (Roads)
        const roadMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
        const mainRoad = new THREE.Mesh(new THREE.BoxGeometry(24, 0.08, 180), roadMat);
        mainRoad.position.set(0, 0.01, 0);
        mainRoad.receiveShadow = true;
        cityGroup.add(mainRoad);

        const crossRoad = new THREE.Mesh(new THREE.BoxGeometry(180, 0.08, 24), roadMat);
        crossRoad.position.set(0, 0.01, 0);
        crossRoad.receiveShadow = true;
        cityGroup.add(crossRoad);

        // Các tòa nhà cao tầng Cyber Skyscraper 3D xung quanh phố xá
        const buildingColors = [0x1e293b, 0x0f172a, 0x334155, 0x475569, 0x0f766e, 0x0369a1];
        for (let bx = -70; bx <= 70; bx += 35) {
            for (let bz = -70; bz <= 70; bz += 35) {
                if (Math.abs(bx) < 20 && Math.abs(bz) < 20) continue;

                const h = 18 + Math.random() * 25;
                const bMat = new THREE.MeshStandardMaterial({ color: buildingColors[Math.floor(Math.random() * buildingColors.length)], roughness: 0.5 });
                const bMesh = new THREE.Mesh(new THREE.BoxGeometry(22, h, 22), bMat);
                bMesh.position.set(bx, h / 2, bz);
                bMesh.castShadow = true;
                bMesh.receiveShadow = true;
                cityGroup.add(bMesh);
            }
        }

        this.scene.add(cityGroup);
    }

    /* 👑 KHIỂN TẠO VÀ CHỌN SKINS NHÂN VẬT 3D */
    _initPlayer() {
        this.selectedCharacterSkin = this.game?.shop3DScene?.selectedCharacterSkin || 'baby_goku';
        this._switchPlayerSkin(this.selectedCharacterSkin);
    }

    _switchPlayerSkin(skinId) {
        if (!['cyber_heroine', 'baby_goku', 'cyber_ninja'].includes(skinId)) return;

        const currentPos = this.playerMesh ? this.playerMesh.position.clone() : this.playerPos.clone();
        const currentRotY = this.playerMesh ? this.playerMesh.rotation.y : 0;

        if (this.playerMesh) {
            this.scene.remove(this.playerMesh);
        }

        let newMesh = null;
        if (skinId === 'baby_goku') {
            newMesh = this._createBabyGokuMesh();
        } else if (skinId === 'cyber_ninja') {
            newMesh = this._createShadowNinjaMesh();
        } else {
            newMesh = this._createCyberHeroineMesh();
        }

        this.selectedCharacterSkin = skinId;
        this.playerMesh = newMesh;
        this.playerMesh.position.copy(currentPos);
        this.playerMesh.rotation.y = currentRotY;

        this.leftLegGroup = newMesh.userData.leftLegGroup || null;
        this.rightLegGroup = newMesh.userData.rightLegGroup || null;
        this.leftArmGroup = newMesh.userData.leftArmGroup || null;
        this.rightArmGroup = newMesh.userData.rightArmGroup || null;
        this.cloakTailMesh = newMesh.userData.cloakTailMesh || null;
        this.playerMixer = newMesh.userData.mixer || null;
        this.playerActions = newMesh.userData.actions || null;
        this.currentActionName = newMesh.userData.currentActionName || 'idle';

        this.scene.add(this.playerMesh);
    }

    /* 👑 SKIN 1: CYBER HEROINE */
    _createCyberHeroineMesh() {
        const playerGroup = new THREE.Group();
        const shoesMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
        const legsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
        const cyanNeonMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff });
        const whiteCloakMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7, metalness: 0.1 });

        const leftLegGroup = new THREE.Group();
        const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.14, 0.34), shoesMat);
        shoeL.position.set(-0.16, 0.07, 0.02);
        leftLegGroup.add(shoeL);
        const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.44, 10), legsMat);
        legL.position.set(-0.16, 0.28, 0);
        leftLegGroup.add(legL);
        playerGroup.add(leftLegGroup);

        const rightLegGroup = new THREE.Group();
        const shoeR = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.14, 0.34), shoesMat);
        shoeR.position.set(0.16, 0.07, 0.02);
        rightLegGroup.add(shoeR);
        const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.44, 10), legsMat);
        legR.position.set(0.16, 0.28, 0);
        rightLegGroup.add(legR);
        playerGroup.add(rightLegGroup);

        const leftArmGroup = new THREE.Group();
        leftArmGroup.position.set(-0.36, 0.92, 0);
        const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.48, 8, 12), whiteCloakMat);
        armL.position.set(0, -0.24, 0);
        leftArmGroup.add(armL);
        playerGroup.add(leftArmGroup);

        const rightArmGroup = new THREE.Group();
        rightArmGroup.position.set(0.36, 0.92, 0);
        const armR = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.48, 8, 12), whiteCloakMat);
        armR.position.set(0, -0.24, 0);
        rightArmGroup.add(armR);
        playerGroup.add(rightArmGroup);

        const robeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.46, 0.75, 12), whiteCloakMat);
        robeBody.position.y = 0.85;
        playerGroup.add(robeBody);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), new THREE.MeshBasicMaterial({ color: 0x090d16 }));
        head.position.y = 1.45;
        playerGroup.add(head);

        const shadowCircle = new THREE.Mesh(
            new THREE.CircleGeometry(0.42, 32),
            new THREE.MeshBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.35 })
        );
        shadowCircle.rotation.x = -Math.PI / 2;
        shadowCircle.position.y = 0.01;
        playerGroup.add(shadowCircle);

        playerGroup.userData = { leftLegGroup, rightLegGroup, leftArmGroup, rightArmGroup, cloakTailMesh: null };
        return playerGroup;
    }

    /* 👑 SKIN 2: BABY GOKU 3D MODEL */
    _createBabyGokuMesh() {
        if (this.babyGokuGltf) {
            const containerGroup = new THREE.Group();
            const model = this.babyGokuGltf.scene.clone(true);

            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const targetHeight = 1.5;
            const scaleFactor = targetHeight / (size.y || 1);
            model.scale.set(scaleFactor, scaleFactor, scaleFactor);

            const scaledBox = new THREE.Box3().setFromObject(model);
            model.position.y = -scaledBox.min.y;

            model.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            containerGroup.add(model);

            let mixer = null;
            let actions = {};
            if (this.babyGokuGltf.animations && this.babyGokuGltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(model);
                this.babyGokuGltf.animations.forEach(clip => {
                    const action = mixer.clipAction(clip);
                    const name = clip.name.toLowerCase();
                    if (name.includes('walk')) actions['walk'] = action;
                    else if (name.includes('run')) actions['run'] = action;
                    else if (name.includes('jump')) actions['jump'] = action;
                    else if (name.includes('idle')) actions['idle'] = action;
                    else actions[clip.name] = action;
                });

                const clips = this.babyGokuGltf.animations;
                if (!actions['idle'] && clips[0]) actions['idle'] = mixer.clipAction(clips[0]);
                if (!actions['walk'] && clips[1]) actions['walk'] = mixer.clipAction(clips[1]);
                else if (!actions['walk']) actions['walk'] = actions['idle'];
                if (!actions['run']) actions['run'] = actions['walk'];
                if (!actions['jump']) actions['jump'] = actions['walk'];

                if (actions['idle']) actions['idle'].play();
            }

            let leftLegGroup = null, rightLegGroup = null, leftArmGroup = null, rightArmGroup = null;
            model.traverse(c => {
                const n = c.name.toLowerCase();
                if (n.includes('leg') && (n.includes('l') || n.includes('left'))) leftLegGroup = c;
                else if (n.includes('leg') && (n.includes('r') || n.includes('right'))) rightLegGroup = c;
                else if (n.includes('arm') && (n.includes('l') || n.includes('left'))) leftArmGroup = c;
                else if (n.includes('arm') && (n.includes('r') || n.includes('right'))) rightArmGroup = c;
            });

            const shadowCircle = new THREE.Mesh(
                new THREE.CircleGeometry(0.42, 32),
                new THREE.MeshBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.35 })
            );
            shadowCircle.rotation.x = -Math.PI / 2;
            shadowCircle.position.y = 0.01;
            containerGroup.add(shadowCircle);

            containerGroup.userData = {
                mixer,
                actions,
                currentActionName: 'idle',
                leftLegGroup,
                rightLegGroup,
                leftArmGroup,
                rightArmGroup,
                cloakTailMesh: null
            };
            return containerGroup;
        }

        // Procedural Fallback 3D Goku
        const gohan = new THREE.Group();
        const orangeGiMat = new THREE.MeshToonMaterial({ color: 0xea580c });
        const blueInnerMat = new THREE.MeshToonMaterial({ color: 0x1d4ed8 });
        const skinMat = new THREE.MeshToonMaterial({ color: 0xfde047 });
        const hairBlackMat = new THREE.MeshToonMaterial({ color: 0x0f172a });
        const bootsMat = new THREE.MeshToonMaterial({ color: 0x1e293b });

        const leftLegGroup = new THREE.Group();
        leftLegGroup.position.set(-0.16, 0.66, 0);
        const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.50, 8, 12), orangeGiMat);
        legL.position.set(0, -0.22, 0);
        leftLegGroup.add(legL);
        const bootL = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.32, 12), bootsMat);
        bootL.position.set(0, -0.45, 0.04);
        leftLegGroup.add(bootL);
        gohan.add(leftLegGroup);

        const rightLegGroup = new THREE.Group();
        rightLegGroup.position.set(0.16, 0.66, 0);
        const legR = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.50, 8, 12), orangeGiMat);
        legR.position.set(0, -0.22, 0);
        rightLegGroup.add(legR);
        const bootR = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.32, 12), bootsMat);
        bootR.position.set(0, -0.45, 0.04);
        rightLegGroup.add(bootR);
        gohan.add(rightLegGroup);

        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.25, 0.72, 12), orangeGiMat);
        torso.position.y = 1.10;
        gohan.add(torso);

        const leftArmGroup = new THREE.Group();
        leftArmGroup.position.set(-0.34, 1.36, 0);
        const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.44, 8, 12), skinMat);
        armL.position.set(0, -0.20, 0);
        leftArmGroup.add(armL);
        gohan.add(leftArmGroup);

        const rightArmGroup = new THREE.Group();
        rightArmGroup.position.set(0.34, 1.36, 0);
        const armR = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.44, 8, 12), skinMat);
        armR.position.set(0, -0.20, 0);
        rightArmGroup.add(armR);
        gohan.add(rightArmGroup);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), skinMat);
        head.position.y = 1.60;
        gohan.add(head);

        const hairGroup = new THREE.Group();
        hairGroup.position.set(0, 1.62, 0);
        [
            { pos: [0, 0.42, -0.02], rot: [0.1, 0, 0], scale: [0.16, 0.75] },
            { pos: [-0.18, 0.32, 0.02], rot: [0.1, 0, 0.45], scale: [0.14, 0.65] },
            { pos: [0.18, 0.32, 0.02], rot: [0.1, 0, -0.45], scale: [0.14, 0.65] }
        ].forEach(sd => {
            const spike = new THREE.Mesh(new THREE.ConeGeometry(sd.scale[0], sd.scale[1], 6), hairBlackMat);
            spike.position.set(sd.pos[0], sd.pos[1], sd.pos[2]);
            spike.rotation.set(sd.rot[0], sd.rot[1], sd.rot[2]);
            hairGroup.add(spike);
        });
        gohan.add(hairGroup);

        const shadowCircle = new THREE.Mesh(
            new THREE.CircleGeometry(0.42, 32),
            new THREE.MeshBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.35 })
        );
        shadowCircle.rotation.x = -Math.PI / 2;
        shadowCircle.position.y = 0.01;
        gohan.add(shadowCircle);

        gohan.userData = { leftLegGroup, rightLegGroup, leftArmGroup, rightArmGroup, cloakTailMesh: null };
        return gohan;
    }

    /* 👑 SKIN 3: SHADOW NINJA CYBER */
    _createShadowNinjaMesh() {
        const ninja = new THREE.Group();
        const darkArmorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.8 });
        const redNeonMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });

        const leftLegGroup = new THREE.Group();
        leftLegGroup.position.set(-0.16, 0.66, 0);
        const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.10, 0.46, 8, 12), darkArmorMat);
        legL.position.set(0, -0.22, 0);
        leftLegGroup.add(legL);
        ninja.add(leftLegGroup);

        const rightLegGroup = new THREE.Group();
        rightLegGroup.position.set(0.16, 0.66, 0);
        const legR = new THREE.Mesh(new THREE.CapsuleGeometry(0.10, 0.46, 8, 12), darkArmorMat);
        legR.position.set(0, -0.22, 0);
        rightLegGroup.add(legR);
        ninja.add(rightLegGroup);

        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.72, 12), darkArmorMat);
        torso.position.y = 1.10;
        ninja.add(torso);

        const leftArmGroup = new THREE.Group();
        leftArmGroup.position.set(-0.34, 1.36, 0);
        const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.44, 8, 12), darkArmorMat);
        armL.position.set(0, -0.20, 0);
        leftArmGroup.add(armL);
        ninja.add(leftArmGroup);

        const rightArmGroup = new THREE.Group();
        rightArmGroup.position.set(0.34, 1.36, 0);
        const armR = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.44, 8, 12), darkArmorMat);
        armR.position.set(0, -0.20, 0);
        rightArmGroup.add(armR);
        ninja.add(rightArmGroup);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), darkArmorMat);
        head.position.y = 1.60;
        ninja.add(head);

        const redVisor = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.12), redNeonMat);
        redVisor.position.set(0, 1.64, 0.20);
        ninja.add(redVisor);

        const shadowCircle = new THREE.Mesh(
            new THREE.CircleGeometry(0.42, 32),
            new THREE.MeshBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.35 })
        );
        shadowCircle.rotation.x = -Math.PI / 2;
        shadowCircle.position.y = 0.01;
        ninja.add(shadowCircle);

        ninja.userData = { leftLegGroup, rightLegGroup, leftArmGroup, rightArmGroup, cloakTailMesh: null };
        return ninja;
    }

    /* 🎮 ĐIỀU KHIỂN BÀN PHÍM ACTIVE KEYS */
    _setupControls() {
        window.addEventListener('keydown', (e) => {
            if (!this.isActive) return;
            const code = e.code;
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(code)) {
                e.preventDefault();
            }
            this.activeKeys.add(code);
        });

        window.addEventListener('keyup', (e) => {
            if (!this.isActive) return;
            this.activeKeys.delete(e.code);
        });
    }

    /* 🖱️ CAMERA CONTROLS ORBIT */
    _setupMouseCameraControls() {
        const onPointerDown = (e) => {
            if (!this.isActive) return;
            if (e.target && e.target.tagName !== 'CANVAS' && e.target.closest('#btn-exit-city-3d')) return;
            this.isPointerDown = true;
            this.previousPointerPos = { x: e.clientX, y: e.clientY };
        };

        const onPointerMove = (e) => {
            if (!this.isActive || !this.isPointerDown) return;
            const deltaX = e.clientX - this.previousPointerPos.x;
            const deltaY = e.clientY - this.previousPointerPos.y;
            this.previousPointerPos = { x: e.clientX, y: e.clientY };

            this.cameraYaw -= deltaX * 0.004;
            this.cameraPitch = THREE.MathUtils.clamp(this.cameraPitch + deltaY * 0.003, 0.08, 1.25);
        };

        const onPointerUp = () => { this.isPointerDown = false; };
        const onWheel = (e) => {
            if (!this.isActive) return;
            this.cameraDistance = THREE.MathUtils.clamp(this.cameraDistance + e.deltaY * 0.005, 4.0, 28.0);
        };

        window.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
        window.addEventListener('wheel', onWheel, { passive: true });
    }

    openCity() {
        this.isActive = true;
        const spawn = this.spawnPoint || new THREE.Vector3(6.2, 0.05, -23.8);
        this.playerPos.copy(spawn);
        if (this.playerMesh) {
            this.playerMesh.position.copy(this.playerPos);
        }
        this.velocityY = 0;
        this.isGrounded = true;
        this.cameraYaw = 0;
        this.cameraPitch = 0.42;
        this.cameraDistance = 12.0;
        this.activeKeys.clear();

        if (this.mobileControls) {
            this.mobileControls.show();
        }
    }

    closeCity() {
        this.isActive = false;
        this.activeKeys.clear();

        const debugElem = document.getElementById('city-debug-hud');
        if (debugElem) debugElem.remove();

        if (this.mobileControls) {
            this.mobileControls.hide();
        }
    }

    /* 🕹️ VÒNG LẶP UPDATE THÀNH PHỐ 3D */
    update(deltaTime) {
        if (!this.isActive || !this.playerMesh) return;

        if (this.cityMixer) {
            this.cityMixer.update(deltaTime);
        }

        const mobileVec = this.mobileControls ? this.mobileControls.getMoveVector() : { dirX: 0, dirZ: 0, intensity: 0 };
        const isW = this.activeKeys.has('KeyW') || this.activeKeys.has('ArrowUp');
        const isS = this.activeKeys.has('KeyS') || this.activeKeys.has('ArrowDown');
        const isA = this.activeKeys.has('KeyA') || this.activeKeys.has('ArrowLeft');
        const isD = this.activeKeys.has('KeyD') || this.activeKeys.has('ArrowRight');

        const forwardX = -Math.sin(this.cameraYaw);
        const forwardZ = -Math.cos(this.cameraYaw);
        const rightX = Math.cos(this.cameraYaw);
        const rightZ = -Math.sin(this.cameraYaw);

        const moveVector = new THREE.Vector3();
        if (isW) { moveVector.x += forwardX; moveVector.z += forwardZ; }
        if (isS) { moveVector.x -= forwardX; moveVector.z -= forwardZ; }
        if (isA) { moveVector.x -= rightX; moveVector.z -= rightZ; }
        if (isD) { moveVector.x += rightX; moveVector.z += rightZ; }

        if (mobileVec.intensity > 0.05) {
            const joyForward = -mobileVec.dirZ;
            const joyRight = mobileVec.dirX;
            moveVector.x += (forwardX * joyForward + rightX * joyRight) * mobileVec.intensity;
            moveVector.z += (forwardZ * joyForward + rightZ * joyRight) * mobileVec.intensity;
        }

        const isFlyUp = this.activeKeys.has('KeyE');
        const isFlyDown = this.activeKeys.has('KeyC');
        const isBoost = this.activeKeys.has('ShiftLeft') || this.activeKeys.has('ShiftRight');

        const currentMoveSpeed = isBoost ? 28.0 : 8.5;
        const flySpeed = isBoost ? 32.0 : 18.0;

        // 🚀 BAY LÊN [E] VÀ BAY XUỐNG [C] (SIÊU TỐC KHI GIỮ SHIFT)
        if (isFlyUp) {
            this.playerPos.y += flySpeed * deltaTime;
            this.isFlying = true;
            this.isGrounded = false;
        }
        if (isFlyDown) {
            this.playerPos.y = Math.max(0, this.playerPos.y - flySpeed * deltaTime);
            if (this.playerPos.y <= 0) {
                this.playerPos.y = 0;
                this.isFlying = false;
                this.isGrounded = true;
            }
        }

        if (moveVector.lengthSq() > 0) {
            moveVector.normalize().multiplyScalar(currentMoveSpeed * deltaTime);
            this.playerPos.x += moveVector.x;
            this.playerPos.z += moveVector.z;

            this.playerPos.x = THREE.MathUtils.clamp(this.playerPos.x, this.bounds.minX, this.bounds.maxX);
            this.playerPos.z = THREE.MathUtils.clamp(this.playerPos.z, this.bounds.minZ, this.bounds.maxZ);

            const targetAngle = Math.atan2(moveVector.x, moveVector.z);
            let angleDiff = targetAngle - this.playerMesh.rotation.y;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            this.playerMesh.rotation.y += angleDiff * Math.min(1.0, deltaTime * 14.0);

            // AnimationMixer & Procedural Swing
            if (this.playerMixer) {
                this.playerMixer.update(deltaTime);
                let targetActionName = 'idle';
                if (!this.isGrounded && !this.isFlying) targetActionName = 'jump';
                else if (moveVector.lengthSq() > 0) targetActionName = isBoost ? 'run' : 'walk';

                if (this.playerActions && targetActionName !== this.currentActionName) {
                    const prevAction = this.playerActions[this.currentActionName];
                    const nextAction = this.playerActions[targetActionName] || this.playerActions['walk'] || this.playerActions['idle'];
                    if (nextAction) {
                        if (prevAction) prevAction.fadeOut(0.2);
                        nextAction.reset().fadeIn(0.2).play();
                        this.currentActionName = targetActionName;
                    }
                }
            }

            this.playerWalkTimer += deltaTime * 13.5;
            if (this.leftLegGroup && this.rightLegGroup) {
                this.leftLegGroup.rotation.x = Math.sin(this.playerWalkTimer) * 0.55;
                this.rightLegGroup.rotation.x = -Math.sin(this.playerWalkTimer) * 0.55;
            }
            if (this.leftArmGroup && this.rightArmGroup) {
                this.leftArmGroup.rotation.x = -Math.sin(this.playerWalkTimer) * 0.78;
                this.rightArmGroup.rotation.x = Math.sin(this.playerWalkTimer) * 0.78;
            }
        } else {
            if (this.playerMixer && this.currentActionName !== 'idle') {
                const prevAction = this.playerActions ? this.playerActions[this.currentActionName] : null;
                const idleAction = this.playerActions ? this.playerActions['idle'] : null;
                if (idleAction) {
                    if (prevAction) prevAction.fadeOut(0.2);
                    idleAction.reset().fadeIn(0.2).play();
                    this.currentActionName = 'idle';
                }
            }
            if (this.leftLegGroup && this.rightLegGroup) {
                this.leftLegGroup.rotation.x = THREE.MathUtils.lerp(this.leftLegGroup.rotation.x, 0, deltaTime * 10.0);
                this.rightLegGroup.rotation.x = THREE.MathUtils.lerp(this.rightLegGroup.rotation.x, 0, deltaTime * 10.0);
            }
            if (this.leftArmGroup && this.rightArmGroup) {
                this.leftArmGroup.rotation.x = THREE.MathUtils.lerp(this.leftArmGroup.rotation.x, 0, deltaTime * 10.0);
                this.rightArmGroup.rotation.x = THREE.MathUtils.lerp(this.rightArmGroup.rotation.x, 0, deltaTime * 10.0);
            }
        }

        // Jump physics
        if (this.activeKeys.has('Space') && this.isGrounded && !this.isFlying) {
            this.velocityY = this.jumpForce;
            this.isGrounded = false;
        }

        if (this.isFlying) {
            this.velocityY = 0;
        } else if (this.isGrounded) {
            this.playerPos.y = 0;
        } else {
            this.velocityY += this.gravity * deltaTime;
            this.playerPos.y += this.velocityY * deltaTime;
            if (this.playerPos.y <= 0) {
                this.playerPos.y = 0;
                this.velocityY = 0;
                this.isGrounded = true;
            }
        }

        this.playerMesh.position.copy(this.playerPos);

        // GTA Camera Orbit Lerp
        const targetCamX = this.playerPos.x + Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDistance;
        const targetCamY = this.playerPos.y + Math.sin(this.cameraPitch) * this.cameraDistance + 0.3;
        const targetCamZ = this.playerPos.z + Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDistance;

        this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetCamX, deltaTime * 8.0);
        this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetCamY, deltaTime * 8.0);
        this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetCamZ, deltaTime * 8.0);

        this.targetLookAt.set(this.playerPos.x, this.playerPos.y + 1.2, this.playerPos.z);
        this.currentLookAt.lerp(this.targetLookAt, deltaTime * 9.0);
        this.camera.lookAt(this.currentLookAt);
    }

    render() {
        if (this.isActive) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}
