/**
 * UIManager.js - Quản lý Giao diện Người Dùng Profile HUD, Avatar Upload & Tiến trình Level/EXP
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
    this.expBarFill = null;
    this.expText = null;
    this.avatarInput = null;

    // 1. Nạp CSS UI tự động nếu chưa có
    this._injectStyleSheet();

    // 2. Khởi tạo DOM Giao diện
    this._initProfileHUDDOM();

    // 3. Đăng ký lắng nghe sự kiện thay đổi dữ liệu từ PlayerManager
    if (this.playerManager) {
      this.unsubscribe = this.playerManager.subscribe((state) => {
        this.renderProfileHUD(state);
      });

      this.playerManager.onLevelUp((data) => {
        this.showLevelUpToast(data);
      });
    }
  }

  /**
   * Nạp CSS Stylesheet /src/ui/styles/ui.css tự động vào <head>
   */
  _injectStyleSheet() {
    if (!document.getElementById('ui-manager-styles')) {
      const link = document.createElement('link');
      link.id = 'ui-manager-styles';
      link.rel = 'stylesheet';
      link.href = '/src/ui/styles/ui.css';
      document.head.appendChild(link);
    }
  }

  /**
   * Xây dựng cấu trúc DOM Profile Widget ở góc trái màn hình
   */
  _initProfileHUDDOM() {
    if (document.getElementById('profile-hud-widget')) {
      this.widgetContainer = document.getElementById('profile-hud-widget');
      this.avatarImg = this.widgetContainer.querySelector('.profile-avatar-img');
      this.levelBadge = this.widgetContainer.querySelector('.profile-level-badge');
      this.expBarFill = this.widgetContainer.querySelector('.profile-exp-bar-fill');
      this.expText = this.widgetContainer.querySelector('.profile-exp-text');
      this.avatarInput = document.getElementById('avatar-input');
      return;
    }

    // Container chính góc trái trên cùng
    const widget = document.createElement('div');
    widget.id = 'profile-hud-widget';
    widget.className = 'profile-hud-widget';

    // 1. Avatar Container (Bóng bẩy, click mở chọn ảnh)
    const avatarBox = document.createElement('div');
    avatarBox.className = 'profile-avatar-container';
    avatarBox.title = 'Bấm để Đổi Ảnh Đại Diện';

    const avatarImg = document.createElement('img');
    avatarImg.className = 'profile-avatar-img';
    avatarImg.alt = 'User Avatar';

    const overlay = document.createElement('div');
    overlay.className = 'profile-avatar-overlay';
    overlay.innerHTML = '📷';

    avatarBox.appendChild(avatarImg);
    avatarBox.appendChild(overlay);

    // Input File Ẩn bên dưới
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'avatar-input';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';

    // Sự kiện Click Avatar -> Chọn file
    avatarBox.onclick = () => {
      fileInput.click();
    };

    // Sự kiện Chọn File Ảnh -> Gọi PlayerManager.uploadAvatar
    fileInput.onchange = async (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        try {
          await this.playerManager.uploadAvatar(file);
        } catch (err) {
          alert(`⚠️ Lỗi Upload Ảnh: ${err.message || 'Không thể tải ảnh!'}`);
        } finally {
          fileInput.value = ''; // Reset input
        }
      }
    };

    // 2. Card Thông Tin Cấp Độ & EXP
    const infoCard = document.createElement('div');
    infoCard.className = 'profile-info-card';

    const headerRow = document.createElement('div');
    headerRow.className = 'profile-header-row';

    const levelBadge = document.createElement('span');
    levelBadge.className = 'profile-level-badge';
    levelBadge.textContent = 'LV. 1';

    const titleText = document.createElement('span');
    titleText.className = 'profile-title-text';
    titleText.textContent = 'RUNNER';

    headerRow.appendChild(levelBadge);
    headerRow.appendChild(titleText);

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
    document.body.appendChild(fileInput);
    document.body.appendChild(widget);

    this.widgetContainer = widget;
    this.avatarImg = avatarImg;
    this.levelBadge = levelBadge;
    this.expBarFill = fill;
    this.expText = expText;
    this.avatarInput = fileInput;
  }

  /**
   * Cập nhật hiển thị giao diện UI Profile tức thì (Re-render)
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
    if (typeof this.unsubscribe === 'function') {
      this.unsubscribe();
    }
    if (this.widgetContainer) {
      this.widgetContainer.remove();
    }
  }
}
