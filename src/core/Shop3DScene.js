/**
 * Shop3DScene.js - Integrated Coastal Town, Japanese Torii Sanctuary, Sougen Garden & White Marble Palace Open World 3D
 * Procedural 3D Anime Character Modeler & Driveable Supercars System:
 * 1. TÍNH NĂNG LÁI SIÊU XE (DRIVEABLE SUPERCARS): Player có thể đến gần 4 chiếc siêu xe (< 3.5m) và nhấn phím [F] hoặc [ENTER] để trèo lên xe lái tự do khắp bản đồ!
 * 2. VẬT LÝ LÁI XE & BÁNH XE XOAY: Hỗ trợ phím [W/S] tăng tốc / lùi, [A/D] bẻ lái mượt mà, bánh xe xoay theo tốc độ, tích hợp Dynamic Ground Y Height.
 * 3. BẢNG HƯỚNG DẪN UI & HỆ THỐNG PROMPT FLUID: Hiển thị Prompt phím [F] lên xe và HUD lái xe hiện đại.
 * 4. 100% Procedural Three.js Code (0ms Load Time, 60 FPS)
 */
import * as THREE from 'three';
import { CAR_MODELS } from '../managers/ShopManager.js';
import { MobileControls } from '../utils/mobile.js'; // 📱 MOBILE CONTROLS: Import bộ điều khiển di động

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

        // Khởi tạo toàn bộ thế giới mở kết hợp Cung Điện La Mã, Cổ Đền Nhật Bản & Vườn Sougen
        this._initSanctuaryEnvironment();
        this._initSanctuaryLighting();
        this._initProceduralSkyAndClouds();
        this._initExpandedIslandGround();
        this._initToriiGateAndSanctuary();
        this._initHangingLanternCables();
        this._initRiverStreamAndBridge();
        this._initTownHousesAndShops();
        this._initGreekMarblePalace(); // Cung Điện Cột Đá Trắng Thiết Kế Nâng Cấp Tuyệt Đẹp z = 30
        this._initSougenGardenAndFloatingText(); // Vườn Sougen & Chữ "Viet Anh Nguyen" Sau Nhà z = -34
        this._initSakuraAndCoastalTrees();
        this._initGiantBoulders();
        this._initAmbientVehicles();
        this._initNPCs(); // 🧍 ANIME SAIYAN NPCS BƯỚC ĐỊ DI CHUYỂN VUNG TAY VUNG CHÂN GIỐNG PLAYER
        this._initCarShowcases(); // 🏎️ KHỞI TẠO 4 SIÊU XE CÓ THỂ LÁI TỰ DO KHẮP MAP
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

        const mainShowroom = this._createHouseBuilding(28, 10, 10, 0x1e293b, 0x3a86ff, 'CYBER MOTORS');
        mainShowroom.position.set(0, 0, -20);
        townGroup.add(mainShowroom);

        // Đẩy toàn bộ các ngôi nhà phụ sang bờ Đông x >= 44 né xa khu vực Cung điện (x = -22 -> 22, z = 16 -> 44)
        const housesData = [
            { x: 44, z: -18, w: 10, h: 7, d: 8, wallColor: 0xffffff, roofColor: 0xe76f51, label: 'COASTAL VILLA' },
            { x: 44, z: 0, w: 9, h: 6, d: 7, wallColor: 0xffe066, roofColor: 0x264653, label: 'BAKERY & CAFE' },
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
    }

    _createHouseBuilding(width, height, depth, wallColorHex, roofColorHex, labelText) {
        const group = new THREE.Group();

        const wallMat = new THREE.MeshStandardMaterial({ color: wallColorHex, roughness: 0.85, metalness: 0.05 });
        const walls = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), wallMat);
        walls.position.y = height / 2;
        walls.castShadow = true;
        walls.receiveShadow = true;
        group.add(walls);

        const roofMat = new THREE.MeshStandardMaterial({ color: roofColorHex, roughness: 0.85, metalness: 0.05 });
        const roof = new THREE.Mesh(new THREE.ConeGeometry(width * 0.75, height * 0.5, 4), roofMat);
        roof.rotation.y = Math.PI / 4;
        roof.position.y = height + (height * 0.25);
        roof.castShadow = true;
        group.add(roof);

        const doorMat = new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.9 });
        const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.8, 0.2), doorMat);
        door.position.set(0, 1.4, depth / 2 + 0.1);
        group.add(door);

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

        const underglow = new THREE.Mesh(
            new THREE.PlaneGeometry(1.9, 3.6),
            new THREE.MeshBasicMaterial({ color: accentColorHex, transparent: true, opacity: 0.35 })
        );
        underglow.rotation.x = -Math.PI / 2;
        underglow.position.y = 0.02;
        carGroup.add(underglow);

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

    /* 👑 16. THIẾT KẾ NHÂN VẬT ANIME CYBER-HEROINE CÓ ĐẦY ĐỦ CÁNH TAY & BÀN TAY */
    _initPlayer() {
        const playerGroup = new THREE.Group();

        const shoesMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
        const legsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
        const cyanNeonMat = new THREE.MeshBasicMaterial({ color: 0x00f5ff });
        const whiteCloakMat = new THREE.MeshStandardMaterial({
            color: 0xf8fafc,
            roughness: 0.7,
            metalness: 0.1
        });
        const handMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });

        // CHÂN TRÁI & PHẢI
        this.leftLegGroup = new THREE.Group();
        const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.14, 0.34), shoesMat);
        shoeL.position.set(-0.16, 0.07, 0.02);
        shoeL.castShadow = true;
        this.leftLegGroup.add(shoeL);

        const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.44, 10), legsMat);
        legL.position.set(-0.16, 0.28, 0);
        legL.castShadow = true;
        this.leftLegGroup.add(legL);

        const ankleRingL = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 8, 16), cyanNeonMat);
        ankleRingL.rotation.x = Math.PI / 2;
        ankleRingL.position.set(-0.16, 0.14, 0);
        this.leftLegGroup.add(ankleRingL);
        playerGroup.add(this.leftLegGroup);

        this.rightLegGroup = new THREE.Group();
        const shoeR = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.14, 0.34), shoesMat);
        shoeR.position.set(0.16, 0.07, 0.02);
        shoeR.castShadow = true;
        this.rightLegGroup.add(shoeR);

        const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.44, 10), legsMat);
        legR.position.set(0.16, 0.28, 0);
        legR.castShadow = true;
        this.rightLegGroup.add(legR);

        const ankleRingR = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 8, 16), cyanNeonMat);
        ankleRingR.rotation.x = Math.PI / 2;
        ankleRingR.position.set(0.16, 0.14, 0);
        this.rightLegGroup.add(ankleRingR);
        playerGroup.add(this.rightLegGroup);

        // TAY TRÁI & PHẢI
        this.leftArmGroup = new THREE.Group();
        this.leftArmGroup.position.set(-0.38, 1.05, 0);

        const sleeveL = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.14, 0.48, 10), whiteCloakMat);
        sleeveL.position.set(0, -0.22, 0);
        sleeveL.rotation.z = 0.15;
        sleeveL.castShadow = true;
        this.leftArmGroup.add(sleeveL);

        const handL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), handMat);
        handL.position.set(0, -0.48, 0);
        handL.castShadow = true;
        this.leftArmGroup.add(handL);

        const wristRingL = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.018, 8, 16), cyanNeonMat);
        wristRingL.rotation.x = Math.PI / 2;
        wristRingL.position.set(0, -0.44, 0);
        this.leftArmGroup.add(wristRingL);
        playerGroup.add(this.leftArmGroup);

        this.rightArmGroup = new THREE.Group();
        this.rightArmGroup.position.set(0.38, 1.05, 0);

        const sleeveR = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.14, 0.48, 10), whiteCloakMat);
        sleeveR.position.set(0, -0.22, 0);
        sleeveR.rotation.z = -0.15;
        sleeveR.castShadow = true;
        this.rightArmGroup.add(sleeveR);

        const handR = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), handMat);
        handR.position.set(0, -0.48, 0);
        handR.castShadow = true;
        this.rightArmGroup.add(handR);

        const wristRingR = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.018, 8, 16), cyanNeonMat);
        wristRingR.rotation.x = Math.PI / 2;
        wristRingR.position.set(0, -0.44, 0);
        this.rightArmGroup.add(wristRingR);
        playerGroup.add(this.rightArmGroup);

        // VÒNG HÀO QUANG CYAN HOOK
        const waistAuraRing = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.04, 12, 32), cyanNeonMat);
        waistAuraRing.rotation.x = Math.PI / 2.3;
        waistAuraRing.position.set(0, 0.75, 0);
        playerGroup.add(waistAuraRing);

        // ÁO CHOÀNG & NÓN TRÙM ĐẦU
        const robeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.46, 0.75, 12), whiteCloakMat);
        robeBody.position.y = 0.85;
        robeBody.castShadow = true;
        playerGroup.add(robeBody);

        const cloakTail = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.70, 0.08), whiteCloakMat);
        cloakTail.position.set(0, 0.65, -0.22);
        cloakTail.rotation.x = 0.15;
        cloakTail.castShadow = true;
        this.cloakTailMesh = cloakTail;
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

        // BÓNG ĐỔ DƯỚI CHÂN
        const shadowCircle = new THREE.Mesh(
            new THREE.CircleGeometry(0.42, 32),
            new THREE.MeshBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.35 })
        );
        shadowCircle.rotation.x = -Math.PI / 2;
        shadowCircle.position.y = 0.01;
        playerGroup.add(shadowCircle);

        this.playerMesh = playerGroup;
        this.playerMesh.position.copy(this.playerPos);
        this.scene.add(this.playerMesh);
    }

    /* 🎮 17. ĐIỀU KHIỂN BÀN PHÍM & BẮT SỰ KIỆN LÁI XE [F] / [ENTER] */
    _setupControls() {
        window.addEventListener('keydown', (e) => {
            if (!this.isActive) return;
            const code = e.code;
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(code)) {
                e.preventDefault();
            }

            if (code === 'KeyF' || code === 'Enter') {
                this._toggleVehicleMount();
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
            hud.style.cssText = `
                position: fixed;
                bottom: 24px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(15, 23, 42, 0.90);
                backdrop-filter: blur(12px);
                border: 1.5px solid rgba(0, 245, 255, 0.6);
                border-radius: 16px;
                padding: 12px 24px;
                color: #ffffff;
                font-family: 'Outfit', 'Segoe UI', sans-serif;
                font-size: 15px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 12px;
                box-shadow: 0 10px 30px rgba(0, 245, 255, 0.3);
                z-index: 1000;
                pointer-events: auto !important;
                transition: all 0.3s ease;
            `;
            document.body.appendChild(hud);
        }

        if (show) {
            hud.innerHTML = `
                <span style="font-size: 24px;">🏎️</span>
                <div>
                    <div style="color: #00f5ff; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Đang Lái: ${carName}</div>
                    <div style="font-size: 14px; color: #e2e8f0;">[W/S] Tăng Tốc / Lùi &nbsp;|&nbsp; [A/D] Bẻ Lái &nbsp;|&nbsp; <b style="color: #ff3366;">[F]</b> Xuống Xe</div>
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

    openShowroom() {
        this.isActive = true;
        this.playerPos.set(0, this.groundY, 6);
        this.velocityY = 0;
        this.isGrounded = true;

        this.isDrivingVehicle = false;
        this.currentVehicle = null;

        this.cameraYaw = 0;
        this.cameraPitch = 0.42;
        this.cameraDistance = 9.5;
        this.isPointerDown = false;
        this.playerWalkTimer = 0;

        this._resetKeys();

        // 📱 MOBILE CONTROLS: Hiển thị giao diện Virtual Joystick & Action Buttons khi người chơi vào Shop 3D
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

        this.isActive = false;
        this._showDriveHUD(false);

        const enterPrompt = document.getElementById('enter-car-prompt');
        if (enterPrompt) enterPrompt.style.display = 'none';

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

    /* 🕹️ 20. VÒNG LẶP UPDATE GAME LOOP (XỬ LÝ ĐI BỘ & LÁI SIÊU XE TỰ DO) */
    update(deltaTime) {
        if (!this.isActive) return;

        // Cập nhật NPC Đi Lại Trên Phố
        this._updateNPCs(deltaTime);

        // Cập nhật Prompt [F] lên xe khi đi bộ
        this._updateVehiclePrompts();

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

        // 🚗 XỬ LÝ VẬT LÝ VÀ ĐIỀU KHIỂN SIÊU XE KHI ĐANG LÁI XE
        if (this.isDrivingVehicle && this.currentVehicle) {
            const veh = this.currentVehicle;

            // 📱 MOBILE CONTROLS: Đọc dữ liệu vector điều khiển từ Virtual Joystick cho Siêu xe Mobile
            const mobileVec = this.mobileControls ? this.mobileControls.getMoveVector() : { dirX: 0, dirZ: 0, intensity: 0 };

            // 📱 MOBILE CONTROLS: Kết hợp phím bàn phím (WASD) và Joystick gạt Lên/Xuống/Trái/Phải
            const isW = this.activeKeys.has('KeyW') || this.activeKeys.has('ArrowUp') || (mobileVec.intensity > 0.1 && mobileVec.dirZ < -0.2);
            const isS = this.activeKeys.has('KeyS') || this.activeKeys.has('ArrowDown') || (mobileVec.intensity > 0.1 && mobileVec.dirZ > 0.2);
            const isA = this.activeKeys.has('KeyA') || this.activeKeys.has('ArrowLeft') || (mobileVec.intensity > 0.1 && mobileVec.dirX < -0.2);
            const isD = this.activeKeys.has('KeyD') || this.activeKeys.has('ArrowRight') || (mobileVec.intensity > 0.1 && mobileVec.dirX > 0.2);

            // Tăng tốc / Lùi
            if (isW) {
                veh.speed = Math.min(veh.maxSpeed, veh.speed + veh.acceleration * deltaTime);
            } else if (isS) {
                veh.speed = Math.max(-veh.maxSpeed * 0.55, veh.speed - veh.acceleration * deltaTime);
            } else {
                veh.speed *= Math.pow(0.04, deltaTime); // Ma sát tự nhiên khi thả ga
            }

            // Bẻ lái theo hướng xe (phím A/D hoặc Joystick gạt ngang)
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

            // Di chuyển xe theo hướng xoay rotation.y
            const moveDist = veh.speed * deltaTime;
            const forwardX = Math.sin(veh.mesh.rotation.y);
            const forwardZ = Math.cos(veh.mesh.rotation.y);

            veh.mesh.position.x += forwardX * moveDist;
            veh.mesh.position.z += forwardZ * moveDist;

            // Giới hạn vùng biên bản đồ
            veh.mesh.position.x = THREE.MathUtils.clamp(veh.mesh.position.x, this.bounds.minX, this.bounds.maxX);
            veh.mesh.position.z = THREE.MathUtils.clamp(veh.mesh.position.z, this.bounds.minZ, this.bounds.maxZ);

            // Độ cao địa hình cho xe
            const targetGroundY = this._calculateGroundY(veh.mesh.position.x, veh.mesh.position.z);
            veh.mesh.position.y = THREE.MathUtils.lerp(veh.mesh.position.y, targetGroundY + 0.02, Math.min(1.0, deltaTime * 14.0));

            // Đồng bộ vị trí Player với Xe
            this.playerPos.copy(veh.mesh.position);

            // Xoay bánh xe theo tốc độ di chuyển
            if (veh.wheels && veh.wheels.length > 0) {
                veh.wheels.forEach(w => {
                    w.rotation.x += veh.speed * deltaTime * 3.5;
                });
            }

            // 🎥 GTA STYLE AUTO FOLLOW CAMERA: CAMERA TỰ ĐỘNG XOAY THEO HƯỚNG BẺ LÁI CỦA SIÊU XE
            if (!this.isPointerDown) {
                const targetYaw = veh.mesh.rotation.y + Math.PI;
                let angleDiff = targetYaw - this.cameraYaw;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

                const followSpeed = Math.abs(veh.speed) > 0.2 ? 5.5 : 2.5;
                this.cameraYaw += angleDiff * Math.min(1.0, deltaTime * followSpeed);
            }
        } else {
            // 🚶 XỬ LÝ ĐI BỘ TRÊN CHÂN (ON FOOT MOVEMENT)
            // 📱 MOBILE CONTROLS: Đọc dữ liệu vector điều khiển từ Virtual Joystick cho Player Đi bộ 360°
            const mobileVec = this.mobileControls ? this.mobileControls.getMoveVector() : { dirX: 0, dirZ: 0, intensity: 0 };
            const isW = this.activeKeys.has('KeyW') || this.activeKeys.has('ArrowUp');
            const isS = this.activeKeys.has('KeyS') || this.activeKeys.has('ArrowDown');
            const isA = this.activeKeys.has('KeyA') || this.activeKeys.has('ArrowLeft');
            const isD = this.activeKeys.has('KeyD') || this.activeKeys.has('ArrowRight');

            // GTA STYLE MOVEMENT
            const forwardX = -Math.sin(this.cameraYaw);
            const forwardZ = -Math.cos(this.cameraYaw);

            const rightX = Math.cos(this.cameraYaw);
            const rightZ = -Math.sin(this.cameraYaw);

            const moveVector = new THREE.Vector3();

            if (isW) { moveVector.x += forwardX; moveVector.z += forwardZ; }
            if (isS) { moveVector.x -= forwardX; moveVector.z -= forwardZ; }
            if (isA) { moveVector.x -= rightX; moveVector.z -= rightZ; }
            if (isD) { moveVector.x += rightX; moveVector.z += rightZ; }

            // 📱 MOBILE CONTROLS: Thêm Vector di chuyển 360° linh hoạt từ Virtual Joystick Mobile
            if (mobileVec.intensity > 0.05) {
                const joyForward = -mobileVec.dirZ; // >0 khi vuốt lên
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

                // Hoạt ảnh bước đi: Đung đưa Chân, Tay & Áo Choàng tự nhiên
                this.playerWalkTimer += deltaTime * 12.0;
                if (this.leftLegGroup && this.rightLegGroup) {
                    this.leftLegGroup.rotation.x = Math.sin(this.playerWalkTimer) * 0.45;
                    this.rightLegGroup.rotation.x = -Math.sin(this.playerWalkTimer) * 0.45;
                }
                if (this.leftArmGroup && this.rightArmGroup) {
                    this.leftArmGroup.rotation.x = -Math.sin(this.playerWalkTimer) * 0.40;
                    this.rightArmGroup.rotation.x = Math.sin(this.playerWalkTimer) * 0.40;
                }
                if (this.cloakTailMesh) {
                    this.cloakTailMesh.rotation.x = 0.15 + Math.sin(this.playerWalkTimer * 2.0) * 0.1;
                }
            } else {
                // Khi đứng yên -> trả tư thế tay chân về vị trí cân bằng
                if (this.leftLegGroup && this.rightLegGroup) {
                    this.leftLegGroup.rotation.x = THREE.MathUtils.lerp(this.leftLegGroup.rotation.x, 0, deltaTime * 10.0);
                    this.rightLegGroup.rotation.x = THREE.MathUtils.lerp(this.rightLegGroup.rotation.x, 0, deltaTime * 10.0);
                }
                if (this.leftArmGroup && this.rightArmGroup) {
                    this.leftArmGroup.rotation.x = THREE.MathUtils.lerp(this.leftArmGroup.rotation.x, 0, deltaTime * 10.0);
                    this.rightArmGroup.rotation.x = THREE.MathUtils.lerp(this.rightArmGroup.rotation.x, 0, deltaTime * 10.0);
                }
                if (this.cloakTailMesh) {
                    this.cloakTailMesh.rotation.x = THREE.MathUtils.lerp(this.cloakTailMesh.rotation.x, 0.15, deltaTime * 5.0);
                }
            }

            // Space Jump
            if (this.activeKeys.has('Space') && this.isGrounded) {
                this.velocityY = this.jumpForce;
                this.isGrounded = false;
            }

            // Dynamic Ground Calculation based on player X, Z
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

            this.playerMesh.position.copy(this.playerPos);
        }

        // GTA & ROBLOX STYLE CAMERA ORBIT LERP
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

    render() {
        if (this.isActive) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}