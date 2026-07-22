/**
 * PlayerManager.js - Quản lý State Người chơi (Level, EXP, Avatar & Persistence)
 */

export const DEFAULT_AVATAR_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="64" fill="%230f172a"/><circle cx="64" cy="46" r="26" fill="%2300f5ff"/><path d="M20 114c0-24 20-38 44-38s44 14 44 38" fill="%2300f5ff"/></svg>`;

export class PlayerManager {
  constructor() {
    this.SAVE_KEY = 'PLAYER_DATA';
    
    this.level = 1;
    this.currentExp = 0;
    this.avatarUrl = DEFAULT_AVATAR_SVG;

    this.listeners = [];
    this.onLevelUpCallback = null;

    this.load();
  }

  /**
   * Tính số EXP tối đa cần để lên Cấp tiếp theo
   * Progressive Curve: maxExp = level * 100
   * Level 1: 100 EXP
   * Level 2: 200 EXP
   * Level 3: 300 EXP...
   */
  getMaxExp() {
    return this.level * 100;
  }

  /**
   * Tăng EXP cho người chơi khi ăn Cà phê (hoặc hoàn thành nhiệm vụ)
   * @param {number} amount - Số lượng EXP nhận được
   */
  addExp(amount) {
    if (typeof amount !== 'number' || amount <= 0) return;

    this.currentExp += amount;
    let maxExp = this.getMaxExp();
    let didLevelUp = false;
    let oldLevel = this.level;

    while (this.currentExp >= maxExp) {
      this.currentExp -= maxExp;
      this.level++;
      didLevelUp = true;
      maxExp = this.getMaxExp();
    }

    this.save();
    this._notifyChange();

    if (didLevelUp) {
      if (typeof this.onLevelUpCallback === 'function') {
        this.onLevelUpCallback({
          oldLevel,
          newLevel: this.level,
          currentExp: this.currentExp,
          maxExp: this.getMaxExp()
        });
      }
    }
  }

  /**
   * Xử lý Tải ảnh đại diện từ máy tính (Local File Reader)
   * @param {File} file - File ảnh chọn từ input
   * @returns {Promise<string>} Chuỗi Base64 Data URL của ảnh
   */
  uploadAvatar(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type || !file.type.startsWith('image/')) {
        reject(new Error('Vui lòng chọn file ảnh hợp lệ!'));
        return;
      }

      // Giới hạn file 5MB để tránh vỡ localStorage limit
      if (file.size > 5 * 1024 * 1024) {
        reject(new Error('Kích thước ảnh quá lớn (Vui lòng chọn ảnh nhỏ hơn 5MB)!'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Url = e.target.result;
        try {
          this.avatarUrl = base64Url;
          this.save();
          this._notifyChange();
          resolve(base64Url);
        } catch (err) {
          console.error('Lỗi khi lưu Avatar vào localStorage:', err);
          reject(err);
        }
      };

      reader.onerror = (err) => {
        console.error('Lỗi đọc file ảnh:', err);
        reject(err);
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Lưu dữ liệu người chơi vào localStorage
   */
  save() {
    try {
      const data = {
        level: this.level,
        currentExp: this.currentExp,
        avatarUrl: this.avatarUrl
      };
      localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Không thể lưu PLAYER_DATA vào localStorage (Có thể dung lượng ảnh avatar quá lớn):', e);
    }
  }

  /**
   * Khôi phục dữ liệu từ localStorage
   */
  load() {
    try {
      const raw = localStorage.getItem(this.SAVE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.level && typeof data.level === 'number' && data.level > 0) {
          this.level = data.level;
        }
        if (typeof data.currentExp === 'number' && data.currentExp >= 0) {
          this.currentExp = data.currentExp;
        }
        if (data.avatarUrl && typeof data.avatarUrl === 'string') {
          this.avatarUrl = data.avatarUrl;
        }
      }
    } catch (e) {
      console.error('Lỗi khi đọc PLAYER_DATA từ localStorage:', e);
      this.level = 1;
      this.currentExp = 0;
      this.avatarUrl = DEFAULT_AVATAR_SVG;
    }
  }

  /**
   * Đăng ký callback khi Level Up
   */
  onLevelUp(callback) {
    this.onLevelUpCallback = callback;
  }

  /**
   * Đăng ký lắng nghe thay đổi State (Observer Pattern)
   */
  subscribe(listener) {
    if (typeof listener === 'function') {
      this.listeners.push(listener);
      // Gọi ngay lập tức dữ liệu hiện tại
      listener(this.getState());
    }
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  _notifyChange() {
    const state = this.getState();
    this.listeners.forEach(fn => {
      try { fn(state); } catch (e) { console.error('Error in PlayerManager listener:', e); }
    });
  }

  getState() {
    return {
      level: this.level,
      currentExp: this.currentExp,
      maxExp: this.getMaxExp(),
      avatarUrl: this.avatarUrl,
      progressPercent: Math.min(100, Math.max(0, (this.currentExp / this.getMaxExp()) * 100))
    };
  }
}
