/**
 * CityManager.js - Manager for 3D City Open World Map
 * Features:
 * 1. Lazy-loads City 3D Map ON DEMAND (0ms upfront load time when entering web app)
 * 2. Manages UI Loading Overlay Progress (0% -> 100%)
 * 3. Enforces UI HUD Visibility Rules (Hides Top Currency Bar & Audio Panel when in 3D City)
 * 4. Integrates with Main Menu Button (#btn-open-city) & Exit Button (#btn-exit-city-3d)
 */
export class CityManager {
    constructor(game, city3DScene) {
        this.game = game;
        this.city3DScene = city3DScene;
        this._setupEvents();
    }

    _setupEvents() {
        const btnOpenCity = document.getElementById('btn-open-city');
        const btnExitCity = document.getElementById('btn-exit-city-3d');
        const mainMenuPanel = document.querySelector('.main-menu-panel') || document.getElementById('main-menu');

        document.addEventListener('click', (e) => {
            // 1. Click nút "🌆 Khám Phá Thành Phố 3D" ở Menu chính
            const btnOpen = e.target.closest('#btn-open-city');
            if (btnOpen) {
                e.stopPropagation();
                this.game.audioManager?._ensureContext?.();
                this.enterCityMap();
            }

            // 2. Click nút "✕ THOÁT THÀNH PHỐ" -> Quay lại Menu chính
            const btnExit = e.target.closest('#btn-exit-city-3d');
            if (btnExit) {
                e.stopPropagation();
                this.exitCityMap();
            }
        });
    }

    /* 🌆 LAZY LOAD & VÀO MAP THÀNH PHỐ 3D */
    enterCityMap() {
        const mainMenuPanel = document.querySelector('.main-menu-panel') || document.getElementById('main-menu');
        const btnExitCity = document.getElementById('btn-exit-city-3d');

        // Ẩn Top Currency Bar & Audio Panel theo đúng UI HUD Rules
        if (typeof this.game._setAudioPanelVisible === 'function') {
            this.game._setAudioPanelVisible(false);
        }

        if (mainMenuPanel) mainMenuPanel.style.display = 'none';

        // Nếu Map chưa được nạp -> Hiển thị Modal Tải Tài Nguyên
        if (!this.city3DScene.isLoaded) {
            this._showLoadingOverlay(true);
            this.city3DScene.loadCity(
                (percent) => {
                    this._updateLoadingProgress(percent);
                },
                () => {
                    this._updateLoadingProgress(100);
                    setTimeout(() => {
                        this._showLoadingOverlay(false);
                        if (btnExitCity) btnExitCity.classList.remove('hidden');
                        this.city3DScene.openCity();
                    }, 350);
                }
            );
        } else {
            if (btnExitCity) btnExitCity.classList.remove('hidden');
            this.city3DScene.openCity();
        }
    }

    /* 🚪 THOÁT MAP THÀNH PHỐ 3D VỀ MENU CHÍNH */
    exitCityMap() {
        const mainMenuPanel = document.querySelector('.main-menu-panel') || document.getElementById('main-menu');
        const btnExitCity = document.getElementById('btn-exit-city-3d');

        if (this.city3DScene) {
            this.city3DScene.closeCity();
        }

        if (btnExitCity) btnExitCity.classList.add('hidden');
        if (mainMenuPanel) mainMenuPanel.style.display = 'flex';

        // Hiển thị lại Top Currency Bar & Audio Panel ở Menu chính
        if (typeof this.game._setAudioPanelVisible === 'function') {
            this.game._setAudioPanelVisible(true);
        }
    }

    _showLoadingOverlay(show) {
        let modal = document.getElementById('city-loading-modal');
        if (!modal && show) {
            modal = document.createElement('div');
            modal.id = 'city-loading-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(15, 23, 42, 0.96);
                backdrop-filter: blur(16px);
                z-index: 5000;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: #ffffff;
                font-family: 'Outfit', sans-serif;
            `;
            modal.innerHTML = `
                <div style="text-align: center; max-width: 480px; width: 90%;">
                    <div style="font-size: 54px; margin-bottom: 12px; animation: bounce 1.5s infinite;">🌆</div>
                    <h2 style="font-size: 26px; color: #00f5ff; font-weight: 800; margin: 0 0 8px 0; letter-spacing: 1px;">ĐANG TẢI THÀNH PHỐ 3D...</h2>
                    <p style="font-size: 14px; color: #94a3b8; margin-bottom: 24px;">Đang tải tài nguyên model city.glb và thiết lập thế giới 3D...</p>

                    <div style="width: 100%; height: 14px; background: rgba(255, 255, 255, 0.1); border-radius: 20px; overflow: hidden; border: 1.5px solid #00f5ff; box-shadow: 0 0 20px rgba(0, 245, 255, 0.4);">
                        <div id="city-progress-bar-fill" style="width: 0%; height: 100%; background: linear-gradient(90deg, #00f5ff, #3b82f6); transition: width 0.2s ease;"></div>
                    </div>
                    <div id="city-progress-text" style="font-size: 16px; font-weight: 700; color: #00f5ff; margin-top: 12px;">0%</div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        if (modal) {
            modal.style.display = show ? 'flex' : 'none';
        }
    }

    _updateLoadingProgress(percent) {
        const fill = document.getElementById('city-progress-bar-fill');
        const text = document.getElementById('city-progress-text');
        if (fill) fill.style.width = `${percent}%`;
        if (text) text.textContent = `${percent}%`;
    }
}
