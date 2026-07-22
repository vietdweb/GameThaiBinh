/**
 * mobile.js - Dedicated Mobile & Touch Controls Manager for 3D Shop Scene & Open World
 * Handles Virtual Analog Joystick, Action Touch Buttons (Jump, Drive/Exit Vehicle),
 * and Touch Orbit Camera Pan gesture.
 */

export class MobileControls {
    constructor(shop3DScene) {
        this.shopScene = shop3DScene;
        this.isMobile = this._detectMobile();
        this.isActive = false;

        // Joystick state
        this.joystickData = {
            active: false,
            touchId: null,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            dirX: 0, // -1 to 1
            dirY: 0, // -1 to 1 (Z movement: -1 forward, 1 backward)
            distance: 0,
            maxRadius: 45 // max joystick thumb drag radius in px
        };

        // Touch Camera Pan state
        this.cameraTouchData = {
            active: false,
            touchId: null,
            lastX: 0,
            lastY: 0
        };

        // Button states
        this.isJumpPressed = false;
        this.isDrivePressed = false;

        // DOM Elements
        this.container = null;
        this.joystickBase = null;
        this.joystickThumb = null;
        this.btnJump = null;
        this.btnDrive = null;
        this.driveLabel = null;

        // Bound event listeners for clean cleanup
        this._onTouchStart = this._handleTouchStart.bind(this);
        this._onTouchMove = this._handleTouchMove.bind(this);
        this._onTouchEnd = this._handleTouchEnd.bind(this);

        this._createDOM();
    }

    /**
     * Tự động phát hiện thiết bị di động / màn hình cảm ứng
     */
    _detectMobile() {
        const hasTouchScreen = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const smallScreen = window.innerWidth <= 1024;
        return hasTouchScreen || mobileUA || smallScreen;
    }

    /**
     * Tạo Giao diện Điều khiển Ảo Mobile trên DOM (Virtual Joystick & Action Buttons)
     */
    _createDOM() {
        if (document.getElementById('mobile-controls-root')) {
            this.container = document.getElementById('mobile-controls-root');
            this.joystickBase = document.getElementById('mobile-joystick-base');
            this.joystickThumb = document.getElementById('mobile-joystick-thumb');
            this.btnJump = document.getElementById('mobile-btn-jump');
            this.btnDrive = document.getElementById('mobile-btn-drive');
            this.driveLabel = document.getElementById('mobile-btn-drive-label');
            return;
        }

        // Parent container
        const root = document.createElement('div');
        root.id = 'mobile-controls-root';
        root.className = 'mobile-controls-overlay';
        root.style.display = 'none';

        // 1. Virtual Joystick (Bottom-Left)
        const joystickWrap = document.createElement('div');
        joystickWrap.className = 'mobile-joystick-wrap';

        const joystickBase = document.createElement('div');
        joystickBase.id = 'mobile-joystick-base';
        joystickBase.className = 'mobile-joystick-base';

        const joystickThumb = document.createElement('div');
        joystickThumb.id = 'mobile-joystick-thumb';
        joystickThumb.className = 'mobile-joystick-thumb';

        joystickBase.appendChild(joystickThumb);
        joystickWrap.appendChild(joystickBase);

        // 2. Action Buttons (Bottom-Right)
        const actionWrap = document.createElement('div');
        actionWrap.className = 'mobile-actions-wrap';

        // Nút Nhảy 🦘
        const btnJump = document.createElement('button');
        btnJump.id = 'mobile-btn-jump';
        btnJump.className = 'mobile-action-btn btn-jump';
        btnJump.type = 'button';
        btnJump.innerHTML = `
            <span class="btn-icon">🦘</span>
            <span class="btn-text">NHẢY</span>
        `;

        // Nút Lái Xe / Xuống Xe 🏎️
        const btnDrive = document.createElement('button');
        btnDrive.id = 'mobile-btn-drive';
        btnDrive.className = 'mobile-action-btn btn-drive';
        btnDrive.type = 'button';
        btnDrive.style.display = 'none'; // Ẩn mặc định, chỉ hiện khi gần xe hoặc đang lái
        btnDrive.innerHTML = `
            <span class="btn-icon" id="mobile-btn-drive-icon">🏎️</span>
            <span class="btn-text" id="mobile-btn-drive-label">LÁI XE</span>
        `;

        actionWrap.appendChild(btnDrive);
        actionWrap.appendChild(btnJump);

        root.appendChild(joystickWrap);
        root.appendChild(actionWrap);

        document.body.appendChild(root);

        this.container = root;
        this.joystickBase = joystickBase;
        this.joystickThumb = joystickThumb;
        this.btnJump = btnJump;
        this.btnDrive = btnDrive;
        this.driveLabel = document.getElementById('mobile-btn-drive-label');

        this._setupButtonListeners();
    }

    /**
     * Gán sự kiện click / touch cho các nút hành động
     */
    _setupButtonListeners() {
        if (this.btnJump) {
            const handleJumpStart = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.isJumpPressed = true;
                this.btnJump.classList.add('active');
                if (this.shopScene && this.shopScene.isActive) {
                    this.shopScene.activeKeys.add('Space');
                }
            };
            const handleJumpEnd = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.isJumpPressed = false;
                this.btnJump.classList.remove('active');
                if (this.shopScene && this.shopScene.isActive) {
                    this.shopScene.activeKeys.delete('Space');
                }
            };

            this.btnJump.addEventListener('touchstart', handleJumpStart, { passive: false });
            this.btnJump.addEventListener('touchend', handleJumpEnd, { passive: false });
            this.btnJump.addEventListener('touchcancel', handleJumpEnd, { passive: false });
            this.btnJump.addEventListener('mousedown', handleJumpStart);
            this.btnJump.addEventListener('mouseup', handleJumpEnd);
        }

        if (this.btnDrive) {
            const handleDriveClick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.shopScene && this.shopScene.isActive) {
                    this.shopScene._toggleVehicleMount();
                }
            };

            this.btnDrive.addEventListener('touchstart', handleDriveClick, { passive: false });
            this.btnDrive.addEventListener('click', handleDriveClick);
        }
    }

    /**
     * Kích hoạt và gắn sự kiện cảm ứng toàn màn hình
     */
    _attachEvents() {
        window.addEventListener('touchstart', this._onTouchStart, { passive: false });
        window.addEventListener('touchmove', this._onTouchMove, { passive: false });
        window.addEventListener('touchend', this._onTouchEnd, { passive: false });
        window.addEventListener('touchcancel', this._onTouchEnd, { passive: false });
    }

    /**
     * Hủy bỏ sự kiện cảm ứng
     */
    _detachEvents() {
        window.removeEventListener('touchstart', this._onTouchStart);
        window.removeEventListener('touchmove', this._onTouchMove);
        window.removeEventListener('touchend', this._onTouchEnd);
        window.removeEventListener('touchcancel', this._onTouchEnd);
    }

    /**
     * Xử lý Touch Start (Phân tách vung Joystick bên trái vs Vùng xoay Camera bên phải)
     */
    _handleTouchStart(e) {
        if (!this.isActive || !this.shopScene || !this.shopScene.isActive) return;

        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const target = touch.target;

            // Bỏ qua nếu chạm vào các nút UI HTML cố định
            if (target && target.closest && (target.closest('#btn-exit-shop-3d') || target.closest('.mobile-action-btn') || target.closest('#audio-control-panel'))) {
                continue;
            }

            // Nửa màn hình bên trái (X < 50%): Kích hoạt hoặc di chuyển Joystick
            if (touch.clientX < screenWidth * 0.50 && !this.joystickData.active) {
                e.preventDefault();
                this.joystickData.active = true;
                this.joystickData.touchId = touch.identifier;

                // Căn chỉnh tâm Joystick base tại vị trí chạm nếu chưa fix position
                const rect = this.joystickBase.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                this.joystickData.startX = centerX;
                this.joystickData.startY = centerY;
                this._updateJoystickPos(touch.clientX, touch.clientY);
            }
            // Nửa màn hình bên phải (X >= 50%): Kích hoạt drag xoay Orbit Camera
            else if (touch.clientX >= screenWidth * 0.50 && !this.cameraTouchData.active) {
                this.cameraTouchData.active = true;
                this.cameraTouchData.touchId = touch.identifier;
                this.cameraTouchData.lastX = touch.clientX;
                this.cameraTouchData.lastY = touch.clientY;
            }
        }
    }

    /**
     * Xử lý Touch Move (Cập nhật hướng Cần gạt & góc xoay Camera)
     */
    _handleTouchMove(e) {
        if (!this.isActive || !this.shopScene || !this.shopScene.isActive) return;

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];

            // Cập nhật Cần gạt Analog Joystick
            if (this.joystickData.active && touch.identifier === this.joystickData.touchId) {
                e.preventDefault();
                this._updateJoystickPos(touch.clientX, touch.clientY);
            }
            // Cập nhật Xoay Camera Orbit 360°
            else if (this.cameraTouchData.active && touch.identifier === this.cameraTouchData.touchId) {
                e.preventDefault();
                const deltaX = touch.clientX - this.cameraTouchData.lastX;
                const deltaY = touch.clientY - this.cameraTouchData.lastY;

                this.cameraTouchData.lastX = touch.clientX;
                this.cameraTouchData.lastY = touch.clientY;

                if (this.shopScene) {
                    this.shopScene.cameraYaw -= deltaX * 0.006;
                    this.shopScene.cameraPitch = THREE.MathUtils.clamp(
                        this.shopScene.cameraPitch + deltaY * 0.004,
                        0.08,
                        1.25
                    );
                }
            }
        }
    }

    /**
     * Xử lý Touch End / Cancel
     */
    _handleTouchEnd(e) {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];

            if (this.joystickData.active && touch.identifier === this.joystickData.touchId) {
                this._resetJoystick();
            }

            if (this.cameraTouchData.active && touch.identifier === this.cameraTouchData.touchId) {
                this.cameraTouchData.active = false;
                this.cameraTouchData.touchId = null;
            }
        }
    }

    /**
     * Tính toán vị trí núm Joystick thumb và vector hướng di chuyển
     */
    _updateJoystickPos(touchX, touchY) {
        const dx = touchX - this.joystickData.startX;
        const dy = touchY - this.joystickData.startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxR = this.joystickData.maxRadius;

        let clampDist = Math.min(dist, maxR);
        let angle = Math.atan2(dy, dx);

        const thumbX = Math.cos(angle) * clampDist;
        const thumbY = Math.sin(angle) * clampDist;

        if (this.joystickThumb) {
            this.joystickThumb.style.transform = `translate(${thumbX}px, ${thumbY}px)`;
        }

        // Normalize direction components (-1 to 1)
        this.joystickData.dirX = thumbX / maxR;
        this.joystickData.dirY = thumbY / maxR; // Negative dy = Up/Forward
        this.joystickData.distance = clampDist / maxR;
    }

    /**
     * Trả Joystick về tâm (0,0) khi thả tay
     */
    _resetJoystick() {
        this.joystickData.active = false;
        this.joystickData.touchId = null;
        this.joystickData.dirX = 0;
        this.joystickData.dirY = 0;
        this.joystickData.distance = 0;

        if (this.joystickThumb) {
            this.joystickThumb.style.transform = 'translate(0px, 0px)';
        }
    }

    /**
     * Lấy vector hướng di chuyển hiện tại từ Joystick
     * @returns {{ dirX: number, dirZ: number, intensity: number }}
     */
    getMoveVector() {
        return {
            dirX: this.joystickData.dirX,
            dirZ: this.joystickData.dirY, // dirY từ màn hình maps sang trục Z trong 3D space
            intensity: this.joystickData.distance
        };
    }

    /**
     * Cập nhật trạng thái hiển thị nút Lái xe khi đứng gần Siêu Xe hoặc đang Lái Xe
     */
    updateVehicleButtonState(nearVehicle, isDriving, carName = '') {
        if (!this.btnDrive) return;

        const iconEl = document.getElementById('mobile-btn-drive-icon');
        const labelEl = document.getElementById('mobile-btn-drive-label');

        if (isDriving) {
            this.btnDrive.style.display = 'flex';
            this.btnDrive.classList.add('is-driving');
            if (iconEl) iconEl.textContent = '🚪';
            if (labelEl) labelEl.textContent = 'XUỐNG XE';
        } else if (nearVehicle) {
            this.btnDrive.style.display = 'flex';
            this.btnDrive.classList.remove('is-driving');
            if (iconEl) iconEl.textContent = '🏎️';
            if (labelEl) labelEl.textContent = `LÁI XE (${carName || 'XE'})`;
        } else {
            this.btnDrive.style.display = 'none';
        }
    }

    /**
     * Hiển thị giao diện mobile controls khi vào Shop 3D
     */
    show() {
        // Tự động kiểm tra thiết bị di động hoặc force display nếu touch capability
        if (!this.container) this._createDOM();
        this.isActive = true;

        if (this.container) {
            this.container.style.display = 'block';
        }

        this._attachEvents();
        this._resetJoystick();
    }

    /**
     * Ẩn giao diện mobile controls khi rời Shop 3D
     */
    hide() {
        this.isActive = false;
        if (this.container) {
            this.container.style.display = 'none';
        }

        this._detachEvents();
        this._resetJoystick();

        this.cameraTouchData.active = false;
        this.cameraTouchData.touchId = null;
    }

    destroy() {
        this.hide();
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
