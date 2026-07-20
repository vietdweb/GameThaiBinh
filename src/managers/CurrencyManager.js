/**
 * CurrencyManager - Quáº£n lÃ½ TÃ i NguyÃªn (Meat Energy, Gold Coins, Gems) & LocalStorage
 */
const CURRENCY_KEY = 'tb_rush_currency';

const DEFAULT_CURRENCY = {
  coins: 0,
  gems: 50,
  meat: 1000 // Táº·ng 1000 thá»‹t free khi láº§n Ä‘áº§u vÃ o game
};

export class CurrencyManager {
  constructor() {
    this.data = this._loadData();
  }

  /**
   * Äá»c tÃ i nguyÃªn tá»« localStorage hoáº·c khá»Ÿi táº¡o máº·c Ä‘á»‹nh 1000 thá»‹t
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
    // Khá»Ÿi táº¡o máº·c Ä‘á»‹nh cho ngÆ°á»i chÆ¡i má»›i
    this._saveData(DEFAULT_CURRENCY);
    return { ...DEFAULT_CURRENCY };
  }

  /**
   * Äá»“ng bá»™ dá»¯ liá»‡u vÃ o localStorage
   */
  _saveData(data = this.data) {
    try {
      localStorage.setItem(CURRENCY_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[CurrencyManager] Error saving currency data:', e);
    }
  }

  /**
   * Láº¥y sá»‘ lÆ°á»£ng tÃ i nguyÃªn hiá»‡n táº¡i
   */
  getCurrencies() {
    return this.data;
  }

  /**
   * Kiá»ƒm tra xem cÃ³ Ä‘á»§ Thá»‹t khÃ´ng (máº·c Ä‘á»‹nh cáº§n 10 thá»‹t Ä‘á»ƒ chÆ¡i)
   */
  hasEnoughMeat(amount = 10) {
    return this.data.meat >= amount;
  }

  /**
   * Trá»« Thá»‹t khi vÃ o tráº­n Ä‘áº¥u (VD: trá»« 10 thá»‹t)
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
   * ThÃªm Xu thu tháº­p Ä‘Æ°á»£c sau tráº­n Ä‘áº¥u
   */
  addCoins(amount) {
    if (!amount || amount <= 0) return;
    this.data.coins += Math.floor(amount);
    this._saveData();
    this.updateUI('val-coins');
  }

  /**
   * ThÃªm Kim CÆ°Æ¡ng
   */
  addGems(amount) {
    if (!amount || amount <= 0) return;
    this.data.gems += Math.floor(amount);
    this._saveData();
    this.updateUI('val-gems');
  }

  /**
   * ThÃªm/Náº¡p Thá»‹t Thá»ƒ Lá»±c
   */
  addMeat(amount) {
    if (!amount || amount <= 0) return;
    this.data.meat += Math.floor(amount);
    this._saveData();
    this.updateUI('val-meat');
  }

  /**
   * Äá»‹nh dáº¡ng sá»‘ Ä‘áº¹p (VD: 1000 -> 1,000; 24500 -> 24.5K)
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
   * Cáº­p nháº­t sá»‘ dÆ° trÃªn giao diá»‡n Top Bar HUD
   */
  updateUI(changedElementId = null) {
    const elMeat = document.getElementById('val-meat');
    const elCoins = document.getElementById('val-coins');
    const elGems = document.getElementById('val-gems');

    if (elMeat) elMeat.textContent = this.formatNumber(this.data.meat);
    if (elCoins) elCoins.textContent = this.formatNumber(this.data.coins);
    if (elGems) elGems.textContent = this.formatNumber(this.data.gems);

    // KÃ­ch hoáº¡t hiá»‡u á»©ng pop-scale náº¿u cÃ³ thay Ä‘á»•i
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
