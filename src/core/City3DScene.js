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
        this.cameraPitch = 0.22;
        this.cameraDistance = 8.0;
        this.isPointerDown = false;
        this.previousPointerPos = { x: 0, y: 0 };
        this.targetLookAt = new THREE.Vector3();
        this.currentLookAt = new THREE.Vector3();

        // Physics & Controls
        this.groundY = -18.6;
        this.spawnPoint = new THREE.Vector3(-13.7, -18.6, -9.1);
        this.playerPos = this.spawnPoint.clone();
        this.raycaster = new THREE.Raycaster();
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

    /* 👑 ĐỒNG BỘ NẠP SKINS NHÂN VẬT 3D TỪ SHOP3DSCENE */
    _initPlayer() {
        const activeSkin = this.game?.shop3DScene?.selectedCharacterSkin || 'cyber_heroine';
        this._switchPlayerSkin(activeSkin);
    }

    _switchPlayerSkin(skinId) {
        const shopScene = this.game?.shop3DScene;
        const skin = skinId || shopScene?.selectedCharacterSkin || 'cyber_heroine';

        const currentPos = this.playerMesh ? this.playerMesh.position.clone() : this.playerPos.clone();
        const currentRotY = this.playerMesh ? this.playerMesh.rotation.y : 0;

        if (this.playerMesh) {
            this.scene.remove(this.playerMesh);
        }

        let newMesh = null;
        if (shopScene && typeof shopScene.createPlayerMesh === 'function') {
            newMesh = shopScene.createPlayerMesh(skin);
        } else if (shopScene && typeof shopScene._createCyberHeroineMesh === 'function') {
            if (skin === 'baby_goku') newMesh = shopScene._createBabyGokuMesh();
            else if (skin === 'cyber_ninja') newMesh = shopScene._createShadowNinjaMesh();
            else newMesh = shopScene._createCyberHeroineMesh();
        }

        if (!newMesh) return;

        this.selectedCharacterSkin = skin;
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

        // Tự động kiểm tra & đồng bộ skin nhân vật mới nhất từ Shop3DScene
        const activeSkin = this.game?.shop3DScene?.selectedCharacterSkin || 'cyber_heroine';
        if (activeSkin !== this.selectedCharacterSkin || !this.playerMesh) {
            this._switchPlayerSkin(activeSkin);
        }

        const spawn = this.spawnPoint || new THREE.Vector3(-13.7, -18.6, -9.1);
        this.playerPos.copy(spawn);
        this.groundY = spawn.y;

        if (this.playerMesh) {
            this.playerMesh.position.copy(this.playerPos);
            this.playerMesh.rotation.y = 0; // Quản lý hướng quay nhìn thẳng về tòa nhà chính điện
        }
        this.velocityY = 0;
        this.isGrounded = true;
        this.isFlying = false;

        this.cameraYaw = 0;
        this.cameraPitch = 0.22;
        this.cameraDistance = 8.0;
        this.activeKeys.clear();

        if (this.mobileControls) {
            this.mobileControls.show();
        }
    }

    closeCity() {
        this.isActive = false;
        this.activeKeys.clear();

        const hudElem = document.getElementById('city-pos-hud');
        if (hudElem) hudElem.style.display = 'none';

        if (this.mobileControls) {
            this.mobileControls.hide();
        }
    }

    _updatePositionHUD() {
        let hudElem = document.getElementById('city-pos-hud');
        if (!hudElem) {
            hudElem = document.createElement('div');
            hudElem.id = 'city-pos-hud';
            hudElem.style.cssText = `
                position: fixed;
                top: 75px;
                left: 24px;
                background: rgba(15, 23, 42, 0.88);
                border: 1.5px solid #00f5ff;
                color: #00f5ff;
                padding: 8px 14px;
                border-radius: 8px;
                font-family: monospace;
                font-size: 14px;
                font-weight: bold;
                z-index: 3000;
                pointer-events: none;
                box-shadow: 0 0 15px rgba(0, 245, 255, 0.35);
            `;
            document.body.appendChild(hudElem);
        }
        hudElem.style.display = this.isActive ? 'block' : 'none';
        hudElem.innerHTML = `📍 X: ${this.playerPos.x.toFixed(1)} | Y: ${this.playerPos.y.toFixed(1)} | Z: ${this.playerPos.z.toFixed(1)}`;
    }

    /* 🎯 DÒ ĐỘ CAO MẶT ĐƯỜNG 3D BẰNG RAYCASTING */
    _calculateGroundY(x, z) {
        if (!this.cityModel) return -18.6;
        if (!this.raycaster) this.raycaster = new THREE.Raycaster();

        this.raycaster.set(
            new THREE.Vector3(x, this.playerPos.y + 12.0, z),
            new THREE.Vector3(0, -1, 0)
        );

        const intersects = this.raycaster.intersectObject(this.cityModel, true);
        if (intersects.length > 0) {
            for (let i = 0; i < intersects.length; i++) {
                const hitY = intersects[i].point.y;
                if (hitY <= this.playerPos.y + 1.8) {
                    return hitY;
                }
            }
            return intersects[0].point.y;
        }
        return -18.6;
    }

    /* 🕹️ VÒNG LẶP UPDATE THÀNH PHỐ 3D */
    update(deltaTime) {
        if (!this.isActive || !this.playerMesh) return;

        if (this.cityMixer) {
            this.cityMixer.update(deltaTime);
        }

        const targetGroundY = this._calculateGroundY(this.playerPos.x, this.playerPos.z);
        this.groundY = THREE.MathUtils.lerp(this.groundY, targetGroundY, Math.min(1.0, deltaTime * 16.0));

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

        // 🚀 BAY LÊN [E] VÀ BAY XUỐNG [C] (HẠ CÁNH SÁT MẶT ĐƯỜNG TARGET_GROUND_Y)
        if (isFlyUp) {
            this.playerPos.y += flySpeed * deltaTime;
            this.isFlying = true;
            this.isGrounded = false;
        }
        if (isFlyDown) {
            this.playerPos.y = Math.max(targetGroundY, this.playerPos.y - flySpeed * deltaTime);
            if (this.playerPos.y <= targetGroundY + 0.08) {
                this.playerPos.y = targetGroundY;
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
            this.playerPos.y = targetGroundY;
        } else {
            this.velocityY += this.gravity * deltaTime;
            this.playerPos.y += this.velocityY * deltaTime;
            if (this.playerPos.y <= targetGroundY) {
                this.playerPos.y = targetGroundY;
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

        this._updatePositionHUD();
    }

    render() {
        if (this.isActive) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}
