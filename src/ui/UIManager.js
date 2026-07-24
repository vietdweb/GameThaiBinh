/**
 * UIManager.js - Quản lý Giao diện Người Dùng Profile HUD, Avatar Upload, Modal Nhân Vật & Playtime Tracker
 */

export class UIManager {
  /**
   * @param {PlayerManager} playerManager - Instance quản lý State người chơi
   */
  constructor(playerManager) {
    this.playerManager = playerManager;

    this.widgetContainer = null;
    this.avatarImg = null;
    this.levelBadge = null;
    this.titleText = null;
    this.expBarFill = null;
    this.expText = null;
    this.avatarInput = null;

    this._playtimeInterval = null;

    // 1. Nạp CSS UI tự động (/src/style.css)
    this._injectStyleSheet();

    // 2. Khởi tạo DOM Giao diện HUD Góc Trái
    this._initProfileHUDDOM();

    // 3. Đăng ký lắng nghe sự kiện thay đổi dữ liệu từ PlayerManager
    if (this.playerManager) {
      this.unsubscribe = this.playerManager.subscribe((state) => {
        this.renderProfileHUD(state);
        this.renderProfileModal(state);
      });

      this.playerManager.onLevelUp((data) => {
        this.showLevelUpToast(data);
      });
    }
  }

  /**
   * Nạp CSS Stylesheet /src/style.css tự động vào <head> nếu chưa có
   */
  _injectStyleSheet() {
    if (!document.getElementById('ui-manager-styles') && !document.querySelector('link[href*="style.css"]')) {
      const link = document.createElement('link');
      link.id = 'ui-manager-styles';
      link.rel = 'stylesheet';
      link.href = '/src/style.css';
      document.head.appendChild(link);
    }
  }

  /**
   * Xây dựng cấu trúc DOM Profile Widget (HUD) ở góc trái màn hình
   */
  _initProfileHUDDOM() {
    if (document.getElementById('player-hud-widget') || document.getElementById('profile-hud-widget')) {
      this.widgetContainer = document.getElementById('player-hud-widget') || document.getElementById('profile-hud-widget');
      this.avatarImg = this.widgetContainer.querySelector('.profile-avatar-img');
      this.levelBadge = this.widgetContainer.querySelector('.profile-level-badge');
      this.titleText = this.widgetContainer.querySelector('.profile-title-text');
      this.expBarFill = this.widgetContainer.querySelector('.profile-exp-bar-fill');
      this.expText = this.widgetContainer.querySelector('.profile-exp-text');
      this.avatarInput = document.getElementById('avatar-input');
      return;
    }

    // Container chính góc trái trên cùng (Mặc định ẩn 100%, chỉ hiện khi ở MENU)
    const widget = document.createElement('div');
    widget.id = 'player-hud-widget';
    widget.className = 'player-hud-widget profile-hud-widget hidden';
    widget.title = 'Bấm để Mở Bảng Thông Tin Nhân Vật';

    // 1. Avatar Container (Bóng bẩy neon glow)
    const avatarBox = document.createElement('div');
    avatarBox.className = 'profile-avatar-container';

    const avatarImg = document.createElement('img');
    avatarImg.className = 'profile-avatar-img';
    avatarImg.alt = 'User Avatar';

    const overlay = document.createElement('div');
    overlay.className = 'profile-avatar-overlay';
    overlay.innerHTML = '👤';

    avatarBox.appendChild(avatarImg);
    avatarBox.appendChild(overlay);

    // 2. Card Thông Tin Cấp Độ & EXP
    const infoCard = document.createElement('div');
    infoCard.className = 'profile-info-card';

    const headerRow = document.createElement('div');
    headerRow.className = 'profile-header-row';

    const levelBadge = document.createElement('span');
    levelBadge.className = 'profile-level-badge';
    levelBadge.textContent = 'LV. 1';

    // Wrapper Tên Nhân Vật
    const nameWrapper = document.createElement('div');
    nameWrapper.className = 'profile-name-wrapper';

    const titleText = document.createElement('span');
    titleText.className = 'profile-title-text';
    titleText.textContent = this.playerManager?.playerName || 'RUNNER';

    const editIcon = document.createElement('span');
    editIcon.className = 'profile-name-edit-icon';
    editIcon.textContent = '✏️';

    nameWrapper.appendChild(titleText);
    nameWrapper.appendChild(editIcon);

    headerRow.appendChild(levelBadge);
    headerRow.appendChild(nameWrapper);

    // Thanh Tiến Trình EXP
    const track = document.createElement('div');
    track.className = 'profile-exp-bar-track';

    const fill = document.createElement('div');
    fill.className = 'profile-exp-bar-fill';

    const expText = document.createElement('span');
    expText.className = 'profile-exp-text';
    expText.textContent = '0 / 100 EXP';

    track.appendChild(fill);
    track.appendChild(expText);

    infoCard.appendChild(headerRow);
    infoCard.appendChild(track);

    widget.appendChild(avatarBox);
    widget.appendChild(infoCard);
    document.body.appendChild(widget);

    // Sự kiện Click Widget HUD -> Mở Character Profile Modal
    widget.onclick = (e) => {
      e.stopPropagation();
      this.openProfileModal();
    };

    this.widgetContainer = widget;
    this.avatarImg = avatarImg;
    this.levelBadge = levelBadge;
    this.titleText = titleText;
    this.expBarFill = fill;
    this.expText = expText;
  }

  /**
   * Mở Bảng Thông Tin Nhân Vật (Character Profile Modal)
   */
  openProfileModal() {
    let overlay = document.getElementById('profile-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'profile-modal-overlay';
      overlay.className = 'profile-modal-overlay';
      overlay.innerHTML = `
        <div class="modal-backdrop-blur" id="profile-backdrop-blur"></div>
        <div class="profile-modal-card" id="profile-modal-card" style="position: relative; z-index: 10000;">
          <!-- Header -->
          <div class="profile-modal-header">
            <div class="profile-modal-title-group">
              <div class="profile-modal-title"><span>👤</span> BẢNG THÔNG TIN NHÂN VẬT</div>
              <div class="profile-modal-subtitle">THÁI BÌNH RUSH • CYBERPUNK RUNNER</div>
            </div>
            <button class="modal-close-btn profile-modal-close" id="btn-close-profile-modal" title="Đóng">✕</button>
          </div>

          <!-- Body 2 Cột -->
          <div class="profile-modal-grid">
            <!-- CỘT TRÁI: Avatar & Đổi tên -->
            <div class="profile-col-left">
              <div class="modal-avatar-wrapper">
                <img id="modal-avatar-preview" class="modal-avatar-preview" src="" alt="Avatar Preview" />
              </div>
              <input type="file" id="modal-avatar-file-input" accept="image/*" style="display:none" />
              <button id="btn-upload-avatar-modal" class="btn-upload-avatar-modal">📸 Đổi ảnh đại diện</button>

              <div class="modal-rename-section">
                <label class="modal-rename-label">✏️ Tên Nhân Vật</label>
                <div class="modal-rename-row">
                  <input type="text" id="modal-player-name-input" class="modal-rename-input" maxlength="16" placeholder="Nhập tên..." />
                  <button id="btn-save-name-modal" class="btn-save-name-modal">LƯU</button>
                </div>
              </div>
            </div>

            <!-- CỘT PHẢI: Level, EXP, Playtime & Grid Slots -->
            <div class="profile-col-right">
              <!-- Cấp Độ & EXP -->
              <div class="modal-stat-box">
                <div class="modal-stat-header">
                  <span class="modal-stat-title">CẤP ĐỘ HIỆN TẠI</span>
                  <span id="modal-level-big" class="modal-level-big">LV. 1</span>
                </div>
                <div class="modal-exp-track">
                  <div id="modal-exp-fill" class="modal-exp-fill" style="width: 0%"></div>
                  <span id="modal-exp-val-text" class="modal-exp-val-text">0 / 100 EXP (0%)</span>
                </div>
              </div>

              <!-- Playtime Tracker -->
              <div class="modal-playtime-box">
                <div class="modal-playtime-info">
                  <span class="modal-playtime-icon">⏱️</span>
                  <span class="modal-playtime-label">TỔNG THỜI GIAN CHƠI</span>
                </div>
                <span id="modal-playtime-clock" class="modal-playtime-clock">00:00:00</span>
              </div>

              <!-- Equipment & Item Grid Slots -->
              <div class="modal-inventory-section">
                <div class="modal-inventory-title"><span>🎒</span> VẬT PHẨM & CHỈ SỐ TRANG BỊ</div>
                <div class="modal-inventory-grid">
                  <div class="inventory-slot" title="Bảo vệ va chạm 1 lần">
                    <span class="inventory-slot-icon">🛡️</span>
                    <span class="inventory-slot-name">Khiên Giáp</span>
                    <span class="inventory-slot-status">SẴN SÀNG</span>
                  </div>
                  <div class="inventory-slot" title="Hồi 100% Thể lực & Giảm sát thương">
                    <span class="inventory-slot-icon">🍞</span>
                    <span class="inventory-slot-name">Bánh Mì</span>
                    <span class="inventory-slot-status">SẴN SÀNG</span>
                  </div>
                  <div class="inventory-slot" title="Tăng 50% Tốc độ trong 15s">
                    <span class="inventory-slot-icon">⚡</span>
                    <span class="inventory-slot-name">Bình Nitro</span>
                    <span class="inventory-slot-status">SẴN SÀNG</span>
                  </div>
                  <div class="inventory-slot" title="Hút toàn bộ Vàng cách 8m">
                    <span class="inventory-slot-icon">🧲</span>
                    <span class="inventory-slot-name">Nam Châm</span>
                    <span class="inventory-slot-status">SẴN SÀNG</span>
                  </div>
                  <div class="inventory-slot" title="Nhảy siêu lực qua xe bus 3.4m">
                    <span class="inventory-slot-icon">👟</span>
                    <span class="inventory-slot-name">Giày Nhảy</span>
                    <span class="inventory-slot-status">SẴN SÀNG</span>
                  </div>
                  <div class="inventory-slot" title="+25 EXP mỗi ly cà phê">
                    <span class="inventory-slot-icon">☕</span>
                    <span class="inventory-slot-name">Cà Phê</span>
                    <span class="inventory-slot-status">+25 EXP</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="profile-modal-footer">
            <button id="btn-confirm-profile-modal" class="btn-confirm-profile-modal">ĐỒNG Ý</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      // Gắn sự kiện Đóng Modal
      const closeBtn = overlay.querySelector('#btn-close-profile-modal');
      const confirmBtn = overlay.querySelector('#btn-confirm-profile-modal');
      if (closeBtn) closeBtn.onclick = () => this.closeProfileModal();
      if (confirmBtn) confirmBtn.onclick = () => this.closeProfileModal();

      overlay.onclick = (e) => {
        if (e.target === overlay || e.target.classList.contains('modal-backdrop-blur')) this.closeProfileModal();
      };

      // Gắn sự kiện Đổi Ảnh Đại Diện trong Modal
      const btnUpload = overlay.querySelector('#btn-upload-avatar-modal');
      const avatarFileInput = overlay.querySelector('#modal-avatar-file-input');

      if (btnUpload && avatarFileInput) {
        btnUpload.onclick = () => avatarFileInput.click();
        avatarFileInput.onchange = async (e) => {
          const file = e.target.files && e.target.files[0];
          if (file) {
            try {
              await this.playerManager.uploadAvatar(file);
            } catch (err) {
              alert(`⚠️ Lỗi Upload Ảnh: ${err.message || 'Không thể tải ảnh!'}`);
            } finally {
              avatarFileInput.value = '';
            }
          }
        };
      }

      // Gắn sự kiện Lưu Tên Nhân Vật
      const btnSaveName = overlay.querySelector('#btn-save-name-modal');
      const nameInput = overlay.querySelector('#modal-player-name-input');
      const handleSaveName = () => {
        if (nameInput && nameInput.value.trim()) {
          this.playerManager.setPlayerName(nameInput.value.trim());
        }
      };

      if (btnSaveName) btnSaveName.onclick = handleSaveName;
      if (nameInput) {
        nameInput.onkeydown = (e) => {
          if (e.key === 'Enter') handleSaveName();
        };
      }
    }

    // Render dữ liệu tức thì lên Modal
    if (this.playerManager) {
      this.renderProfileModal(this.playerManager.getState());
    }

    overlay.classList.add('active');

    // Chạy đếm thời gian chơi realtime khi modal mở
    this._startPlaytimeLiveTracker();
  }

  /**
   * Đóng Character Profile Modal
   */
  closeProfileModal() {
    const overlay = document.getElementById('profile-modal-overlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
    this._stopPlaytimeLiveTracker();
  }

  _startPlaytimeLiveTracker() {
    this._stopPlaytimeLiveTracker();
    this._playtimeInterval = setInterval(() => {
      const clockElem = document.getElementById('modal-playtime-clock');
      if (clockElem && this.playerManager) {
        clockElem.textContent = this.playerManager.getFormattedPlaytime();
      }
    }, 1000);
  }

  _stopPlaytimeLiveTracker() {
    if (this._playtimeInterval) {
      clearInterval(this._playtimeInterval);
      this._playtimeInterval = null;
    }
  }

  /**
   * Cập nhật dữ liệu hiển thị trên Profile Modal
   * @param {Object} state - Trạng thái PlayerManager
   */
  renderProfileModal(state) {
    if (!state) return;
    const overlay = document.getElementById('profile-modal-overlay');
    if (!overlay) return;

    const avatarPreview = overlay.querySelector('#modal-avatar-preview');
    const nameInput = overlay.querySelector('#modal-player-name-input');
    const levelBig = overlay.querySelector('#modal-level-big');
    const expFill = overlay.querySelector('#modal-exp-fill');
    const expValText = overlay.querySelector('#modal-exp-val-text');
    const playtimeClock = overlay.querySelector('#modal-playtime-clock');

    if (avatarPreview && state.avatarUrl) avatarPreview.src = state.avatarUrl;
    if (nameInput && document.activeElement !== nameInput) nameInput.value = state.playerName || 'RUNNER';
    if (levelBig) levelBig.textContent = `LV. ${state.level}`;
    if (expFill) expFill.style.width = `${state.progressPercent.toFixed(1)}%`;
    if (expValText) expValText.textContent = `${state.currentExp} / ${state.maxExp} EXP (${state.progressPercent.toFixed(1)}%)`;
    if (playtimeClock) playtimeClock.textContent = state.formattedPlaytime || '00:00:00';
  }

  /**
   * Cập nhật hiển thị giao diện UI Profile HUD tức thì (Re-render)
   * @param {Object} state - Data state từ PlayerManager
   */
  renderProfileHUD(state) {
    if (!state) return;

    if (this.avatarImg && state.avatarUrl) {
      this.avatarImg.src = state.avatarUrl;
    }

    if (this.levelBadge && typeof state.level === 'number') {
      this.levelBadge.textContent = `LV. ${state.level}`;
    }

    if (this.titleText && state.playerName) {
      this.titleText.textContent = state.playerName;
    }

    if (this.expBarFill && typeof state.progressPercent === 'number') {
      this.expBarFill.style.width = `${state.progressPercent.toFixed(1)}%`;
    }

    if (this.expText && typeof state.currentExp === 'number' && typeof state.maxExp === 'number') {
      this.expText.textContent = `${state.currentExp} / ${state.maxExp} EXP`;
    }
  }

  /**
   * Hiển thị Toast thông báo chúc mừng Level Up rực rỡ
   */
  showLevelUpToast(data) {
    let toast = document.getElementById('level-up-toast-popup');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'level-up-toast-popup';
      toast.className = 'level-up-toast-popup';
      toast.innerHTML = `
        <div class="level-up-title">🌟 LEVEL UP! 🌟</div>
        <div class="level-up-subtitle" id="level-up-toast-sub">Cấp độ mới: LV. 2</div>
      `;
      document.body.appendChild(toast);
    }

    const sub = toast.querySelector('#level-up-toast-sub');
    if (sub) {
      sub.textContent = `Chúc mừng! Bạn đã đạt Cấp Độ LV. ${data.newLevel}`;
    }

    toast.classList.add('active');

    setTimeout(() => {
      toast.classList.remove('active');
    }, 2800);
  }

  /**
   * Bật / Ẩn Profile HUD Widget
   * @param {boolean} visible 
   */
  showProfileHUD(visible) {
    if (this.widgetContainer) {
      if (visible) {
        this.widgetContainer.classList.remove('hidden');
      } else {
        this.widgetContainer.classList.add('hidden');
      }
    }
  }

  destroy() {
    this._stopPlaytimeLiveTracker();
    if (typeof this.unsubscribe === 'function') {
      this.unsubscribe();
    }
    if (this.widgetContainer) {
      this.widgetContainer.remove();
    }
  }
}
