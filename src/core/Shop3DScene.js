/**
 * Shop3DScene.js - Integrated Coastal Town, Japanese Torii Sanctuary, Sougen Garden & White Marble Palace Open World 3D
 * Procedural 3D Anime Character Modeler & Driveable Supercars System:
 * 1. TÍNH NĂNG LÁI SIÊU XE (DRIVEABLE SUPERCARS): Player có thể đến gần 4 chiếc siêu xe (< 3.5m) và nhấn phím [F] hoặc [ENTER] để trèo lên xe lái tự do khắp bản đồ!
 * 2. VẬT LÝ LÁI XE & BÁNH XE XOAY: Hỗ trợ phím [W/S] tăng tốc / lùi, [A/D] bẻ lái mượt mà, bánh xe xoay theo tốc độ, tích hợp Dynamic Ground Y Height.
 * 3. BẢNG HƯỚNG DẪN UI & HỆ THỐNG PROMPT FLUID: Hiển thị Prompt phím [F] lên xe và HUD lái xe hiện đại.
 * 4. 100% Procedural Three.js Code (0ms Load Time, 60 FPS)
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MD2Character } from 'three/examples/jsm/misc/MD2Character.js';
import { CAR_MODELS } from '../managers/ShopManager.js';
import { MobileControls } from '../utils/mobile.js'; // 📱 MOBILE CONTROLS: Import bộ điều khiển di động
import { HolographicPortal } from '../entities/HolographicPortal.js';

export class Shop3DScene {
    constructor(renderer, game) {
        this.renderer = renderer;
        this.game = game;
        this.isActive = false;

        // 📱 MOBILE CONTROLS: Khởi tạo Trình quản lý Điều khiển Cảm ứng di động (Virtual Joystick & Action Buttons)
        this.mobileControls = new MobileControls(this);


        if (this.renderer) {
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }

        // 1. Scene & Camera Setup
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);

        // 2. GTA & Roblox Style Orbit Camera
        this.cameraYaw = 0;           // Góc xoay ngang (-PI -> PI)
        this.cameraPitch = 0.42;      // Góc xoay dọc (0.08 -> 1.25 rad)
        this.cameraDistance = 9.5;    // Khoảng cách camera
        this.isPointerDown = false;
        this.previousPointerPos = { x: 0, y: 0 };

        // 3. Player Physics & Controls (Dynamic Ground Height)
        this.groundY = 0.0;
        this.playerPos = new THREE.Vector3(0, this.groundY, 6);
        this.playerMesh = null;
        this.leftLegGroup = null;
        this.rightLegGroup = null;
        this.leftArmGroup = null;
        this.rightArmGroup = null;
        this.cloakTailMesh = null;
        this.playerWalkTimer = 0;
        this.babyGokuGltf = null;
        this._loadBabyGokuModel();

        // 4. Driveable Vehicle System
        this.isDrivingVehicle = false;
        this.currentVehicle = null;
        this.driveableVehicles = [];

        this.activeKeys = new Set();
        this.moveSpeed = 9.5;

        // Jump Physics
        this.velocityY = 0;
        this.gravity = -25.0;
        this.jumpForce = 9.0;
        this.isGrounded = true;

        // Mở Rộng Bản Đồ
        this.bounds = { minX: -60.0, maxX: 60.0, minZ: -60.0, maxZ: 50.0 };

        // Camera Lerp LookAt
        this.currentLookAt = new THREE.Vector3(0, 1.2, 4);
        this.targetLookAt = new THREE.Vector3(0, 1.2, 4);

        this.carPlatforms = [];
        this.npcList = [];
        this.animatedLanterns = [];
        this.cloudList = [];
        this.cyanPortalSphere = null;

        // 🚪 Trạng Thái & Bản Lề Cửa Nhà Chính
        this.isHouseDoorOpen = false;
        this.mainShowroomDoorHinge = null;

        // ☁️ HỆ THỐNG CÂN ĐẨU VÂN (FLYING NIMBUS MOUNT)
        this.nimbusCloud = null;
        this.isRidingNimbus = false;
        this.isNimbusLanding = false;
        this.nimbusFlightHeight = 0.8;
        this.nimbusMaxHeight = 35.0;

        // 🏙️ CYBERPUNK RAMEN SHOP & INTERACTIVE SIGNPOST STATIONS (ANH ZHOU STYLE)
        this.signpostArrowMeshes = [];
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.hoveredSign = null;
        this.isStationActive = false;
        this.activeStationType = null;
        this.stationTargetCamPos = null;
        this.stationTargetLookAt = null;

        this.stationCameraTargets = {
            projects: { pos: new THREE.Vector3(29.5, 1.8, 36.0), lookAt: new THREE.Vector3(35.0, 1.3, 36.0) },
            articles: { pos: new THREE.Vector3(32.0, 2.85, 30.0), lookAt: new THREE.Vector3(37.0, 2.85, 30.0) },
            about: { pos: new THREE.Vector3(29.5, 1.8, 42.0), lookAt: new THREE.Vector3(35.0, 1.6, 42.0) },
            credits: { pos: new THREE.Vector3(23.0, 3.2, 36.0), lookAt: new THREE.Vector3(29.0, 2.5, 36.0) }
        };

        // Khởi tạo toàn bộ thế giới mở kết hợp Cung Điện La Mã, Cổ Đền Nhật Bản & Vườn Sougen
        this._initSanctuaryEnvironment();
        if (this.game && this.game.trophyHallManager) {
            this.game.trophyHallManager.create3DTrophyShelf(this.scene, new THREE.Vector3(2.5, 1.2, -3.5));
        }
        this._initSanctuaryLighting();
        this._initProceduralSkyAndClouds();
        this._initExpandedIslandGround();
        this._initToriiGateAndSanctuary();
        this._initHangingLanternCables();
        this._initRiverStreamAndBridge();
        this._initTownHousesAndShops();
        this._initCyberpunkRamenShop();
        this._initInteractiveSignpost();
        this._setupSignpostRaycaster();
        this._initGreekMarblePalace(); // Cung Điện Cột Đá Trắng Thiết Kế Nâng Cấp Tuyệt Đẹp z = 30
        this._initHolographicPortal(); // 🌀 CỔNG DỊCH CHUYỂN HOLOGRAPHIC PORTAL 3D TRỤ ĐỨNG z = 24
        this._initSougenGardenAndFloatingText(); // Vườn Sougen & Chữ "Viet Anh Nguyen" Sau Nhà z = -34
        this._initSakuraAndCoastalTrees();
        this._initGiantBoulders();
        this._initAmbientVehicles();
        this._initNPCs(); // 🧍 ANIME SAIYAN NPCS BƯỚC ĐỊ DI CHUYỂN VUNG TAY VUNG CHÂN GIỐNG PLAYER
        this._initCarShowcases(); // 🏎️ KHỞI TẠO 4 SIÊU XE CÓ THỂ LÁI TỰ DO KHẮP MAP
        this._initNimbusCloud(); // ☁️ NẠP CÂN ĐẨU VÂN VÀO GIỮA THẢM CỎ XANH BẢN ĐỒ
        this._initPlayer();
        this._setupControls();
        this._setupMouseCameraControls();

        window.addEventListener('resize', () => this.onWindowResize());
    }

    onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    /* 🌊 1. BẦU TRỜI & SƯƠNG MÙ JAPANESE SANCTUARY */
    _initSanctuaryEnvironment() {
        const skyColor = new THREE.Color(0x60a5fa);
        this.scene.background = skyColor;
        this.scene.fog = new THREE.FogExp2(0x60a5fa, 0.0045);
    }

    /* ☁️ 2. VẼ BẦU TRỜI VỚI MÂY TRẮNG 3D BƠI TRÔI NHẸ NHÀNG */
    _initProceduralSkyAndClouds() {
        const cloudMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.88
        });

        const cloudPositions = [
            { x: -40, y: 38, z: -30, scale: 3.5 },
            { x: 10, y: 42, z: -40, scale: 4.2 },
            { x: 50, y: 36, z: 10, scale: 3.8 },
            { x: -20, y: 44, z: 30, scale: 4.0 },
            { x: -60, y: 35, z: 0, scale: 3.2 },
            { x: 30, y: 40, z: 40, scale: 3.6 }
        ];

        cloudPositions.forEach(cp => {
            const cloudGroup = new THREE.Group();

            const puff1 = new THREE.Mesh(new THREE.DodecahedronGeometry(2.5, 1), cloudMat);
            puff1.position.set(0, 0, 0);
            cloudGroup.add(puff1);

            const puff2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8, 1), cloudMat);
            puff2.position.set(2.2, 0.4, 0.5);
            cloudGroup.add(puff2);

            const puff3 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.9, 1), cloudMat);
            puff3.position.set(-2.0, 0.3, -0.4);
            cloudGroup.add(puff3);

            cloudGroup.position.set(cp.x, cp.y, cp.z);
            cloudGroup.scale.setScalar(cp.scale);
            this.scene.add(cloudGroup);

            this.cloudList.push({
                group: cloudGroup,
                speed: 0.8 + Math.random() * 0.6
            });
        });
    }

    /* ☀️ 3. ÁNH SÁNG SANCTUARY VÀ BÓNG ĐỔ MỀM DIỆN RỘNG */
    _initSanctuaryLighting() {
        const hemiLight = new THREE.HemisphereLight(0x60a5fa, 0x38b000, 1.05);
        hemiLight.position.set(0, 60, 0);
        this.scene.add(hemiLight);

        const sunLight = new THREE.DirectionalLight(0xFFF8E7, 1.55);
        sunLight.position.set(30, 45, 25);
        sunLight.castShadow = true;

        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.bias = -0.0003;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 140;
        sunLight.shadow.camera.left = -65;
        sunLight.shadow.camera.right = 65;
        sunLight.shadow.camera.top = 65;
        sunLight.shadow.camera.bottom = -65;
        this.scene.add(sunLight);

        const fillLight = new THREE.DirectionalLight(0xFFF5EA, 0.65);
        fillLight.position.set(-25, 25, 35);
        this.scene.add(fillLight);
    }

    /* 🏝️ 4. ĐẢO BIỂN & ĐƯỜNG PHỐ BẢN ĐỒ KẾT HỢP (ISLAND & HIGHWAYS) */
    _initExpandedIslandGround() {
        const grassGeo = new THREE.PlaneGeometry(160, 160);
        const grassMat = new THREE.MeshStandardMaterial({
            color: 0x38b000,
            roughness: 0.85,
            metalness: 0.05
        });
        const grass = new THREE.Mesh(grassGeo, grassMat);
        grass.rotation.x = -Math.PI / 2;
        grass.receiveShadow = true;
        this.scene.add(grass);

        const oceanGeo = new THREE.PlaneGeometry(300, 300);
        const oceanMat = new THREE.MeshStandardMaterial({
            color: 0x0077b6,
            roughness: 0.1,
            metalness: 0.8,
            transparent: true,
            opacity: 0.8
        });
        const ocean = new THREE.Mesh(oceanGeo, oceanMat);
        ocean.rotation.x = -Math.PI / 2;
        ocean.position.y = -0.4;
        this.scene.add(ocean);

        // Đường nhựa/cát
        const mainRoadGeo = new THREE.PlaneGeometry(80, 28);
        const mainRoadMat = new THREE.MeshStandardMaterial({
            color: 0xFDF0D5,
            roughness: 0.85,
            metalness: 0.05
        });
        const mainRoad = new THREE.Mesh(mainRoadGeo, mainRoadMat);
        mainRoad.rotation.x = -Math.PI / 2;
        mainRoad.position.set(0, 0.005, 0);
        mainRoad.receiveShadow = true;
        this.scene.add(mainRoad);

        const sideRoadGeo = new THREE.PlaneGeometry(24, 70);
        const sideRoad = new THREE.Mesh(sideRoadGeo, mainRoadMat);
        sideRoad.rotation.x = -Math.PI / 2;
        sideRoad.position.set(42, 0.006, 10);
        sideRoad.receiveShadow = true;
        this.scene.add(sideRoad);

        // Đường Lát Đá Cổ Kính Xuyên Qua Cổng Torii
        const stonePathGeo = new THREE.PlaneGeometry(26, 5.5);
        const stonePathMat = new THREE.MeshStandardMaterial({
            color: 0xe2e8f0,
            roughness: 0.7,
            metalness: 0.1
        });
        const stonePath = new THREE.Mesh(stonePathGeo, stonePathMat);
        stonePath.rotation.x = -Math.PI / 2;
        stonePath.position.set(-29, 0.008, 8);
        stonePath.receiveShadow = true;
        this.scene.add(stonePath);
    }

    /* ⛩️ 5. CỔNG TORII NỔI BẬT ĐẮC ĐỊA NGAY ĐẦU CẦU GỖ (x = -27, z = 8, rotY = PI/2) */
    _initToriiGateAndSanctuary() {
        const toriiGroup = new THREE.Group();
        toriiGroup.position.set(-27, 0, 8);
        toriiGroup.rotation.y = Math.PI / 2;

        const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.7 });
        const vermilionMat = new THREE.MeshStandardMaterial({ color: 0xd90429, roughness: 0.5, metalness: 0.1 });

        const pillarL = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 7.2, 12), vermilionMat);
        pillarL.position.set(-3.8, 3.6, 0);
        pillarL.castShadow = true;
        toriiGroup.add(pillarL);

        const pillarR = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 7.2, 12), vermilionMat);
        pillarR.position.set(3.8, 3.6, 0);
        pillarR.castShadow = true;
        toriiGroup.add(pillarR);

        const mainBeam = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.62, 0.75), vermilionMat);
        mainBeam.position.set(0, 6.9, 0);
        mainBeam.castShadow = true;
        toriiGroup.add(mainBeam);

        const topCap = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.32, 0.9), darkWoodMat);
        topCap.position.set(0, 7.32, 0);
        topCap.castShadow = true;
        toriiGroup.add(topCap);

        const subBeam = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.45, 0.55), darkWoodMat);
        subBeam.position.set(0, 5.6, 0);
        subBeam.castShadow = true;
        toriiGroup.add(subBeam);

        this.scene.add(toriiGroup);
    }

    /* 🏮 6. HÀNG ĐÈN LỒNG NỐI DÂY SONG SONG TẠI 2 BÊN ĐƯỜNG LÁT ĐÁ */
    _initHangingLanternCables() {
        const cableMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
        const lanternGlowMat = new THREE.MeshStandardMaterial({
            color: 0xfff4e0,
            emissive: 0xffe0b2,
            emissiveIntensity: 0.5,
            roughness: 0.3
        });
        const lanternFrameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });

        const postsSide = [
            { x: -27, z: 11.2 }, { x: -35, z: 11.2 }, { x: -43, z: 11.2 }
        ];

        postsSide.forEach(p => {
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 5.8, 8), lanternFrameMat);
            post.position.set(p.x, 2.9, p.z);
            post.castShadow = true;
            this.scene.add(post);
        });

        for (let i = 0; i < postsSide.length - 1; i++) {
            const p1 = postsSide[i];
            const p2 = postsSide[i + 1];

            const startVec = new THREE.Vector3(p1.x, 5.5, p1.z);
            const endVec = new THREE.Vector3(p2.x, 5.5, p2.z);

            const points = [];
            const steps = 10;
            for (let s = 0; s <= steps; s++) {
                const t = s / steps;
                const x = THREE.MathUtils.lerp(startVec.x, endVec.x, t);
                const z = THREE.MathUtils.lerp(startVec.z, endVec.z, t);
                const sag = Math.sin(t * Math.PI) * 0.7;
                const y = THREE.MathUtils.lerp(startVec.y, endVec.y, t) - sag;
                points.push(new THREE.Vector3(x, y, z));
            }

            const curve = new THREE.CatmullRomCurve3(points);
            const tubeGeo = new THREE.TubeGeometry(curve, 20, 0.04, 6, false);
            const cableMesh = new THREE.Mesh(tubeGeo, cableMat);
            this.scene.add(cableMesh);

            [0.3, 0.7].forEach(t => {
                const pos = curve.getPoint(t);

                const lanternGroup = new THREE.Group();
                lanternGroup.position.set(pos.x, pos.y - 0.45, pos.z);

                const frame = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.58, 0.48), lanternFrameMat);
                frame.castShadow = true;
                lanternGroup.add(frame);

                const paper = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.50, 0.40), lanternGlowMat);
                lanternGroup.add(paper);

                const string = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6), cableMat);
                string.position.y = 0.42;
                lanternGroup.add(string);

                const pLight = new THREE.PointLight(0xfff4e0, 1.0, 6);
                pLight.position.y = 0;
                lanternGroup.add(pLight);

                this.scene.add(lanternGroup);
                this.animatedLanterns.push(lanternGroup);
            });
        }
    }

    /* 🏛️ 7. XÂY DỰNG CUNG ĐIỆN CẨM THẠCH TRẮNG (BỆ NỀN CAO Y = 0.70M) */
    _initGreekMarblePalace() {
        const palaceGroup = new THREE.Group();
        palaceGroup.position.set(0, 0, 30);

        const marbleMat = new THREE.MeshStandardMaterial({
            color: 0xf8fafc,
            roughness: 0.20,
            metalness: 0.05
        });

        const darkMarbleMat = new THREE.MeshStandardMaterial({
            color: 0xe2e8f0,
            roughness: 0.3
        });

        const cyanHoloMat = new THREE.MeshBasicMaterial({
            color: 0x00f5ff,
            wireframe: true
        });

        const cyanGlowMat = new THREE.MeshBasicMaterial({
            color: 0x00f5ff
        });

        // 1. Bệ Nền Bán Nguyệt Cẩm Thạch Trắng 2 Tầng (Tổng chiều cao bệ floor Y = 0.70m)
        const plinthBase = new THREE.Mesh(new THREE.CylinderGeometry(14.4, 15.0, 0.42, 32), marbleMat);
        plinthBase.position.y = 0.21;
        plinthBase.receiveShadow = true;
        plinthBase.castShadow = true;
        palaceGroup.add(plinthBase);

        const plinthStep = new THREE.Mesh(new THREE.CylinderGeometry(13.6, 14.0, 0.28, 32), darkMarbleMat);
        plinthStep.position.y = 0.56;
        plinthStep.receiveShadow = true;
        palaceGroup.add(plinthStep);

        // 2. Hàng Cột Đá Trắng Bán Nguyệt Cổ Kính Rực Rỡ (Radius = 11.5)
        const numPillars = 8;
        const radius = 11.5;
        const startAngle = -Math.PI * 0.40;
        const endAngle = Math.PI * 0.40;

        for (let i = 0; i < numPillars; i++) {
            const angle = startAngle + (i / (numPillars - 1)) * (endAngle - startAngle);
            const px = Math.sin(angle) * radius;
            const pz = Math.cos(angle) * radius * 0.45;

            const pillarGroup = new THREE.Group();
            pillarGroup.position.set(px, 0.70, pz);

            if (i === 1 || i === 6) {
                // CỘT PHÂN ĐOẠN TREO LƠ LỬNG
                const base1 = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.90, 0.3, 16), marbleMat);
                base1.position.y = 0.15;
                pillarGroup.add(base1);
                const base2 = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.75, 0.2, 16), darkMarbleMat);
                base2.position.y = 0.4;
                pillarGroup.add(base2);

                const lowerShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.55, 2.2, 16), marbleMat);
                lowerShaft.position.y = 1.6;
                lowerShaft.castShadow = true;
                pillarGroup.add(lowerShaft);

                // Tượng Holographic Cyan & Vòng đai xoay lơ lửng
                const statueGroup = new THREE.Group();
                statueGroup.position.y = 3.6;

                const holoStatue = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.7, 8, 16), cyanHoloMat);
                statueGroup.add(holoStatue);

                const auraRing = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.03, 8, 24), cyanGlowMat);
                auraRing.rotation.x = Math.PI / 2;
                statueGroup.add(auraRing);

                pillarGroup.add(statueGroup);

                // Thân cột trên LƠ LỬNG
                const upperShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.48, 2.4, 16), marbleMat);
                upperShaft.position.y = 5.6;
                upperShaft.castShadow = true;
                pillarGroup.add(upperShaft);

                const capital = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.45, 1.3), marbleMat);
                capital.position.y = 7.0;
                capital.castShadow = true;
                pillarGroup.add(capital);

                const capitalCrown = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.2, 1.5), darkMarbleMat);
                capitalCrown.position.y = 7.3;
                pillarGroup.add(capitalCrown);

            } else {
                // Cột Cẩm Thạch Ionic / Corinthian Đẹp Tinh Tế
                const base1 = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.90, 0.3, 16), marbleMat);
                base1.position.y = 0.15;
                pillarGroup.add(base1);
                const base2 = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.75, 0.2, 16), darkMarbleMat);
                base2.position.y = 0.4;
                pillarGroup.add(base2);

                const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.55, 6.2, 20), marbleMat);
                shaft.position.y = 3.6;
                shaft.castShadow = true;
                pillarGroup.add(shaft);

                // Vòng nhẫn trang trí giữa thân cột
                const ringTrim = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.04, 12, 24), cyanGlowMat);
                ringTrim.rotation.x = Math.PI / 2;
                ringTrim.position.y = 3.6;
                pillarGroup.add(ringTrim);

                // Đỉnh cột có hoa văn nhô 2 tầng
                const capital = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.45, 1.3), marbleMat);
                capital.position.y = 7.0;
                capital.castShadow = true;
                pillarGroup.add(capital);

                const capitalCrown = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.2, 1.5), darkMarbleMat);
                capitalCrown.position.y = 7.3;
                pillarGroup.add(capitalCrown);
            }

            palaceGroup.add(pillarGroup);
        }

        // 3. Mái Vòm Cong Bán Nguyệt Bằng Đá Cẩm Thạch Trắng
        const architraveGeo = new THREE.TorusGeometry(11.5, 0.65, 12, 32, Math.PI * 0.82);
        const architrave = new THREE.Mesh(architraveGeo, marbleMat);
        architrave.rotation.x = Math.PI / 2;
        architrave.rotation.z = -Math.PI / 2;
        architrave.position.set(0, 7.95, 2.6);
        architrave.castShadow = true;
        palaceGroup.add(architrave);

        const architraveTrim = new THREE.Mesh(new THREE.TorusGeometry(11.5, 0.08, 8, 32, Math.PI * 0.82), cyanGlowMat);
        architraveTrim.rotation.x = Math.PI / 2;
        architraveTrim.rotation.z = -Math.PI / 2;
        architraveTrim.position.set(0, 8.65, 2.6);
        palaceGroup.add(architraveTrim);

        // 4. CỔNG VÒM CỬA RỘNG NGUY NGA CHUẨN 100% ẢNH MẪU
        const grandDoor = this._createArchDoorWithMoldings();
        palaceGroup.add(grandDoor);

        // 5. QUẢ CẦU NĂNG LƯỢNG CYAN TREO LƠ LỬNG CAO (y = 14.5m)
        const energySphereGroup = new THREE.Group();
        energySphereGroup.position.set(0, 14.5, 4.5);

        const coreSphere = new THREE.Mesh(
            new THREE.IcosahedronGeometry(1.6, 2),
            new THREE.MeshBasicMaterial({ color: 0x00f5ff, wireframe: true })
        );
        energySphereGroup.add(coreSphere);

        const ring1 = new THREE.Mesh(
            new THREE.TorusGeometry(2.3, 0.06, 8, 32),
            new THREE.MeshBasicMaterial({ color: 0x70d6ff })
        );
        ring1.rotation.x = Math.PI / 3;
        energySphereGroup.add(ring1);

        const ring2 = new THREE.Mesh(
            new THREE.TorusGeometry(2.8, 0.06, 8, 32),
            new THREE.MeshBasicMaterial({ color: 0x00f5ff })
        );
        ring2.rotation.y = Math.PI / 4;
        energySphereGroup.add(ring2);

        this.cyanPortalSphere = energySphereGroup;
        palaceGroup.add(energySphereGroup);

        this.scene.add(palaceGroup);
    }

    /* 🚪 HÀM XÂY DỰNG CỬA VÒM 3D RỘNG NGUY NGA CHUẨN 100% ẢNH MẪU */
    _createArchDoorWithMoldings() {
        const doorGroup = new THREE.Group();
        doorGroup.position.set(0, 0.70, 5.2);

        // Vật liệu cẩm thạch trắng sáng tinh khôi
        const pureWhiteMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.15,
            metalness: 0.02
        });

        const panelShadowMat = new THREE.MeshStandardMaterial({
            color: 0xcfd8dc, // Xám tạo bóng đổ 3D sâu sắc nét
            roughness: 0.30,
            metalness: 0.02
        });

        const width = 4.8;        // MỞ RỘNG BÁN KÍNH CỬA VÒM RỘNG NGUY NGA (4.8m)
        const heightBase = 7.6;   // Chiều cao thân đứng 7.6m
        const radius = width / 2; // Radius 2.4m (Tổng chiều cao = 10.0m)
        const doorDepth = 0.44;

        // 1. THÂN CỬA VÒM KÍN 180 DEGREE RỘNG THOÁNG (Solid Arched Door Base)
        const doorShape = new THREE.Shape();
        doorShape.moveTo(-radius, 0);
        doorShape.lineTo(-radius, heightBase);
        doorShape.absarc(0, heightBase, radius, Math.PI, 0, true);
        doorShape.lineTo(radius, 0);
        doorShape.closePath();

        const doorBaseGeo = new THREE.ExtrudeGeometry(doorShape, {
            depth: doorDepth,
            bevelEnabled: true,
            bevelThickness: 0.04,
            bevelSize: 0.04,
            bevelSegments: 4
        });
        doorBaseGeo.center();

        const doorBaseMesh = new THREE.Mesh(doorBaseGeo, pureWhiteMat);
        doorBaseMesh.position.set(0, (heightBase + radius) / 2, 0);
        doorBaseMesh.castShadow = true;
        doorBaseMesh.receiveShadow = true;
        doorGroup.add(doorBaseMesh);

        // 2. KHUÔN VIỀN CỬA VÒM 3 LỚP BO TRÒN SẮC NẾT TRƯỚC VÀ SAU (Triple Concentric Arch Frame Moldings)
        // Dải 1: Viền Nẹp Ngoài Cùng (Outer Heavy Arch Frame)
        const f1Shape = new THREE.Shape();
        const r1Out = radius + 0.45; // 2.85m
        const r1In = radius + 0.28;  // 2.68m
        f1Shape.moveTo(-r1Out, 0); f1Shape.lineTo(-r1Out, heightBase); f1Shape.absarc(0, heightBase, r1Out, Math.PI, 0, true); f1Shape.lineTo(r1Out, 0);
        f1Shape.lineTo(r1In, 0); f1Shape.lineTo(r1In, heightBase); f1Shape.absarc(0, heightBase, r1In, 0, Math.PI, false); f1Shape.lineTo(-r1In, 0); f1Shape.closePath();

        const f1Geo = new THREE.ExtrudeGeometry(f1Shape, { depth: doorDepth + 0.22, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3 });
        f1Geo.center();
        const f1Mesh = new THREE.Mesh(f1Geo, pureWhiteMat);
        f1Mesh.position.set(0, (heightBase + radius) / 2, 0);
        doorGroup.add(f1Mesh);

        // Dải 2: Viền Rãnh Bóng Chìm (Middle Shadow Groove Arch)
        const f2Shape = new THREE.Shape();
        const r2Out = radius + 0.28; // 2.68m
        const r2In = radius + 0.12;  // 2.52m
        f2Shape.moveTo(-r2Out, 0); f2Shape.lineTo(-r2Out, heightBase); f2Shape.absarc(0, heightBase, r2Out, Math.PI, 0, true); f2Shape.lineTo(r2Out, 0);
        f2Shape.lineTo(r2In, 0); f2Shape.lineTo(r2In, heightBase); f2Shape.absarc(0, heightBase, r2In, 0, Math.PI, false); f2Shape.lineTo(-r2In, 0); f2Shape.closePath();

        const f2Geo = new THREE.ExtrudeGeometry(f2Shape, { depth: doorDepth + 0.26, bevelEnabled: false });
        f2Geo.center();
        const f2Mesh = new THREE.Mesh(f2Geo, panelShadowMat);
        f2Mesh.position.set(0, (heightBase + radius) / 2, 0);
        doorGroup.add(f2Mesh);

        // Dải 3: Viền Nẹp Trong Cùng Nhô Cao (Inner Raised Beveled Lip Arch)
        const f3Shape = new THREE.Shape();
        const r3Out = radius + 0.12; // 2.52m
        const r3In = radius;         // 2.40m
        f3Shape.moveTo(-r3Out, 0); f3Shape.lineTo(-r3Out, heightBase); f3Shape.absarc(0, heightBase, r3Out, Math.PI, 0, true); f3Shape.lineTo(r3Out, 0);
        f3Shape.lineTo(r3In, 0); f3Shape.lineTo(r3In, heightBase); f3Shape.absarc(0, heightBase, r3In, 0, Math.PI, false); f3Shape.lineTo(-r3In, 0); f3Shape.closePath();

        const f3Geo = new THREE.ExtrudeGeometry(f3Shape, { depth: doorDepth + 0.30, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3 });
        f3Geo.center();
        const f3Mesh = new THREE.Mesh(f3Geo, pureWhiteMat);
        f3Mesh.position.set(0, (heightBase + radius) / 2, 0);
        doorGroup.add(f3Mesh);

        // 3. 4 PANO SOI CHÌM NỔI BẬT RÕ RÀNG TRƯỚC (+Z) VÀ SAU (-Z)
        const zFront = doorDepth / 2 + 0.02;
        const zBack = -doorDepth / 2 - 0.02;
        const faceZList = [zFront, zBack];

        faceZList.forEach(zVal => {
            // Nẹp dọc phân chia 2 cánh cửa (Center Stile)
            const centerStile = new THREE.Mesh(new THREE.BoxGeometry(0.14, 9.8, 0.06), pureWhiteMat);
            centerStile.position.set(0, 4.9, zVal);
            doorGroup.add(centerStile);

            // Nẹp ngang giữa (Horizontal Rail)
            const midRail = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.16, 0.06), pureWhiteMat);
            midRail.position.set(0, 3.6, zVal);
            doorGroup.add(midRail);

            // 2 Pano Dưới Chữ Nhật (Bottom Rectangular Panels)
            [-1.12, 1.12].forEach(xVal => {
                const panelBaseB = new THREE.Mesh(new THREE.BoxGeometry(1.85, 3.1, 0.08), panelShadowMat);
                panelBaseB.position.set(xVal, 1.75, zVal);
                doorGroup.add(panelBaseB);

                const panelCoreB = new THREE.Mesh(new THREE.BoxGeometry(1.60, 2.85, 0.12), pureWhiteMat);
                panelCoreB.position.set(xVal, 1.75, zVal);
                doorGroup.add(panelCoreB);
            });

            // 2 Pano Trên Vòm Cong Rộng (Top Arched Panels)
            [-1.12, 1.12].forEach(xVal => {
                const pW = 0.925;
                const pH = 3.6;

                // Shadow Base
                const panelOuterShape = new THREE.Shape();
                panelOuterShape.moveTo(-pW, 0); panelOuterShape.lineTo(-pW, pH); panelOuterShape.absarc(0, pH, pW, Math.PI, 0, true); panelOuterShape.lineTo(pW, 0); panelOuterShape.closePath();

                const panelOuterGeo = new THREE.ExtrudeGeometry(panelOuterShape, { depth: 0.08, bevelEnabled: false });
                panelOuterGeo.center();
                const panelOuterMesh = new THREE.Mesh(panelOuterGeo, panelShadowMat);
                panelOuterMesh.position.set(xVal, 6.0, zVal);
                doorGroup.add(panelOuterMesh);

                // Core Raised Panel
                const cW = 0.80;
                const cH = 3.45;
                const panelCoreShape = new THREE.Shape();
                panelCoreShape.moveTo(-cW, 0); panelCoreShape.lineTo(-cW, cH); panelCoreShape.absarc(0, cH, cW, Math.PI, 0, true); panelCoreShape.lineTo(cW, 0); panelCoreShape.closePath();

                const panelCoreGeo = new THREE.ExtrudeGeometry(panelCoreShape, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3 });
                panelCoreGeo.center();
                const panelCoreMesh = new THREE.Mesh(panelCoreGeo, pureWhiteMat);
                panelCoreMesh.position.set(xVal, 6.0, zVal);
                doorGroup.add(panelCoreMesh);
            });
        });

        return doorGroup;
    }

    /* 🌸 8. THIẾT KẾ KHU VƯỜN SOUGEN & CHỮ 3D "Viet Anh Nguyen" (KHỐI ĐÁ NÚI z = -52) */
    _initSougenGardenAndFloatingText() {
        const gardenGroup = new THREE.Group();
        gardenGroup.position.set(0, 0, -34);

        // 1. Sàn Gỗ Sougen Terrace Deck
        const deckMat = new THREE.MeshStandardMaterial({
            color: 0xb87333,
            roughness: 0.6,
            metalness: 0.05
        });
        const deckMesh = new THREE.Mesh(new THREE.BoxGeometry(34, 0.24, 22), deckMat);
        deckMesh.position.set(0, 0.12, 0);
        deckMesh.receiveShadow = true;
        deckMesh.castShadow = true;
        gardenGroup.add(deckMesh);

        // 2. Bồn Hoa Tròn Bán Nguyệt 1
        const flowerbed1Group = new THREE.Group();
        flowerbed1Group.position.set(-6.5, 0.24, 0);

        const marbleRimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 });
        const rim1 = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 6.8, 0.36, 32), marbleRimMat);
        rim1.position.y = 0.18;
        rim1.castShadow = true;
        rim1.receiveShadow = true;
        flowerbed1Group.add(rim1);

        const soilMat = new THREE.MeshStandardMaterial({ color: 0x40c057, roughness: 0.8 });
        const soil1 = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 6.4, 0.38, 32), soilMat);
        soil1.position.y = 0.19;
        soil1.receiveShadow = true;
        flowerbed1Group.add(soil1);

        const flowerColors = [0xff75a0, 0xffffff, 0xffd166, 0xff4d6d];
        for (let i = 0; i < 90; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 5.8;
            const fx = Math.cos(angle) * dist;
            const fz = Math.sin(angle) * dist;

            const flowerColor = flowerColors[Math.floor(Math.random() * flowerColors.length)];
            const petalMat = new THREE.MeshStandardMaterial({ color: flowerColor, roughness: 0.5 });
            const stemMat = new THREE.MeshStandardMaterial({ color: 0x2b9348 });

            const flower = new THREE.Group();
            flower.position.set(fx, 0.38, fz);

            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 6), stemMat);
            stem.position.y = 0.11;
            flower.add(stem);

            const petals = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 0), petalMat);
            petals.position.y = 0.24;
            petals.castShadow = true;
            flower.add(petals);

            flowerbed1Group.add(flower);
        }
        gardenGroup.add(flowerbed1Group);

        // Bồn Hoa Tròn Bán Nguyệt 2
        const flowerbed2Group = new THREE.Group();
        flowerbed2Group.position.set(8.5, 0.24, 2.0);

        const rim2 = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.4, 0.36, 32), marbleRimMat);
        rim2.position.y = 0.18;
        rim2.castShadow = true;
        flowerbed2Group.add(rim2);

        const soil2 = new THREE.Mesh(new THREE.CylinderGeometry(4.0, 4.0, 0.38, 32), soilMat);
        soil2.position.y = 0.19;
        flowerbed2Group.add(soil2);

        for (let i = 0; i < 45; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 3.5;
            const fx = Math.cos(angle) * dist;
            const fz = Math.sin(angle) * dist;

            const flowerColor = flowerColors[Math.floor(Math.random() * flowerColors.length)];
            const flower = new THREE.Group();
            flower.position.set(fx, 0.38, fz);

            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.20, 6), new THREE.MeshStandardMaterial({ color: 0x2b9348 }));
            stem.position.y = 0.10;
            flower.add(stem);

            const petals = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), new THREE.MeshStandardMaterial({ color: flowerColor }));
            petals.position.y = 0.22;
            flower.add(petals);

            flowerbed2Group.add(flower);
        }
        gardenGroup.add(flowerbed2Group);

        // 3. Rặng Núi Mây Trắng Bao Bọc Phía Sau Khu Vườn (z = -52)
        const cloudHillMat = new THREE.MeshStandardMaterial({
            color: 0xf8fafc,
            roughness: 0.9,
            metalness: 0.05,
            flatShading: true
        });

        const hillPositions = [
            { x: -16, y: 3.5, z: -18, scale: 6.5 },
            { x: 0, y: 4.8, z: -20, scale: 7.8 },
            { x: 18, y: 3.8, z: -18, scale: 6.8 }
        ];

        hillPositions.forEach(hp => {
            const hill = new THREE.Mesh(new THREE.DodecahedronGeometry(hp.scale, 1), cloudHillMat);
            hill.position.set(hp.x, hp.y, hp.z);
            hill.castShadow = true;
            hill.receiveShadow = true;
            gardenGroup.add(hill);
        });

        // 4. CHỮ 3D "Viet Anh Nguyen" TREO LƠ LỬNG TRÊN KHÔNG
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            ctx.clearRect(0, 0, 1024, 256);
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 95px "Outfit", "Inter", "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Viet Anh Nguyen', 512, 135);

            ctx.fillStyle = '#00f5ff';
            ctx.beginPath();
            ctx.arc(220, 82, 12, 0, Math.PI * 2);
            ctx.fill();
        }

        const textTexture = new THREE.CanvasTexture(canvas);
        textTexture.needsUpdate = true;

        const textPlaneGeo = new THREE.PlaneGeometry(22, 5.5);
        const textPlaneMat = new THREE.MeshBasicMaterial({
            map: textTexture,
            transparent: true,
            side: THREE.DoubleSide
        });

        const floatingTextMesh = new THREE.Mesh(textPlaneGeo, textPlaneMat);
        floatingTextMesh.position.set(0, 6.2, -1.0);
        gardenGroup.add(floatingTextMesh);

        // Bóng Đổ Chữ "Viet Anh Nguyen" Trên Sàn Gỗ
        const shadowCanvas = document.createElement('canvas');
        shadowCanvas.width = 1024;
        shadowCanvas.height = 256;
        const sCtx = shadowCanvas.getContext('2d');
        if (sCtx) {
            sCtx.clearRect(0, 0, 1024, 256);
            sCtx.fillStyle = 'rgba(15, 23, 42, 0.45)';
            sCtx.font = 'bold 95px "Outfit", "Inter", sans-serif';
            sCtx.textAlign = 'center';
            sCtx.textBaseline = 'middle';
            sCtx.fillText('Viet Anh Nguyen', 512, 135);
        }
        const shadowTexture = new THREE.CanvasTexture(shadowCanvas);

        const shadowPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(22, 5.5),
            new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, opacity: 0.4 })
        );
        shadowPlane.rotation.x = -Math.PI / 2;
        shadowPlane.position.set(0, 0.25, 0);
        gardenGroup.add(shadowPlane);

        this.scene.add(gardenGroup);
    }

    /* 🌊 9. DÒNG SÔNG BẮC-NAM (x = -22) & CẦU GỖ UỐN VÒM BẮC NGANG ĐÔNG-TÂY */
    _initRiverStreamAndBridge() {
        const riverGeo = new THREE.PlaneGeometry(8, 90);
        const riverMat = new THREE.MeshStandardMaterial({
            color: 0x00b4d8,
            emissive: 0x0077b6,
            emissiveIntensity: 0.15,
            roughness: 0.1,
            metalness: 0.85,
            transparent: true,
            opacity: 0.88
        });
        const river = new THREE.Mesh(riverGeo, riverMat);
        river.rotation.x = -Math.PI / 2;
        river.position.set(-22, 0.01, 0);
        this.scene.add(river);

        const bankMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9, flatShading: true });

        const bankWestGeo = new THREE.PlaneGeometry(1.2, 90);
        const bankWest = new THREE.Mesh(bankWestGeo, bankMat);
        bankWest.rotation.x = -Math.PI / 2;
        bankWest.position.set(-26.1, 0.012, 0);
        this.scene.add(bankWest);

        const bankEastGeo = new THREE.PlaneGeometry(1.2, 90);
        const bankEast = new THREE.Mesh(bankEastGeo, bankMat);
        bankEast.rotation.x = -Math.PI / 2;
        bankEast.position.set(-17.9, 0.012, 0);
        this.scene.add(bankEast);

        for (let i = 0; i < 18; i++) {
            const side = i % 2 === 0 ? -26.4 : -17.6;
            const p = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.35, 0), bankMat);
            p.position.set(side, 0.2, -40 + i * 4.8);
            p.castShadow = true;
            this.scene.add(p);
        }

        // CẦU GỖ UỐN VÒM BẮC NGANG QUA SÔNG
        const bridgeGroup = new THREE.Group();
        bridgeGroup.position.set(-22, 0, 8);

        const woodMat = new THREE.MeshStandardMaterial({ color: 0x7c5836, roughness: 0.85 });
        const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x4a3b32, roughness: 0.9 });

        const bridgeDeck = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.28, 4.2), woodMat);
        bridgeDeck.position.y = 0.35;
        bridgeDeck.castShadow = true;
        bridgeDeck.receiveShadow = true;
        bridgeGroup.add(bridgeDeck);

        const beamL = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.3, 0.25), darkWoodMat);
        beamL.position.set(0, 0.18, -2.0);
        bridgeGroup.add(beamL);

        const beamR = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.3, 0.25), darkWoodMat);
        beamR.position.set(0, 0.18, 2.0);
        bridgeGroup.add(beamR);

        for (let x = -4.8; x <= 4.8; x += 2.4) {
            const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 1.2, 8), darkWoodMat);
            postL.position.set(x, 1.0, -2.0);
            postL.castShadow = true;
            bridgeGroup.add(postL);

            const postR = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 1.2, 8), darkWoodMat);
            postR.position.set(x, 1.0, 2.0);
            postR.castShadow = true;
            bridgeGroup.add(postR);
        }

        const railL = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.12, 0.14), darkWoodMat);
        railL.position.set(0, 1.55, -2.0);
        bridgeGroup.add(railL);

        const railR = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.12, 0.14), darkWoodMat);
        railR.position.set(0, 1.55, 2.0);
        bridgeGroup.add(railR);

        this.scene.add(bridgeGroup);
    }

    /* 🏡 10. KHU NHÀ CỬA THỊ TRẤN - ĐẶT NỘI THẤT XA HOÀN TOÀN CUNG ĐIỆN (x >= 42) */
    _initTownHousesAndShops() {
        const townGroup = new THREE.Group();

        const mainShowroom = this._createHouseBuilding(28, 10, 10, 0x1e293b, 0x3a86ff, 'CYBER MOTORS', true);
        mainShowroom.position.set(0, 0, -19.1);
        townGroup.add(mainShowroom);

        // Đẩy toàn bộ các ngôi nhà phụ sang bờ Đông x >= 44 né xa khu vực Cung điện (x = -22 -> 22, z = 16 -> 44)
        const housesData = [
            { x: 44, z: -18, w: 10, h: 7, d: 8, wallColor: 0xffffff, roofColor: 0xe76f51, label: 'COASTAL VILLA' },
            { x: 45, z: 38, w: 11, h: 8, d: 9, wallColor: 0x48cae4, roofColor: 0xf72585, label: 'BEACH HOTEL' },
            { x: 34, z: -28, w: 10, h: 7, d: 8, wallColor: 0xa8e6cf, roofColor: 0xe76f51, label: 'MOTORS CLUB' }
        ];

        housesData.forEach(hd => {
            const house = this._createHouseBuilding(hd.w, hd.h, hd.d, hd.wallColor, hd.roofColor, hd.label);
            house.position.set(hd.x, 0, hd.z);
            townGroup.add(house);
        });

        // Trạm Xăng & Sửa Xe
        const gasStation = new THREE.Group();
        gasStation.position.set(-16, 0, -12);

        const canopy = new THREE.Mesh(new THREE.BoxGeometry(14, 0.5, 9), new THREE.MeshStandardMaterial({ color: 0xe76f51, roughness: 0.5 }));
        canopy.position.set(0, 5, 0);
        canopy.castShadow = true;
        gasStation.add(canopy);

        const pillarL = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 5, 12), new THREE.MeshStandardMaterial({ color: 0xffffff }));
        pillarL.position.set(-5, 2.5, 0);
        gasStation.add(pillarL);

        const pillarR = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 5, 12), new THREE.MeshStandardMaterial({ color: 0xffffff }));
        pillarR.position.set(5, 2.5, 0);
        gasStation.add(pillarR);

        const pumpMat = new THREE.MeshStandardMaterial({ color: 0x2a9d8f, roughness: 0.4 });
        const pump1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 1.0), pumpMat);
        pump1.position.set(-2.5, 1.1, 0);
        gasStation.add(pump1);

        const pump2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 1.0), pumpMat);
        pump2.position.set(2.5, 1.1, 0);
        gasStation.add(pump2);

        townGroup.add(gasStation);
        this.scene.add(townGroup);

        // 🛒 KHỞI TẠO QUẦY BÁN HÀNG 3D NGOÀI TRỜI ĐẶT TRƯỚC NHÀ (z = -7.0)
        this._initArmoryShopCounter();

        // 🏆 XÂY DỰNG CĂN NHÀ VÀNG RỘNG MỞ VÀ TRƯNG BÀY 3 MÔ HÌNH 3D BABY GOKU BÊN TRONG NHÀ
        this._initBabyGokuExhibitionYellowHouse();
    }

    /* 🛒 10A. QUẦY BÁN HÀNG 3D NGOÀI TRỜI (ARMORY SHOP COUNTER WITH 3D ITEMS ON TOP) */
    _initArmoryShopCounter() {
        const counterGroup = new THREE.Group();
        counterGroup.position.set(0, 0, -7.0);

        const counterWoodMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.6 });
        const marbleTopMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });
        const cyanNeonMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff });
        const magentaNeonMat = new THREE.MeshBasicMaterial({ color: 0xff007f });
        const goldNeonMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });

        // 1. Thân Bàn Quầy Hàng (Counter Table Base)
        const tableBase = new THREE.Mesh(new THREE.BoxGeometry(8.5, 1.1, 1.8), counterWoodMat);
        tableBase.position.y = 0.55;
        tableBase.castShadow = true;
        tableBase.receiveShadow = true;
        counterGroup.add(tableBase);

        // Mặt Bàn Cẩm Thạch Trắng (Marble Table Top)
        const tableTop = new THREE.Mesh(new THREE.BoxGeometry(8.9, 0.12, 2.0), marbleTopMat);
        tableTop.position.y = 1.16;
        tableTop.castShadow = true;
        counterGroup.add(tableTop);

        // Viền LED Cyan Neon Đèn Chân Bàn
        const ledTrim = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.08, 1.84), cyanNeonMat);
        ledTrim.position.y = 1.10;
        counterGroup.add(ledTrim);

        // 2. Mái Hiên Che Quầy Bán Hàng (Counter Awning Canopy)
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
        const awningMat = new THREE.MeshStandardMaterial({ color: 0x00f5ff, roughness: 0.4 });

        [-3.8, 3.8].forEach(px => {
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 8), pillarMat);
            pole.position.set(px, 2.3, 0);
            pole.castShadow = true;
            counterGroup.add(pole);
        });

        const awning = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.25, 2.4), awningMat);
        awning.position.set(0, 3.4, 0);
        awning.castShadow = true;
        counterGroup.add(awning);

        // Biển chữ "🛒 ITEM & SKIN SHOP" 1024x256 nét căng, chữ P hiển thị 100% rõ ràng
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, 1024, 256);
            ctx.font = 'bold 74px "Outfit", "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Viền chữ viền đen sắc nét
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 12;
            ctx.strokeText('🛒 ITEM & SKIN SHOP', 512, 128);

            // Chữ màu trắng nổi bật trên nền mái Cyan
            ctx.fillStyle = '#ffffff';
            ctx.fillText('🛒 ITEM & SKIN SHOP', 512, 128);
        }
        const signTexture = new THREE.CanvasTexture(canvas);
        signTexture.minFilter = THREE.LinearFilter;
        const signMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(8.2, 2.0),
            new THREE.MeshBasicMaterial({ map: signTexture, transparent: true, side: THREE.DoubleSide })
        );
        signMesh.position.set(0, 3.4, 1.26);
        counterGroup.add(signMesh);

        // 3. 4 ITEM 3D ĐẶT TRÊN MẶT QUẦY BÁN HÀNG (Shield, Bread, Nitro, Magnet)
        this.armoryItemIcons = [];

        // Item 1: Khiên Bảo Vệ 🛡️
        const shieldIcon = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 1), cyanNeonMat);
        shieldIcon.position.set(-2.7, 1.65, 0);
        counterGroup.add(shieldIcon);
        this.armoryItemIcons.push(shieldIcon);

        // Item 2: Bánh Mì Hồi Huyết 🍞
        const breadMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });
        const breadIcon = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.32, 8, 12), breadMat);
        breadIcon.rotation.z = Math.PI / 2;
        breadIcon.position.set(-0.9, 1.65, 0);
        counterGroup.add(breadIcon);
        this.armoryItemIcons.push(breadIcon);

        // Item 3: Bình Nitro Tăng Tốc ⚡
        const nitroIcon = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.45, 12), magentaNeonMat);
        nitroIcon.position.set(0.9, 1.65, 0);
        counterGroup.add(nitroIcon);
        this.armoryItemIcons.push(nitroIcon);

        // Item 4: Nam Châm Hút Coin 🧲
        const magnetIcon = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.08, 8, 16, Math.PI), goldNeonMat);
        magnetIcon.position.set(2.7, 1.65, 0);
        counterGroup.add(magnetIcon);
        this.armoryItemIcons.push(magnetIcon);

        this.scene.add(counterGroup);
    }

    /* 🪟 HÀM VẼ CỬA SỔ CÓ MÁI CHE NÓNG CONG CHÓP NÓN NHƯ TRONG ẢNH MẪU (WINDOW WITH MINI-ROOF CANOPY & TILED OVERHANG) */
    _createWindowWithMiniRoof(width = 2.2, height = 2.4) {
        const group = new THREE.Group();
        const frameMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
        const glassMat = new THREE.MeshStandardMaterial({ color: 0x8ad2f1, roughness: 0.1, transparent: true, opacity: 0.6 });
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x264653, roughness: 0.7 });
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.8 });

        // 1. Kính Cửa Sổ Trong Suốt
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.2, height - 0.2), glassMat);
        glass.position.z = 0.02;
        group.add(glass);

        // 2. Khung Viền Cửa Sổ Trắng Sắc Nét
        const frameOuter = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.12), frameMat);
        group.add(frameOuter);

        // Chia Ô Cửa Sổ Sọc Ngang & Sọc Dọc
        const mullionH = new THREE.Mesh(new THREE.BoxGeometry(width - 0.2, 0.08, 0.14), frameMat);
        mullionH.position.z = 0.03;
        group.add(mullionH);

        const mullionV = new THREE.Mesh(new THREE.BoxGeometry(0.08, height - 0.2, 0.14), frameMat);
        mullionV.position.z = 0.03;
        group.add(mullionV);

        // 3. MÁI NGÓI MÁI HIÊN CHE CỬA SỔ CHUẨN 100% ẢNH MẪU CỦA USER (MINI-ROOF EAVES CANOPY)
        const canopyGroup = new THREE.Group();
        canopyGroup.position.set(0, height / 2 + 0.35, 0.35);

        // Mái Ngói Cong Khối Kim Tự Tháp Nón Chóp (Cone Geometry rotated 45 deg)
        const miniRoof = new THREE.Mesh(new THREE.ConeGeometry(width * 0.75, 0.7, 4), roofMat);
        miniRoof.rotation.y = Math.PI / 4;
        miniRoof.position.y = 0.35;
        miniRoof.castShadow = true;
        canopyGroup.add(miniRoof);

        // Nẹp xà gồ gỗ đỡ phía dưới mái ngói
        [-width / 2 + 0.3, width / 2 - 0.3].forEach(bx => {
            const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.45), woodMat);
            bracket.position.set(bx, -0.1, -0.2);
            bracket.rotation.x = Math.PI / 4;
            bracket.castShadow = true;
            canopyGroup.add(bracket);
        });

        group.add(canopyGroup);
        return group;
    }

    /* 🏆 10B. XÂY DỰNG CĂN NHÀ VÀNG TRIỂN LÃM RỘNG MỞ & NẠP 4 MÔ HÌNH 3D GOKU GLTF THẬT VÀO TRONG NHÀ */
    _initBabyGokuExhibitionYellowHouse() {
        const houseGroup = new THREE.Group();
        // Vị trí căn nhà vàng x = 44, z = 0, xoay mặt tiền sang trái (rotation.y = -Math.PI / 2)
        houseGroup.position.set(44.0, 0, 0);
        houseGroup.rotation.y = -Math.PI / 2;

        const width = 22.0;  // MỞ RỘNG CĂN NHÀ VÀNG RỘNG THOÁNG 22.0M CHO 4 MÔ HÌNH
        const height = 8.5;
        const depth = 14.0;

        const wallMat = new THREE.MeshStandardMaterial({ color: 0xffe066, roughness: 0.8, metalness: 0.05 });
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x264653, roughness: 0.7 });
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
        const pedestalGoldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.3, metalness: 0.8 });
        const cyanNeonMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff });
        const magentaNeonMat = new THREE.MeshBasicMaterial({ color: 0xff007f });
        const goldNeonMat = new THREE.MeshBasicMaterial({ color: 0xffb703 });

        // 1. SÀN NHÀ & MÁI NHÀ VÀNG THIẾT KẾ RỘNG NÂNG CẤP
        const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(width, 0.2, depth), floorMat);
        floorMesh.position.y = 0.1;
        floorMesh.receiveShadow = true;
        houseGroup.add(floorMesh);

        // Mái Nhà Hình Kim Tự Tháp/Khối Tam Giác
        const roofMesh = new THREE.Mesh(new THREE.ConeGeometry(width * 0.72, height * 0.55, 4), roofMat);
        roofMesh.rotation.y = Math.PI / 4;
        roofMesh.position.y = height + (height * 0.55) / 2;
        roofMesh.castShadow = true;
        houseGroup.add(roofMesh);

        // 2. TƯỜNG NHÀ RỖNG KHÔNG GIAN NỘI THẤT RỘNG MỞ (KHE CỬA VÒM RỖNG 100% KHÔNG BỊ TẤM ĐEN CHE LẠI)
        const wallThickness = 0.4;
        const doorW = 5.2;

        // Tường Tiền Trái
        const frontLeftW = (width - doorW) / 2;
        const frontLeftWall = new THREE.Mesh(new THREE.BoxGeometry(frontLeftW, height, wallThickness), wallMat);
        frontLeftWall.position.set(-(doorW / 2 + frontLeftW / 2), height / 2, depth / 2);
        frontLeftWall.castShadow = true;
        frontLeftWall.receiveShadow = true;
        houseGroup.add(frontLeftWall);

        // Tường Tiền Phải
        const frontRightWall = new THREE.Mesh(new THREE.BoxGeometry(frontLeftW, height, wallThickness), wallMat);
        frontRightWall.position.set(doorW / 2 + frontLeftW / 2, height / 2, depth / 2);
        frontRightWall.castShadow = true;
        frontRightWall.receiveShadow = true;
        houseGroup.add(frontRightWall);

        // Tường Trên Cửa Lanh Tô
        const lintelH = height - 4.5;
        const lintelWall = new THREE.Mesh(new THREE.BoxGeometry(doorW, lintelH, wallThickness), wallMat);
        lintelWall.position.set(0, height - lintelH / 2, depth / 2);
        lintelWall.castShadow = true;
        lintelWall.receiveShadow = true;
        houseGroup.add(lintelWall);

        // Tường Hậu & Tường 2 Bên
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(width, height, wallThickness), wallMat);
        backWall.position.set(0, height / 2, -depth / 2);
        backWall.castShadow = true;
        backWall.receiveShadow = true;
        houseGroup.add(backWall);

        const sideWallL = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, height, depth), wallMat);
        sideWallL.position.set(-width / 2, height / 2, 0);
        sideWallL.castShadow = true;
        sideWallL.receiveShadow = true;
        houseGroup.add(sideWallL);

        const sideWallR = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, height, depth), wallMat);
        sideWallR.position.set(width / 2, height / 2, 0);
        sideWallR.castShadow = true;
        sideWallR.receiveShadow = true;
        houseGroup.add(sideWallR);

        // 🪟 VẼ 2 CỬA SỔ CÓ MÁI NGÓI CHE NHƯ ẢNH MẪU 100% TẠI MẶT TIỀN TƯỜNG VÀNG
        const winLeft = this._createWindowWithMiniRoof(2.2, 2.4);
        winLeft.position.set(-6.8, 4.2, depth / 2 + 0.06);
        houseGroup.add(winLeft);

        const winRight = this._createWindowWithMiniRoof(2.2, 2.4);
        winRight.position.set(6.8, 4.2, depth / 2 + 0.06);
        houseGroup.add(winRight);

        // 3. BIỂN HIỆU CHỮ 3D "🏆 BABY GOKU EXHIBITION" GẮN NỔI BẬT TRÊN MÁI NHÀ VÀNG (ROOF SIGNBOARD)
        const signBoardGroup = new THREE.Group();
        signBoardGroup.position.set(0, height + 1.8, depth / 2 + 0.3);

        // Khung biển đen mạ LED Cyan
        const signBackerMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.8 });
        const signBacker = new THREE.Mesh(new THREE.BoxGeometry(14.2, 2.8, 0.16), signBackerMat);
        signBoardGroup.add(signBacker);

        const signNeonTrim = new THREE.Mesh(new THREE.BoxGeometry(14.4, 3.0, 0.08), cyanNeonMat);
        signNeonTrim.position.z = -0.05;
        signBoardGroup.add(signNeonTrim);

        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, 1024, 256);
            ctx.font = 'bold 78px "Outfit", "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 14;
            ctx.strokeText('🏆 BABY GOKU EXHIBITION', 512, 128);

            ctx.fillStyle = '#00f5ff';
            ctx.fillText('🏆 BABY GOKU EXHIBITION', 512, 128);
        }
        const signTexture = new THREE.CanvasTexture(canvas);
        signTexture.minFilter = THREE.LinearFilter;
        const signMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(13.8, 2.6),
            new THREE.MeshBasicMaterial({ map: signTexture, transparent: true, side: THREE.DoubleSide })
        );
        signMesh.position.z = 0.09;
        signBoardGroup.add(signMesh);
        houseGroup.add(signBoardGroup);

        // 4. BỘ CỬA GỖ NÂU RỖNG KHÔNG CÓ TẤM ĐEN CHE LẠI (HOLLOW FRAME & DOUBLE HINGED DOORS)
        const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.8 });
        const doorMat = new THREE.MeshStandardMaterial({ color: 0x5c3d2e, roughness: 0.7 });
        const handleMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.2 });

        const exhibitionDoorGroup = new THREE.Group();
        exhibitionDoorGroup.position.set(0, 0, depth / 2);

        // KHUNG VIỀN RỖNG TÁCH BỆNH (Không dùng BoxGeometry lớn đặc làm đen cửa nữa)
        const postL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.5, 0.44), doorFrameMat);
        postL.position.set(-2.425, 2.25, 0);
        postL.castShadow = true;
        exhibitionDoorGroup.add(postL);

        const postR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.5, 0.44), doorFrameMat);
        postR.position.set(2.425, 2.25, 0);
        postR.castShadow = true;
        exhibitionDoorGroup.add(postR);

        const headerTop = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.35, 0.44), doorFrameMat);
        headerTop.position.set(0, 4.325, 0);
        headerTop.castShadow = true;
        exhibitionDoorGroup.add(headerTop);

        // Bản Lề Cửa Trái (Hinge Left) - Căn mép vừa khít 100% không còn khe hở dọc giữa
        const hingeL = new THREE.Group();
        hingeL.position.set(-2.4, 2.1, 0.05);

        const doorLeafL = new THREE.Mesh(new THREE.BoxGeometry(2.43, 4.1, 0.16), doorMat);
        doorLeafL.position.set(1.215, 0, 0);
        doorLeafL.castShadow = true;
        hingeL.add(doorLeafL);

        const knobL = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), handleMat);
        knobL.position.set(2.1, 0, 0.14);
        hingeL.add(knobL);

        exhibitionDoorGroup.add(hingeL);

        // Bản Lề Cửa Phải (Hinge Right) - Căn mép vừa khít 100% không còn khe hở dọc giữa
        const hingeR = new THREE.Group();
        hingeR.position.set(2.4, 2.1, 0.05);

        const doorLeafR = new THREE.Mesh(new THREE.BoxGeometry(2.43, 4.1, 0.16), doorMat);
        doorLeafR.position.set(-1.215, 0, 0);
        doorLeafR.castShadow = true;
        hingeR.add(doorLeafR);

        const knobR = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), handleMat);
        knobR.position.set(-2.1, 0, 0.14);
        hingeR.add(knobR);

        exhibitionDoorGroup.add(hingeR);

        houseGroup.add(exhibitionDoorGroup);

        this.exhibitionDoorHingeL = hingeL;
        this.exhibitionDoorHingeR = hingeR;

        // 5. ĐẶT 4 MÔ HÌNH 3D GOKU GLTF THẬT TRONG NHÀ (goku-0, goku-1, goku-3, goku-4)
        this.gokuExhibitionModels = [];
        const modelPaths = [
            '/models/goku-0.glb',
            '/models/goku-1.glb',
            '/models/goku-3.glb',
            '/models/goku-4.glb'
        ];

        const pedestalOffsets = [
            { x: -7.5, z: -1.8, neonMat: goldNeonMat },
            { x: -2.5, z: -3.2, neonMat: cyanNeonMat },
            { x: 2.5, z: -3.2, neonMat: magentaNeonMat },
            { x: 7.5, z: -1.8, neonMat: goldNeonMat }
        ];

        const gltfLoader = new GLTFLoader();

        pedestalOffsets.forEach((ped, idx) => {
            const pGroup = new THREE.Group();
            pGroup.position.set(ped.x, 0.2, ped.z);

            // Bệ Tròn Mạ Vàng Trong Nhà
            const pBase = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 0.5, 32), pedestalGoldMat);
            pBase.position.y = 0.25;
            pBase.castShadow = true;
            pBase.receiveShadow = true;
            pGroup.add(pBase);

            // Vòng Đèn Neon Chiếu Sáng Chân Bệ
            const pRing = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.05, 12, 32), ped.neonMat);
            pRing.rotation.x = Math.PI / 2;
            pRing.position.y = 0.51;
            pGroup.add(pRing);

            // Đèn Spotlight Trong Nhà Rọi Trực Tiếp Từ Trần Nhà
            const spotLight = new THREE.SpotLight(0xffffff, 2.5);
            spotLight.position.set(0, height - 1.2, 0);
            spotLight.target = pBase;
            spotLight.angle = Math.PI / 5;
            spotLight.penumbra = 0.3;
            pGroup.add(spotLight);

            // NẠP MÔ HÌNH 3D GOKU GLB THẬT TỪ PUBLIC/MODELS/
            const modelPath = modelPaths[idx] || '/models/baby_goku.glb';
            gltfLoader.load(
                modelPath,
                (gltf) => {
                    const figureMesh = gltf.scene;

                    // Scale & Fit model 3D vừa vặn bệ đòn trong nhà
                    const box = new THREE.Box3().setFromObject(figureMesh);
                    const size = box.getSize(new THREE.Vector3());
                    const maxDim = Math.max(size.x, size.y, size.z);
                    const scale = 2.2 / (maxDim || 1);
                    figureMesh.scale.set(scale, scale, scale);

                    // Căn chỉnh vị trí Y chân mô hình đứng vững trên bệ đòn
                    figureMesh.position.set(0, 0.52, 0);

                    figureMesh.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });

                    pGroup.add(figureMesh);
                    this.gokuExhibitionModels.push(figureMesh);
                },
                undefined,
                (err) => {
                    console.warn(`Could not load ${modelPath}, fallback to baby_goku.glb:`, err);
                    gltfLoader.load('/models/baby_goku.glb', (fallbackGltf) => {
                        const figureMesh = fallbackGltf.scene;
                        figureMesh.scale.set(1.5, 1.5, 1.5);
                        figureMesh.position.set(0, 0.52, 0);
                        pGroup.add(figureMesh);
                        this.gokuExhibitionModels.push(figureMesh);
                    });
                }
            );

            houseGroup.add(pGroup);
        });

        this.scene.add(houseGroup);
    }

    _createHouseBuilding(width, height, depth, wallColorHex, roofColorHex, labelText, isMainShowroom = false) {
        const group = new THREE.Group();

        const wallMat = new THREE.MeshStandardMaterial({ color: wallColorHex, roughness: 0.85, metalness: 0.05 });

        if (isMainShowroom) {
            // 🏠 XÂY DỰNG NHÀ CHÍNH KHÔNG GIAN NỘI THẤT RỘNG MỞ & CỬA RA VÀO (HOLLOW WALLS & INTERIOR SHOWROOM)
            const wallThickness = 0.4;
            const doorOpeningW = 1.9;

            // 1. Tường Mặt Tiền Trái (Đồng màu đen 0x1e293b 100%)
            const frontLeftW = (width - doorOpeningW) / 2;
            const frontLeftWall = new THREE.Mesh(new THREE.BoxGeometry(frontLeftW, height, wallThickness), wallMat);
            frontLeftWall.position.set(-(doorOpeningW / 2 + frontLeftW / 2), height / 2, depth / 2);
            frontLeftWall.castShadow = true;
            frontLeftWall.receiveShadow = true;
            group.add(frontLeftWall);

            // 2. Tường Mặt Tiền Phải (Đồng màu đen 0x1e293b 100%)
            const frontRightWall = new THREE.Mesh(new THREE.BoxGeometry(frontLeftW, height, wallThickness), wallMat);
            frontRightWall.position.set(doorOpeningW / 2 + frontLeftW / 2, height / 2, depth / 2);
            frontRightWall.castShadow = true;
            frontRightWall.receiveShadow = true;
            group.add(frontRightWall);

            // 3. Tường Lanh Tô Trên Cửa Chính (Triệt tiêu hoàn toàn thanh xám, phủ đen 0x1e293b đồng bộ)
            const lintelHeight = height - 2.9; // Từ y = 2.9m tới 10.0m
            const lintelWall = new THREE.Mesh(new THREE.BoxGeometry(doorOpeningW, lintelHeight, wallThickness), wallMat);
            lintelWall.position.set(0, height - lintelHeight / 2, depth / 2);
            lintelWall.castShadow = true;
            lintelWall.receiveShadow = true;
            group.add(lintelWall);

            // 4. Tường Phía Sau & Tường 2 Bên
            const backWall = new THREE.Mesh(new THREE.BoxGeometry(width, height, wallThickness), wallMat);
            backWall.position.set(0, height / 2, -depth / 2);
            backWall.castShadow = true;
            backWall.receiveShadow = true;
            group.add(backWall);

            const sideWallL = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, height, depth), wallMat);
            sideWallL.position.set(-width / 2, height / 2, 0);
            sideWallL.castShadow = true;
            group.add(sideWallL);

            const sideWallR = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, height, depth), wallMat);
            sideWallR.position.set(width / 2, height / 2, 0);
            sideWallR.castShadow = true;
            group.add(sideWallR);

            // 🛋️ SÀN GỖ NỘI THẤT VÀ ÁNH SÁNG ẤM CỦNG TRONG NHÀ
            const floorMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.45, metalness: 0.05 });
            const interiorFloor = new THREE.Mesh(new THREE.BoxGeometry(width - 0.4, 0.12, depth - 0.4), floorMat);
            interiorFloor.position.set(0, 0.06, 0);
            interiorFloor.receiveShadow = true;
            group.add(interiorFloor);

            // Đèn Trần Ấm Củng Chiếu Sáng Nội Thất & Tỏa Sáng Ra Cửa
            const indoorLight = new THREE.PointLight(0xffda9e, 2.8, 20.0);
            indoorLight.position.set(0, 4.8, 0);
            indoorLight.castShadow = true;
            group.add(indoorLight);

            // Đèn Chùm Trang Trí Trần Nhà (Chandelier)
            const chandelier = new THREE.Mesh(
                new THREE.SphereGeometry(0.38, 16, 16),
                new THREE.MeshBasicMaterial({ color: 0xffd700 })
            );
            chandelier.position.set(0, 5.2, 0);
            group.add(chandelier);

            // 🛋️ BỘ BÀN GHẾ LEATHER SOFA LOUNGE TRONG NHÀ
            const sofaMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.6 });
            const sofaSeat = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.6, 1.6), sofaMat);
            sofaSeat.position.set(-8.0, 0.45, 0);
            sofaSeat.castShadow = true;
            group.add(sofaSeat);

            const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.2, 0.4), sofaMat);
            sofaBack.position.set(-8.0, 1.05, -0.6);
            sofaBack.castShadow = true;
            group.add(sofaBack);

            // Bàn Trà Gỗ & Thảm Lounge
            const rug = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 3.8), new THREE.MeshStandardMaterial({ color: 0x00f5ff, roughness: 0.7 }));
            rug.rotation.x = -Math.PI / 2;
            rug.position.set(-8.0, 0.13, 0.2);
            group.add(rug);

            const coffeeTable = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 1.2), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 }));
            coffeeTable.position.set(-8.0, 0.38, 0.8);
            coffeeTable.castShadow = true;
            group.add(coffeeTable);

            // 🏆 TỦ KÍNH TRƯNG BÀY CÚP VÔ ĐỊCH SIÊU XE (TROPHY CABINET)
            const cabinetMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 });
            const cabinet = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.2, 0.8), cabinetMat);
            cabinet.position.set(8.0, 1.7, -depth / 2 + 0.6);
            cabinet.castShadow = true;
            group.add(cabinet);

            // 3 Cúp Vàng Lấp Lánh Trong Tủ
            for (let t = -1; t <= 1; t++) {
                const trophy = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.12, 0.22, 0.5, 12),
                    new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.1 })
                );
                trophy.position.set(8.0 + t * 0.9, 2.3, -depth / 2 + 0.6);
                trophy.castShadow = true;
                group.add(trophy);
            }
        } else {
            // Khối Tường Đặc Nguyên Bản Cho Các Nhà Khác
            const walls = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), wallMat);
            walls.position.y = height / 2;
            walls.castShadow = true;
            walls.receiveShadow = true;
            group.add(walls);
        }

        // 2. MÁI NHÀ CHÓP NÓN NGUYÊN BẢN
        const roofMat = new THREE.MeshStandardMaterial({ color: roofColorHex, roughness: 0.85, metalness: 0.05 });
        const roofRadius = width * 0.75;
        const roofHeight = height * 0.5;
        const roof = new THREE.Mesh(new THREE.ConeGeometry(roofRadius, roofHeight, 4), roofMat);
        roof.rotation.y = Math.PI / 4;
        roof.position.y = height + (height * 0.25);
        roof.castShadow = true;
        group.add(roof);

        // 3. CỬA CHÍNH ĐẸP NẾT + TAY NẮM CỬA KIM LOẠI VÀNG (CẢ KHUNG GỖ NÂU VÀ CÁNH CỬA NÂU XOAY CÙNG NHAU)
        const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.8 });
        const doorMat = new THREE.MeshStandardMaterial({ color: 0x5c3d2e, roughness: 0.7 });
        const handleMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.2 });

        if (isMainShowroom) {
            // HỆ TRỤC PIVOT XOAY TOÀN BỘ CỤM CỬA NÂU (BẢN LỀ TRÁI x = -0.95)
            const doorHingePivot = new THREE.Group();
            doorHingePivot.position.set(-0.95, 1.45, depth / 2 + 0.08);

            // Khung viền gỗ ngoài cửa (Màu nâu 0x3d271d)
            const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.9, 3.0, 0.08), doorFrameMat);
            doorFrame.position.set(0.95, 0, -0.04);
            doorFrame.castShadow = true;
            doorHingePivot.add(doorFrame);

            // Cánh cửa chính (Màu nâu 0x5c3d2e)
            const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.8, 0.16), doorMat);
            doorLeaf.position.set(0.95, -0.05, 0);
            doorLeaf.castShadow = true;
            doorHingePivot.add(doorLeaf);

            // Pano soi chìm trên và dưới cửa
            const doorPanelTop = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 0.20), doorFrameMat);
            doorPanelTop.position.set(0.95, 0.50, 0);
            doorHingePivot.add(doorPanelTop);

            const doorPanelBot = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 0.20), doorFrameMat);
            doorPanelBot.position.set(0.95, -0.60, 0);
            doorHingePivot.add(doorPanelBot);

            // Tay nắm cửa tròn bằng Vàng Kim Loại (Giữ nguyên tay nắm cũ tại vị trí x = 1.50 so với bản lề)
            const doorKnobBase = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.08, 12), handleMat);
            doorKnobBase.rotation.x = Math.PI / 2;
            doorKnobBase.position.set(1.50, -0.05, 0.12);
            doorHingePivot.add(doorKnobBase);

            const doorKnob = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), handleMat);
            doorKnob.position.set(1.50, -0.05, 0.16);
            doorKnob.castShadow = true;
            doorHingePivot.add(doorKnob);

            group.add(doorHingePivot);
            this.mainShowroomDoorHinge = doorHingePivot;

            // 🏷️ BIỂN HIỆU 3D "👗 CHARACTER WARDROBE" PHÍA TRÊN CỬA CHÍNH QUAY VỀ HƯỚNG BẢN ĐỒ
            const signCanvas = document.createElement('canvas');
            signCanvas.width = 1024;
            signCanvas.height = 256;
            const sCtx = signCanvas.getContext('2d');
            if (sCtx) {
                sCtx.clearRect(0, 0, 1024, 256);
                sCtx.font = 'bold 68px "Outfit", "Inter", sans-serif';
                sCtx.textAlign = 'center';
                sCtx.textBaseline = 'middle';
                sCtx.strokeStyle = '#0f172a';
                sCtx.lineWidth = 14;
                sCtx.strokeText('👗 CHARACTER WARDROBE', 512, 128);
                sCtx.fillStyle = '#00f5ff';
                sCtx.fillText('👗 CHARACTER WARDROBE', 512, 128);
            }
            const signTex = new THREE.CanvasTexture(signCanvas);
            signTex.minFilter = THREE.LinearFilter;
            const houseSignMesh = new THREE.Mesh(
                new THREE.PlaneGeometry(8.5, 2.1),
                new THREE.MeshBasicMaterial({ map: signTex, transparent: true, side: THREE.DoubleSide })
            );
            houseSignMesh.position.set(0, height * 0.65, depth / 2 + 0.22);
            group.add(houseSignMesh);
        } else {
            // Cửa tĩnh cho các nhà khác
            const doorGroup = new THREE.Group();
            doorGroup.position.set(0, 1.4, depth / 2 + 0.1);

            const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.9, 3.0, 0.08), doorFrameMat);
            doorFrame.position.set(0, 0.05, -0.04);
            doorGroup.add(doorFrame);

            const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.8, 0.16), doorMat);
            doorLeaf.castShadow = true;
            doorGroup.add(doorLeaf);

            const doorKnob = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), handleMat);
            doorKnob.position.set(0.55, 0.05, 0.16);
            doorKnob.castShadow = true;
            doorGroup.add(doorKnob);

            group.add(doorGroup);
        }

        // 4. 2 KHUNG CỬA SỔ KÍNH 2 BÊN MẶT TIỀN (2 WINDOW FRAMES WITH CROSS GRILL)
        const winW = Math.max(1.8, width * 0.09);
        const winH = Math.max(1.5, height * 0.22);
        const winOffsetX = Math.max(3.2, width * 0.23);

        const windowFrameMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
        const windowGlassMat = new THREE.MeshStandardMaterial({
            color: 0x8ad2f1,
            roughness: 0.1,
            metalness: 0.9,
            transparent: true,
            opacity: 0.8
        });

        [-winOffsetX, winOffsetX].forEach(wx => {
            const winGroup = new THREE.Group();
            winGroup.position.set(wx, height * 0.52, depth / 2 + 0.08);

            const winOuterFrame = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.3, winH + 0.3, 0.08), windowFrameMat);
            winGroup.add(winOuterFrame);

            const winGlass = new THREE.Mesh(new THREE.BoxGeometry(winW, winH, 0.12), windowGlassMat);
            winGroup.add(winGlass);

            const grillVert = new THREE.Mesh(new THREE.BoxGeometry(0.08, winH, 0.14), windowFrameMat);
            winGroup.add(grillVert);

            const grillHoriz = new THREE.Mesh(new THREE.BoxGeometry(winW, 0.08, 0.14), windowFrameMat);
            winGroup.add(grillHoriz);

            group.add(winGroup);
        });

        return group;
    }

    /* 🌸 11. CÂY SAKURA & CÂY PHONG/THÔNG NÉ XA HOÀN TOÀN KHU VỰC CUNG ĐIỆN */
    _initSakuraAndCoastalTrees() {
        const sakuraSpawns = [
            { x: -35, z: 18, scale: 2.2 },  // Phía sau Cổng Torii
            { x: -44, z: 25, scale: 2.3 },  // Đỉnh đồi
            { x: -34, z: -2, scale: 2.0 },  // Bờ đồi phía Nam
            { x: -30, z: 42, scale: 2.1 },  // Bờ Đồi Tây Bắc xa hẳn Cung điện
            { x: -48, z: 12, scale: 2.1 }   // Đồi phía Tây
        ];

        sakuraSpawns.forEach(s => {
            const sakura = this._createSakuraTree();
            sakura.position.set(s.x, 0, s.z);
            sakura.scale.setScalar(s.scale);
            this.scene.add(sakura);
        });

        // TOÀN BỘ CÂY ĐỒN RẢI THOÁNG ĐÃNG - TRÁNH VÙNG CUNG ĐIỆN (x = -22 -> 22, z = 16 -> 44)
        const regularTrees = [
            { type: 'pine', x: -16, z: 12, scale: 1.8 },
            { type: 'maple', x: 30, z: -10, scale: 1.6, color: 0xF3CA40 },
            { type: 'pine', x: 30, z: 12, scale: 1.9 },
            { type: 'maple', x: 28, z: -25, scale: 1.7, color: 0xF07167 },
            { type: 'pine', x: -52, z: -25, scale: 2.1 },
            { type: 'maple', x: 48, z: -25, scale: 2.2 }
        ];

        regularTrees.forEach(t => {
            const tree = this._createProceduralTree(t.type, t.color);
            tree.position.set(t.x, 0, t.z);
            tree.scale.setScalar(t.scale);
            this.scene.add(tree);
        });
    }

    _createSakuraTree() {
        const group = new THREE.Group();

        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3b32, roughness: 0.85 });
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.48, 2.8, 8), trunkMat);
        trunk.position.y = 1.4;
        trunk.rotation.z = -0.12;
        trunk.castShadow = true;
        group.add(trunk);

        const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 1.9, 8), trunkMat);
        branch.position.set(0.45, 2.3, 0);
        branch.rotation.z = -0.42;
        group.add(branch);

        const sakuraPinkMat = new THREE.MeshStandardMaterial({
            color: 0xff9ebb,
            emissive: 0xff75a0,
            emissiveIntensity: 0.15,
            roughness: 0.7,
            flatShading: true
        });

        const sakuraLightPinkMat = new THREE.MeshStandardMaterial({
            color: 0xffc2d1,
            emissive: 0xffb7c5,
            emissiveIntensity: 0.15,
            roughness: 0.7,
            flatShading: true
        });

        const mainLeaves = new THREE.Mesh(new THREE.DodecahedronGeometry(1.95, 1), sakuraPinkMat);
        mainLeaves.position.set(0.2, 4.0, 0);
        mainLeaves.castShadow = true;
        group.add(mainLeaves);

        const subLeaves1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4, 1), sakuraLightPinkMat);
        subLeaves1.position.set(1.45, 3.6, 0.6);
        subLeaves1.castShadow = true;
        group.add(subLeaves1);

        const subLeaves2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.5, 1), sakuraPinkMat);
        subLeaves2.position.set(-1.1, 3.7, -0.5);
        subLeaves2.castShadow = true;
        group.add(subLeaves2);

        return group;
    }

    /* 🪨 12. KHỐI ĐÁ NÚI XÁM MỊN KHỔNG LỒ (TÂY BẮC XA x = -50, z = 38) */
    _initGiantBoulders() {
        const boulderMat = new THREE.MeshStandardMaterial({
            color: 0x94a3b8,
            roughness: 0.8,
            metalness: 0.05,
            flatShading: true
        });

        const bigBoulder = new THREE.Mesh(new THREE.DodecahedronGeometry(5.5, 1), boulderMat);
        bigBoulder.scale.set(1.2, 1.5, 1.1);
        bigBoulder.position.set(-50, 4.2, 38);
        bigBoulder.rotation.set(0.2, 0.5, -0.1);
        bigBoulder.castShadow = true;
        bigBoulder.receiveShadow = true;
        this.scene.add(bigBoulder);

        const subBoulder = new THREE.Mesh(new THREE.DodecahedronGeometry(3.5, 1), boulderMat);
        subBoulder.scale.set(1.3, 1.1, 1.0);
        subBoulder.position.set(-42, 2.4, 42);
        subBoulder.castShadow = true;
        this.scene.add(subBoulder);
    }

    _createProceduralTree(type = 'pine', leafColorHex = 0x2EC4B6) {
        const group = new THREE.Group();

        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7c5836, roughness: 0.85 });
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 2.4, 8), trunkMat);
        trunk.position.y = 1.2;
        trunk.castShadow = true;
        group.add(trunk);

        const leafMat = new THREE.MeshStandardMaterial({
            color: leafColorHex || (type === 'pine' ? 0x2EC4B6 : 0xF3CA40),
            roughness: 0.85,
            flatShading: true
        });

        if (type === 'pine') {
            const leaves = new THREE.Mesh(new THREE.ConeGeometry(1.7, 4.2, 8), leafMat);
            leaves.position.y = 4.0;
            leaves.castShadow = true;
            group.add(leaves);
        } else {
            const leaves = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8, 1), leafMat);
            leaves.position.y = 3.9;
            leaves.castShadow = true;
            group.add(leaves);
        }

        return group;
    }

    /* 🚗 13. XE CỘ ĐẬU RẢI RÁC TRONG BẢN ĐỒ */
    _initAmbientVehicles() {
        const parkings = [
            { x: 38, z: -8, color: 0xe76f51, rot: Math.PI / 2 },
            { x: 38, z: 12, color: 0x2a9d8f, rot: Math.PI / 2 },
            { x: -10, z: -18, color: 0xf4a261, rot: 0 }
        ];

        parkings.forEach(p => {
            const car = this._createSimpleParkedCar(p.color);
            car.position.set(p.x, 0, p.z);
            car.rotation.y = p.rot;
            this.scene.add(car);
        });
    }

    _createSimpleParkedCar(colorHex) {
        const group = new THREE.Group();
        const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.4, metalness: 0.6 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 3.2), bodyMat);
        body.position.y = 0.45;
        body.castShadow = true;
        group.add(body);

        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 1.5), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.2 }));
        cabin.position.set(0, 0.8, -0.1);
        group.add(cabin);

        return group;
    }

    /* 🧍 14. DÀN ANIME SAIYAN PROCEDURAL (GOKU, VEGETA, VEGITO, TRUNKS, GOHAN) ĐI LẠI TRÊN PHỐ */
    _initNPCs() {
        this.npcList = [];

        const npcConfigs = [
            // 1. GOKU - Người Gác Cửa Cung Điện La Mã (Đi lại trước cửa vòm Z = 23.5m, Y = 0.70m)
            { type: 'goku', x: -6, z: 23.5, pathX: [-6, 6], dir: 1, speed: 1.8 },
            { type: 'vegeta', x: -14, z: 4, pathZ: [4, 20], dir: 1, speed: 2.2 },
            { type: 'vegito', x: 28, z: -10, pathZ: [-15, 12], dir: 1, speed: 2.0 },
            { type: 'trunks', x: -35, z: 8, pathX: [-42, -26], dir: 1, speed: 2.1 },
            { type: 'gohan', x: 18, z: 12, pathX: [12, 28], dir: 1, speed: 2.3 }
        ];

        npcConfigs.forEach(data => {
            let characterMesh;
            if (data.type === 'goku') {
                characterMesh = this._createProceduralGoku();
            } else if (data.type === 'vegeta') {
                characterMesh = this._createProceduralVegeta();
            } else if (data.type === 'vegito') {
                characterMesh = this._createProceduralVegito();
            } else if (data.type === 'trunks') {
                characterMesh = this._createProceduralTrunks();
            } else {
                characterMesh = this._createProceduralGohan();
            }

            characterMesh.position.set(data.x, 0, data.z);
            this.scene.add(characterMesh);

            this.npcList.push({
                group: characterMesh,
                data: data,
                walkTime: Math.random() * 10
            });
        });
    }

    _updateNPCs(deltaTime) {
        this.npcList.forEach(npc => {
            const d = npc.data;
            npc.walkTime += deltaTime * d.speed * 4.2;

            const u = npc.group.userData;
            if (u && u.leftLegGroup && u.rightLegGroup) {
                u.leftLegGroup.rotation.x = Math.sin(npc.walkTime) * 0.45;
                u.rightLegGroup.rotation.x = -Math.sin(npc.walkTime) * 0.45;
            }
            if (u && u.leftArmGroup && u.rightArmGroup) {
                u.leftArmGroup.rotation.x = -Math.sin(npc.walkTime) * 0.40;
                u.rightArmGroup.rotation.x = Math.sin(npc.walkTime) * 0.40;
            }

            if (u && u.aura) {
                u.aura.rotation.z += deltaTime * 2.5;
                u.aura.material.opacity = 0.45 + Math.sin(npc.walkTime * 1.5) * 0.18;
            }

            if (d.pathX) {
                npc.group.position.x += d.dir * d.speed * deltaTime;
                if (npc.group.position.x > d.pathX[1]) {
                    npc.group.position.x = d.pathX[1];
                    d.dir = -1;
                    npc.group.rotation.y = -Math.PI / 2;
                } else if (npc.group.position.x < d.pathX[0]) {
                    npc.group.position.x = d.pathX[0];
                    d.dir = 1;
                    npc.group.rotation.y = Math.PI / 2;
                }
            } else if (d.pathZ) {
                npc.group.position.z += d.dir * d.speed * deltaTime;
                if (npc.group.position.z > d.pathZ[1]) {
                    npc.group.position.z = d.pathZ[1];
                    d.dir = -1;
                    npc.group.rotation.y = Math.PI;
                } else if (npc.group.position.z < d.pathZ[0]) {
                    npc.group.position.z = d.pathZ[0];
                    d.dir = 1;
                    npc.group.rotation.y = 0;
                }
            }

            npc.group.rotation.z = 0;
            const currentGroundY = this._calculateGroundY(npc.group.position.x, npc.group.position.z);
            npc.group.position.y = currentGroundY;
        });
    }

    /* 🟠 14A. PROCEDURAL GOKU MODEL */
    _createProceduralGoku() {
        const goku = new THREE.Group();

        const skinMat = new THREE.MeshToonMaterial({ color: 0xffdbac });
        const orangeGiMat = new THREE.MeshToonMaterial({ color: 0xff6b00 });
        const blueShirtMat = new THREE.MeshToonMaterial({ color: 0x0038a8 });
        const hairGoldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.3, metalness: 0.25 });
        const bootBlueMat = new THREE.MeshToonMaterial({ color: 0x002b7f });
        const bootRedMat = new THREE.MeshToonMaterial({ color: 0xd90429 });

        const leftLegGroup = new THREE.Group();
        leftLegGroup.position.set(-0.18, 0.70, 0);

        const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.55, 8, 12), orangeGiMat);
        legL.position.set(0, -0.25, 0);
        legL.castShadow = true;
        leftLegGroup.add(legL);

        const bootL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.32, 12), bootBlueMat);
        bootL.position.set(0, -0.50, 0.04);
        bootL.castShadow = true;
        leftLegGroup.add(bootL);

        const bootRimL = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.02, 8, 16), bootRedMat);
        bootRimL.rotation.x = Math.PI / 2;
        bootRimL.position.set(0, -0.36, 0.04);
        leftLegGroup.add(bootRimL);
        goku.add(leftLegGroup);

        const rightLegGroup = new THREE.Group();
        rightLegGroup.position.set(0.18, 0.70, 0);

        const legR = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.55, 8, 12), orangeGiMat);
        legR.position.set(0, -0.25, 0);
        legR.castShadow = true;
        rightLegGroup.add(legR);

        const bootR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.32, 12), bootBlueMat);
        bootR.position.set(0, -0.50, 0.04);
        bootR.castShadow = true;
        rightLegGroup.add(bootR);

        const bootRimR = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.02, 8, 16), bootRedMat);
        bootRimR.rotation.x = Math.PI / 2;
        bootRimR.position.set(0, -0.36, 0.04);
        rightLegGroup.add(bootRimR);
        goku.add(rightLegGroup);

        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.75, 12), orangeGiMat);
        torso.position.y = 1.12;
        torso.castShadow = true;
        goku.add(torso);

        const innerShirt = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.40, 4), blueShirtMat);
        innerShirt.rotation.x = Math.PI;
        innerShirt.position.set(0, 1.30, 0.12);
        goku.add(innerShirt);

        const waistSash = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.06, 8, 24), blueShirtMat);
        waistSash.rotation.x = Math.PI / 2;
        waistSash.position.y = 0.85;
        goku.add(waistSash);

        const leftArmGroup = new THREE.Group();
        leftArmGroup.position.set(-0.38, 1.40, 0);

        const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.45, 8, 12), skinMat);
        armL.position.set(0, -0.22, 0);
        armL.castShadow = true;
        leftArmGroup.add(armL);

        const wristbandL = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.16, 12), blueShirtMat);
        wristbandL.position.set(0, -0.45, 0);
        leftArmGroup.add(wristbandL);
        goku.add(leftArmGroup);

        const rightArmGroup = new THREE.Group();
        rightArmGroup.position.set(0.38, 1.40, 0);

        const armR = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.45, 8, 12), skinMat);
        armR.position.set(0, -0.22, 0);
        armR.castShadow = true;
        rightArmGroup.add(armR);

        const wristbandR = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.16, 12), blueShirtMat);
        wristbandR.position.set(0, -0.45, 0);
        rightArmGroup.add(wristbandR);
        goku.add(rightArmGroup);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), skinMat);
        head.position.y = 1.62;
        head.castShadow = true;
        goku.add(head);

        const browMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
        const browL = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.03, 0.02), browMat);
        browL.position.set(-0.09, 1.68, 0.24);
        browL.rotation.z = -0.15;
        goku.add(browL);

        const browR = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.03, 0.02), browMat);
        browR.position.set(0.09, 1.68, 0.24);
        browR.rotation.z = 0.15;
        goku.add(browR);

        const hairGroup = new THREE.Group();
        hairGroup.position.set(0, 1.68, 0);

        const spikesData = [
            { pos: [0, 0.35, -0.05], rot: [0.2, 0, 0], scale: [0.15, 0.65] },
            { pos: [-0.22, 0.28, 0.05], rot: [0.1, 0, 0.45], scale: [0.13, 0.58] },
            { pos: [0.22, 0.28, 0.05], rot: [0.1, 0, -0.45], scale: [0.13, 0.58] },
            { pos: [-0.30, 0.12, -0.05], rot: [-0.1, 0, 0.85], scale: [0.12, 0.52] },
            { pos: [0.30, 0.12, -0.05], rot: [-0.1, 0, -0.85], scale: [0.12, 0.52] },
            { pos: [-0.15, 0.22, -0.22], rot: [-0.4, -0.2, 0.3], scale: [0.12, 0.55] },
            { pos: [0.15, 0.22, -0.22], rot: [-0.4, 0.2, -0.3], scale: [0.12, 0.55] },
            { pos: [-0.10, 0.10, 0.24], rot: [0.6, 0.1, 0.2], scale: [0.08, 0.32] },
            { pos: [0.10, 0.10, 0.24], rot: [0.6, -0.1, -0.2], scale: [0.08, 0.32] }
        ];

        spikesData.forEach(sd => {
            const spike = new THREE.Mesh(new THREE.ConeGeometry(sd.scale[0], sd.scale[1], 6), hairGoldMat);
            spike.position.set(sd.pos[0], sd.pos[1], sd.pos[2]);
            spike.rotation.set(sd.rot[0], sd.rot[1], sd.rot[2]);
            spike.castShadow = true;
            hairGroup.add(spike);
        });
        goku.add(hairGroup);

        const auraMesh = new THREE.Mesh(
            new THREE.TorusGeometry(0.85, 0.08, 12, 32),
            new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.65 })
        );
        auraMesh.rotation.x = Math.PI / 2;
        auraMesh.position.y = 0.04;
        goku.add(auraMesh);

        goku.userData = { leftLegGroup, rightLegGroup, leftArmGroup, rightArmGroup, aura: auraMesh };
        return goku;
    }

    /* 🔵 14B. PROCEDURAL VEGETA MODEL */
    _createProceduralVegeta() {
        const vegeta = new THREE.Group();

        const skinMat = new THREE.MeshToonMaterial({ color: 0xffdbac });
        const darkBlueMat = new THREE.MeshToonMaterial({ color: 0x1d3557 });
        const armorWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf4f4f9, roughness: 0.25 });
        const armorGoldMat = new THREE.MeshStandardMaterial({ color: 0xffc300, roughness: 0.3 });
        const hairGoldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.3, metalness: 0.25 });
        const bootWhiteMat = new THREE.MeshToonMaterial({ color: 0xffffff });

        const leftLegGroup = new THREE.Group();
        leftLegGroup.position.set(-0.16, 0.66, 0);

        const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.10, 0.50, 8, 12), darkBlueMat);
        legL.position.set(0, -0.22, 0);
        legL.castShadow = true;
        leftLegGroup.add(legL);

        const bootL = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.32, 12), bootWhiteMat);
        bootL.position.set(0, -0.46, 0.04);
        bootL.castShadow = true;
        leftLegGroup.add(bootL);

        const bootTipL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.12), armorGoldMat);
        bootTipL.position.set(0, -0.58, 0.12);
        leftLegGroup.add(bootTipL);
        vegeta.add(leftLegGroup);

        const rightLegGroup = new THREE.Group();
        rightLegGroup.position.set(0.16, 0.66, 0);

        const legR = new THREE.Mesh(new THREE.CapsuleGeometry(0.10, 0.50, 8, 12), darkBlueMat);
        legR.position.set(0, -0.22, 0);
        legR.castShadow = true;
        rightLegGroup.add(legR);

        const bootR = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.32, 12), bootWhiteMat);
        bootR.position.set(0, -0.46, 0.04);
        bootR.castShadow = true;
        rightLegGroup.add(bootR);

        const bootTipR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.12), armorGoldMat);
        bootTipR.position.set(0, -0.58, 0.12);
        rightLegGroup.add(bootTipR);
        vegeta.add(rightLegGroup);

        const torsoBody = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.25, 0.70, 12), darkBlueMat);
        torsoBody.position.y = 1.05;
        vegeta.add(torsoBody);

        const chestArmor = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.48, 0.48), armorWhiteMat);
        chestArmor.position.set(0, 1.15, 0);
        chestArmor.castShadow = true;
        vegeta.add(chestArmor);

        const armorStripe = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.20, 0.50), armorGoldMat);
        armorStripe.position.set(0, 0.96, 0);
        vegeta.add(armorStripe);

        [-0.32, 0.32].forEach(x => {
            const shoulderPad = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.35), armorGoldMat);
            shoulderPad.position.set(x, 1.36, 0);
            vegeta.add(shoulderPad);
        });

        const leftArmGroup = new THREE.Group();
        leftArmGroup.position.set(-0.36, 1.35, 0);

        const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.42, 8, 12), darkBlueMat);
        armL.position.set(0, -0.20, 0);
        armL.castShadow = true;
        leftArmGroup.add(armL);

        const gloveL = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.20, 12), bootWhiteMat);
        gloveL.position.set(0, -0.42, 0);
        leftArmGroup.add(gloveL);
        vegeta.add(leftArmGroup);

        const rightArmGroup = new THREE.Group();
        rightArmGroup.position.set(0.36, 1.35, 0);

        const armR = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.42, 8, 12), darkBlueMat);
        armR.position.set(0, -0.20, 0);
        armR.castShadow = true;
        rightArmGroup.add(armR);

        const gloveR = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.20, 12), bootWhiteMat);
        gloveR.position.set(0, -0.42, 0);
        rightArmGroup.add(gloveR);
        vegeta.add(rightArmGroup);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 16, 16), skinMat);
        head.position.y = 1.55;
        head.castShadow = true;
        vegeta.add(head);

        const browMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const sternBrow = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.02), browMat);
        sternBrow.position.set(0, 1.61, 0.22);
        sternBrow.rotation.x = 0.2;
        vegeta.add(sternBrow);

        const hairGroup = new THREE.Group();
        hairGroup.position.set(0, 1.62, 0);

        const vegetaSpikes = [
            { pos: [0, 0.48, -0.02], rot: [0.05, 0, 0], scale: [0.18, 0.85] },
            { pos: [-0.14, 0.38, 0.02], rot: [0.05, 0, 0.22], scale: [0.15, 0.72] },
            { pos: [0.14, 0.38, 0.02], rot: [0.05, 0, -0.22], scale: [0.15, 0.72] },
            { pos: [-0.22, 0.25, -0.05], rot: [-0.1, 0, 0.45], scale: [0.13, 0.60] },
            { pos: [0.22, 0.25, -0.05], rot: [-0.1, 0, -0.45], scale: [0.13, 0.60] },
            { pos: [0, 0.30, -0.18], rot: [-0.3, 0, 0], scale: [0.14, 0.65] },
            { pos: [-0.10, 0.18, 0.20], rot: [0.4, 0.1, 0.15], scale: [0.07, 0.28] },
            { pos: [0.10, 0.18, 0.20], rot: [0.4, -0.1, -0.15], scale: [0.07, 0.28] }
        ];

        vegetaSpikes.forEach(sd => {
            const spike = new THREE.Mesh(new THREE.ConeGeometry(sd.scale[0], sd.scale[1], 6), hairGoldMat);
            spike.position.set(sd.pos[0], sd.pos[1], sd.pos[2]);
            spike.rotation.set(sd.rot[0], sd.rot[1], sd.rot[2]);
            spike.castShadow = true;
            hairGroup.add(spike);
        });
        vegeta.add(hairGroup);

        const auraMesh = new THREE.Mesh(
            new THREE.TorusGeometry(0.85, 0.08, 12, 32),
            new THREE.MeshBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0.65 })
        );
        auraMesh.rotation.x = Math.PI / 2;
        auraMesh.position.y = 0.04;
        vegeta.add(auraMesh);

        vegeta.userData = { leftLegGroup, rightLegGroup, leftArmGroup, rightArmGroup, aura: auraMesh };
        return vegeta;
    }

    /* 🟣 14C. PROCEDURAL VEGITO MODEL */
    _createProceduralVegito() {
        const vegito = new THREE.Group();

        const skinMat = new THREE.MeshToonMaterial({ color: 0xffdbac });
        const darkGiMat = new THREE.MeshToonMaterial({ color: 0x03045e });
        const orangeShirtMat = new THREE.MeshToonMaterial({ color: 0xff5400 });
        const hairGoldMat = new THREE.MeshStandardMaterial({ color: 0xffe600, roughness: 0.25, metalness: 0.3 });
        const whiteMat = new THREE.MeshToonMaterial({ color: 0xffffff });
        const potaraGoldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.2, metalness: 0.8 });

        const leftLegGroup = new THREE.Group();
        leftLegGroup.position.set(-0.18, 0.72, 0);

        const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.58, 8, 12), darkGiMat);
        legL.position.set(0, -0.26, 0);
        legL.castShadow = true;
        leftLegGroup.add(legL);

        const bootL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.35, 12), whiteMat);
        bootL.position.set(0, -0.52, 0.04);
        bootL.castShadow = true;
        leftLegGroup.add(bootL);
        vegito.add(leftLegGroup);

        const rightLegGroup = new THREE.Group();
        rightLegGroup.position.set(0.18, 0.72, 0);

        const legR = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.58, 8, 12), darkGiMat);
        legR.position.set(0, -0.26, 0);
        legR.castShadow = true;
        rightLegGroup.add(legR);

        const bootR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.35, 12), whiteMat);
        bootR.position.set(0, -0.52, 0.04);
        bootR.castShadow = true;
        rightLegGroup.add(bootR);
        vegito.add(rightLegGroup);

        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.27, 0.78, 12), darkGiMat);
        torso.position.y = 1.15;
        torso.castShadow = true;
        vegito.add(torso);

        const innerShirt = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.42, 4), orangeShirtMat);
        innerShirt.rotation.x = Math.PI;
        innerShirt.position.set(0, 1.33, 0.12);
        vegito.add(innerShirt);

        const waistSash = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.06, 8, 24), whiteMat);
        waistSash.rotation.x = Math.PI / 2;
        waistSash.position.y = 0.86;
        vegito.add(waistSash);

        const leftArmGroup = new THREE.Group();
        leftArmGroup.position.set(-0.38, 1.44, 0);

        const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.10, 0.46, 8, 12), skinMat);
        armL.position.set(0, -0.22, 0);
        armL.castShadow = true;
        leftArmGroup.add(armL);

        const gloveL = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.18, 12), whiteMat);
        gloveL.position.set(0, -0.45, 0);
        leftArmGroup.add(gloveL);
        vegito.add(leftArmGroup);

        const rightArmGroup = new THREE.Group();
        rightArmGroup.position.set(0.38, 1.44, 0);

        const armR = new THREE.Mesh(new THREE.CapsuleGeometry(0.10, 0.46, 8, 12), skinMat);
        armR.position.set(0, -0.22, 0);
        armR.castShadow = true;
        rightArmGroup.add(armR);

        const gloveR = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.18, 12), whiteMat);
        gloveR.position.set(0, -0.45, 0);
        rightArmGroup.add(gloveR);
        vegito.add(rightArmGroup);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), skinMat);
        head.position.y = 1.66;
        head.castShadow = true;
        vegito.add(head);

        [-0.26, 0.26].forEach(x => {
            const earRing = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), potaraGoldMat);
            earRing.position.set(x, 1.62, 0.02);
            vegito.add(earRing);
        });

        const browMat = new THREE.MeshBasicMaterial({ color: 0x090d16 });
        const browL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.035, 0.02), browMat);
        browL.position.set(-0.09, 1.72, 0.24);
        browL.rotation.z = -0.18;
        vegito.add(browL);

        const browR = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.035, 0.02), browMat);
        browR.position.set(0.09, 1.72, 0.24);
        browR.rotation.z = 0.18;
        vegito.add(browR);

        const hairGroup = new THREE.Group();
        hairGroup.position.set(0, 1.68, 0);

        const vegitoSpikes = [
            { pos: [0, 0.42, -0.05], rot: [0.15, 0, 0], scale: [0.16, 0.75] },
            { pos: [-0.20, 0.32, 0.02], rot: [0.1, 0, 0.38], scale: [0.14, 0.65] },
            { pos: [0.20, 0.32, 0.02], rot: [0.1, 0, -0.38], scale: [0.14, 0.65] },
            { pos: [-0.28, 0.18, -0.08], rot: [-0.1, 0, 0.70], scale: [0.13, 0.58] },
            { pos: [0.28, 0.18, -0.08], rot: [-0.1, 0, -0.70], scale: [0.13, 0.58] },
            { pos: [0, 0.26, -0.22], rot: [-0.4, 0, 0], scale: [0.14, 0.62] },
            { pos: [-0.09, 0.04, 0.26], rot: [0.85, 0.1, 0.25], scale: [0.085, 0.45] },
            { pos: [0.09, 0.04, 0.26], rot: [0.85, -0.1, -0.25], scale: [0.085, 0.45] }
        ];

        vegitoSpikes.forEach(sd => {
            const spike = new THREE.Mesh(new THREE.ConeGeometry(sd.scale[0], sd.scale[1], 6), hairGoldMat);
            spike.position.set(sd.pos[0], sd.pos[1], sd.pos[2]);
            spike.rotation.set(sd.rot[0], sd.rot[1], sd.rot[2]);
            spike.castShadow = true;
            hairGroup.add(spike);
        });
        vegito.add(hairGroup);

        const auraMesh = new THREE.Mesh(
            new THREE.TorusGeometry(0.90, 0.09, 12, 32),
            new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.65 })
        );
        auraMesh.rotation.x = Math.PI / 2;
        auraMesh.position.y = 0.04;
        vegito.add(auraMesh);

        vegito.userData = { leftLegGroup, rightLegGroup, leftArmGroup, rightArmGroup, aura: auraMesh };
        return vegito;
    }

    /* 🟣 14D. PROCEDURAL TRUNKS MODEL */
    _createProceduralTrunks() {
        const trunks = new THREE.Group();

        const skinMat = new THREE.MeshToonMaterial({ color: 0xffdbac });
        const denimMat = new THREE.MeshToonMaterial({ color: 0x1e3a8a });
        const pantsMat = new THREE.MeshToonMaterial({ color: 0x0f172a });
        const hairLavenderMat = new THREE.MeshStandardMaterial({ color: 0xa5b4fc, roughness: 0.3 });
        const swordMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });

        const leftLegGroup = new THREE.Group();
        leftLegGroup.position.set(-0.16, 0.68, 0);

        const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.52, 8, 12), pantsMat);
        legL.position.set(0, -0.22, 0);
        leftLegGroup.add(legL);

        const bootL = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.32, 12), new THREE.MeshToonMaterial({ color: 0x78350f }));
        bootL.position.set(0, -0.46, 0.04);
        leftLegGroup.add(bootL);
        trunks.add(leftLegGroup);

        const rightLegGroup = new THREE.Group();
        rightLegGroup.position.set(0.16, 0.68, 0);

        const legR = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.52, 8, 12), pantsMat);
        legR.position.set(0, -0.22, 0);
        rightLegGroup.add(legR);

        const bootR = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.32, 12), new THREE.MeshToonMaterial({ color: 0x78350f }));
        bootR.position.set(0, -0.46, 0.04);
        rightLegGroup.add(bootR);
        trunks.add(rightLegGroup);

        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.25, 0.72, 12), denimMat);
        torso.position.y = 1.10;
        trunks.add(torso);

        const sheath = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8), new THREE.MeshToonMaterial({ color: 0x991b1b }));
        sheath.rotation.z = Math.PI / 4;
        sheath.position.set(0, 1.15, -0.22);
        trunks.add(sheath);

        const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8), swordMat);
        hilt.rotation.z = Math.PI / 4;
        hilt.position.set(0.35, 1.50, -0.22);
        trunks.add(hilt);

        const leftArmGroup = new THREE.Group();
        leftArmGroup.position.set(-0.34, 1.38, 0);

        const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.44, 8, 12), skinMat);
        armL.position.set(0, -0.22, 0);
        leftArmGroup.add(armL);
        trunks.add(leftArmGroup);

        const rightArmGroup = new THREE.Group();
        rightArmGroup.position.set(0.34, 1.38, 0);

        const armR = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.44, 8, 12), skinMat);
        armR.position.set(0, -0.22, 0);
        rightArmGroup.add(armR);
        trunks.add(rightArmGroup);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), skinMat);
        head.position.y = 1.60;
        trunks.add(head);

        const hairGroup = new THREE.Group();
        hairGroup.position.set(0, 1.62, 0);
        [
            { pos: [0, 0.35, -0.02], rot: [0.1, 0, 0], scale: [0.16, 0.70] },
            { pos: [-0.18, 0.26, 0.05], rot: [0.1, 0, 0.35], scale: [0.13, 0.58] },
            { pos: [0.18, 0.26, 0.05], rot: [0.1, 0, -0.35], scale: [0.13, 0.58] },
            { pos: [-0.10, 0.08, 0.24], rot: [0.7, 0.1, 0.2], scale: [0.08, 0.38] },
            { pos: [0.10, 0.08, 0.24], rot: [0.7, -0.1, -0.2], scale: [0.08, 0.38] }
        ].forEach(sd => {
            const spike = new THREE.Mesh(new THREE.ConeGeometry(sd.scale[0], sd.scale[1], 6), hairLavenderMat);
            spike.position.set(sd.pos[0], sd.pos[1], sd.pos[2]);
            spike.rotation.set(sd.rot[0], sd.rot[1], sd.rot[2]);
            hairGroup.add(spike);
        });
        trunks.add(hairGroup);

        trunks.userData = { leftLegGroup, rightLegGroup, leftArmGroup, rightArmGroup };
        return trunks;
    }

    /* 🔴 14E. PROCEDURAL GOHAN MODEL */
    _createProceduralGohan() {
        const gohan = new THREE.Group();

        const skinMat = new THREE.MeshToonMaterial({ color: 0xffdbac });
        const purpleGiMat = new THREE.MeshToonMaterial({ color: 0x6b21a8 });
        const redSashMat = new THREE.MeshToonMaterial({ color: 0xdc2626 });
        const hairGoldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.3 });

        const leftLegGroup = new THREE.Group();
        leftLegGroup.position.set(-0.16, 0.66, 0);

        const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.50, 8, 12), purpleGiMat);
        legL.position.set(0, -0.22, 0);
        leftLegGroup.add(legL);

        const bootL = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.32, 12), new THREE.MeshToonMaterial({ color: 0x1e293b }));
        bootL.position.set(0, -0.45, 0.04);
        leftLegGroup.add(bootL);
        gohan.add(leftLegGroup);

        const rightLegGroup = new THREE.Group();
        rightLegGroup.position.set(0.16, 0.66, 0);

        const legR = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.50, 8, 12), purpleGiMat);
        legR.position.set(0, -0.22, 0);
        rightLegGroup.add(legR);

        const bootR = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.32, 12), new THREE.MeshToonMaterial({ color: 0x1e293b }));
        bootR.position.set(0, -0.45, 0.04);
        rightLegGroup.add(bootR);
        gohan.add(rightLegGroup);

        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.25, 0.72, 12), purpleGiMat);
        torso.position.y = 1.10;
        gohan.add(torso);

        const waistSash = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.06, 8, 24), redSashMat);
        waistSash.rotation.x = Math.PI / 2;
        waistSash.position.y = 0.82;
        gohan.add(waistSash);

        const leftArmGroup = new THREE.Group();
        leftArmGroup.position.set(-0.34, 1.36, 0);

        const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.44, 8, 12), skinMat);
        armL.position.set(0, -0.20, 0);
        leftArmGroup.add(armL);

        const wristbandL = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.14, 12), redSashMat);
        wristbandL.position.set(0, -0.42, 0);
        leftArmGroup.add(wristbandL);
        gohan.add(leftArmGroup);

        const rightArmGroup = new THREE.Group();
        rightArmGroup.position.set(0.34, 1.36, 0);

        const armR = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.44, 8, 12), skinMat);
        armR.position.set(0, -0.20, 0);
        rightArmGroup.add(armR);

        const wristbandR = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.14, 12), redSashMat);
        wristbandR.position.set(0, -0.42, 0);
        rightArmGroup.add(wristbandR);
        gohan.add(rightArmGroup);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), skinMat);
        head.position.y = 1.60;
        gohan.add(head);

        const hairGroup = new THREE.Group();
        hairGroup.position.set(0, 1.62, 0);
        [
            { pos: [0, 0.42, -0.02], rot: [0.1, 0, 0], scale: [0.16, 0.75] },
            { pos: [-0.16, 0.32, 0.02], rot: [0.1, 0, 0.30], scale: [0.13, 0.62] },
            { pos: [0.16, 0.32, 0.02], rot: [0.1, 0, -0.30], scale: [0.13, 0.62] },
            { pos: [0, 0.06, 0.26], rot: [0.9, 0, 0], scale: [0.08, 0.42] }
        ].forEach(sd => {
            const spike = new THREE.Mesh(new THREE.ConeGeometry(sd.scale[0], sd.scale[1], 6), hairGoldMat);
            spike.position.set(sd.pos[0], sd.pos[1], sd.pos[2]);
            spike.rotation.set(sd.rot[0], sd.rot[1], sd.rot[2]);
            hairGroup.add(spike);
        });
        gohan.add(hairGroup);

        gohan.userData = { leftLegGroup, rightLegGroup, leftArmGroup, rightArmGroup };
        return gohan;
    }

    /* 🏎️ 15. BỤC SIÊU XE 3D VÀ HỆ THỐNG XE CÓ THỂ LÁI TỰ DO (DRIVEABLE SUPERCARS) */
    _createProceduralSupercar(carId, accentColorHex) {
        const carGroup = new THREE.Group();

        const bodyMat = new THREE.MeshStandardMaterial({
            color: accentColorHex,
            roughness: 0.2,
            metalness: 0.8
        });

        const darkMetalMat = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.3,
            metalness: 0.85
        });

        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x8AD2F1,
            roughness: 0.1,
            metalness: 0.9,
            transparent: true,
            opacity: 0.85
        });

        const neonMat = new THREE.MeshBasicMaterial({ color: accentColorHex });

        if (carId === 'flying_car') {
            const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.42, 3.4), bodyMat);
            body.position.y = 0.5;
            body.castShadow = true;
            carGroup.add(body);

            const nose = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.0, 4), bodyMat);
            nose.rotation.x = Math.PI / 2;
            nose.rotation.y = Math.PI / 4;
            nose.position.set(0, 0.5, 2.0);
            carGroup.add(nose);

            const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.45, 1.6), glassMat);
            cabin.position.set(0, 0.8, -0.1);
            carGroup.add(cabin);

            const thrusterPositions = [
                [-0.9, 0.25, 1.1], [0.9, 0.25, 1.1],
                [-0.9, 0.25, -1.1], [0.9, 0.25, -1.1]
            ];
            thrusterPositions.forEach(pos => {
                const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.25, 16), darkMetalMat);
                pad.position.set(pos[0], pos[1], pos[2]);
                carGroup.add(pad);

                const glowRing = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.05, 8, 24), neonMat);
                glowRing.rotation.x = Math.PI / 2;
                glowRing.position.set(pos[0], pos[1] - 0.1, pos[2]);
                carGroup.add(glowRing);
            });

            const finL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.65, 0.9), bodyMat);
            finL.position.set(-0.75, 0.85, -1.4);
            carGroup.add(finL);

            const finR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.65, 0.9), bodyMat);
            finR.position.set(0.75, 0.85, -1.4);
            carGroup.add(finR);

        } else if (carId === 'lamborghini') {
            const bodyLower = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.32, 3.5), bodyMat);
            bodyLower.position.y = 0.32;
            bodyLower.castShadow = true;
            carGroup.add(bodyLower);

            const hood = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.45, 4), bodyMat);
            hood.rotation.y = Math.PI / 4;
            hood.scale.set(1.15, 0.9, 2.3);
            hood.position.set(0, 0.58, -0.2);
            hood.castShadow = true;
            carGroup.add(hood);

            const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.38, 1.2), glassMat);
            windshield.position.set(0, 0.62, 0.15);
            carGroup.add(windshield);

            const wingPlank = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.07, 0.4), darkMetalMat);
            wingPlank.position.set(0, 0.85, -1.55);
            carGroup.add(wingPlank);

            this._addCarWheels(carGroup, darkMetalMat, accentColorHex);

        } else if (carId === 'cyberpsycho') {
            const body = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.6, 3.2), bodyMat);
            body.position.y = 0.52;
            body.castShadow = true;
            carGroup.add(body);

            const cabinRoof = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.55, 1.5), darkMetalMat);
            cabinRoof.position.set(0, 0.98, -0.1);
            carGroup.add(cabinRoof);

            const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.3, 0.35), darkMetalMat);
            bumper.position.set(0, 0.35, 1.6);
            carGroup.add(bumper);

            this._addCarWheels(carGroup, darkMetalMat, accentColorHex, 0.46);

        } else {
            const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.38, 3.4), bodyMat);
            body.position.y = 0.38;
            body.castShadow = true;
            carGroup.add(body);

            const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.42, 1.6), glassMat);
            cabin.position.set(0, 0.68, 0.0);
            carGroup.add(cabin);

            const stripL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 3.3), neonMat);
            stripL.position.set(-0.81, 0.42, 0);
            carGroup.add(stripL);

            const stripR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 3.3), neonMat);
            stripR.position.set(0.81, 0.42, 0);
            carGroup.add(stripR);

            this._addCarWheels(carGroup, darkMetalMat, accentColorHex);
        }

        const lightGeo = new THREE.BoxGeometry(0.38, 0.12, 0.1);
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        const lightL = new THREE.Mesh(lightGeo, lightMat);
        lightL.position.set(-0.55, 0.45, 1.65);
        carGroup.add(lightL);

        const lightR = new THREE.Mesh(lightGeo, lightMat);
        lightR.position.set(0.55, 0.45, 1.65);
        carGroup.add(lightR);

        const tailLight = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.1, 0.08), new THREE.MeshBasicMaterial({ color: 0xff0044 }));
        tailLight.position.set(0, 0.5, -1.65);
        carGroup.add(tailLight);

        return carGroup;
    }

    _addCarWheels(parentGroup, darkMat, accentHex, wheelRadius = 0.38) {
        const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.3, 16);
        wheelGeo.rotateZ(Math.PI / 2);

        const hubMat = new THREE.MeshBasicMaterial({ color: accentHex });
        const wheelPositions = [
            [-0.88, wheelRadius, 1.05], [0.88, wheelRadius, 1.05],
            [-0.88, wheelRadius, -1.05], [0.88, wheelRadius, -1.05]
        ];

        const wheelsList = [];
        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeo, darkMat);
            wheel.position.set(pos[0], pos[1], pos[2]);
            wheel.castShadow = true;
            parentGroup.add(wheel);

            const hub = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius * 0.52, wheelRadius * 0.52, 0.32, 12), hubMat);
            hub.rotateZ(Math.PI / 2);
            hub.position.set(pos[0], pos[1], pos[2]);
            parentGroup.add(hub);

            wheelsList.push(wheel, hub);
        });

        parentGroup.userData.wheels = wheelsList;
    }

    _initCarShowcases() {
        this.carPlatforms = [];
        this.driveableVehicles = [];
        const carList = Object.values(CAR_MODELS);
        const podiumColors = [0x3A86FF, 0xFF006E, 0xFFBE0B, 0x8338EC];
        const defaultPositionsX = [-9, -3, 3, 9];

        carList.forEach((car, index) => {
            const posX = car.position?.x ?? defaultPositionsX[index % defaultPositionsX.length];
            const posZ = car.position?.z ?? -2;

            const platformGroup = new THREE.Group();
            platformGroup.position.set(posX, 0, posZ);

            const platformGeo = new THREE.CylinderGeometry(2.3, 2.6, 0.3, 32);
            const platformMat = new THREE.MeshStandardMaterial({
                color: podiumColors[index % podiumColors.length],
                roughness: 0.85,
                metalness: 0.05
            });
            const platformMesh = new THREE.Mesh(platformGeo, platformMat);
            platformMesh.position.y = 0.15;
            platformMesh.receiveShadow = true;
            platformMesh.castShadow = true;
            platformGroup.add(platformMesh);

            const ringGeo = new THREE.TorusGeometry(2.45, 0.05, 16, 32);
            const ringMat = new THREE.MeshBasicMaterial({ color: podiumColors[index % podiumColors.length] });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2;
            ring.position.y = 0.31;
            platformGroup.add(ring);

            this.scene.add(platformGroup);

            // Mesh Siêu Xe Độc Lập Đặt Trên Bục (Có Thể Di Chuyển Lái Đi Khắp Map)
            const carMeshGroup = this._createProceduralSupercar(car.id, podiumColors[index % podiumColors.length]);
            carMeshGroup.position.set(posX, 0.30, posZ);
            this.scene.add(carMeshGroup);

            this.carPlatforms.push({
                podiumGroup: platformGroup,
                carMesh: carMeshGroup,
                basePos: new THREE.Vector3(posX, 0.30, posZ)
            });

            this.driveableVehicles.push({
                id: car.id,
                name: car.name,
                mesh: carMeshGroup,
                wheels: carMeshGroup.userData.wheels || [],
                speed: 0,
                maxSpeed: 22.0,
                acceleration: 18.0,
                steeringSpeed: 2.2,
                isBeingDriven: false,
                basePos: new THREE.Vector3(posX, 0.30, posZ)
            });
        });
    }

    /* ☁️ 15B. KHỞI TẠO CÂN ĐẨU VÂN 3D DRAGON BALL (KINTO-UN GOLDEN NIMBUS) CHUẨN 100% ẢNH MẪU */
    _initNimbusCloud() {
        const nimbusGroup = new THREE.Group();
        nimbusGroup.position.set(18.0, 0.8, 0.0); // Vị trí chính giữa thảm cỏ xanh trong ảnh người dùng chụp

        // 🎨 Màu Vàng Chanh Pastel Ấm Củng Chuẩn 100% Ảnh Mẫu Dragon Ball (Claymation Effect)
        const nimbusPastelMat = new THREE.MeshStandardMaterial({
            color: 0xFCE855,
            emissive: 0xE5C820,
            emissiveIntensity: 0.18,
            roughness: 0.85,
            metalness: 0.05
        });

        const nimbusDeepMat = new THREE.MeshStandardMaterial({
            color: 0xF5DC3B,
            emissive: 0xD9BA15,
            emissiveIntensity: 0.15,
            roughness: 0.88,
            metalness: 0.05
        });

        // 1. THÂN ĐỆM MÂY CHÍNH HƯỚNG DỌC ĐẦU MÂY +Z, ĐUÔI MÂY -Z (Main Cloud Cushion Base aligned with Z-axis)
        const coreGeo = new THREE.SphereGeometry(1.05, 16, 16);
        coreGeo.scale(1.1, 0.75, 1.8); // Dọc theo trục Z: Chiều dài 3.8m, chiều ngang 2.3m, cao 1.6m

        const mainCore = new THREE.Mesh(coreGeo, nimbusPastelMat);
        mainCore.position.y = 0.45;
        mainCore.castShadow = true;
        nimbusGroup.add(mainCore);

        // 2. 15 BÚP MÂY BỒNG BỀNH THÂN MÂY (Dense Fluffy Cloud Swell Bulges)
        const puffSpecs = [
            // Đầu Mây Tròn Phía Trước (+Z)
            { x: -0.45, y: 0.48, z: 1.45, s: 0.58 },
            { x: 0.45, y: 0.48, z: 1.45, s: 0.58 },
            { x: 0.0, y: 0.52, z: 1.60, s: 0.65 },
            // Hông Phải (+X)
            { x: 0.88, y: 0.45, z: 0.9, s: 0.62 },
            { x: 0.95, y: 0.45, z: 0.0, s: 0.68 },
            { x: 0.88, y: 0.45, z: -0.9, s: 0.62 },
            // Hông Trái (-X)
            { x: -0.88, y: 0.45, z: 0.9, s: 0.62 },
            { x: -0.95, y: 0.45, z: 0.0, s: 0.68 },
            { x: -0.88, y: 0.45, z: -0.9, s: 0.62 },
            // Đỉnh Trên (+Y - Nơi Gohan / Goku đứng đệm mây phẳng êm ái)
            { x: -0.3, y: 0.50, z: 0.4, s: 0.45 },
            { x: 0.3, y: 0.50, z: 0.4, s: 0.45 },
            { x: -0.3, y: 0.50, z: -0.4, s: 0.45 },
            { x: 0.3, y: 0.50, z: -0.4, s: 0.45 },
            // Đáy Dưới (-Y)
            { x: 0.0, y: 0.22, z: 0.7, s: 0.55 },
            { x: 0.0, y: 0.22, z: -0.7, s: 0.55 }
        ];

        puffSpecs.forEach((p, idx) => {
            const mat = idx % 2 === 0 ? nimbusPastelMat : nimbusDeepMat;
            const puff = new THREE.Mesh(new THREE.SphereGeometry(p.s, 16, 16), mat);
            puff.position.set(p.x, p.y, p.z);
            puff.castShadow = true;
            nimbusGroup.add(puff);
        });

        // 3. 🌀 ĐUÔI CÂN ĐẨU VÂN XOẮN CONG VÚT ĐẶC TRƯNG Ở PHÍA SAU (-Z)
        const tailGroup = new THREE.Group();
        tailGroup.position.set(0.0, 0.42, -1.6); // Đặt chính xác đằng sau (-Z)

        const tailSegments = [
            { x: 0.0, y: 0.05, z: 0.0, r: 0.52 },
            { x: 0.05, y: 0.12, z: -0.35, r: 0.42 },
            { x: 0.10, y: 0.24, z: -0.68, r: 0.32 },
            { x: 0.12, y: 0.42, z: -0.96, r: 0.22 },
            { x: 0.14, y: 0.64, z: -1.18, r: 0.14 }
        ];

        tailSegments.forEach(ts => {
            const seg = new THREE.Mesh(new THREE.SphereGeometry(ts.r, 14, 14), nimbusPastelMat);
            seg.position.set(ts.x, ts.y, ts.z);
            seg.castShadow = true;
            tailGroup.add(seg);
        });

        // Chóp đuôi nón nhọn cong vút lên cao (Curved Tail Tip Cone)
        const tailTip = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.65, 12), nimbusPastelMat);
        tailTip.position.set(0.15, 0.88, -1.32);
        tailTip.rotation.x = -Math.PI * 0.38; // Nghiêng uốn cong vút mềm mại về phía sau -Z
        tailTip.castShadow = true;
        tailGroup.add(tailTip);

        nimbusGroup.add(tailGroup);

        // 4. 💫 HOA VĂN XOẮN NỔI 3D TRÊN 2 HÔNG THÂN MÂY (3D Cloud Swirl Reliefs on Left & Right Flanks)
        const swirlMat = new THREE.MeshStandardMaterial({ color: 0xF7DC33, roughness: 0.8 });
        [-0.95, 0.95].forEach(sx => {
            const swirl = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.08, 10, 24, Math.PI * 1.5), swirlMat);
            swirl.position.set(sx, 0.55, 0.2);
            swirl.rotation.y = sx < 0 ? -Math.PI / 2 : Math.PI / 2;
            nimbusGroup.add(swirl);
        });

        // 5. ĐÈN TỎA SÁNG ẤM VÀNG KIM DƯỚI THÂN MÂY
        const nimbusLight = new THREE.PointLight(0xfce855, 2.2, 8.0);
        nimbusLight.position.y = 0.2;
        nimbusGroup.add(nimbusLight);

        this.nimbusCloud = nimbusGroup;
        this.scene.add(nimbusGroup);
    }

    _updateNimbusPrompts() {
        let nimbusPrompt = document.getElementById('enter-nimbus-prompt');
        if (!nimbusPrompt) {
            nimbusPrompt = document.createElement('div');
            nimbusPrompt.id = 'enter-nimbus-prompt';
            nimbusPrompt.style.cssText = `
                position: fixed;
                top: 75%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(15, 23, 42, 0.92);
                backdrop-filter: blur(8px);
                border: 1.5px solid rgba(255, 215, 0, 0.9);
                border-radius: 20px;
                padding: 10px 22px;
                color: #ffd700;
                font-family: 'Outfit', sans-serif;
                font-size: 15px;
                font-weight: 700;
                z-index: 1000;
                pointer-events: auto !important;
                display: none;
                box-shadow: 0 4px 20px rgba(255, 215, 0, 0.45);
            `;
            document.body.appendChild(nimbusPrompt);
        }

        if (this.isActive && !this.isDrivingVehicle && !this.isRidingNimbus && this.nimbusCloud) {
            const distToNimbus = this.playerPos.distanceTo(this.nimbusCloud.position);
            if (distToNimbus < 3.8) {
                nimbusPrompt.innerHTML = `☁️ Bấm <span style="background: #ffd700; color: #000; padding: 2px 8px; border-radius: 6px; margin: 0 4px;">[F]</span> để Cưỡi Cân Đẩu Vân Bay Lượn`;
                nimbusPrompt.style.display = 'block';
            } else {
                nimbusPrompt.style.display = 'none';
            }
        } else {
            nimbusPrompt.style.display = 'none';
        }
    }

    _toggleNimbusMount() {
        if (!this.nimbusCloud) return;

        if (!this.isRidingNimbus) {
            const distToNimbus = this.playerPos.distanceTo(this.nimbusCloud.position);
            if (distToNimbus < 3.8) {
                this.isRidingNimbus = true;
                this.isNimbusLanding = false;
                this.isGrounded = false;

                // Player đứng trên lưng Cân Đẩu Vân (Hiển thị 100% Đôi Chân, Đôi Giày, Vòng Cyan Cổ Chân & Vòng Cyan Hào Quang Vòng Eo)
                this.playerMesh.visible = true;
                this.nimbusFlightHeight = Math.max(0.8, this.nimbusCloud.position.y);
                this.playerPos.set(this.nimbusCloud.position.x, this.nimbusCloud.position.y + 1.18, this.nimbusCloud.position.z);
                this.playerMesh.position.copy(this.playerPos);
                this.playerMesh.rotation.y = this.nimbusCloud.rotation.y;

                // Xoay Camera nằm chính diện đằng sau đuôi nhìn về đầu Cân Đẩu Vân
                this.cameraYaw = this.nimbusCloud.rotation.y + Math.PI;
                this._showNimbusHUD(true);
                this._showToastNotification(`Nhấn[E] bay lên ⬆️, Nhấn [C] bay xuống ⬇️.`);
            }
        } else {
            // Nếu bấm F khi đang bay trên cao -> Cân Đẩu Vân & Player rơi từ từ từ trên không trung xuống
            const targetGroundY = this._calculateGroundY(this.nimbusCloud.position.x, this.nimbusCloud.position.z) + 0.8;
            if (this.nimbusCloud.position.y > targetGroundY + 0.6) {
                this.isNimbusLanding = true;
                this._showToastNotification(`☁️ Cân Đẩu Vân & Nhân vật đang hạ cánh từ từ xuống mặt đất...`);
            } else {
                // Xuống mây Cân Đẩu Vân ngay khi đã tiếp đất
                this.isRidingNimbus = false;
                this.isNimbusLanding = false;
                this.playerPos.set(this.nimbusCloud.position.x + 1.3, targetGroundY - 0.8, this.nimbusCloud.position.z);
                this.playerMesh.position.copy(this.playerPos);
                this.playerMesh.visible = true;
                this._showNimbusHUD(false);
                this._showToastNotification(`☁️ Đã xuống mây Cân Đẩu Vân an toàn.`);
            }
        }
    }

    _showNimbusHUD(show) {
        let hud = document.getElementById('nimbus-hud-prompt');
        if (!hud) {
            hud = document.createElement('div');
            hud.id = 'nimbus-hud-prompt';
            hud.className = 'dbz-hud-container';
            document.body.appendChild(hud);
        }

        if (show) {
            hud.innerHTML = `
                <div class="dbz-hud-row">
                    <span class="dbz-key-badge">E</span>
                    <span class="dbz-action-text">Bay Lên</span>
                </div>
                <div class="dbz-hud-row">
                    <span class="dbz-key-badge">C</span>
                    <span class="dbz-action-text">Bay Xuống</span>
                </div>
                <div class="dbz-hud-row">
                    <span class="dbz-key-badge">F</span>
                    <span class="dbz-action-text">Xuống Mây</span>
                </div>
            `;
            hud.style.display = 'flex';
        } else {
            hud.style.display = 'none';
        }
    }

    /* 👑 16. KHỞI TẠO BỘ SƯU TẬP 3 NHÂN VẬT ANIME PLAYER 3D (CYBER HEROINE, BABY GOKU, SHADOW NINJA) */
    _initPlayer() {
        this.selectedCharacterSkin = this.selectedCharacterSkin || 'cyber_heroine';
        this._switchPlayerSkin(this.selectedCharacterSkin);
    }

    _loadBabyGokuModel() {
        const md2Char = new MD2Character();
        md2Char.scale = 0.06;

        const config = {
            baseUrl: '/models/md2/ratamahatta/',
            body: 'ratamahatta.md2',
            skins: ['ratamahatta.png'],
            weapons: []
        };

        md2Char.onLoadComplete = () => {
            md2Char.root.position.y = 1.4;
            this.babyGokuMd2Root = md2Char.root;
            this.md2CharacterInstance = md2Char;
        };

        md2Char.loadParts(config);
    }

    createPlayerMesh(skinId) {
        const skin = skinId || this.selectedCharacterSkin || 'cyber_heroine';
        if (skin === 'baby_goku') {
            return this._createBabyGokuMesh();
        } else if (skin === 'cyber_ninja') {
            return this._createShadowNinjaMesh();
        }
        return this._createCyberHeroineMesh();
    }

    _switchPlayerSkin(skinId) {
        if (!['cyber_heroine', 'baby_goku', 'cyber_ninja'].includes(skinId)) return;

        const currentPos = this.playerMesh ? this.playerMesh.position.clone() : this.playerPos.clone();
        const currentRotY = this.playerMesh ? this.playerMesh.rotation.y : 0;

        if (this.playerMesh) {
            this.scene.remove(this.playerMesh);
        }

        const newMesh = this.createPlayerMesh(skinId);

        this.selectedCharacterSkin = skinId;
        this.playerMesh = newMesh;
        this.playerMesh.position.copy(currentPos);
        this.playerMesh.rotation.y = currentRotY;

        // Unpack animation groups & AnimationMixer controller
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

    /* 👑 SKIN 1: CYBER HEROINE (NÓN LÁ & ÁO CHOÀNG TRẮNG HÀO QUANG CYAN) */
    _createCyberHeroineMesh() {
        const playerGroup = new THREE.Group();

        const shoesMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
        const legsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
        const cyanNeonMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff });
        const whiteCloakMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7, metalness: 0.1 });

        const leftLegGroup = new THREE.Group();
        const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.14, 0.34), shoesMat);
        shoeL.position.set(-0.16, 0.07, 0.02);
        shoeL.castShadow = true;
        leftLegGroup.add(shoeL);
        const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.44, 10), legsMat);
        legL.position.set(-0.16, 0.28, 0);
        legL.castShadow = true;
        leftLegGroup.add(legL);
        const ankleRingL = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 8, 16), cyanNeonMat);
        ankleRingL.rotation.x = Math.PI / 2;
        ankleRingL.position.set(-0.16, 0.14, 0);
        leftLegGroup.add(ankleRingL);
        playerGroup.add(leftLegGroup);

        const rightLegGroup = new THREE.Group();
        const shoeR = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.14, 0.34), shoesMat);
        shoeR.position.set(0.16, 0.07, 0.02);
        shoeR.castShadow = true;
        rightLegGroup.add(shoeR);
        const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.44, 10), legsMat);
        legR.position.set(0.16, 0.28, 0);
        legR.castShadow = true;
        rightLegGroup.add(legR);
        const ankleRingR = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 8, 16), cyanNeonMat);
        ankleRingR.rotation.x = Math.PI / 2;
        ankleRingR.position.set(0.16, 0.14, 0);
        rightLegGroup.add(ankleRingR);
        playerGroup.add(rightLegGroup);

        const leftArmGroup = new THREE.Group();
        leftArmGroup.position.set(-0.36, 0.92, 0);
        const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.48, 8, 12), whiteCloakMat);
        armL.position.set(0, -0.24, 0);
        armL.castShadow = true;
        leftArmGroup.add(armL);
        const wristbandL = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.16, 12), cyanNeonMat);
        wristbandL.position.set(0, -0.46, 0);
        leftArmGroup.add(wristbandL);
        playerGroup.add(leftArmGroup);

        const rightArmGroup = new THREE.Group();
        rightArmGroup.position.set(0.36, 0.92, 0);
        const armR = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.48, 8, 12), whiteCloakMat);
        armR.position.set(0, -0.24, 0);
        rightArmGroup.add(armR);
        const wristbandR = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.16, 12), cyanNeonMat);
        wristbandR.position.set(0, -0.46, 0);
        rightArmGroup.add(wristbandR);
        playerGroup.add(rightArmGroup);

        const waistAuraRing = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.04, 12, 32), cyanNeonMat);
        waistAuraRing.rotation.x = Math.PI / 2.3;
        waistAuraRing.position.set(0, 0.75, 0);
        playerGroup.add(waistAuraRing);

        const robeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.46, 0.75, 12), whiteCloakMat);
        robeBody.position.y = 0.85;
        robeBody.castShadow = true;
        playerGroup.add(robeBody);

        const cloakTail = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.70, 0.08), whiteCloakMat);
        cloakTail.position.set(0, 0.65, -0.22);
        cloakTail.rotation.x = 0.15;
        cloakTail.castShadow = true;
        playerGroup.add(cloakTail);

        const hoodMesh = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.55, 12), whiteCloakMat);
        hoodMesh.position.set(0, 1.42, -0.05);
        hoodMesh.rotation.x = -0.1;
        hoodMesh.castShadow = true;
        playerGroup.add(hoodMesh);

        const faceMask = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 16), new THREE.MeshBasicMaterial({ color: 0x090d16 }));
        faceMask.position.set(0, 1.30, 0.02);
        playerGroup.add(faceMask);

        const visorCyan = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.22, 3), cyanNeonMat);
        visorCyan.rotation.x = Math.PI / 2;
        visorCyan.position.set(0, 1.38, 0.24);
        playerGroup.add(visorCyan);

        const shadowCircle = new THREE.Mesh(
            new THREE.CircleGeometry(0.42, 32),
            new THREE.MeshBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.35 })
        );
        shadowCircle.rotation.x = -Math.PI / 2;
        shadowCircle.position.y = 0.01;
        playerGroup.add(shadowCircle);

        playerGroup.userData = { leftLegGroup, rightLegGroup, leftArmGroup, rightArmGroup, cloakTailMesh: cloakTail };
        return playerGroup;
    }

    /* 👑 SKIN 2: BABY GOKU 3D MODEL (MODEL BABY GOKU GLTF & PROCEDURAL ANIMATION CONTROLLER) */
    _createBabyGokuMesh() {
        // 🎯 ƯU TIÊN TRẢ VỀ MODEL MD2 RATAMAHATTA NẾU ĐÃ LOAD XONG
        if (this.babyGokuMd2Root) {
            return this.babyGokuMd2Root;
        }

        // Nếu file MD2 chưa tải xong, tạm thời trả về một Group rỗng để tránh lỗi màn hình trắng
        const tempGroup = new THREE.Group();
        return tempGroup;
    }

    /* 👑 SKIN 3: SHADOW NINJA CYBER (GIÁP ĐEN OBSIDIAN, VISOR ĐỎ & SONG KIẾM) */
    _createShadowNinjaMesh() {
        const ninja = new THREE.Group();
        const darkArmorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.8 });
        const redNeonMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
        const silverMetalMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.2, metalness: 0.9 });

        const leftLegGroup = new THREE.Group();
        leftLegGroup.position.set(-0.16, 0.66, 0);
        const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.10, 0.46, 8, 12), darkArmorMat);
        legL.position.set(0, -0.22, 0);
        leftLegGroup.add(legL);
        const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.32), darkArmorMat);
        bootL.position.set(0, -0.45, 0.03);
        leftLegGroup.add(bootL);
        const trimL = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 8, 16), redNeonMat);
        trimL.rotation.x = Math.PI / 2;
        trimL.position.set(0, -0.38, 0);
        leftLegGroup.add(trimL);
        ninja.add(leftLegGroup);

        const rightLegGroup = new THREE.Group();
        rightLegGroup.position.set(0.16, 0.66, 0);
        const legR = new THREE.Mesh(new THREE.CapsuleGeometry(0.10, 0.46, 8, 12), darkArmorMat);
        legR.position.set(0, -0.22, 0);
        rightLegGroup.add(legR);
        const bootR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.32), darkArmorMat);
        bootR.position.set(0, -0.45, 0.03);
        rightLegGroup.add(bootR);
        const trimR = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 8, 16), redNeonMat);
        trimR.rotation.x = Math.PI / 2;
        trimR.position.set(0, -0.38, 0);
        rightLegGroup.add(trimR);
        ninja.add(rightLegGroup);

        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.72, 12), darkArmorMat);
        torso.position.y = 1.10;
        ninja.add(torso);

        const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.38, 0.12), redNeonMat);
        chestPlate.position.set(0, 1.18, 0.16);
        ninja.add(chestPlate);

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

        [-0.15, 0.15].forEach((kx, idx) => {
            const katana = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 8), silverMetalMat);
            katana.position.set(kx, 1.25, -0.22);
            katana.rotation.z = idx === 0 ? Math.PI / 4 : -Math.PI / 4;
            ninja.add(katana);
        });

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

    /* 👗 MỞ GIAO DIỆN CHỌN VÀ THAY ĐỔI NHÂN VẬT 3D (CHARACTER WARDROBE MODAL) */
    _openCharacterSelectModal() {
        let modal = document.getElementById('character-select-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'character-select-modal';
            modal.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 92%;
                max-width: 800px;
                max-height: 88vh;
                background: rgba(15, 23, 42, 0.96);
                backdrop-filter: blur(18px);
                border: 2px solid rgba(0, 245, 255, 0.7);
                border-radius: 24px;
                padding: 24px;
                color: #ffffff;
                font-family: 'Outfit', 'Segoe UI', sans-serif;
                z-index: 2500;
                box-shadow: 0 20px 60px rgba(0, 245, 255, 0.45);
                pointer-events: auto !important;
                display: flex;
                flex-direction: column;
                overflow-y: auto;
            `;
            document.body.appendChild(modal);
        }

        this._renderCharacterSelectModalContent(modal);
        modal.style.display = 'flex';
    }

    _renderCharacterSelectModalContent(modal) {
        const skins = [
            {
                id: 'cyber_heroine',
                name: 'CYBER HEROINE',
                badge: '⚡ LEGENDARY',
                badgeBg: '#00f5ff',
                desc: 'Nữ chiến binh Nón Lá Cyber, Áo choàng trắng & Vòng hào quang Neon',
                avatar: '👑'
            },
            {
                id: 'baby_goku',
                name: 'BABY GOKU 3D',
                badge: '🔥 DRAGON BALL',
                badgeBg: '#ffd700',
                desc: 'Khỉ con Baby Goku 3D dễ thương, Tóc chóp Goku & Động tác võ thuật',
                avatar: '🐒'
            },
            {
                id: 'cyber_ninja',
                name: 'SHADOW NINJA CYBER',
                badge: '🥷 SHADOW NINJA',
                badgeBg: '#ff0055',
                desc: 'Ninja bóng đêm Giáp đen Obsidian, Visor đỏ & Song kiếm Katana',
                avatar: '🗡️'
            }
        ];

        const currentSkin = this.selectedCharacterSkin || 'cyber_heroine';

        let html = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid rgba(255, 255, 255, 0.15); padding-bottom: 14px; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">👗</span>
                    <div>
                        <h2 style="margin: 0; font-size: 22px; color: #00f5ff; font-weight: 800; letter-spacing: 0.5px;">BỘ SƯU TẬP & TỦ ĐỒ NHÂN VẬT</h2>
                        <div style="font-size: 13px; color: #94a3b8;">Chọn và thay đổi nhân vật 3D trực tiếp trong Showroom!</div>
                    </div>
                </div>
                <button id="btn-close-char-select" style="background: rgba(255, 255, 255, 0.1); border: none; color: #fff; width: 36px; height: 36px; border-radius: 50%; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center;">✕</button>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 18px; margin-bottom: 16px;">
        `;

        skins.forEach(s => {
            const isEquipped = s.id === currentSkin;
            html += `
                <div style="background: ${isEquipped ? 'rgba(0, 245, 255, 0.12)' : 'rgba(30, 41, 59, 0.7)'}; border: ${isEquipped ? '2px solid #00f5ff' : '1px solid rgba(255, 255, 255, 0.1)'}; border-radius: 18px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.3s ease;">
                    <div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <span style="font-size: 32px;">${s.avatar}</span>
                            <span style="background: ${s.badgeBg}; color: #000; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 6px; text-transform: uppercase;">${s.badge}</span>
                        </div>
                        <h3 style="margin: 0 0 6px 0; font-size: 17px; color: #ffffff; font-weight: 700;">${s.name}</h3>
                        <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.4;">${s.desc}</p>
                    </div>

                    <button class="btn-select-skin" data-id="${s.id}" data-name="${s.name}" style="margin-top: 16px; width: 100%; padding: 10px; border-radius: 12px; border: none; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 14px; cursor: pointer; transition: all 0.2s ease; ${isEquipped ? 'background: #00f5ff; color: #000;' : 'background: rgba(255, 255, 255, 0.15); color: #fff;'}">
                        ${isEquipped ? '✓ ĐANG SỬ DỤNG' : 'CHỌN NHÂN VẬT'}
                    </button>
                </div>
            `;
        });

        html += `</div>`;
        modal.innerHTML = html;

        document.getElementById('btn-close-char-select').onclick = () => { modal.style.display = 'none'; };

        modal.querySelectorAll('.btn-select-skin').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                const name = btn.getAttribute('data-name');
                this._switchPlayerSkin(id);
                this._showToastNotification(`✨ Đã chuyển sang nhân vật: ${name}!`);
                this._renderCharacterSelectModalContent(modal);
            };
        });
    }

    /* 🎮 17. ĐIỀU KHIỂN BÀN PHÍM & BẮT SỰ KIỆN LÁI XE [F] / [ENTER] */
    _setupControls() {
        window.addEventListener('keydown', (e) => {
            if (!this.isActive) return;
            const code = e.code;
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(code)) {
                e.preventDefault();
            }

            if (this.isRidingNimbus) {
                if (code === 'KeyF' || code === 'Enter') {
                    this._toggleNimbusMount();
                    return;
                }
            }

            if (code === 'KeyE' || code === 'KeyF' || code === 'KeyR' || code === 'Enter') {
                const doorPos = new THREE.Vector3(0, this._calculateGroundY(0, -14.1), -14.1);
                const counterPos = new THREE.Vector3(0, this._calculateGroundY(0, -7.0), -7.0);

                const distDoor = this.playerPos.distanceTo(doorPos);
                const distCounter = this.playerPos.distanceTo(counterPos);
                const distNimbus = this.nimbusCloud ? this.playerPos.distanceTo(this.nimbusCloud.position) : 999;

                const exhibitionDoorPos = new THREE.Vector3(37.0, this._calculateGroundY(37.0, 0), 0.0);
                const distExhibitionDoor = this.playerPos.distanceTo(exhibitionDoorPos);

                // 🏆 [F]: Mở / Đóng cửa nhà Triển Lãm Goku 3D
                if ((code === 'KeyF') && distExhibitionDoor < 4.5 && !this.isDrivingVehicle && !this.isRidingNimbus) {
                    this.isExhibitionDoorOpen = !this.isExhibitionDoorOpen;
                    return;
                }

                // 🚪 [R]: Mở / Đóng cửa nhà chính
                if (code === 'KeyR' && distDoor < 3.2 && !this.isDrivingVehicle && !this.isRidingNimbus) {
                    this.isHouseDoorOpen = !this.isHouseDoorOpen;
                    const statusText = this.isHouseDoorOpen ? '🚪 Đã mở cửa vào nhà!' : '🚪 Đã đóng cửa nhà!';
                    this._showToastNotification(statusText);
                    return;
                }

                // 👗 [E]: Mở Tủ Đồ Đổi Nhân Vật khi đứng gần cửa nhà (< 3.2m)
                if (code === 'KeyE' && distDoor < 3.2 && !this.isDrivingVehicle && !this.isRidingNimbus) {
                    this.isHouseDoorOpen = true;
                    this._openCharacterSelectModal();
                    return;
                }

                // 🛒 Mở Cyber Armory Modal khi đứng gần quầy bán hàng (< 4.2m) - Bấm phím [E]
                if (code === 'KeyE' && distCounter < 4.2 && !this.isDrivingVehicle && !this.isRidingNimbus) {
                    this._openCyberArmoryModal();
                    return;
                }

                // ☁️ Cưỡi Cân Đẩu Vân (BẮT BỘC CHỈ BẤM [F] HOẶC [ENTER], KHÔNG BAO GIỜ BẰNG [E])
                if ((code === 'KeyF' || code === 'Enter') && distNimbus < 3.8 && !this.isDrivingVehicle && !this.isRidingNimbus) {
                    this._toggleNimbusMount();
                    return;
                }

                // 🏎️ Lên / Xuống xe khi đứng gần siêu xe (Bấm phím [F] hoặc [Enter])
                if (code === 'KeyF' || code === 'Enter') {
                    this._toggleVehicleMount();
                }
            }

            this.activeKeys.add(code);
        });

        window.addEventListener('keyup', (e) => {
            if (!this.isActive) return;
            this.activeKeys.delete(e.code);
        });

        window.addEventListener('blur', () => this._resetKeys());
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) this._resetKeys();
        });
    }

    /* 🛒 17A. MỞ GIAO DIỆN SHOP TRANG BỊ & SKIN XE CYBER ARMORY */
    _openCyberArmoryModal() {
        let modal = document.getElementById('cyber-armory-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'cyber-armory-modal';
            modal.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 92%;
                max-width: 720px;
                max-height: 88vh;
                background: rgba(15, 23, 42, 0.96);
                backdrop-filter: blur(18px);
                border: 2px solid rgba(0, 245, 255, 0.65);
                border-radius: 24px;
                padding: 24px;
                color: #ffffff;
                font-family: 'Outfit', 'Segoe UI', sans-serif;
                z-index: 2000;
                box-shadow: 0 20px 60px rgba(0, 245, 255, 0.4);
                pointer-events: auto !important;
                display: flex;
                flex-direction: column;
                overflow-y: auto;
            `;
            document.body.appendChild(modal);
        }

        this.armoryCurrentTab = this.armoryCurrentTab || 'items';
        this._renderArmoryModalContent(modal);
        modal.style.display = 'flex';
    }

    _renderArmoryModalContent(modal) {
        const curMgr = this.game?.currencyManager;
        const curData = curMgr ? curMgr.getCurrencies() : { coins: 1500, gems: 250 };
        const shopMgr = this.game?.shopManager;

        const itemCatalog = [
            { id: 'shield_boost', name: '🛡️ Khiên Giáp Bảo Vệ', desc: 'Kháng 1 va chạm chướng ngại vật đầu tiên', price: 300, currency: 'coins', type: 'item' },
            { id: 'bread_heal', name: '🍞 Bánh Mì Hồi Huyết', desc: 'Hồi 100% Thể lực & Giảm 20% sát thương', price: 200, currency: 'coins', type: 'item' },
            { id: 'nitro_booster', name: '⚡ Bình Động Cơ Nitro', desc: 'Tăng 50% Tốc độ di chuyển xe trong 15s', price: 500, currency: 'coins', type: 'item' },
            { id: 'coin_magnet', name: '🧲 Nam Châm Hút Coin', desc: 'Tự động hút toàn bộ Vàng cách xa 8m', price: 400, currency: 'coins', type: 'item' }
        ];

        const carSkinCatalog = Object.values(CAR_MODELS).map(c => ({
            id: c.id,
            name: c.name,
            desc: c.desc,
            price: c.price,
            currency: 'gems',
            badge: c.badge,
            type: 'skin'
        }));

        modal.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid rgba(0, 245, 255, 0.3); padding-bottom: 14px; margin-bottom: 18px;">
                <div style="font-size: 22px; font-weight: 800; color: #00f5ff; letter-spacing: 1px; display: flex; align-items: center; gap: 8px;">
                    🛒 CYBER ARMORY & SKIN SHOP
                </div>
                <div style="display: flex; align-items: center; gap: 16px;">
                    <div style="display: flex; gap: 12px; font-size: 14px; font-weight: 700; background: rgba(0, 0, 0, 0.4); padding: 6px 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                        <span style="color: #ffd700;">🪙 ${curMgr ? curMgr.formatNumber(curData.coins) : curData.coins}</span>
                        <span style="color: #00f5ff;">💎 ${curMgr ? curMgr.formatNumber(curData.gems) : curData.gems}</span>
                    </div>
                    <button id="btn-close-armory" style="background: rgba(255, 0, 100, 0.2); border: 1px solid #ff0066; color: #ff3366; width: 34px; height: 34px; border-radius: 50%; font-size: 16px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center;">✕</button>
                </div>
            </div>

            <!-- TABS -->
            <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                <button id="tab-armory-items" style="flex: 1; padding: 10px; border-radius: 12px; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s ease; ${this.armoryCurrentTab === 'items' ? 'background: #00f5ff; color: #0f172a; border: none; box-shadow: 0 0 15px rgba(0, 245, 255, 0.5);' : 'background: rgba(30, 41, 59, 0.8); color: #94a3b8; border: 1px solid rgba(255,255,255,0.1);'}">
                    🎒 TRANG BỊ VẬT PHẨM (🪙 VÀNG)
                </button>
                <button id="tab-armory-skins" style="flex: 1; padding: 10px; border-radius: 12px; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s ease; ${this.armoryCurrentTab === 'skins' ? 'background: #00f5ff; color: #0f172a; border: none; box-shadow: 0 0 15px rgba(0, 245, 255, 0.5);' : 'background: rgba(30, 41, 59, 0.8); color: #94a3b8; border: 1px solid rgba(255,255,255,0.1);'}">
                    🏎️ SKIN XE & KIM CƯƠNG (💎 GEMS)
                </button>
            </div>

            <!-- CATALOG CONTENT -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
                ${(this.armoryCurrentTab === 'items' ? itemCatalog : carSkinCatalog).map(item => {
            const isOwned = shopMgr ? shopMgr.isOwned(item.id) : false;
            return `
                        <div style="background: rgba(30, 41, 59, 0.7); border: 1.5px solid ${item.currency === 'gems' ? 'rgba(0, 245, 255, 0.4)' : 'rgba(255, 215, 0, 0.4)'}; border-radius: 16px; padding: 16px; display: flex; flex-direction: column; justify-space-between; gap: 10px;">
                            <div>
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                    <div style="font-size: 16px; font-weight: 700; color: #ffffff;">${item.name}</div>
                                    ${item.badge ? `<span style="font-size: 11px; background: rgba(0, 245, 255, 0.2); color: #00f5ff; padding: 2px 8px; border-radius: 8px; border: 1px solid #00f5ff;">${item.badge}</span>` : ''}
                                </div>
                                <div style="font-size: 13px; color: #94a3b8; line-height: 1.4;">${item.desc}</div>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                                <div style="font-size: 15px; font-weight: 800; color: ${item.currency === 'gems' ? '#00f5ff' : '#ffd700'};">
                                    ${item.currency === 'gems' ? '💎' : '🪙'} ${item.price}
                                </div>
                                <button class="btn-buy-armory-item" data-id="${item.id}" data-price="${item.price}" data-currency="${item.currency}" data-name="${item.name}" style="background: ${isOwned ? 'rgba(16, 185, 129, 0.3)' : item.currency === 'gems' ? 'linear-gradient(135deg, #00f5ff, #0077b6)' : 'linear-gradient(135deg, #ffd700, #b45309)'}; color: ${isOwned ? '#10b981' : '#ffffff'}; border: ${isOwned ? '1px solid #10b981' : 'none'}; padding: 8px 18px; border-radius: 10px; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer;">
                                    ${isOwned ? '✓ ĐÃ SỞ HỮU' : 'MUA NGAY'}
                                </button>
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;

        // EVENT LISTENERS INSIDE MODAL
        document.getElementById('btn-close-armory').onclick = () => { modal.style.display = 'none'; };

        document.getElementById('tab-armory-items').onclick = () => {
            this.armoryCurrentTab = 'items';
            this._renderArmoryModalContent(modal);
        };

        document.getElementById('tab-armory-skins').onclick = () => {
            this.armoryCurrentTab = 'skins';
            this._renderArmoryModalContent(modal);
        };

        modal.querySelectorAll('.btn-buy-armory-item').forEach(btn => {
            btn.onclick = () => {
                const id = btn.getAttribute('data-id');
                const name = btn.getAttribute('data-name');
                const price = parseInt(btn.getAttribute('data-price'));
                const currency = btn.getAttribute('data-currency');
                this._buyArmoryItem({ id, name, price, currency });
            };
        });
    }

    _buyArmoryItem(item) {
        const curMgr = this.game?.currencyManager;
        const shopMgr = this.game?.shopManager;

        if (shopMgr && shopMgr.isOwned(item.id)) {
            this._showToastNotification(`ℹ️ Bạn đã sở hữu ${item.name} rồi!`);
            return;
        }

        if (item.currency === 'coins') {
            if (curMgr && curMgr.hasEnoughCoins(item.price)) {
                curMgr.deductCoins(item.price);
                if (shopMgr) shopMgr.ownedItems.push(item.id);
                this._showToastNotification(`✅ Mua ${item.name} thành công!`);
                this._renderArmoryModalContent(document.getElementById('cyber-armory-modal'));
            } else {
                this._showToastNotification(`⚠️ Bạn không đủ Vàng (Cần ${item.price} 🪙)!`);
            }
        } else {
            if (curMgr && curMgr.hasEnoughGems(item.price)) {
                curMgr.deductGems(item.price);
                if (shopMgr) shopMgr.ownedItems.push(item.id);
                this._showToastNotification(`✅ Mua ${item.name} thành công!`);
                this._renderArmoryModalContent(document.getElementById('cyber-armory-modal'));
            } else {
                this._showToastNotification(`⚠️ Bạn không đủ Kim Cương (Cần ${item.price} 💎)!`);
            }
        }
    }

    _showToastNotification(msg) {
        return;
    }
    _updateArmoryShopPrompts() {
        let armoryPrompt = document.getElementById('enter-armory-prompt');
        if (!armoryPrompt) {
            armoryPrompt = document.createElement('div');
            armoryPrompt.id = 'enter-armory-prompt';
            armoryPrompt.style.cssText = `
                position: fixed;
                top: 75%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(15, 23, 42, 0.90);
                backdrop-filter: blur(8px);
                border: 1.5px solid rgba(0, 245, 255, 0.8);
                border-radius: 20px;
                padding: 10px 22px;
                color: #00f5ff;
                font-family: 'Outfit', sans-serif;
                font-size: 15px;
                font-weight: 700;
                z-index: 1000;
                pointer-events: auto !important;
                display: none;
                box-shadow: 0 4px 20px rgba(0, 245, 255, 0.4);
            `;
            document.body.appendChild(armoryPrompt);
        }

        if (this.isActive && !this.isDrivingVehicle) {
            const counterPos = new THREE.Vector3(0, this._calculateGroundY(0, -7.0), -7.0);
            const distToCounter = this.playerPos.distanceTo(counterPos);

            if (distToCounter < 4.2) {
                armoryPrompt.innerHTML = `🛒 Bấm <span style="background: #00f5ff; color: #000; padding: 2px 8px; border-radius: 6px; margin: 0 4px;">[E]</span> để Mua Vật Phẩm & Skin Xe tại Quầy`;
                armoryPrompt.style.display = 'block';
            } else {
                armoryPrompt.style.display = 'none';
            }
        } else {
            armoryPrompt.style.display = 'none';
        }
    }

    /* 🚪 GỢI Ý PROMPT MỞ CỬA NHÀ CHÍNH SHOWROOM [E] / [F] */
    _updateHouseDoorPrompts() {
        let doorPrompt = document.getElementById('enter-door-prompt');
        if (!doorPrompt) {
            doorPrompt = document.createElement('div');
            doorPrompt.id = 'enter-door-prompt';
            doorPrompt.style.cssText = `
                position: fixed;
                top: 75%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(15, 23, 42, 0.92);
                backdrop-filter: blur(8px);
                border: 1.5px solid rgba(255, 215, 0, 0.85);
                border-radius: 20px;
                padding: 10px 22px;
                color: #ffd700;
                font-family: 'Outfit', sans-serif;
                font-size: 15px;
                font-weight: 700;
                z-index: 1000;
                pointer-events: auto !important;
                display: none;
                box-shadow: 0 4px 20px rgba(255, 215, 0, 0.4);
            `;
            document.body.appendChild(doorPrompt);
        }

        if (this.isActive && !this.isDrivingVehicle) {
            const doorPos = new THREE.Vector3(0, this._calculateGroundY(0, -14.1), -14.1);
            const exhibitionDoorPos = new THREE.Vector3(37.0, this._calculateGroundY(37.0, 0), 0.0);

            const distToDoor = this.playerPos.distanceTo(doorPos);
            const distToExhibition = this.playerPos.distanceTo(exhibitionDoorPos);

            if (distToDoor < 3.2) {
                const actionText = this.isHouseDoorOpen ? 'Đóng Cửa' : 'Mở Cửa';
                doorPrompt.innerHTML = `👗 Bấm <span style="background: #00f5ff; color: #000; padding: 2px 8px; border-radius: 6px; margin: 0 4px;">[E]</span> Đổi Nhân Vật &nbsp;|&nbsp; 🚪 Bấm <span style="background: #ffd700; color: #000; padding: 2px 8px; border-radius: 6px; margin: 0 4px;">[R]</span> để ${actionText}`;
                doorPrompt.style.display = 'block';
            } else if (distToExhibition < 4.5) {
                const actionText = this.isExhibitionDoorOpen ? 'Đóng Cửa' : 'Mở Cửa';
                doorPrompt.innerHTML = `🏆 Bấm <span style="background: #00f5ff; color: #000; padding: 2px 8px; border-radius: 6px; margin: 0 4px;">[F]</span> để ${actionText} Triển Lãm Goku 3D`;
                doorPrompt.style.display = 'block';
            } else {
                doorPrompt.style.display = 'none';
            }
        } else {
            doorPrompt.style.display = 'none';
        }
    }

    /* 📍 HUD HIỂN THỊ TỌA ĐỘ REALTIME X, Y, Z Ở GÓC PHẢI MÀN HÌNH */
    _updatePositionHUD() {
        let hud = document.getElementById('position-hud-panel');
        if (!hud) {
            hud = document.createElement('div');
            hud.id = 'position-hud-panel';
            hud.style.cssText = `
                position: fixed;
                top: 18px;
                right: 20px;
                background: rgba(15, 23, 42, 0.88);
                backdrop-filter: blur(10px);
                border: 1.5px solid rgba(0, 245, 255, 0.7);
                border-radius: 12px;
                padding: 6px 14px;
                color: #00f5d4;
                font-family: 'Outfit', 'Inter', monospace;
                font-size: 13px;
                font-weight: 700;
                z-index: 1000;
                pointer-events: auto !important;
                box-shadow: 0 4px 16px rgba(0, 245, 255, 0.25);
                display: none; /* Mặc định ẩn */
                align-items: center;
                gap: 8px;
                user-select: none;
            `;
            document.body.appendChild(hud);
        }

        if (this.isActive) {
            hud.style.display = 'flex';
            const px = (this.playerPos ? this.playerPos.x : 0).toFixed(1);
            const py = (this.playerPos ? this.playerPos.y : 0).toFixed(1);
            const pz = (this.playerPos ? this.playerPos.z : 0).toFixed(1);
            hud.innerHTML = `📍 <span style="color: #ffd700;">POS:</span> X: ${px} | Y: ${py} | Z: ${pz}`;
        } else {
            hud.style.display = 'none';
        }
    }

    /* 🚗 HÀM LÊN / XUỐNG XE SIÊU XE (VEHICLE MOUNTING / DISMOUNTING) */
    _toggleVehicleMount() {
        if (!this.isDrivingVehicle) {
            // Kiểm tra xem player có đang đứng gần chiếc xe nào không (< 3.5m)
            let nearestVehicle = null;
            let minDist = 3.5;

            this.driveableVehicles.forEach(veh => {
                const dist = this.playerPos.distanceTo(veh.mesh.position);
                if (dist < minDist) {
                    minDist = dist;
                    nearestVehicle = veh;
                }
            });

            if (nearestVehicle) {
                this.isDrivingVehicle = true;
                this.currentVehicle = nearestVehicle;
                nearestVehicle.isBeingDriven = true;
                this.playerMesh.visible = false;

                // THIẾT LẬP CAMERA XOAY NGAY PHÍA SAU ĐUÔI XE KHI LÊN XE (GTA CAMERA)
                this.cameraYaw = nearestVehicle.mesh.rotation.y + Math.PI;
                this.cameraPitch = 0.35;
                this.cameraDistance = 10.5;

                this._showDriveHUD(true, nearestVehicle.name);
            }
        } else {
            // Xuống xe
            if (this.currentVehicle) {
                this.currentVehicle.isBeingDriven = false;
                this.currentVehicle.speed = 0;

                // Đặt vị trí player đứng bên cạnh cửa xe
                const exitOffset = new THREE.Vector3(-1.8, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.currentVehicle.mesh.rotation.y);
                this.playerPos.copy(this.currentVehicle.mesh.position).add(exitOffset);
                this.playerPos.y = this._calculateGroundY(this.playerPos.x, this.playerPos.z);
                this.playerMesh.position.copy(this.playerPos);
                this.playerMesh.visible = true;

                this.isDrivingVehicle = false;
                this.currentVehicle = null;
                this._showDriveHUD(false);
            }
        }
    }

    /* 🖥️ HIỂN THỊ CỤM PROMPT LÁI XE & HUD THÔNG BÁO VỚI POINTER-EVENTS: AUTO */
    _showDriveHUD(show, carName = '') {
        let hud = document.getElementById('driving-hud-prompt');
        if (!hud) {
            hud = document.createElement('div');
            hud.id = 'driving-hud-prompt';
            hud.className = 'dbz-hud-container';
            document.body.appendChild(hud);
        }

        if (show) {
            hud.innerHTML = `
                <div class="dbz-hud-row">
                    <span class="dbz-key-badge">F</span>
                    <span class="dbz-action-text">Rời khỏi ${carName || 'xe'}</span>
                </div>
            `;
            hud.style.display = 'flex';
        } else {
            hud.style.display = 'none';
        }
    }

    _updateVehiclePrompts() {
        let enterPrompt = document.getElementById('enter-car-prompt');
        if (!enterPrompt) {
            enterPrompt = document.createElement('div');
            enterPrompt.id = 'enter-car-prompt';
            enterPrompt.style.cssText = `
                position: fixed;
                top: 75%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(15, 23, 42, 0.88);
                backdrop-filter: blur(8px);
                border: 1.5px solid rgba(255, 215, 0, 0.7);
                border-radius: 20px;
                padding: 10px 22px;
                color: #ffd700;
                font-family: 'Outfit', sans-serif;
                font-size: 15px;
                font-weight: 700;
                z-index: 1000;
                pointer-events: auto !important;
                display: none;
                box-shadow: 0 4px 20px rgba(255, 215, 0, 0.35);
            `;
            document.body.appendChild(enterPrompt);
        }

        if (this.isActive && !this.isDrivingVehicle) {
            let nearCar = null;
            let minDist = 3.5;
            this.driveableVehicles.forEach(veh => {
                const dist = this.playerPos.distanceTo(veh.mesh.position);
                if (dist < minDist) {
                    minDist = dist;
                    nearCar = veh;
                }
            });

            if (nearCar) {
                enterPrompt.innerHTML = `🚘 Bấm <span style="background: #ffd700; color: #000; padding: 2px 8px; border-radius: 6px; margin: 0 4px;">[F]</span> để Lái ${nearCar.name}`;
                enterPrompt.style.display = 'block';
                // 📱 MOBILE CONTROLS: Cập nhật hiển thị nút Lái Xe Mobile khi đứng gần siêu xe
                if (this.mobileControls) {
                    this.mobileControls.updateVehicleButtonState(true, false, nearCar.name);
                }
            } else {
                enterPrompt.style.display = 'none';
                // 📱 MOBILE CONTROLS: Ẩn nút Lái Xe Mobile khi đứng xa siêu xe
                if (this.mobileControls) {
                    this.mobileControls.updateVehicleButtonState(false, false);
                }
            }
        } else if (this.isActive && this.isDrivingVehicle && this.currentVehicle) {
            enterPrompt.style.display = 'none';
            // 📱 MOBILE CONTROLS: Đang lái xe -> Chuyển nút bấm Mobile thành "XUỐNG XE"
            if (this.mobileControls) {
                this.mobileControls.updateVehicleButtonState(true, true, this.currentVehicle.name);
            }
        } else {
            enterPrompt.style.display = 'none';
            // 📱 MOBILE CONTROLS: Trả về trạng thái mặc định cho nút Mobile
            if (this.mobileControls) {
                this.mobileControls.updateVehicleButtonState(false, false);
            }
        }
    }

    /* ☁️ GỢI Ý PROMPT CƯỠI CÂN ĐẨU VÂN [F] */
    _updateNimbusPrompts() {
        let nimbusPrompt = document.getElementById('enter-nimbus-prompt');
        if (!nimbusPrompt) {
            nimbusPrompt = document.createElement('div');
            nimbusPrompt.id = 'enter-nimbus-prompt';
            nimbusPrompt.style.cssText = `
                position: fixed;
                top: 75%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(15, 23, 42, 0.88);
                backdrop-filter: blur(8px);
                border: 1.5px solid rgba(255, 215, 0, 0.85);
                border-radius: 20px;
                padding: 10px 22px;
                color: #ffd700;
                font-family: 'Outfit', sans-serif;
                font-size: 15px;
                font-weight: 700;
                z-index: 1000;
                pointer-events: auto !important;
                display: none;
                box-shadow: 0 4px 20px rgba(255, 215, 0, 0.4);
            `;
            document.body.appendChild(nimbusPrompt);
        }

        if (this.isActive && !this.isDrivingVehicle && !this.isRidingNimbus && this.nimbusCloud) {
            const distNimbus = this.playerPos.distanceTo(this.nimbusCloud.position);
            if (distNimbus < 3.8) {
                nimbusPrompt.innerHTML = `☁️ Bấm <span style="background: #ffd700; color: #000; padding: 2px 8px; border-radius: 6px; margin: 0 4px;">[F]</span> để Cưỡi Cân Đẩu Vân`;
                nimbusPrompt.style.display = 'block';
            } else {
                nimbusPrompt.style.display = 'none';
            }
        } else {
            nimbusPrompt.style.display = 'none';
        }
    }

    /* 🖱️ 18. ĐIỀU KHIỂN CHUỘT GTA ORBIT CAMERA CONTROLS */
    _setupMouseCameraControls() {
        const onPointerDown = (e) => {
            if (!this.isActive) return;
            if (e.target && e.target.tagName !== 'CANVAS' && e.target.closest('#btn-exit-shop-3d')) return;

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

        const onPointerUp = () => {
            this.isPointerDown = false;
        };

        const onWheel = (e) => {
            if (!this.isActive) return;
            this.cameraDistance = THREE.MathUtils.clamp(this.cameraDistance + e.deltaY * 0.005, 4.0, 24.0);
        };

        window.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
        window.addEventListener('wheel', onWheel, { passive: true });
    }

    _resetKeys() {
        this.activeKeys.clear();
        this.isPointerDown = false;
    }

    openShowroom(spawnPos = null) {
        this.isActive = true;

        // 🎯 Đảm bảo ẩn sạch sẽ HUD Roguelike Arena khi mở lại Shop
        const roguelikeHud = document.getElementById('roguelike-hud');
        if (roguelikeHud) {
            roguelikeHud.classList.remove('active');
            roguelikeHud.style.display = 'none';
        }

        // Nếu có truyền tọa độ chỉ định (từ Roguelike trở về Cổng Cung Điện)
        if (spawnPos) {
            this.playerPos.copy(spawnPos);
        } else {
            this.playerPos.set(0, this.groundY, 6);
        }

        this.velocityY = 0;
        this.isGrounded = true
        this.isDrivingVehicle = false;
        this.currentVehicle = null;

        // Căn góc nhìn Camera hướng thẳng vào Cổng Cung Điện khi xuất hiện
        if (spawnPos) {
            this.cameraYaw = Math.PI; // Look backward/forward tùy góc cổng
        } else {
            this.cameraYaw = 0;
        }

        this.cameraPitch = 0.42;
        this.cameraDistance = 9.5;
        this.isPointerDown = false;
        this.playerWalkTimer = 0;
        this._resetKeys();

        // 📱 MOBILE CONTROLS: Hiển thị giao diện điều khiển mobile
        if (this.mobileControls) {
            this.mobileControls.show();
        }

        if (document.activeElement && document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    }

    closeShowroom() {
        if (this.isDrivingVehicle && this.currentVehicle) {
            this._toggleVehicleMount();
        }

        if (this.isRidingNimbus) {
            this._toggleNimbusMount();
        }

        this.isActive = false;
        this._showDriveHUD(false);
        this._showNimbusHUD(false);

        // 🎯 1. Ẩn Bảng Tọa độ Pos HUD
        const posHud = document.getElementById('position-hud-panel');
        if (posHud) posHud.style.display = 'none';

        // 🎯 2. FIX DỨT ĐIỂM: Ẩn Prompt Cổng Dịch Chuyển Không Gian khi thoát/chuyển map
        const portalPrompt = document.getElementById('portal-teleport-prompt');
        if (portalPrompt) {
            portalPrompt.classList.remove('show');
            portalPrompt.style.display = 'none';
        }

        const enterPrompt = document.getElementById('enter-car-prompt');
        if (enterPrompt) enterPrompt.style.display = 'none';

        const armoryPrompt = document.getElementById('enter-armory-prompt');
        if (armoryPrompt) armoryPrompt.style.display = 'none';

        const doorPrompt = document.getElementById('enter-door-prompt');
        if (doorPrompt) doorPrompt.style.display = 'none';

        const nimbusPrompt = document.getElementById('enter-nimbus-prompt');
        if (nimbusPrompt) nimbusPrompt.style.display = 'none';

        const armoryModal = document.getElementById('cyber-armory-modal');
        if (armoryModal) armoryModal.style.display = 'none';

        const charModal = document.getElementById('character-select-modal');
        if (charModal) charModal.style.display = 'none';

        // 📱 MOBILE CONTROLS: Ẩn 100% giao diện Virtual Joystick & Action Buttons khi người chơi thoát Shop 3D
        if (this.mobileControls) {
            this.mobileControls.hide();
        }

        this._resetKeys();
    }

    /* 🏔️ 19. TÍNH TOÁN ĐỘ CAO ĐỊA HÌNH DYNAMIC GROUND HEIGHT PER X, Z */
    _calculateGroundY(x, z) {
        let currentTargetGroundY = 0.0;

        // 1. Cung Điện Cẩm Thạch Bán Nguyệt (Palace Center: x = 0, z = 30, radius = 14.5, floor Y = 0.70m)
        const dxP = x - 0;
        const dzP = z - 30;
        const distPalace = Math.sqrt(dxP * dxP + dzP * dzP);

        if (distPalace <= 14.6) {
            if (distPalace <= 13.4) {
                currentTargetGroundY = 0.70;
            } else {
                const t = (14.6 - distPalace) / 1.2;
                currentTargetGroundY = THREE.MathUtils.lerp(0.21, 0.70, t);
            }
        }

        // 2. Sàn Gỗ Sougen Terrace Deck (x in [-17, 17], z in [-45, -23], floor Y = 0.24m)
        if (x >= -17 && x <= 17 && z >= -45 && z <= -23) {
            currentTargetGroundY = Math.max(currentTargetGroundY, 0.24);
        }

        // 3. Cầu Gỗ Băc Ngang Sông (x in [-27.25, -16.75], z in [5.9, 10.1], floor Y = 0.35m)
        if (x >= -27.25 && x <= -16.75 && z >= 5.9 && z <= 10.1) {
            currentTargetGroundY = Math.max(currentTargetGroundY, 0.35);
        }

        return currentTargetGroundY;
    }

    /* 🎬 HÀM TẠO VIDEO TEXTURE & CANVAS LIVE STREAM 60FPS (ANH ZHOU STYLE) */
    _createCyberVideoTexture() {
        if (this.cyberLiveCanvas) return this.cyberLiveTexture;

        // 1. Tạo Canvas Live Stream 60FPS Cyberpunk
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 576;
        this.cyberLiveCanvas = canvas;
        this.cyberLiveCtx = canvas.getContext('2d');
        this.cyberLiveAnimTime = 0;
        this.cyberLiveTexture = new THREE.CanvasTexture(canvas);

        // 2. Tạo HTML5 Video Element gắn ngầm với Video Sample mượt mà
        try {
            const video = document.createElement('video');
            video.src = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
            video.crossOrigin = 'anonymous';
            video.loop = true;
            video.muted = true;
            video.playsInline = true;
            video.setAttribute('playsinline', '');
            video.setAttribute('muted', '');
            video.style.display = 'none';
            document.body.appendChild(video);

            const tryPlay = () => {
                video.play().catch(err => console.log("Autoplay waiting user click:", err));
            };
            tryPlay();

            window.addEventListener('pointerdown', tryPlay, { once: true });
            window.addEventListener('click', tryPlay, { once: true });

            this.videoElement = video;
        } catch (e) {
            console.warn("HTML5 Video fallback to procedural live cam stream:", e);
        }

        return this.cyberLiveTexture;
    }

    /* 🎥 CẬP NHẬT HOẠT HỌA REALTIME MÀN HÌNH LIVE STREAM 3D TRÊN MÁI RAMEN */
    _updateCyberLiveStream(deltaTime) {
        if (!this.cyberLiveCtx) return;
        this.cyberLiveAnimTime += deltaTime;
        const time = this.cyberLiveAnimTime;
        const ctx = this.cyberLiveCtx;
        const w = 1024;
        const h = 576;

        let videoDrawn = false;
        if (this.videoElement && this.videoElement.readyState >= 2 && !this.videoElement.paused) {
            try {
                ctx.drawImage(this.videoElement, 0, 0, w, h);
                videoDrawn = true;
            } catch (e) {
                videoDrawn = false;
            }
        }

        if (!videoDrawn) {
            // 🏙️ GIẢ LẬP VIDEO STREAM CYBERPUNK SYNTHWAVE NEON CITY 60FPS
            ctx.fillStyle = '#050508';
            ctx.fillRect(0, 0, w, h);

            // Bầu Trời Synthwave Sunset Gradient
            const skyGrad = ctx.createLinearGradient(0, 0, 0, 380);
            skyGrad.addColorStop(0, '#090514');
            skyGrad.addColorStop(0.5, '#2e1065');
            skyGrad.addColorStop(1, '#831843');
            ctx.fillStyle = skyGrad;
            ctx.fillRect(0, 0, w, 380);

            // Mặt Trời Neon Sun Tròn Chuyển Màu
            const sunGrad = ctx.createLinearGradient(512, 100, 512, 300);
            sunGrad.addColorStop(0, '#fde047');
            sunGrad.addColorStop(1, '#ff007f');
            ctx.fillStyle = sunGrad;
            ctx.beginPath();
            ctx.arc(512, 220, 110, 0, Math.PI * 2);
            ctx.fill();

            // Vạch Kẻ Synthwave Sun Lines
            ctx.fillStyle = '#050508';
            for (let y = 180; y < 320; y += 16) {
                const lineH = 3 + (y - 180) * 0.04;
                ctx.fillRect(380, y, 264, lineH);
            }

            // Tòa Nhà Cyberpunk City Skyline
            ctx.fillStyle = '#0f172a';
            const bldgs = [
                { x: 40, w: 90, h: 220 }, { x: 140, w: 70, h: 280 },
                { x: 220, w: 110, h: 190 }, { x: 340, w: 85, h: 320 },
                { x: 600, w: 95, h: 300 }, { x: 710, w: 100, h: 230 },
                { x: 820, w: 80, h: 270 }, { x: 910, w: 80, h: 210 }
            ];
            bldgs.forEach(b => {
                ctx.fillRect(b.x, 380 - b.h, b.w, b.h);
                ctx.fillStyle = '#00f5d4';
                for (let wx = b.x + 10; wx < b.x + b.w - 15; wx += 20) {
                    for (let wy = 380 - b.h + 20; wy < 360; wy += 35) {
                        if (Math.sin(wx * wy + time * 2) > 0) {
                            ctx.fillRect(wx, wy, 8, 14);
                        }
                    }
                }
                ctx.fillStyle = '#0f172a';
            });

            // Lưới Đường Phố Grid Line 3D Moving Perspective Lines
            ctx.fillStyle = '#0a0a10';
            ctx.fillRect(0, 380, w, h - 380);

            ctx.strokeStyle = '#00f5d4';
            ctx.lineWidth = 2;
            for (let y = 380; y < h; y += 18) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.stroke();
            }
            for (let x = -200; x < w + 200; x += 80) {
                ctx.beginPath();
                ctx.moveTo(512, 380);
                ctx.lineTo(x, h);
                ctx.stroke();
            }

            // Xe Đèn Neon Đang Bay Qua Lại (Moving Hover Cars)
            const carX = (time * 320) % (w + 200) - 100;
            ctx.fillStyle = '#ff007f';
            ctx.shadowColor = '#ff007f';
            ctx.shadowBlur = 15;
            ctx.fillRect(carX, 330, 45, 8);
            ctx.shadowBlur = 0;
        }

        // 🔴 LỚP PHỦ LIVE STREAM HUD (REC ● LIVE STREAM 4K)
        ctx.fillStyle = 'rgba(5, 5, 8, 0.55)';
        ctx.fillRect(16, 16, 320, 52);
        ctx.strokeStyle = '#00f5d4';
        ctx.lineWidth = 2;
        ctx.strokeRect(16, 16, 320, 52);

        // Chấm Đỏ Chớp Nháy REC
        const blink = Math.floor(time * 2) % 2 === 0;
        if (blink) {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(36, 42, 10, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.font = '900 22px "Space Grotesk", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText('REC  ●  LIVE STREAM 4K', 56, 49);

        // Live Time Code
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0] + '.' + Math.floor((time * 10) % 10);
        ctx.fillStyle = '#00f5d4';
        ctx.font = 'bold 20px "Space Grotesk", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(timeStr, w - 24, 46);

        this.cyberLiveTexture.needsUpdate = true;
    }

    /* 🏙️ CYBERPUNK RAMEN SHOP & STATIONS (ANH ZHOU STYLE 100% CHUẨN ẢNH MẪU) */
    _initCyberpunkRamenShop() {
        const shopGroup = new THREE.Group();
        shopGroup.position.set(36.0, 0, 36.0);
        shopGroup.rotation.y = -Math.PI / 2;

        // 1. Thân Bàn Quầy Bar & Mặt Bàn Nướng Ấm Vàng
        const barGeo = new THREE.BoxGeometry(6.4, 1.1, 1.8);
        const barMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4, metalness: 0.7 });
        const bar = new THREE.Mesh(barGeo, barMat);
        bar.position.set(0, 0.55, 0);
        bar.castShadow = true;
        bar.receiveShadow = true;
        shopGroup.add(bar);

        // Mặt Bàn Ấm Vàng Chuẩn 100% Ảnh Mẫu ANH Zhou
        const topGeo = new THREE.BoxGeometry(6.8, 0.12, 2.1);
        const topMat = new THREE.MeshStandardMaterial({
            color: 0xfff2cc,
            emissive: 0xffe89e,
            emissiveIntensity: 0.35,
            roughness: 0.3
        });
        const top = new THREE.Mesh(topGeo, topMat);
        top.position.set(0, 1.12, 0);
        top.castShadow = true;
        shopGroup.add(top);

        // 2. Mái Che Cong Tím/Xanh Cyberpunk Canopy Roof (Nâng cao +0.95m mở rộng tầm nhìn)
        const roofGeo = new THREE.BoxGeometry(7.2, 0.28, 2.8);
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x6b21a8, roughness: 0.4, metalness: 0.3 });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.set(0, 3.75, 0.2);
        roof.castShadow = true;
        shopGroup.add(roof);

        // 3. BIỂN HIỆU CHÍNH "ANH'S RAMEN" VỚI VIỀN NEON CYAN & HỒNG
        const signCanvas = document.createElement('canvas');
        signCanvas.width = 1024;
        signCanvas.height = 256;
        const sCtx = signCanvas.getContext('2d');
        sCtx.fillStyle = '#090d16';
        sCtx.fillRect(0, 0, 1024, 256);

        // Dual Neon Frame (Cyan & Magenta)
        sCtx.strokeStyle = '#00f5d4';
        sCtx.lineWidth = 14;
        sCtx.strokeRect(14, 14, 996, 228);
        sCtx.strokeStyle = '#ff007f';
        sCtx.lineWidth = 6;
        sCtx.strokeRect(26, 26, 972, 204);

        sCtx.shadowColor = '#c084fc';
        sCtx.shadowBlur = 30;
        sCtx.fillStyle = '#f0abfc';
        sCtx.font = '900 82px "Space Grotesk", sans-serif';
        sCtx.textAlign = 'center';
        sCtx.textBaseline = 'middle';
        sCtx.fillText("ANH'S RAMEN", 512, 128);

        const signTexture = new THREE.CanvasTexture(signCanvas);

        const signGeo = new THREE.BoxGeometry(5.8, 1.1, 0.12);
        const signMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.2, metalness: 0.8 });
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.position.set(0, 4.45, 1.5);

        const neonStripMat = new THREE.MeshStandardMaterial({
            map: signTexture,
            emissiveMap: signTexture,
            emissive: 0xffffff,
            emissiveIntensity: 1.2,
            roughness: 0.2
        });
        const neonStrip = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.02), neonStripMat);
        neonStrip.position.set(0, 0, 0.065);
        sign.add(neonStrip);
        shopGroup.add(sign);

        // 🎬 4. MÀN HÌNH 3D TV PHÁT VIDEO TEXTURE NGAY TRÊN ĐỈNH QUẦY RAMEN
        const videoTex = this._createCyberVideoTexture();
        const tvGroup = new THREE.Group();
        tvGroup.position.set(-0.8, 5.95, 1.2);

        // Main Metallic TV Frame & Glowing Cyan Bezel
        const tvFrameMesh = new THREE.Mesh(
            new THREE.BoxGeometry(3.0, 1.8, 0.12),
            new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.8 })
        );
        tvGroup.add(tvFrameMesh);

        const tvBorderMesh = new THREE.Mesh(
            new THREE.BoxGeometry(3.08, 1.88, 0.06),
            new THREE.MeshStandardMaterial({ color: 0x00f5d4, emissive: 0x00f5d4, emissiveIntensity: 2.5, roughness: 0.1 })
        );
        tvBorderMesh.position.z = -0.03;
        tvGroup.add(tvBorderMesh);

        // 3D Video Screen Plane Playing Video Texture
        const tvScreenPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(2.88, 1.68),
            new THREE.MeshBasicMaterial({ map: videoTex })
        );
        tvScreenPlane.position.z = 0.07;
        tvGroup.add(tvScreenPlane);

        // Title Overlay "BEAUTIFUL VANCOUVER - LIVE"
        const tvTitleCanvas = document.createElement('canvas');
        tvTitleCanvas.width = 512;
        tvTitleCanvas.height = 64;
        const tCtx = tvTitleCanvas.getContext('2d');
        tCtx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        tCtx.fillRect(0, 0, 512, 64);
        tCtx.fillStyle = '#00f5d4';
        tCtx.font = 'bold 24px "Space Grotesk", sans-serif';
        tCtx.textAlign = 'center';
        tCtx.fillText('BEAUTIFUL VANCOUVER - LIVE STREAM', 256, 40);

        const tvTitleTex = new THREE.CanvasTexture(tvTitleCanvas);
        const tvTitleMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(2.88, 0.35),
            new THREE.MeshBasicMaterial({ map: tvTitleTex, transparent: true })
        );
        tvTitleMesh.position.set(0, -0.66, 0.08);
        tvGroup.add(tvTitleMesh);

        // Secondary Small Sub-Screen under Main Video Screen
        const subTvFrame = new THREE.Mesh(
            new THREE.BoxGeometry(1.4, 0.85, 0.1),
            new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.8 })
        );
        subTvFrame.position.set(-0.5, -1.25, 0.02);
        tvGroup.add(subTvFrame);

        const subTvScreen = new THREE.Mesh(
            new THREE.PlaneGeometry(1.32, 0.78),
            new THREE.MeshBasicMaterial({ map: videoTex })
        );
        subTvScreen.position.set(-0.5, -1.25, 0.08);
        tvGroup.add(subTvScreen);

        shopGroup.add(tvGroup);

        // 10. NHÂN VẬT ANIME BEAN ĐEO TAI NGHE DỰNG ĐỨNG ĐẰNG SAU QUẦY
        const beanNPC = this._createHeadphoneBeanNPC();
        beanNPC.scale.set(1.75, 1.75, 1.75);
        beanNPC.position.set(0.0, 0.0, -1.8);
        shopGroup.add(beanNPC);
        this.beanNPC = beanNPC;

        // 5. 🍜 NỔI BẬT NỐM BIỂN BÁT MÌ RAMEN & ĐÔI ĐŨA NEON TRÊN MÁI
        const bowlArtGroup = new THREE.Group();
        bowlArtGroup.position.set(2.2, 5.95, 1.2);

        // Glowing Cyan Bowl Rim
        const neonBowlRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.65, 0.06, 12, 32),
            new THREE.MeshStandardMaterial({ color: 0x00f5d4, emissive: 0x00f5d4, emissiveIntensity: 3.0 })
        );
        neonBowlRing.rotation.x = Math.PI / 3;
        bowlArtGroup.add(neonBowlRing);

        // Glowing Yellow Noodles & Chopsticks
        const chopsticksMat = new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xffb703, emissiveIntensity: 3.0 });
        [-0.1, 0.1].forEach(dx => {
            const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 1.4, 8), chopsticksMat);
            stick.position.set(dx + 0.3, 0.5, 0);
            stick.rotation.z = -Math.PI / 4;
            bowlArtGroup.add(stick);
        });

        shopGroup.add(bowlArtGroup);

        // 6. 🏮 BIỂN NEON DỌC "RAMEN" BÊN CẠNH QUẦY (DỊCH RA CẠNH SHOP - KHÔNG ĐÈ LÊN QUẦY)
        const vertSignGroup = new THREE.Group();
        vertSignGroup.position.set(-4.2, 2.4, 0.5);

        const vertSignBack = new THREE.Mesh(
            new THREE.BoxGeometry(0.7, 3.2, 0.12),
            new THREE.MeshStandardMaterial({ color: 0x050508, roughness: 0.2, metalness: 0.8 })
        );
        vertSignGroup.add(vertSignBack);

        const vertBorder = new THREE.Mesh(
            new THREE.BoxGeometry(0.76, 3.28, 0.06),
            new THREE.MeshStandardMaterial({ color: 0x00f5d4, emissive: 0x00f5d4, emissiveIntensity: 2.5 })
        );
        vertBorder.position.z = -0.03;
        vertSignGroup.add(vertBorder);

        const vCanvas = document.createElement('canvas');
        vCanvas.width = 128;
        vCanvas.height = 512;
        const vCtx = vCanvas.getContext('2d');
        vCtx.fillStyle = '#050508';
        vCtx.fillRect(0, 0, 128, 512);
        vCtx.fillStyle = '#00f5d4';
        vCtx.shadowColor = '#00f5d4';
        vCtx.shadowBlur = 20;
        vCtx.font = '900 56px "Space Grotesk", sans-serif';
        vCtx.textAlign = 'center';

        const letters = ['R', 'A', 'M', 'E', 'N'];
        letters.forEach((char, idx) => {
            vCtx.fillText(char, 64, 80 + idx * 85);
        });

        const vTex = new THREE.CanvasTexture(vCanvas);
        const vMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(0.64, 3.1),
            new THREE.MeshBasicMaterial({ map: vTex, transparent: true })
        );
        vMesh.position.z = 0.07;
        vertSignGroup.add(vMesh);

        shopGroup.add(vertSignGroup);

        // 8. 4 TÔ MÌ RAMEN SIÊU THẬT & 4 GHẾ BAR CYBERPUNK SIÊU ĐẸP
        const stoolPositionsX = [-2.1, -0.7, 0.7, 2.1];

        // Đặt 4 Ghế Bar Siêu Đẹp
        stoolPositionsX.forEach(x => {
            const stool = this._createCyberBarStool();
            stool.position.set(x, 0, 1.4);
            shopGroup.add(stool);
        });

        // Đặt 4 Tô Mì Ramen Siêu Thật Trên Mặt Bàn
        stoolPositionsX.forEach(x => {
            const bowl = this._createDetailedRamenBowl();
            bowl.position.set(x, 1.18, 0.3);
            shopGroup.add(bowl);
        });

        // 9. 💻 TRẠM MÁY TÍNH BÀN CRT RETRO & GHẾ XOAY LÀM VIỆC (THAY THẾ CHÍNH THỨC VỊ TRÍ ARTICLE CŨ - CHUẨN IMAGE 2 & 3)
        this._buildRetroComputerStation(shopGroup);

        // Vending Machine
        this._buildVendingMachine(shopGroup);

        // 📺 Màn Hình LED Cột Đứng ("Hi, I'm Viet Anh.") Đặt Dịch Sang Bên Phải (x = 8.5m) Không Che Quầy
        this._buildCyberpunkLedTv(shopGroup);

        this.scene.add(shopGroup);
    }

    /* 💻 TRẠM MÁY TÍNH BÀN CRT RETRO & GHẾ XOAY LÀM VIỆC (THAY THẾ CHÍNH THỨC VỊ TRÍ ARTICLES CŨ - CHUẨN IMAGE 2 & 3) */
    _buildRetroComputerStation(shopGroup) {
        const pcGroup = new THREE.Group();
        pcGroup.position.set(-6.0, 0, -1.0);
        pcGroup.scale.set(2.5, 2.5, 2.5);
        pcGroup.rotation.y = 0.0;

        // 1. Bàn Gỗ Làm Việc Chân Kim Loại (Wooden Desk)
        const deskTopMat = new THREE.MeshStandardMaterial({ color: 0x3b291a, roughness: 0.6 });
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.8 });
        const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.9), deskTopMat);
        deskTop.position.set(0, 0.74, 0);
        deskTop.castShadow = true;
        pcGroup.add(deskTop);

        // Chân Bàn Metal Legs
        [[-0.72, -0.38], [0.72, -0.38], [-0.72, 0.38], [0.72, 0.38]].forEach(([dx, dz]) => {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.70, 12), metalMat);
            leg.position.set(dx, 0.35, dz);
            pcGroup.add(leg);
        });

        // 2. Thùng Máy Cây CRT Cổ Điển (Desktop Case Tower)
        const pcPlastMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.7 });
        const pcCase = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.14, 0.44), pcPlastMat);
        pcCase.position.set(0, 0.85, -0.1);
        pcGroup.add(pcCase);

        const floppySlot = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, 0.025, 0.01),
            new THREE.MeshStandardMaterial({ color: 0x111111 })
        );
        floppySlot.position.set(0.14, 0.87, 0.12);
        pcGroup.add(floppySlot);

        // 3. Màn Hình CRT Dày Dặn & Mặt Màn Hình HĐH Windows 98
        const monitorGroup = new THREE.Group();
        monitorGroup.position.set(0, 1.14, -0.1);

        const bezelMesh = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.48, 0.42), pcPlastMat);
        monitorGroup.add(bezelMesh);

        // Canvas Texture Hiển Thị Desktop Windows 98
        const osCanvas = document.createElement('canvas');
        osCanvas.width = 512;
        osCanvas.height = 384;
        const osCtx = osCanvas.getContext('2d');

        // Hình Nền Teal Windows 98 Standard Desktop
        osCtx.fillStyle = '#008080';
        osCtx.fillRect(0, 0, 512, 384);

        // Icons Trên Màn Hình Desktop
        const icons = [
            { label: 'THƯ VIỆN ẢNH', icon: '🖼️', x: 40, y: 40 },
            { label: 'NHẬT KÝ', icon: '📖', x: 40, y: 120 },
            { label: 'XEM VIDEO', icon: '🎬', x: 40, y: 200 },
            { label: 'RẮN SĂN MỒI', icon: '🐍', x: 40, y: 280 }
        ];
        icons.forEach(ic => {
            osCtx.fillStyle = '#ffffff';
            osCtx.font = '32px sans-serif';
            osCtx.fillText(ic.icon, ic.x, ic.y + 24);
            osCtx.font = 'bold 13px "Space Grotesk", sans-serif';
            osCtx.fillText(ic.label, ic.x + 45, ic.y + 20);
        });

        // Windows Start Taskbar ở đáy
        osCtx.fillStyle = '#c0c0c0';
        osCtx.fillRect(0, 356, 512, 28);
        osCtx.fillStyle = '#000080';
        osCtx.fillRect(4, 359, 65, 22);
        osCtx.fillStyle = '#ffffff';
        osCtx.font = 'bold 12px sans-serif';
        osCtx.fillText('Start 🪟', 12, 374);

        const osTex = new THREE.CanvasTexture(osCanvas);
        const crtScreen = new THREE.Mesh(
            new THREE.PlaneGeometry(0.52, 0.38),
            new THREE.MeshBasicMaterial({ map: osTex })
        );
        crtScreen.position.z = 0.215;
        monitorGroup.add(crtScreen);
        pcGroup.add(monitorGroup);

        // 4. Bàn Phím & Chuột
        const kb = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 0.16), pcPlastMat);
        kb.position.set(-0.05, 0.79, 0.22);
        pcGroup.add(kb);

        const mouse = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.025, 0.10), pcPlastMat);
        mouse.position.set(0.28, 0.79, 0.22);
        pcGroup.add(mouse);

        // 5. 🪑 GHẾ NGHÌ HÁY TÍNH CHUẨN 100% ẢNH MẪU (BROWN LEATHER SWIVEL CHAIR MATCHING IMAGE 2)
        const chairGroup = new THREE.Group();
        chairGroup.position.set(0, 0, 0.65);

        // Chân Xoay 5 Nhánh & Cột Thủy Lực Chrome
        const chairBase = new THREE.Mesh(
            new THREE.CylinderGeometry(0.035, 0.035, 0.44, 12),
            new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.8 })
        );
        chairBase.position.y = 0.22;
        chairGroup.add(chairBase);

        // 5 Bánh Xe Xoay
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const leg = new THREE.Mesh(
                new THREE.BoxGeometry(0.26, 0.03, 0.05),
                new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 })
            );
            leg.rotation.y = angle;
            leg.position.set(Math.cos(angle) * 0.13, 0.06, Math.sin(angle) * 0.13);
            chairGroup.add(leg);
        }

        // Đệm Ghế Nâu Da Bò Bo Cong (Brown Leather Seat Cushion)
        const seatMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.5 });
        const seatMesh = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.08, 0.48), seatMat);
        seatMesh.position.y = 0.48;
        seatMesh.castShadow = true;
        chairGroup.add(seatMesh);

        // Khung Kim Loại Đỡ Tựa Lưng Phía Sau
        const backSupport = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, 0.35, 8),
            new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 })
        );
        backSupport.rotation.x = -0.2;
        backSupport.position.set(0, 0.62, 0.24);
        chairGroup.add(backSupport);

        // Tựa Lưng Ghế Nâu Da Bò
        const backrestMesh = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.32, 0.06), seatMat);
        backrestMesh.position.set(0, 0.78, 0.26);
        backrestMesh.castShadow = true;
        chairGroup.add(backrestMesh);

        pcGroup.add(chairGroup);

        // 6. 📁 KHAY GIẤY HỒ SƠ & TÀI LIỆU A4 (THIẾT KẾ BÊN TRÁI BÀN - CHUẨN ẢNH MẪU 1)
        const trayMat = new THREE.MeshStandardMaterial({ color: 0xd6c7b2, roughness: 0.7 });
        const paperMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 });

        // 2 Khay Đựng Giấy Xếp Chồng
        [0.78, 0.84].forEach(ty => {
            const tray = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.46), trayMat);
            tray.position.set(-0.58, ty, -0.15);
            pcGroup.add(tray);

            const paperStack = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.03, 0.40), paperMat);
            paperStack.position.set(-0.58, ty + 0.02, -0.15);
            pcGroup.add(paperStack);
        });

        // Tờ Giấy Đang Đọc Nằm Flat Trên Bàn
        const flatDoc = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.32), paperMat);
        flatDoc.rotation.x = -Math.PI / 2;
        flatDoc.rotation.z = -0.1;
        flatDoc.position.set(-0.48, 0.785, 0.24);
        pcGroup.add(flatDoc);

        // 7. 📚 BÌA HỒ SƠ DỰ ÁN & CỐC CÀ PHÊ NÓNG (THIẾT KẾ BÊN PHẢI BÀN - CHUẨN ẢNH MẪU 1)
        const binderMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.6 });
        [-0.15, -0.04].forEach(bz => {
            const binder = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.28), binderMat);
            binder.position.set(0.56, 0.95, bz);
            pcGroup.add(binder);
        });

        // Cốc Cà Phê Trắng Porcelain Coffee Mug
        const mugMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });
        const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.14, 16), mugMat);
        mug.position.set(0.62, 0.85, 0.22);
        pcGroup.add(mug);

        // Nước Cà Phê Đen Bên Trong
        const coffeeSurface = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.01, 16), new THREE.MeshBasicMaterial({ color: 0x27190d }));
        coffeeSurface.position.set(0.62, 0.91, 0.22);
        pcGroup.add(coffeeSurface);

        // 8. BẢNG GỖ HIỂN THỊ HƯỚNG DẪN TƯƠNG TÁC PC
        const promptGroup = new THREE.Group();
        promptGroup.position.set(0, 1.55, 0);

        const promptCanvas = document.createElement('canvas');
        promptCanvas.width = 512;
        promptCanvas.height = 128;
        const prCtx = promptCanvas.getContext('2d');
        prCtx.fillStyle = '#0f172a';
        prCtx.fillRect(0, 0, 512, 128);
        prCtx.strokeStyle = '#00f5d4';
        prCtx.lineWidth = 6;
        prCtx.strokeRect(6, 6, 500, 116);
        prCtx.fillStyle = '#ffffff';
        prCtx.font = '900 30px "Space Grotesk", sans-serif';
        prCtx.textAlign = 'center';
        prCtx.fillText('💻 MÁY TÍNH WINDOWS 98', 256, 52);
        prCtx.fillStyle = '#00f5d4';
        prCtx.font = 'bold 24px "Space Grotesk", sans-serif';
        prCtx.fillText('BẤM VÀO ĐỂ NGỒI & SỬ DỤNG', 256, 92);

        const promptTex = new THREE.CanvasTexture(promptCanvas);
        const promptMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(1.2, 0.3),
            new THREE.MeshBasicMaterial({ map: promptTex })
        );
        promptGroup.add(promptMesh);
        pcGroup.add(promptGroup);

        // Đăng ký tương tác click an toàn
        if (crtScreen) crtScreen.userData.onClick = () => this._openRetroComputerOSModal();
        if (bezelMesh) bezelMesh.userData.onClick = () => this._openRetroComputerOSModal();
        if (seatMesh) seatMesh.userData.onClick = () => this._openRetroComputerOSModal();
        if (promptMesh) promptMesh.userData.onClick = () => this._openRetroComputerOSModal();

        shopGroup.add(pcGroup);
    }

    /* 🖥️ MỞ GIAO DIỆN WINDOWS 98 OVERLAY VỚI 4 ỨNG DỤNG (ẢNH, NHẬT KÝ, VIDEO, RẮN SĂN MỒI) */
    _openRetroComputerOSModal() {
        let modal = document.getElementById('retro-computer-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'retro-computer-modal';
            modal.style.cssText = `
                position: fixed; inset: 0; z-index: 99999;
                background: rgba(10, 14, 23, 0.92);
                backdrop-filter: blur(12px);
                display: flex; flex-direction: column;
                align-items: center; justify-content: center;
                font-family: "Outfit", sans-serif;
            `;

            modal.innerHTML = `
                <div id="pc-modal-frame" style="width: 900px; max-width: 95vw; height: 600px; background: #008080; border: 4px solid #c0c0c0; border-radius: 6px; box-shadow: 0 25px 50px rgba(0,0,0,0.8); display: flex; flex-direction: column; overflow: hidden; position: relative; transition: all 0.2s ease;">
                    <!-- Windows Title Bar -->
                    <div style="background: linear-gradient(90deg, #000080, #1084d0); color: white; padding: 6px 10px; font-weight: 800; display: flex; justify-content: space-between; align-items: center; font-family: 'Space Grotesk', sans-serif;">
                        <span style="font-size: 13px;">🪟 RETRO WINDOWS 98 OS - VIET ANH WORKSTATION</span>
                        <div class="win98-btn-group">
                            <button id="btn-min-pc-modal" class="win98-btn-ctrl" title="Minimize">_</button>
                            <button id="btn-max-pc-modal" class="win98-btn-ctrl" title="Maximize">🗖</button>
                            <button id="btn-close-pc-modal" class="win98-btn-ctrl" title="Close">✕</button>
                        </div>
                    </div>

                    <!-- Desktop Workspace (Vertical Alignment & Multi-Window Support) -->
                    <div id="pc-desktop-workspace" style="flex: 1; padding: 24px; display: flex; flex-direction: column; align-items: flex-start; gap: 20px; position: relative; width: 100%; box-sizing: border-box; overflow: hidden;">
                        
                        <!-- Desktop Icons (Stacked Vertically) -->
                        <div class="pc-app-icon" data-app="gallery">
                            <div style="font-size: 38px; margin-bottom: 4px;">🖼️</div>
                            <span class="pc-app-label">Thư Viện Ảnh</span>
                        </div>

                        <div class="pc-app-icon" data-app="diary">
                            <div style="font-size: 38px; margin-bottom: 4px;">📖</div>
                            <span class="pc-app-label">Nhật Ký</span>
                        </div>

                        <div class="pc-app-icon" data-app="video">
                            <div style="font-size: 38px; margin-bottom: 4px;">🎬</div>
                            <span class="pc-app-label">Xem Video</span>
                        </div>

                        <div class="pc-app-icon" data-app="snake">
                            <div style="font-size: 38px; margin-bottom: 4px;">🐍</div>
                            <span class="pc-app-label">Rắn Săn Mồi</span>
                        </div>

                    </div>

                    <!-- Taskbar -->
                    <div style="height: 36px; background: #c0c0c0; border-top: 2px solid #ffffff; display: flex; align-items: center; padding: 0 8px; justify-content: space-between;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <button style="background: #c0c0c0; border: 2px outset #ffffff; font-weight: 900; padding: 4px 12px; cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 12px;">Start 🪟</button>
                            <div id="pc-taskbar-apps-container" style="display: flex; align-items: center; gap: 4px; overflow-x: auto;"></div>
                        </div>
                        <span style="font-weight: bold; font-family: monospace; border: 1px inset #808080; padding: 2px 8px; background: #dfdfdf;">${new Date().toLocaleTimeString()}</span>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Initialize Z-Index tracker for multi-window focus
            this.pcTopZIndex = 10;

            // Bind Main Modal Titlebar Controls
            const modalFrame = document.getElementById('pc-modal-frame');
            document.getElementById('btn-close-pc-modal').onclick = () => {
                modal.style.display = 'none';
            };
            document.getElementById('btn-min-pc-modal').onclick = () => {
                modal.style.display = 'none';
            };
            document.getElementById('btn-max-pc-modal').onclick = () => {
                if (!modalFrame) return;
                if (modalFrame.dataset.maximized === 'true') {
                    modalFrame.dataset.maximized = 'false';
                    modalFrame.style.width = '900px';
                    modalFrame.style.height = '600px';
                    modalFrame.style.maxWidth = '95vw';
                    modalFrame.style.maxHeight = '95vh';
                } else {
                    modalFrame.dataset.maximized = 'true';
                    modalFrame.style.width = '100vw';
                    modalFrame.style.height = '100vh';
                    modalFrame.style.maxWidth = '100vw';
                    modalFrame.style.maxHeight = '100vh';
                }
            };

            const appIcons = modal.querySelectorAll('.pc-app-icon');
            appIcons.forEach(icon => {
                icon.onclick = (e) => {
                    e.stopPropagation();
                    appIcons.forEach(i => i.classList.remove('selected'));
                    icon.classList.add('selected');
                    const appType = icon.getAttribute('data-app');
                    this._launchPCApp(appType);
                };
            });

            const desktopWorkspace = document.getElementById('pc-desktop-workspace');
            if (desktopWorkspace) {
                desktopWorkspace.onclick = (e) => {
                    if (!e.target.closest('.pc-app-icon') && !e.target.closest('.pc-window-frame')) {
                        appIcons.forEach(i => i.classList.remove('selected'));
                    }
                };
            }
        }

        modal.style.display = 'flex';
    }

    /* 🖥️ QUẢN LÝ TẬP TRUNG NHIỀU CỬA SỔ & THANH TASKBAR */
    _focusPCAppWindow(appType) {
        const workspace = document.getElementById('pc-desktop-workspace');
        if (!workspace) return;

        this.pcTopZIndex = (this.pcTopZIndex || 10) + 1;

        // Reset titlebar headers to inactive gray
        workspace.querySelectorAll('.pc-window-frame').forEach(win => {
            const header = win.querySelector('.pc-window-header');
            if (header) header.style.background = '#808080';
        });

        // Set focused window titlebar to active navy blue
        const focusedWin = document.getElementById(`pc-app-window-${appType}`);
        if (focusedWin) {
            focusedWin.style.display = 'flex';
            focusedWin.style.zIndex = this.pcTopZIndex;
            const header = focusedWin.querySelector('.pc-window-header');
            if (header) header.style.background = '#000080';
        }

        // Set active taskbar button state
        const taskbarContainer = document.getElementById('pc-taskbar-apps-container');
        if (taskbarContainer) {
            taskbarContainer.querySelectorAll('.win98-taskbar-btn').forEach(btn => btn.classList.remove('active'));
            const activeBtn = document.getElementById(`taskbar-app-btn-${appType}`);
            if (activeBtn) activeBtn.classList.add('active');
        }
    }

    _minimizePCAppWindow(appType) {
        const win = document.getElementById(`pc-app-window-${appType}`);
        if (win) win.style.display = 'none';

        const btn = document.getElementById(`taskbar-app-btn-${appType}`);
        if (btn) btn.classList.remove('active');
    }

    _closePCAppWindow(appType) {
        const win = document.getElementById(`pc-app-window-${appType}`);
        if (win) win.remove();

        const btn = document.getElementById(`taskbar-app-btn-${appType}`);
        if (btn) btn.remove();
    }

    /* 🚀 KHỞI CHẠY CÁC ỨNG DỤNG RETRO MULTI-WINDOW (ẢNH, NHẬT KÝ, VIDEO, RẮN SĂN MỒI) */
    _launchPCApp(appType) {
        const workspace = document.getElementById('pc-desktop-workspace');
        const taskbarContainer = document.getElementById('pc-taskbar-apps-container');
        if (!workspace || !taskbarContainer) return;

        const appMeta = {
            gallery: { title: '🖼️ Thư Viện Ảnh - Photo Showcase', name: 'Thư Viện Ảnh', icon: '🖼️', top: 20, left: 120 },
            diary: { title: '📖 Nhật Ký Phát Triển - Developer Log', name: 'Nhật Ký', icon: '📖', top: 50, left: 170 },
            video: { title: '🎬 Retro Media Player - Trailer Video', name: 'Xem Video', icon: '🎬', top: 80, left: 220 },
            snake: { title: '🐍 Game Rắn Săn Mồi - Classic Retro Snake Game', name: 'Rắn Săn Mồi', icon: '🐍', top: 110, left: 270 },
            tetris: { title: '🧩 Xếp Hình 98 - Tetris Game', name: 'Xếp Hình 98', icon: '🧩', top: 140, left: 310 },
            paint: { title: '🎨 Paint 98 - Độ Tem Xe & Khẩu Hiệu 3D', name: 'Paint 98', icon: '🎨', top: 160, left: 350 }
        };

        const meta = appMeta[appType];
        if (!meta) return;

        if (typeof window.openWin98App === 'function') {
            window.openWin98App(appType);
        }

        // 1. Check or Create Taskbar Button
        let taskbarBtn = document.getElementById(`taskbar-app-btn-${appType}`);
        if (!taskbarBtn) {
            taskbarBtn = document.createElement('button');
            taskbarBtn.id = `taskbar-app-btn-${appType}`;
            taskbarBtn.className = 'win98-taskbar-btn active';
            taskbarBtn.setAttribute('data-app', appType);
            taskbarBtn.innerHTML = `<span>${meta.icon}</span><span>${meta.name}</span>`;

            taskbarBtn.onclick = (e) => {
                e.stopPropagation();
                const win = document.getElementById(`pc-app-window-${appType}`);
                if (win && win.style.display !== 'none' && taskbarBtn.classList.contains('active')) {
                    this._minimizePCAppWindow(appType);
                } else {
                    this._focusPCAppWindow(appType);
                }
            };
            taskbarContainer.appendChild(taskbarBtn);
        }

        // 2. Check or Create App Window
        let win = document.getElementById(`pc-app-window-${appType}`);
        if (!win) {
            win = document.createElement('div');
            win.id = `pc-app-window-${appType}`;
            win.className = 'pc-window-frame';
            win.setAttribute('data-app', appType);
            win.style.cssText = `
                position: absolute; top: ${meta.top}px; left: ${meta.left}px;
                width: 560px; height: 380px; max-width: 90%; max-height: 85%;
                background: #c0c0c0; border: 3px outset #ffffff;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5); display: flex; flex-direction: column;
            `;

            let contentHtml = '';
            if (appType === 'gallery') {
                contentHtml = `
                    <h3 style="margin-top:0; color:#000080;">BỘ BỘ ANH CHỌN LỌC DỰ ÁN 3D</h3>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
                        <div style="border:2px solid #ccc; padding:6px; background:#f8fafc; text-align:center;">
                            <img src="https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400" style="width:100%; height:110px; object-fit:cover; border-radius:4px;" />
                            <p style="margin:4px 0 0; font-size:12px; font-weight:bold;">Biển Đảo Cyberpunk</p>
                        </div>
                        <div style="border:2px solid #ccc; padding:6px; background:#f8fafc; text-align:center;">
                            <img src="https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=400" style="width:100%; height:110px; object-fit:cover; border-radius:4px;" />
                            <p style="margin:4px 0 0; font-size:12px; font-weight:bold;">Đêm Neon Vancouver</p>
                        </div>
                        <div style="border:2px solid #ccc; padding:6px; background:#f8fafc; text-align:center;">
                            <img src="https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=400" style="width:100%; height:110px; object-fit:cover; border-radius:4px;" />
                            <p style="margin:4px 0 0; font-size:12px; font-weight:bold;">Siêu Xe Lamborghini</p>
                        </div>
                    </div>
                `;
            } else if (appType === 'diary') {
                contentHtml = `
                    <div style="font-family: monospace; background:#fffae6; padding:16px; border:1px solid #d97706; border-radius:4px; line-height:1.6;">
                        <h3 style="margin-top:0; color:#b45309;">📝 NHẬT KÝ DỰ ÁN VIỆT ANH 3D</h3>
                        <p><strong>[2026-07-23]</strong> Hoàn thiện góc quầy Ramen Cyberpunk ANH Zhou Style 100%.</p>
                        <p><strong>[Features]</strong> Đã thiết kế 4 tô mì Ramen siêu thật, 4 ghế Bar Cyberpunk, Màn hình TV phát video Live 4K, Cột LED Billboard "Hi, I'm Viet Anh." bên phải.</p>
                        <p><strong>[Character]</strong> Nhân vật Chú Đậu Anime đeo tai nghe DJ uốn vòm Parabol cực mịn với nét miệng cười nụ chữ U siêu đáng yêu.</p>
                        <p><strong>[Workstation]</strong> Nâng cấp trạm máy tính bàn Retro CRT với hệ điều hành Retro Windows 98 Multi-Window & Multi-Taskbar chuẩn 100% ảnh mẫu!</p>
                    </div>
                `;
            } else if (appType === 'video') {
                contentHtml = `
                    <div style="text-align:center;">
                        <video src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" controls autoplay style="width:100%; max-height:280px; border:3px solid #000; border-radius:6px;"></video>
                        <p style="font-weight:bold; color:#000080; margin-top:8px;">Live Stream Showreel Cyberpunk Demo</p>
                    </div>
                `;
            } else if (appType === 'snake') {
                contentHtml = `
                    <div style="text-align:center; display:flex; flex-direction:column; align-items:center;">
                        <div style="display:flex; justify-content:space-between; width:360px; margin-bottom:8px; font-weight:bold; font-size:16px; color:#000080;">
                            <span>Điểm: <span id="snake-score">0</span></span>
                            <span>Kỷ Lục: <span id="snake-highscore">0</span></span>
                        </div>
                        <canvas id="snake-canvas" width="360" height="260" style="background:#050508; border:3px solid #00f5d4; border-radius:4px;"></canvas>
                        <p style="font-size:12px; color:#64748b; margin-top:6px;">Dùng phím Mũi tên / WASD để điều khiển Rắn ăn táo 🍎</p>
                    </div>
                `;
            }

            win.innerHTML = `
                <div class="pc-window-header" style="background: #000080; color: white; padding: 4px 8px; font-weight: bold; display: flex; justify-content: space-between; align-items: center; font-size: 13px; user-select: none;">
                    <span>${meta.title}</span>
                    <div class="win98-btn-group">
                        <button class="win98-btn-ctrl btn-min-app" title="Minimize">_</button>
                        <button class="win98-btn-ctrl btn-max-app" title="Maximize">🗖</button>
                        <button class="win98-btn-ctrl btn-close-app" title="Close">✕</button>
                    </div>
                </div>
                <div class="pc-window-body" style="flex: 1; padding: 16px; background: #ffffff; overflow-y: auto; color: #111111;">
                    ${contentHtml}
                </div>
            `;

            // Bind Window Focus & Control Buttons
            win.onmousedown = () => this._focusPCAppWindow(appType);

            win.querySelector('.btn-min-app').onclick = (e) => {
                e.stopPropagation();
                this._minimizePCAppWindow(appType);
            };

            win.querySelector('.btn-max-app').onclick = (e) => {
                e.stopPropagation();
                if (win.dataset.maximized === 'true') {
                    win.dataset.maximized = 'false';
                    win.style.top = `${meta.top}px`;
                    win.style.left = `${meta.left}px`;
                    win.style.width = '560px';
                    win.style.height = '380px';
                    win.style.maxWidth = '90%';
                    win.style.maxHeight = '85%';
                } else {
                    win.dataset.maximized = 'true';
                    win.style.top = '0';
                    win.style.left = '0';
                    win.style.width = '100%';
                    win.style.height = '100%';
                    win.style.maxWidth = '100%';
                    win.style.maxHeight = '100%';
                }
            };

            win.querySelector('.btn-close-app').onclick = (e) => {
                e.stopPropagation();
                this._closePCAppWindow(appType);
            };

            workspace.appendChild(win);

            if (appType === 'snake') {
                setTimeout(() => this._initSnakeGame(), 50);
            }
        }

        // Focus and bring window to front
        this._focusPCAppWindow(appType);
    }

    /* 🐍 GAME RẮN SĂN MỒI RETRO 60FPS THUẬT TOÁN CANVASCORRECT */
    _initSnakeGame() {
        const canvas = document.getElementById('snake-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const scoreEl = document.getElementById('snake-score');
        const highEl = document.getElementById('snake-highscore');

        const gridSize = 15;
        const cols = canvas.width / gridSize;
        const rows = canvas.height / gridSize;

        let snake = [{ x: 10, y: 8 }, { x: 9, y: 8 }, { x: 8, y: 8 }];
        let food = { x: 15, y: 8 };
        let dir = { x: 1, y: 0 };
        let score = 0;
        let highScore = parseInt(localStorage.getItem('snake_highscore') || '0');
        if (highEl) highEl.innerText = highScore;

        const onKeyDown = (e) => {
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { if (dir.y !== 1) dir = { x: 0, y: -1 }; }
            else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { if (dir.y !== -1) dir = { x: 0, y: 1 }; }
            else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { if (dir.x !== 1) dir = { x: -1, y: 0 }; }
            else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { if (dir.x !== -1) dir = { x: 1, y: 0 }; }
        };

        window.removeEventListener('keydown', onKeyDown);
        window.addEventListener('keydown', onKeyDown);

        if (this.snakeInterval) clearInterval(this.snakeInterval);
        this.snakeInterval = setInterval(() => {
            const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

            // Game Over Collision Wall or Self
            if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows || snake.some(s => s.x === head.x && s.y === head.y)) {
                snake = [{ x: 10, y: 8 }, { x: 9, y: 8 }, { x: 8, y: 8 }];
                dir = { x: 1, y: 0 };
                if (score > highScore) {
                    highScore = score;
                    localStorage.setItem('snake_highscore', highScore);
                    if (highEl) highEl.innerText = highScore;
                }
                score = 0;
                if (scoreEl) scoreEl.innerText = score;
                return;
            }

            snake.unshift(head);

            // Eat Food
            if (head.x === food.x && head.y === food.y) {
                score += 10;
                if (scoreEl) scoreEl.innerText = score;
                food = {
                    x: Math.floor(Math.random() * cols),
                    y: Math.floor(Math.random() * rows)
                };
            } else {
                snake.pop();
            }

            // Draw Snake Game
            ctx.fillStyle = '#050508';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Food 🍎
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(food.x * gridSize + 1, food.y * gridSize + 1, gridSize - 2, gridSize - 2);

            // Snake Body 🐍
            snake.forEach((s, idx) => {
                ctx.fillStyle = idx === 0 ? '#00f5d4' : '#10b981';
                ctx.fillRect(s.x * gridSize + 1, s.y * gridSize + 1, gridSize - 2, gridSize - 2);
            });
        }, 110);
    }

    /* 🎧 TẠO NHÂN VẬT ANIME BEAN ĐEO TAI NGHE & BÓNG THOẠI CHẤM THÁN [!] ĐỨNG Ở QUẦY (CHUẨN 100% ẢNH MẪU) */
    _createHeadphoneBeanNPC() {
        const npcGroup = new THREE.Group();

        // 1. Thân Đậu Màu Cyan/Teal Smooth Bean Capsule Body
        const beanMat = new THREE.MeshStandardMaterial({
            color: 0x00a896,
            emissive: 0x004d40,
            emissiveIntensity: 0.15,
            roughness: 0.3,
            metalness: 0.05
        });
        const bodyMesh = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.28, 0.65, 16, 24),
            beanMat
        );
        bodyMesh.position.y = 0.65;
        bodyMesh.castShadow = true;
        npcGroup.add(bodyMesh);

        // 2. Mặt Trắng Oval Face Plate & Đôi Mắt Chấm Đen
        const facePatch = new THREE.Mesh(
            new THREE.SphereGeometry(0.18, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        facePatch.scale.set(1.0, 1.25, 0.4);
        facePatch.position.set(0, 0.72, 0.22);
        npcGroup.add(facePatch);

        // 2 Mắt Chấm Đen Cute
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
        [-0.07, 0.07].forEach(ex => {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 10), eyeMat);
            eye.position.set(ex, 0.76, 0.28);
            npcGroup.add(eye);
        });

        // Nét Miệng Bo Cong Hình Chữ U Nụ Cười (U-Shaped Mouth Curve)
        const mouthGeo = new THREE.TorusGeometry(0.042, 0.008, 12, 24, Math.PI * 0.75);
        const mouthMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
        const mouthMesh = new THREE.Mesh(mouthGeo, mouthMat);
        mouthMesh.rotation.x = Math.PI / 2 + 0.2;
        mouthMesh.position.set(0, 0.69, 0.285);
        npcGroup.add(mouthMesh);

        // Chấm Ửng Hồng Cheeks
        const blushMat = new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.6 });
        [-0.10, 0.10].forEach(bx => {
            const blush = new THREE.Mesh(new THREE.CircleGeometry(0.032, 12), blushMat);
            blush.position.set(bx, 0.70, 0.285);
            npcGroup.add(blush);
        });

        // 3. DJ TAI NGHE ĐEO ĐẦU VÒNG ÔM SÁT ĐỈNH ĐẦU DẠNG PARABOL MỊN MÀNG (SNUG PARABOLIC HEADBAND)
        const headbandCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-0.31, 0.75, 0.0),
            new THREE.Vector3(-0.30, 0.95, 0.0),
            new THREE.Vector3(-0.21, 1.18, 0.0),
            new THREE.Vector3(0.00, 1.28, 0.0), // Vòng parabol ôm sát đỉnh đầu (cao 1.28m vừa chớm trên đầu 1.25m)
            new THREE.Vector3(0.21, 1.18, 0.0),
            new THREE.Vector3(0.30, 0.95, 0.0),
            new THREE.Vector3(0.31, 0.75, 0.0)
        ]);
        headbandCurve.curveType = 'centripetal';

        const headbandGeo = new THREE.TubeGeometry(headbandCurve, 40, 0.036, 14, false);
        const headbandMat = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.2,
            metalness: 0.8
        });
        const headband = new THREE.Mesh(headbandGeo, headbandMat);
        npcGroup.add(headband);

        // 2 Củ Đèn Tai Ốp Vòng Kim Loại Silver (Cắm nối khớp trực tiếp hai đầu của vòm)
        const cupMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.8 });
        const silverRimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.1, metalness: 0.95 });

        [-0.31, 0.31].forEach(cx => {
            const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 20), cupMat);
            cup.rotation.z = Math.PI / 2;
            cup.position.set(cx, 0.75, 0);
            npcGroup.add(cup);

            const silverRing = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.018, 10, 20), silverRimMat);
            silverRing.rotation.y = Math.PI / 2;
            silverRing.position.set(cx + (cx > 0 ? 0.04 : -0.04), 0.75, 0);
            npcGroup.add(silverRing);
        });

        // 4. CHÂN THỂ THAO VÀ GIÀY SNEAKER TRẮNG
        const legMat = new THREE.MeshStandardMaterial({ color: 0x0f3833, roughness: 0.5 });
        const shoeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });

        [-0.14, 0.14].forEach(lx => {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.44, 12), legMat);
            leg.position.set(lx, 0.22, 0);
            leg.castShadow = true;
            npcGroup.add(leg);

            const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.10, 0.25), shoeMat);
            shoe.position.set(lx, 0.05, 0.04);
            shoe.castShadow = true;
            npcGroup.add(shoe);
        });

        // 5. CÁNH TAY TẠO DÁNG SUY NGHĨ (THINKING POSE WITH HAND NEAR CHIN)
        const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.36, 8, 12), beanMat);
        armL.position.set(-0.31, 0.55, 0.04);
        armL.rotation.z = 0.2;
        npcGroup.add(armL);

        const armR = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.36, 8, 12), beanMat);
        armR.position.set(0.24, 0.62, 0.18);
        armR.rotation.set(-0.8, -0.4, -0.9);
        npcGroup.add(armR);

        // 6. ❗ BÓNG THOẠI HÌNH CHỮ NHẬT CHỨA DẤU CHẤM THÁN NỔI BẬT CHUẨN 100% ẢNH MẪU
        const bubbleGroup = new THREE.Group();
        bubbleGroup.position.set(0, 1.82, 0);

        const bubbleBack = new THREE.Mesh(
            new THREE.BoxGeometry(0.58, 0.42, 0.05),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        bubbleGroup.add(bubbleBack);

        const bubbleTail = new THREE.Mesh(
            new THREE.ConeGeometry(0.08, 0.12, 3),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        bubbleTail.rotation.z = Math.PI;
        bubbleTail.position.set(-0.08, -0.26, 0);
        bubbleGroup.add(bubbleTail);

        const exStem = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.045, 0.15, 8, 12),
            new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.6 })
        );
        exStem.position.set(0, 0.05, 0.035);
        bubbleGroup.add(exStem);

        const exDot = new THREE.Mesh(
            new THREE.SphereGeometry(0.045, 12, 12),
            new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.6 })
        );
        exDot.position.set(0, -0.12, 0.035);
        bubbleGroup.add(exDot);

        npcGroup.add(bubbleGroup);
        npcGroup.userData.bubbleGroup = bubbleGroup;

        return npcGroup;
    }

    /* 🍜 TẠO TÔ MÌ RAMEN CHÂN THỰC 3D (4 HYPER-REALISTIC RAMEN BOWLS) */
    _createDetailedRamenBowl() {
        const bowlGroup = new THREE.Group();

        // 1. Vỏ Tô Sứ Đỏ/Đen Bóng Bẩy (Ceramic Bowl Body)
        const bowlGeo = new THREE.CylinderGeometry(0.24, 0.15, 0.20, 24);
        const bowlMat = new THREE.MeshStandardMaterial({
            color: 0xd90429,
            roughness: 0.15,
            metalness: 0.1
        });
        const bowlMesh = new THREE.Mesh(bowlGeo, bowlMat);
        bowlMesh.castShadow = true;
        bowlGroup.add(bowlMesh);

        // Viền Đen Bóng Quanh Miệng Tô
        const rimMesh = new THREE.Mesh(
            new THREE.TorusGeometry(0.24, 0.02, 12, 24),
            new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 })
        );
        rimMesh.rotation.x = Math.PI / 2;
        rimMesh.position.y = 0.10;
        bowlGroup.add(rimMesh);

        // 2. Nước Lèo Tonkotsu Đậm Đà (Rich Ramen Broth)
        const brothMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.22, 0.22, 0.02, 24),
            new THREE.MeshStandardMaterial({
                color: 0x9a3412,
                roughness: 0.05,
                emissive: 0x7c2d12,
                emissiveIntensity: 0.25
            })
        );
        brothMesh.position.y = 0.07;
        bowlGroup.add(brothMesh);

        // 3. Vắt Mì Vàng Cong Bồng Bềnh (Curly Noodle Strands)
        const noodleMat = new THREE.MeshStandardMaterial({
            color: 0xfef08a,
            emissive: 0xfde047,
            emissiveIntensity: 0.2,
            roughness: 0.4
        });
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const r = 0.08 + (i % 2) * 0.04;
            const noodleRing = new THREE.Mesh(new THREE.TorusGeometry(r, 0.02, 8, 16), noodleMat);
            noodleRing.rotation.x = Math.PI / 2 + (i % 3) * 0.1;
            noodleRing.position.set(Math.cos(angle) * 0.06, 0.085, Math.sin(angle) * 0.06);
            bowlGroup.add(noodleRing);
        }

        // 4. TOPPINGS CHI TIẾT SIÊU THẬT (Narutomaki, Trứng, Thịt Xá Xíu, Rong Biển Nori)
        // Chả cá xoắn Narutomaki
        const narutoGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.015, 16);
        const narutoMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
        const narutoMesh = new THREE.Mesh(narutoGeo, narutoMat);
        narutoMesh.position.set(-0.08, 0.095, -0.05);
        narutoMesh.rotation.z = 0.1;
        bowlGroup.add(narutoMesh);

        const pinkSwirl = new THREE.Mesh(
            new THREE.TorusGeometry(0.025, 0.008, 8, 16),
            new THREE.MeshBasicMaterial({ color: 0xff007f })
        );
        pinkSwirl.rotation.x = Math.PI / 2;
        pinkSwirl.position.set(-0.08, 0.103, -0.05);
        bowlGroup.add(pinkSwirl);

        // Nửa Trứng Ajitsuke Tamago
        const eggWhite = new THREE.Mesh(
            new THREE.SphereGeometry(0.06, 12, 12),
            new THREE.MeshStandardMaterial({ color: 0xfffbeb, roughness: 0.2 })
        );
        eggWhite.scale.set(1.2, 0.5, 0.9);
        eggWhite.position.set(0.08, 0.095, -0.06);
        bowlGroup.add(eggWhite);

        const eggYolk = new THREE.Mesh(
            new THREE.SphereGeometry(0.035, 10, 10),
            new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.1 })
        );
        eggYolk.position.set(0.08, 0.105, -0.06);
        bowlGroup.add(eggYolk);

        // Lát Thịt Xá Xíu Chashu Pork
        const chashuMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.075, 0.075, 0.015, 12),
            new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 })
        );
        chashuMesh.scale.set(1.3, 1, 0.9);
        chashuMesh.position.set(-0.04, 0.092, 0.08);
        chashuMesh.rotation.y = 0.4;
        bowlGroup.add(chashuMesh);

        // Lá Rong Biển Nori
        const noriMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.13, 0.008),
            new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.8 })
        );
        noriMesh.position.set(0.12, 0.14, 0.05);
        noriMesh.rotation.set(0.3, -0.2, 0.2);
        bowlGroup.add(noriMesh);

        // 5. Đôi Đũa Tre Gác Trực Tiếp Qua Thành Tô
        const stickMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 });
        [-0.02, 0.02].forEach(dz => {
            const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.018, 0.55, 8), stickMat);
            stick.rotation.z = Math.PI / 2.4;
            stick.rotation.y = 0.2;
            stick.position.set(0.05, 0.13, dz + 0.04);
            bowlGroup.add(stick);
        });

        return bowlGroup;
    }

    /* 🪑 TẠO GHẾ BAR CYBERPUNK SIÊU ĐẸP (4 CYBERBAR STOOLS) */
    _createCyberBarStool() {
        const stoolGroup = new THREE.Group();

        // 1. Vòng Chân Chrome Kim Loại Phát Sáng LED Cyan
        const baseRing = new THREE.Mesh(
            new THREE.CylinderGeometry(0.34, 0.36, 0.05, 24),
            new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 })
        );
        baseRing.position.y = 0.025;
        stoolGroup.add(baseRing);

        const neonBaseRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.35, 0.025, 12, 32),
            new THREE.MeshStandardMaterial({ color: 0x00f5d4, emissive: 0x00f5d4, emissiveIntensity: 2.0 })
        );
        neonBaseRing.rotation.x = Math.PI / 2;
        neonBaseRing.position.y = 0.025;
        stoolGroup.add(neonBaseRing);

        // 2. Cột Trục Thủy Lực Chrome Cao Cấp & Vòng Gác Chân
        const poleMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.05, 0.52, 12),
            new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95, roughness: 0.1 })
        );
        poleMesh.position.y = 0.28;
        stoolGroup.add(poleMesh);

        const footrestRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.22, 0.025, 8, 24),
            new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.2 })
        );
        footrestRing.rotation.x = Math.PI / 2;
        footrestRing.position.y = 0.22;
        stoolGroup.add(footrestRing);

        // 3. Đệm Ghế Bo Cong Tròn Bọc Da Neon Hồng Sáng Đẹp
        const seatMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.34, 0.30, 0.10, 24),
            new THREE.MeshStandardMaterial({
                color: 0xff007f,
                emissive: 0xff007f,
                emissiveIntensity: 0.8,
                roughness: 0.2
            })
        );
        seatMesh.position.y = 0.55;
        seatMesh.castShadow = true;
        stoolGroup.add(seatMesh);

        return stoolGroup;
    }

    /* 📺 GIANT CYBERPUNK OUTDOOR LED TV BILLBOARD (ANH ZHOU PORTFOLIO STYLE) */
    _buildCyberpunkLedTv(parentGroup) {
        const tvGroup = new THREE.Group();
        tvGroup.position.set(8.5, 0, 0.5);

        // 1. Glowing Cyan Energy Ring Base Platform
        const baseRingGeo = new THREE.CylinderGeometry(0.85, 0.95, 0.12, 32);
        const baseRingMat = new THREE.MeshStandardMaterial({
            color: 0x090d16,
            emissive: 0x00f5d4,
            emissiveIntensity: 0.9,
            roughness: 0.2,
            metalness: 0.8
        });
        const baseRing = new THREE.Mesh(baseRingGeo, baseRingMat);
        baseRing.position.y = 0.06;
        baseRing.castShadow = true;
        tvGroup.add(baseRing);

        // Sub Platform Cylinder Grid (ANH Zhou Metallic Stand)
        const gridPedestalGeo = new THREE.CylinderGeometry(0.7, 0.75, 0.35, 32);
        const gridPedestalMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4, metalness: 0.7 });
        const gridPedestal = new THREE.Mesh(gridPedestalGeo, gridPedestalMat);
        gridPedestal.position.y = 0.28;
        tvGroup.add(gridPedestal);

        // 2. Heavy Metallic Support Pole
        const poleGeo = new THREE.CylinderGeometry(0.1, 0.14, 2.2, 16);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.3, metalness: 0.9 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = 1.45;
        pole.castShadow = true;
        tvGroup.add(pole);

        // 3. Metallic TV Bezel Outer Frame
        const frameGeo = new THREE.BoxGeometry(3.6, 2.3, 0.18);
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.8 });
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.set(0, 2.45, 0);
        frame.castShadow = true;

        // Glowing Frame Neon Accent Trim
        const trimGeo = new THREE.BoxGeometry(3.68, 2.38, 0.06);
        const trimMat = new THREE.MeshStandardMaterial({ color: 0x00f5d4, emissive: 0x00f5d4, emissiveIntensity: 0.9, roughness: 0.1 });
        const trim = new THREE.Mesh(trimGeo, trimMat);
        trim.position.set(0, 2.45, -0.04);
        tvGroup.add(trim);
        tvGroup.add(frame);

        // 4. Dynamic HTML5 Canvas LED Screen Texture
        this.ledTvCanvas = document.createElement('canvas');
        this.ledTvCanvas.width = 1024;
        this.ledTvCanvas.height = 600;
        this.ledTvCtx = this.ledTvCanvas.getContext('2d');
        this.ledTvAnimTime = 0;

        this.ledTvTexture = new THREE.CanvasTexture(this.ledTvCanvas);

        const screenGeo = new THREE.PlaneGeometry(3.48, 2.18);
        const screenMat = new THREE.MeshStandardMaterial({
            map: this.ledTvTexture,
            emissiveMap: this.ledTvTexture,
            emissive: 0xffffff,
            emissiveIntensity: 1.0,
            roughness: 0.1
        });
        const screenPlane = new THREE.Mesh(screenGeo, screenMat);
        screenPlane.position.set(0, 2.45, 0.095);
        tvGroup.add(screenPlane);

        parentGroup.add(tvGroup);
    }

    _updateLedTvDisplay(deltaTime) {
        if (!this.ledTvCtx) return;
        this.ledTvAnimTime += deltaTime;
        const time = this.ledTvAnimTime;

        const ctx = this.ledTvCtx;
        const w = 1024;
        const h = 600;

        // 1. Dark Cyberpunk Background
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, w, h);

        // Cyber Grid Lines
        ctx.strokeStyle = 'rgba(0, 245, 212, 0.08)';
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = 0; y < h; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // Outer Neon Frame Border
        ctx.strokeStyle = '#00f5d4';
        ctx.lineWidth = 8;
        ctx.strokeRect(10, 10, w - 20, h - 20);

        // 2. Top Header Navigation Bar (ANH Zhou Style)
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(18, 18, w - 36, 60);

        // Back Button Text
        ctx.font = 'bold 24px "Space Grotesk", sans-serif';
        ctx.fillStyle = '#00f5d4';
        ctx.textAlign = 'left';
        ctx.fillText('← Back', 36, 54);

        // Top Accent Color Strips (Cyan, Orange, Pink)
        ctx.fillStyle = '#00f5d4';
        ctx.fillRect(160, 32, 100, 8);
        ctx.fillStyle = '#f97316';
        ctx.fillRect(270, 32, 70, 8);
        ctx.fillStyle = '#ff007f';
        ctx.fillRect(350, 32, 120, 8);

        // Top Right Vertical Tabs
        ctx.font = 'bold 20px "Space Grotesk", sans-serif';
        ctx.fillStyle = '#00f5d4';
        ctx.fillText('About', w - 380, 54);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Skills', w - 280, 54);
        ctx.fillText('Experience', w - 160, 54);

        // 3. Main Hero Profile Box
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.strokeStyle = 'rgba(0, 245, 212, 0.4)';
        ctx.lineWidth = 2;
        ctx.fillRect(36, 100, 680, 360);
        ctx.strokeRect(36, 100, 680, 360);

        // Hero Greeting Title
        ctx.font = '900 44px "Outfit", sans-serif';
        ctx.shadowColor = '#00f5d4';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#ffffff';
        ctx.fillText("Hi, I'm Viet Anh.", 64, 160);

        // Colorful Sub-line Strips under greeting
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#00f5d4';
        ctx.fillRect(64, 180, 120, 6);
        ctx.fillStyle = '#f97316';
        ctx.fillRect(190, 180, 80, 6);
        ctx.fillStyle = '#ff007f';
        ctx.fillRect(276, 180, 140, 6);

        // Bio Text Paragraph
        ctx.font = '500 22px "Inter", sans-serif';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText("I'm a Senior Creative Technologist & WebGL Master.", 64, 230);
        ctx.fillText("Building AAA Interactive 3D Web Apps & Cyberpunk Worlds.", 64, 268);
        ctx.fillText("Dự án tiêu biểu: Thái Bình Rush 3D & Showroom Siêu Xe.", 64, 306);
        ctx.fillText("Tích hợp Three.js, GLSL Shaders & Windows 98 Retro OS.", 64, 344);

        // Social Icons Row
        ctx.font = 'bold 26px "Space Grotesk", sans-serif';
        ctx.fillStyle = '#00f5d4';
        ctx.fillText('𝕏   in   🐙   ✉   🎮', 64, 420);

        // 4. Right Side Equalizer & Animated Visualizer Panel
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.strokeStyle = 'rgba(255, 0, 127, 0.4)';
        ctx.fillRect(736, 100, 252, 360);
        ctx.strokeRect(736, 100, 252, 360);

        ctx.font = 'bold 18px "Space Grotesk", sans-serif';
        ctx.fillStyle = '#ff007f';
        ctx.textAlign = 'center';
        ctx.fillText('● AUDIO SPECTRUM', 862, 134);

        // 10 Animated Spectrum Equalizer Bars
        const numBars = 10;
        const barWidth = 14;
        const startX = 760;
        for (let i = 0; i < numBars; i++) {
            const barHeight = Math.abs(Math.sin(time * 3.5 + i * 0.6)) * 220 + 20;
            const x = startX + i * 22;
            const y = 430 - barHeight;

            // Gradient fill for visualizer bars
            const grad = ctx.createLinearGradient(0, y, 0, 430);
            grad.addColorStop(0, '#ff007f');
            grad.addColorStop(0.5, '#00f5d4');
            grad.addColorStop(1, '#3b82f6');

            ctx.fillStyle = grad;
            ctx.fillRect(x, y, barWidth, barHeight);
        }

        // 5. Bottom Live System Status Bar
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(18, 480, w - 36, 95);
        ctx.strokeStyle = 'rgba(0, 245, 212, 0.5)';
        ctx.strokeRect(18, 480, w - 36, 95);

        ctx.font = 'bold 20px "Space Grotesk", sans-serif';
        ctx.fillStyle = '#00f5d4';
        ctx.textAlign = 'left';
        ctx.fillText('● SYSTEM METRICS:', 36, 520);

        ctx.fillStyle = '#4ade80';
        ctx.fillText('WEBGL 2.0: ACTIVE  |  FPS: 60  |  SHADER: STYLISED CLAY  |  RESOLUTION: 4K UHD', 260, 520);

        // Animated Moving Scanline
        const scanlineY = (time * 120) % h;
        ctx.fillStyle = 'rgba(0, 245, 212, 0.15)';
        ctx.fillRect(0, scanlineY, w, 6);

        this.ledTvTexture.needsUpdate = true;
    }

    _buildArcadeCabinet(parentGroup) {
        const arcadeGroup = new THREE.Group();
        arcadeGroup.position.set(-6.0, 0, -1.0);

        // Cabinet Body
        const cabGeo = new THREE.BoxGeometry(1.2, 2.4, 1.1);
        const cabMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.5, metalness: 0.3 });
        const cabinet = new THREE.Mesh(cabGeo, cabMat);
        cabinet.position.y = 1.2;
        cabinet.castShadow = true;
        arcadeGroup.add(cabinet);

        // CRT Screen (Cyan Emissive)
        const screenGeo = new THREE.PlaneGeometry(0.9, 0.7);
        const screenMat = new THREE.MeshStandardMaterial({
            color: 0x00f5d4,
            emissive: 0x00f5d4,
            emissiveIntensity: 0.9,
            roughness: 0.1
        });
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.set(0, 1.4, 0.56);
        arcadeGroup.add(screen);

        // Marquee Header "ARCADE 1998"
        const marqueeGeo = new THREE.BoxGeometry(1.1, 0.3, 0.05);
        const marqueeMat = new THREE.MeshStandardMaterial({ color: 0xff007f, emissive: 0xff007f, emissiveIntensity: 1.0 });
        const marquee = new THREE.Mesh(marqueeGeo, marqueeMat);
        marquee.position.set(0, 2.25, 0.56);
        arcadeGroup.add(marquee);

        parentGroup.add(arcadeGroup);
    }

    _buildVendingMachine(parentGroup) {
        const vendGroup = new THREE.Group();
        vendGroup.position.set(6.0, 0, -1.0);

        // Machine Body
        const vendGeo = new THREE.BoxGeometry(1.3, 2.5, 1.1);
        const vendMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4, metalness: 0.2 });
        const vend = new THREE.Mesh(vendGeo, vendMat);
        vend.position.y = 1.25;
        vend.castShadow = true;
        vendGroup.add(vend);

        // Glass Front Window
        const glassGeo = new THREE.PlaneGeometry(1.0, 1.4);
        const glassMat = new THREE.MeshStandardMaterial({ color: 0xa5f3fc, emissive: 0x38bdf8, emissiveIntensity: 0.6, roughness: 0.1, transparent: true, opacity: 0.85 });
        const glass = new THREE.Mesh(glassGeo, glassMat);
        glass.position.set(0, 1.45, 0.56);
        vendGroup.add(glass);

        parentGroup.add(vendGroup);
    }

    /* 🚦 INTERACTIVE NEON SIGNPOST POLE */
    /* 🚦 INTERACTIVE NEON SIGNPOST POLE (DỊCH SANG PHẢI KHÔNG CHE MẶT TIỀN QUẦY RAMEN) */
    _initInteractiveSignpost() {
        const signpostGroup = new THREE.Group();
        // 🎯 Dịch Z từ 36.0 sang 40.5 để đẩy cây cột sang bên phải!
        signpostGroup.position.set(29.0, 0, 40.5);

        // Cột sắt Metallic Support Pole
        const poleGeo = new THREE.CylinderGeometry(0.08, 0.1, 4.6, 16);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.3, metalness: 0.8 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = 2.3;
        pole.castShadow = true;
        signpostGroup.add(pole);

        // 4 Biển Hiệu Neon cùng chiều quầy Ramen
        const signsConfig = [
            { type: 'projects', label: '[PROJECTS]', color: 0x00f5d4, y: 3.8, rotY: Math.PI / 2 },
            { type: 'articles', label: '[SHOPFOOD]', color: 0xff007f, y: 3.1, rotY: Math.PI / 2 },
            { type: 'about', label: '[ABOUT ME]', color: 0xffd700, y: 2.4, rotY: Math.PI / 2 },
            { type: 'credits', label: '[CREDITS]', color: 0x00e5ff, y: 1.7, rotY: Math.PI / 2 }
        ];

        signsConfig.forEach((cfg) => {
            const arrowGroup = new THREE.Group();
            arrowGroup.position.set(0, cfg.y, 0);
            arrowGroup.rotation.y = cfg.rotY;

            // Tạo Canvas Texture cho Chữ Neon
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');

            const hexColor = '#' + cfg.color.toString(16).padStart(6, '0');

            ctx.fillStyle = '#090d16';
            ctx.fillRect(0, 0, 512, 128);

            ctx.strokeStyle = hexColor;
            ctx.lineWidth = 10;
            ctx.strokeRect(8, 8, 496, 112);

            ctx.font = '900 44px "Outfit", "Space Grotesk", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.shadowColor = hexColor;
            ctx.shadowBlur = 24;
            ctx.fillStyle = '#ffffff';
            ctx.fillText(cfg.label, 256, 64);

            ctx.shadowColor = hexColor;
            ctx.shadowBlur = 12;
            ctx.fillStyle = hexColor;
            ctx.fillText(cfg.label, 256, 64);

            const texture = new THREE.CanvasTexture(canvas);

            const boardGeo = new THREE.BoxGeometry(2.2, 0.48, 0.08);
            const boardMat = new THREE.MeshStandardMaterial({
                color: 0x090d16,
                roughness: 0.3,
                metalness: 0.7,
                emissive: cfg.color,
                emissiveIntensity: 0.35
            });
            const board = new THREE.Mesh(boardGeo, boardMat);
            board.castShadow = true;

            const textMat = new THREE.MeshStandardMaterial({
                map: texture,
                emissiveMap: texture,
                emissive: 0xffffff,
                emissiveIntensity: 1.0,
                roughness: 0.2
            });

            const textPlaneF = new THREE.Mesh(new THREE.PlaneGeometry(2.14, 0.45), textMat);
            textPlaneF.position.set(0, 0, 0.042);
            board.add(textPlaneF);

            const textPlaneB = new THREE.Mesh(new THREE.PlaneGeometry(2.14, 0.45), textMat);
            textPlaneB.position.set(0, 0, -0.042);
            textPlaneB.rotation.y = Math.PI;
            board.add(textPlaneB);

            board.userData = {
                isSignpostArrow: true,
                signType: cfg.type,
                baseColor: cfg.color,
                baseEmissiveIntensity: 0.35,
                textMat: textMat
            };

            this.signpostArrowMeshes.push(board);
            arrowGroup.add(board);
            signpostGroup.add(arrowGroup);
        });

        this.scene.add(signpostGroup);
    }
    /* 🖱️ RAYCASTER HOVER & CLICK LOGIC */
    _setupSignpostRaycaster() {
        const exitBtn = document.getElementById('btn-exit-station');

        // Mouse Move Hover Detector
        window.addEventListener('pointermove', (e) => {
            if (!this.isActive || this.isStationActive) return;

            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.signpostArrowMeshes, false);

            if (intersects.length > 0) {
                const hitObj = intersects[0].object;
                if (this.hoveredSign !== hitObj) {
                    if (this.hoveredSign) this._resetSignHover(this.hoveredSign);
                    this.hoveredSign = hitObj;
                    this._setSignHover(hitObj);
                }
            } else {
                if (this.hoveredSign) {
                    this._resetSignHover(this.hoveredSign);
                    this.hoveredSign = null;
                }
            }
        });

        // Mouse Click Station Zoom Trigger
        window.addEventListener('pointerdown', (e) => {
            if (!this.isActive || this.isStationActive) return;

            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.signpostArrowMeshes, false);

            if (intersects.length > 0) {
                const hitObj = intersects[0].object;
                const stationType = hitObj.userData.signType;
                if (stationType) {
                    e.stopPropagation();
                    this.zoomToStation(stationType);
                }
            }
        });

        // Keydown ESC Exit Station
        window.addEventListener('keydown', (e) => {
            if (!this.isActive) return;
            if (e.key.toUpperCase() === 'ESCAPE' && this.isStationActive) {
                this.exitStation();
            }
        });

        // Click Exit Button
        if (exitBtn) {
            exitBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.isStationActive) {
                    this.exitStation();
                }
            });
        }
    }

    _setSignHover(mesh) {
        document.body.style.cursor = 'pointer';
        if (mesh && mesh.material) {
            mesh.material.emissiveIntensity = 1.2;
            if (mesh.userData && mesh.userData.textMat) {
                mesh.userData.textMat.emissiveIntensity = 1.6;
            }
            mesh.scale.set(1.1, 1.1, 1.1);
        }
    }

    _resetSignHover(mesh) {
        document.body.style.cursor = 'default';
        if (mesh && mesh.material) {
            mesh.material.emissiveIntensity = mesh.userData.baseEmissiveIntensity || 0.35;
            if (mesh.userData && mesh.userData.textMat) {
                mesh.userData.textMat.emissiveIntensity = 1.0;
            }
            mesh.scale.set(1.0, 1.0, 1.0);
        }
    }

    /* 🎥 STATION CAMERA ZOOM TWEEN CONTROLLER */
    zoomToStation(stationType) {
        const targetConfig = this.stationCameraTargets[stationType];
        if (!targetConfig) return;

        this.isStationActive = true;
        this.activeStationType = stationType;
        this.stationTargetCamPos = targetConfig.pos.clone();
        this.stationTargetLookAt = targetConfig.lookAt.clone();

        const overlay = document.getElementById('cyber-station-overlay');
        const exitBtn = document.getElementById('btn-exit-station');

        if (exitBtn) exitBtn.classList.remove('hidden');

        if (stationType === 'articles') {
            setTimeout(() => {
                this._openRetroComputerOSModal();
            }, 650);
        } else {
            const winEl = document.getElementById(`station-window-${stationType}`);
            setTimeout(() => {
                if (overlay) overlay.classList.remove('hidden');
                if (winEl) winEl.classList.remove('hidden');
            }, 600);
        }
    }

    exitStation() {
        this.isStationActive = false;

        const overlay = document.getElementById('cyber-station-overlay');
        const exitBtn = document.getElementById('btn-exit-station');

        if (overlay) overlay.classList.add('hidden');
        if (exitBtn) exitBtn.classList.add('hidden');

        ['projects', 'articles', 'about', 'credits'].forEach(id => {
            const winEl = document.getElementById(`station-window-${id}`);
            if (winEl) winEl.classList.add('hidden');
        });

        this.activeStationType = null;
        this.stationTargetCamPos = null;
        this.stationTargetLookAt = null;
    }

    /* 🕹️ 20. VÒNG LẶP UPDATE GAME LOOP (XỬ LÝ ĐI BỘ & LÁI SIÊU XE TỰ DO) */
    update(deltaTime) {
        if (!this.isActive) return;

        // Cập nhật NPC Đi Lại Trên Phố
        this._updateNPCs(deltaTime);

        // 📺 Cập nhật Animation Màn Hình TV LED Cyberpunk (ANH Zhou Style)
        this._updateLedTvDisplay(deltaTime);

        // Cập nhật Prompts Tương Tác Cửa Hàng Trang Bị, Cửa Nhà, Siêu Xe & Cân Đẩu Vân
        this._updateVehiclePrompts();
        this._updateArmoryShopPrompts();
        this._updateHouseDoorPrompts();
        this._updateNimbusPrompts();

        // 🚪 Xوay Bản Lề Mở/Đóng Cửa Nhà Smooth Animation
        if (this.mainShowroomDoorHinge) {
            const targetAngle = this.isHouseDoorOpen ? Math.PI * 0.58 : 0.0;
            this.mainShowroomDoorHinge.rotation.y = THREE.MathUtils.lerp(
                this.mainShowroomDoorHinge.rotation.y,
                targetAngle,
                Math.min(1.0, deltaTime * 6.0)
            );
        }

        const timeNow = performance.now() * 0.003;
        this.animatedLanterns.forEach((lantern, idx) => {
            lantern.rotation.z = Math.sin(timeNow + idx) * 0.08;
        });

        // Xoay Quả Cầu Năng Lượng Cyan Cung Điện Treo Cao
        if (this.cyanPortalSphere) {
            this.cyanPortalSphere.rotation.y += deltaTime * 0.5;
            this.cyanPortalSphere.position.y = 14.5 + Math.sin(timeNow * 1.5) * 0.25;
        }

        // Mây 3D bơi trôi nhẹ nhàng trên bầu trời
        this.cloudList.forEach(cloud => {
            cloud.group.position.x += deltaTime * cloud.speed;
            if (cloud.group.position.x > 80) {
                cloud.group.position.x = -80;
            }
        });

        // ☁️ XỬ LÝ VẬT LÝ VÀ BAY CÂN ĐẨU VÂN KHÔNG TRUNG ([WASD] Bay 360°, [E] Bay lên ⬆️, [C] Bay xuống ⬇️)
        if (this.isRidingNimbus && this.nimbusCloud) {
            const mobileVec = this.mobileControls ? this.mobileControls.getMoveVector() : { dirX: 0, dirZ: 0, intensity: 0 };
            const isW = this.activeKeys.has('KeyW') || this.activeKeys.has('ArrowUp') || (mobileVec.intensity > 0.1 && mobileVec.dirZ < -0.2);
            const isS = this.activeKeys.has('KeyS') || this.activeKeys.has('ArrowDown') || (mobileVec.intensity > 0.1 && mobileVec.dirZ > 0.2);
            const isA = this.activeKeys.has('KeyA') || this.activeKeys.has('ArrowLeft') || (mobileVec.intensity > 0.1 && mobileVec.dirX < -0.2);
            const isD = this.activeKeys.has('KeyD') || this.activeKeys.has('ArrowRight') || (mobileVec.intensity > 0.1 && mobileVec.dirX > 0.2);

            const isFlyUp = this.activeKeys.has('KeyE');
            const isFlyDown = this.activeKeys.has('KeyC');

            // Xử lý bay lên [E] & bay xuống [C]
            if (isFlyUp) {
                this.nimbusFlightHeight = Math.min(this.nimbusMaxHeight, this.nimbusFlightHeight + 14.0 * deltaTime);
            }
            if (isFlyDown) {
                const currentGround = this._calculateGroundY(this.nimbusCloud.position.x, this.nimbusCloud.position.z);
                this.nimbusFlightHeight = Math.max(currentGround + 0.8, this.nimbusFlightHeight - 14.0 * deltaTime);
            }

            // Di chuyển ngang 360° theo camera
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

            if (moveVector.lengthSq() > 0) {
                moveVector.normalize().multiplyScalar(16.0 * deltaTime);
                this.nimbusCloud.position.x += moveVector.x;
                this.nimbusCloud.position.z += moveVector.z;

                this.nimbusCloud.position.x = THREE.MathUtils.clamp(this.nimbusCloud.position.x, this.bounds.minX, this.bounds.maxX);
                this.nimbusCloud.position.z = THREE.MathUtils.clamp(this.nimbusCloud.position.z, this.bounds.minZ, this.bounds.maxZ);

                const targetAngle = Math.atan2(moveVector.x, moveVector.z);
                let angleDiff = targetAngle - this.nimbusCloud.rotation.y;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                this.nimbusCloud.rotation.y += angleDiff * Math.min(1.0, deltaTime * 2.5);
            }

            // Xử lý khi bấm F hạ cánh từ từ dịu nhẹ từ trên cao xuống
            if (this.isNimbusLanding) {
                const targetGroundY = this._calculateGroundY(this.nimbusCloud.position.x, this.nimbusCloud.position.z) + 0.8;
                this.nimbusFlightHeight = Math.max(targetGroundY, this.nimbusFlightHeight - 5.0 * deltaTime);

                if (Math.abs(this.nimbusCloud.position.y - targetGroundY) < 0.12) {
                    this.isNimbusLanding = false;
                    this.isRidingNimbus = false;
                    this.playerPos.set(this.nimbusCloud.position.x + 1.4, targetGroundY - 0.8, this.nimbusCloud.position.z);
                    this.playerMesh.position.copy(this.playerPos);
                    this.playerMesh.visible = true;
                    this._showNimbusHUD(false);
                    this._showToastNotification(`☁️ Cân Đẩu Vân đã hạ cánh an toàn xuống mặt đất!`);
                }
            }

            this.nimbusCloud.position.y = THREE.MathUtils.lerp(this.nimbusCloud.position.y, this.nimbusFlightHeight, Math.min(1.0, deltaTime * 6.0));

            this.playerPos.copy(this.nimbusCloud.position);
            this.playerMesh.position.set(this.nimbusCloud.position.x, this.nimbusCloud.position.y + 1.18, this.nimbusCloud.position.z);
            this.playerMesh.rotation.y = this.nimbusCloud.rotation.y;
            this.playerMesh.visible = true;

            if (!this.isPointerDown) {
                const targetYaw = this.nimbusCloud.rotation.y + Math.PI;
                let angleDiff = targetYaw - this.cameraYaw;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                this.cameraYaw += angleDiff * Math.min(1.0, deltaTime * 2.5);

                const altitudeProgress = THREE.MathUtils.clamp((this.nimbusCloud.position.y - 0.8) / 30.0, 0, 1);
                const targetCamDist = 9.5 + altitudeProgress * 3.5;
                this.cameraDistance = THREE.MathUtils.lerp(this.cameraDistance, targetCamDist, deltaTime * 4.0);
            }

        } else if (this.nimbusCloud) {
            const currentGround = this._calculateGroundY(this.nimbusCloud.position.x, this.nimbusCloud.position.z);
            this.nimbusCloud.position.y = currentGround + 0.8 + Math.sin(timeNow * 2.5) * 0.15;
            this.nimbusCloud.rotation.y += deltaTime * 0.4;
        }

        // 🚗 XỬ LÝ VẬT LÝ VÀ ĐIỀU KHIỂN SIÊU XE KHI ĐANG LÁI XE
        if (this.isDrivingVehicle && this.currentVehicle) {
            const veh = this.currentVehicle;

            const mobileVec = this.mobileControls ? this.mobileControls.getMoveVector() : { dirX: 0, dirZ: 0, intensity: 0 };
            const isW = this.activeKeys.has('KeyW') || this.activeKeys.has('ArrowUp') || (mobileVec.intensity > 0.1 && mobileVec.dirZ < -0.2);
            const isS = this.activeKeys.has('KeyS') || this.activeKeys.has('ArrowDown') || (mobileVec.intensity > 0.1 && mobileVec.dirZ > 0.2);
            const isA = this.activeKeys.has('KeyA') || this.activeKeys.has('ArrowLeft') || (mobileVec.intensity > 0.1 && mobileVec.dirX < -0.2);
            const isD = this.activeKeys.has('KeyD') || this.activeKeys.has('ArrowRight') || (mobileVec.intensity > 0.1 && mobileVec.dirX > 0.2);

            if (isW) {
                veh.speed = Math.min(veh.maxSpeed, veh.speed + veh.acceleration * deltaTime);
            } else if (isS) {
                veh.speed = Math.max(-veh.maxSpeed * 0.55, veh.speed - veh.acceleration * deltaTime);
            } else {
                veh.speed *= Math.pow(0.04, deltaTime);
            }

            if (Math.abs(veh.speed) > 0.15) {
                const dirSign = veh.speed > 0 ? 1 : -1;
                if (isA) {
                    const steerRate = mobileVec.intensity > 0.1 && Math.abs(mobileVec.dirX) > 0.2 ? Math.abs(mobileVec.dirX) : 1.0;
                    veh.mesh.rotation.y += veh.steeringSpeed * steerRate * dirSign * deltaTime;
                }
                if (isD) {
                    const steerRate = mobileVec.intensity > 0.1 && Math.abs(mobileVec.dirX) > 0.2 ? Math.abs(mobileVec.dirX) : 1.0;
                    veh.mesh.rotation.y -= veh.steeringSpeed * steerRate * dirSign * deltaTime;
                }
            }

            const moveDist = veh.speed * deltaTime;
            const forwardX = Math.sin(veh.mesh.rotation.y);
            const forwardZ = Math.cos(veh.mesh.rotation.y);

            veh.mesh.position.x += forwardX * moveDist;
            veh.mesh.position.z += forwardZ * moveDist;

            veh.mesh.position.x = THREE.MathUtils.clamp(veh.mesh.position.x, this.bounds.minX, this.bounds.maxX);
            veh.mesh.position.z = THREE.MathUtils.clamp(veh.mesh.position.z, this.bounds.minZ, this.bounds.maxZ);

            const targetGroundY = this._calculateGroundY(veh.mesh.position.x, veh.mesh.position.z);
            veh.mesh.position.y = THREE.MathUtils.lerp(veh.mesh.position.y, targetGroundY + 0.02, Math.min(1.0, deltaTime * 14.0));

            this.playerPos.copy(veh.mesh.position);

            if (veh.wheels && veh.wheels.length > 0) {
                veh.wheels.forEach(w => {
                    w.rotation.x += veh.speed * deltaTime * 3.5;
                });
            }

            if (!this.isPointerDown) {
                const targetYaw = veh.mesh.rotation.y + Math.PI;
                let angleDiff = targetYaw - this.cameraYaw;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

                const followSpeed = Math.abs(veh.speed) > 0.2 ? 5.5 : 2.5;
                this.cameraYaw += angleDiff * Math.min(1.0, deltaTime * followSpeed);
            }
        } else if (!this.isRidingNimbus) {
            // 🚶 XỬ LÝ ĐI BỘ TRÊN CHÂN (ON FOOT MOVEMENT)
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

            if (moveVector.lengthSq() > 0) {
                moveVector.normalize().multiplyScalar(this.moveSpeed * deltaTime);
                this.playerPos.x += moveVector.x;
                this.playerPos.z += moveVector.z;

                this.playerPos.x = THREE.MathUtils.clamp(this.playerPos.x, this.bounds.minX, this.bounds.maxX);
                this.playerPos.z = THREE.MathUtils.clamp(this.playerPos.z, this.bounds.minZ, this.bounds.maxZ);

                const targetAngle = Math.atan2(moveVector.x, moveVector.z);
                let angleDiff = targetAngle - this.playerMesh.rotation.y;

                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

                this.playerMesh.rotation.y += angleDiff * Math.min(1.0, deltaTime * 14.0);

                // 🎯 PHÂN TÁCH: NẾU ĐANG DÙNG SKIN BABY GOKU (MD2) THÌ CHẠY ANIMATION MD2
                if (this.selectedCharacterSkin === 'baby_goku' && this.md2CharacterInstance) {
                    try {
                        if (this.currentMd2Anim !== 'run') {
                            this.md2CharacterInstance.setAnimation('run');
                            this.currentMd2Anim = 'run';
                        }
                    } catch (e) { }
                } else {
                    // 🎬 CÁC SKIN CYBER / SHADOW KHÁC DÙNG MIXER HOẶC PROCEDURAL SWAY
                    if (this.playerMixer) {
                        this.playerMixer.update(deltaTime);
                    }
                }

                // Hoạt ảnh bước đi Procedural cho các skin thường
                this.playerWalkTimer += deltaTime * 13.5;
                if (this.selectedCharacterSkin !== 'baby_goku') {
                    if (this.leftLegGroup && this.rightLegGroup) {
                        this.leftLegGroup.rotation.x = Math.sin(this.playerWalkTimer) * 0.55;
                        this.rightLegGroup.rotation.x = -Math.sin(this.playerWalkTimer) * 0.55;
                    }
                    if (this.leftArmGroup && this.rightArmGroup) {
                        this.leftArmGroup.rotation.x = -Math.sin(this.playerWalkTimer) * 0.78;
                        this.rightArmGroup.rotation.x = Math.sin(this.playerWalkTimer) * 0.78;
                    }
                }
            } else {
                // 🧍 KHI ĐỨNG YÊN
                if (this.selectedCharacterSkin === 'baby_goku' && this.md2CharacterInstance) {
                    try {
                        if (this.currentMd2Anim !== 'stand') {
                            this.md2CharacterInstance.setAnimation('stand');
                            this.currentMd2Anim = 'stand';
                        }
                    } catch (e) { }
                }

                if (this.selectedCharacterSkin !== 'baby_goku') {
                    if (this.leftLegGroup && this.rightLegGroup) {
                        this.leftLegGroup.rotation.x = THREE.MathUtils.lerp(this.leftLegGroup.rotation.x, 0, deltaTime * 10.0);
                        this.rightLegGroup.rotation.x = THREE.MathUtils.lerp(this.rightLegGroup.rotation.x, 0, deltaTime * 10.0);
                    }
                    if (this.leftArmGroup && this.rightArmGroup) {
                        this.leftArmGroup.rotation.x = THREE.MathUtils.lerp(this.leftArmGroup.rotation.x, 0, deltaTime * 10.0);
                        this.rightArmGroup.rotation.x = THREE.MathUtils.lerp(this.rightArmGroup.rotation.x, 0, deltaTime * 10.0);
                    }
                }
            }

            // 🔄 CẬP NHẬT TICK CHO MD2 NẾU ĐANG CHỌN BABY GOKU
            if (this.selectedCharacterSkin === 'baby_goku' && this.md2CharacterInstance) {
                this.md2CharacterInstance.update(deltaTime);
            }

            // Space Jump
            if (this.activeKeys.has('Space') && this.isGrounded) {
                this.velocityY = this.jumpForce;
                this.isGrounded = false;
            }

            const targetGroundY = this._calculateGroundY(this.playerPos.x, this.playerPos.z);
            this.groundY = THREE.MathUtils.lerp(this.groundY, targetGroundY, Math.min(1.0, deltaTime * 14.0));

            if (this.isGrounded) {
                this.playerPos.y = this.groundY;
            } else {
                this.velocityY += this.gravity * deltaTime;
                this.playerPos.y += this.velocityY * deltaTime;

                if (this.playerPos.y <= this.groundY) {
                    this.playerPos.y = this.groundY;
                    this.velocityY = 0;
                    this.isGrounded = true;
                }
            }

            const adjustedPlayerPos = this.playerPos.clone();
            if (this.selectedCharacterSkin === 'baby_goku') {
                adjustedPlayerPos.y += 1.4; // Đẩy cao MD2 lên tránh lún đất
            }
            this.playerMesh.position.copy(adjustedPlayerPos);
        }

        // GTA & ROBLOX STYLE CAMERA ORBIT LERP
        if (this.isStationActive && this.stationTargetCamPos && this.stationTargetLookAt) {
            this.camera.position.lerp(this.stationTargetCamPos, deltaTime * 6.0);
            this.currentLookAt.lerp(this.stationTargetLookAt, deltaTime * 6.0);
            this.camera.lookAt(this.currentLookAt);
        } else {
            const targetCamX = this.playerPos.x + Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDistance;
            const targetCamY = this.playerPos.y + Math.sin(this.cameraPitch) * this.cameraDistance + (this.isGrounded ? 0 : 0.3);
            const targetCamZ = this.playerPos.z + Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDistance;

            this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetCamX, deltaTime * 8.0);
            this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetCamY, deltaTime * 8.0);
            this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetCamZ, deltaTime * 8.0);

            this.targetLookAt.set(this.playerPos.x, this.playerPos.y + 1.2, this.playerPos.z);
            this.currentLookAt.lerp(this.targetLookAt, deltaTime * 9.0);
            this.camera.lookAt(this.currentLookAt);
        }

        // 🏆 XOAY 4 MÔ HÌNH TRƯNG BÀY 3D BÊN TRONG CĂN NHÀ VÀNG
        if (this.gokuExhibitionModels && this.gokuExhibitionModels.length > 0) {
            this.gokuExhibitionModels.forEach((model, i) => {
                if (model) {
                    model.rotation.y += deltaTime * (0.45 + i * 0.12);
                }
            });
        }

        // 🚪 XỬ LÝ MỞ / ĐÓNG CỬA BẢN LỀ CĂN NHÀ VÀNG KHI NGƯỜI CHƠI BẤM [F]
        if (this.exhibitionDoorHingeL && this.exhibitionDoorHingeR) {
            const targetRotL = this.isExhibitionDoorOpen ? -Math.PI / 2.2 : 0;
            const targetRotR = this.isExhibitionDoorOpen ? Math.PI / 2.2 : 0;

            this.exhibitionDoorHingeL.rotation.y = THREE.MathUtils.lerp(this.exhibitionDoorHingeL.rotation.y, targetRotL, deltaTime * 6.0);
            this.exhibitionDoorHingeR.rotation.y = THREE.MathUtils.lerp(this.exhibitionDoorHingeR.rotation.y, targetRotR, deltaTime * 6.0);
        }

        // 📺 CẬP NHẬT REALTIME MÀN HÌNH LED BILLBOARD
        this._updateLedTvDisplay(deltaTime);

        // 🎬 CẬP NHẬT REALTIME MÀN HÌNH TV LIVE STREAM 60FPS
        this._updateCyberLiveStream(deltaTime);

        // 🎧 HOẠT HỌA REALTIME NHÂN VẬT ANIME BEAN ĐEO TAI NGHE
        if (this.beanNPC) {
            const time = performance.now() * 0.003;
            this.beanNPC.position.y = 0.0 + Math.sin(time * 2.5) * 0.02;
            if (this.beanNPC.userData.bubbleGroup) {
                this.beanNPC.userData.bubbleGroup.position.y = 1.7 + Math.sin(time * 3.5) * 0.025;
            }
        }

        // 🏆 Cập nhật hoạt họa 3D Trophies xoay nhẹ
        if (this.game && this.game.trophyHallManager) {
            this.game.trophyHallManager.update(0.016);
        }

        // 🌀 CẬP NHẬT REALTIME CỔNG DỊCH CHUYỂN HOLOGRAPHIC PORTAL 3D
        if (this.holographicPortal) {
            const isNear = this.holographicPortal.update(deltaTime, this.playerPos);
            const promptEl = document.getElementById('portal-teleport-prompt');
            if (promptEl) {
                if (isNear) {
                    promptEl.classList.add('show');
                    promptEl.style.display = 'flex';
                } else {
                    promptEl.classList.remove('show');
                }
            }

            if (isNear && this.activeKeys.has('KeyE')) {
                if (promptEl) {
                    promptEl.classList.remove('show');
                    promptEl.style.display = 'none';
                }
                this.holographicPortal.triggerTeleport();
            }
        }

        // 📍 CẬP NHẬT REALTIME TỌA ĐỘ TRÊN HUD
        this._updatePositionHUD();
    }

    _initHolographicPortal() {
        this.holographicPortal = new HolographicPortal(
            this.scene,
            new THREE.Vector3(0, 0, 24),
            () => {
                this.game?.triggerTeleportToRoguelike?.();
            }
        );
    }

    updateCustomCarDecal(dataUrl) {
        if (!dataUrl || !this.scene) return;
        const loader = new THREE.TextureLoader();
        loader.load(dataUrl, (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            if (!this.shopDecalMesh) {
                const geo = new THREE.PlaneGeometry(1.2, 0.3);
                const mat = new THREE.MeshStandardMaterial({
                    map: texture,
                    transparent: true,
                    roughness: 0.2,
                    metalness: 0.1,
                    side: THREE.DoubleSide
                });
                this.shopDecalMesh = new THREE.Mesh(geo, mat);
                this.shopDecalMesh.position.set(0, 1.2, -4.5);
                this.scene.add(this.shopDecalMesh);
            } else {
                if (this.shopDecalMesh.material.map) this.shopDecalMesh.material.map.dispose();
                this.shopDecalMesh.material.map = texture;
                this.shopDecalMesh.material.needsUpdate = true;
            }
        });
    }

    render() {
        if (this.isActive) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}