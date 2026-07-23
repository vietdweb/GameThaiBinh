/**
 * CurrencyManager - Quản lý Tài Nguyên (Meat Energy, Gold Coins, Gems) & LocalStorage
 */
const CURRENCY_KEY = 'tb_rush_currency';

const DEFAULT_CURRENCY = {
  coins: 0,
  gems: 50,
  meat: 1000 // Tặng 1000 thịt free khi lần đầu vào game
};

export class CurrencyManager {
  constructor() {
    this.data = this._loadData();
  }

  /**
   * Đọc tài nguyên từ localStorage hoặc khởi tạo mặc định 1000 thịt
   */
  _loadData() {
    try {
      const saved = localStorage.getItem(CURRENCY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          coins: parsed.coins !== undefined ? parsed.coins : DEFAULT_CURRENCY.coins,
          gems: parsed.gems !== undefined ? parsed.gems : DEFAULT_CURRENCY.gems,
          meat: parsed.meat !== undefined ? parsed.meat : DEFAULT_CURRENCY.meat
        };
      }
    } catch (e) {
      console.warn('[CurrencyManager] Error loading currency data:', e);
    }
    // Khởi tạo mặc định cho người chơi mới
    this._saveData(DEFAULT_CURRENCY);
    return { ...DEFAULT_CURRENCY };
  }

  /**
   * Đồng bộ dữ liệu vào localStorage
   */
  _saveData(data = this.data) {
    try {
      localStorage.setItem(CURRENCY_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[CurrencyManager] Error saving currency data:', e);
    }
  }

  /**
   * Lấy số lượng tài nguyên hiện tại
   */
  getCurrencies() {
    return this.data;
  }

  /**
   * Kiểm tra xem có đủ Thịt không (mặc định cần 10 thịt để chơi)
   */
  hasEnoughMeat(amount = 10) {
    return this.data.meat >= amount;
  }

  /**
   * Trừ Thịt khi vào trận đấu (VD: trừ 10 thịt)
   */
  deductMeat(amount = 10) {
    if (this.data.meat < amount) {
      return false;
    }
    this.data.meat -= amount;
    this._saveData();
    this.updateUI('val-meat');
    return true;
  }

  /**
   * Thêm Xu thu thập được sau trận đấu
   */
  addCoins(amount) {
    if (!amount || amount <= 0) return;
    this.data.coins += Math.floor(amount);
    this._saveData();
    this.updateUI('val-coins');
  }

  /**
   * Thêm Kim Cương
   */
  addGems(amount) {
    if (!amount || amount <= 0) return;
    this.data.gems += Math.floor(amount);
    this._saveData();
    this.updateUI('val-gems');
  }

  /**
   * Thêm/Nạp Thịt Thể Lực
   */
  addMeat(amount) {
    if (!amount || amount <= 0) return;
    this.data.meat += Math.floor(amount);
    this._saveData();
    this.updateUI('val-meat');
  }

  /**
   * Định dạng số đẹp (VD: 1000 -> 1,000; 24500 -> 24.5K)
   */
  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 10000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toLocaleString('vi-VN');
  }

  /**
   * Cập nhật số dư trên giao diện Top Bar HUD
   */
  updateUI(changedElementId = null) {
    const elMeat = document.getElementById('val-meat');
    const elCoins = document.getElementById('val-coins');
    const elGems = document.getElementById('val-gems');
    const elCoffee = document.getElementById('val-coffee');

    if (elMeat) elMeat.textContent = this.formatNumber(this.data.meat);
    if (elCoins) elCoins.textContent = this.formatNumber(this.data.coins);
    if (elGems) elGems.textContent = this.formatNumber(this.data.gems);
    if (elCoffee) elCoffee.textContent = this.formatNumber(this.data.coins);


    // Kích hoạt hiệu ứng pop-scale nếu có thay đổi
    if (changedElementId) {
      const el = document.getElementById(changedElementId);
      if (el) {
        el.classList.remove('pop-scale');
        void el.offsetWidth; // Force reflow
        el.classList.add('pop-scale');
      }
    }
  }
}