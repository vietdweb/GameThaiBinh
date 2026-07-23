/**
 * PowerUpUpgradeManager.js - Quản lý Cấp độ (Level 1-5) & Nâng Cấp Vật Phẩm
 * Mỗi cấp độ cộng thêm +1 giây thời gian hiệu lực cho vật phẩm
 */
import { POWERUP_TYPES, POWERUP_CONFIG } from '../utils/Constants.js';

export const POWERUP_UPGRADE_CONFIG = {
  [POWERUP_TYPES.SHIELD]: {
    id: POWERUP_TYPES.SHIELD,
    name: 'Giáp Nón Lá',
    icon: '🛡️',
    baseDesc: 'Bảo vệ 1 lần va chạm',
    baseDurationSec: 1.5, // 1.5s cooldown miễn trừ va chạm
    costs: [0, 150, 350, 700, 1200] // Chi phí Cà phê cho Lv 1, Lv 2, Lv 3, Lv 4, Lv 5
  },
  [POWERUP_TYPES.DOUBLE_SCORE]: {
    id: POWERUP_TYPES.DOUBLE_SCORE,
    name: 'Bánh Mì X2 Score',
    icon: '🥖',
    baseDesc: 'Nhân đôi điểm số khi chạy',
    baseDurationSec: 10, // 10 giây mặc định
    costs: [0, 100, 250, 500, 1000]
  },
  [POWERUP_TYPES.BOOST]: {
    id: POWERUP_TYPES.BOOST,
    name: 'Xe Ôm Boost',
    icon: '🛵',
    baseDesc: 'Phóng nhanh bất tử & hút Cà phê',
    baseDurationSec: 6, // 6 giây mặc định
    costs: [0, 200, 450, 850, 1500]
  },
  [POWERUP_TYPES.HIGH_JUMP]: {
    id: POWERUP_TYPES.HIGH_JUMP,
    name: 'Giày Nhảy Cao Neon',
    icon: '👟',
    baseDesc: 'Bật nhảy cực cao qua VinBus',
    baseDurationSec: 8, // 8 giây mặc định
    costs: [0, 120, 300, 600, 1100]
  }
};

export class PowerUpUpgradeManager {
  constructor(currencyManager) {
    this.currencyManager = currencyManager;
    this.levels = this._loadLevels();
  }

  _loadLevels() {
    try {
      const data = localStorage.getItem('sgr_powerup_upgrades');
      const defaultLevels = {
        [POWERUP_TYPES.SHIELD]: 1,
        [POWERUP_TYPES.DOUBLE_SCORE]: 1,
        [POWERUP_TYPES.BOOST]: 1,
        [POWERUP_TYPES.HIGH_JUMP]: 1
      };
      return data ? { ...defaultLevels, ...JSON.parse(data) } : defaultLevels;
    } catch (e) {
      return {
        [POWERUP_TYPES.SHIELD]: 1,
        [POWERUP_TYPES.DOUBLE_SCORE]: 1,
        [POWERUP_TYPES.BOOST]: 1,
        [POWERUP_TYPES.HIGH_JUMP]: 1
      };
    }
  }

  _saveLevels() {
    try {
      localStorage.setItem('sgr_powerup_upgrades', JSON.stringify(this.levels));
    } catch (e) {
      console.warn('[PowerUpUpgradeManager] Failed to save levels:', e);
    }
  }

  /**
   * Lấy cấp độ hiện tại của vật phẩm (1-5)
   */
  getLevel(type) {
    return this.levels[type] || 1;
  }

  /**
   * Lấy thời gian hiệu lực (tính bằng ms) của vật phẩm theo Level hiện tại (+1s mỗi Lv)
   */
  getDurationMs(type) {
    const level = this.getLevel(type);
    const config = POWERUP_UPGRADE_CONFIG[type];
    if (!config) return 5000;

    const extraSec = level - 1; // Lv1: +0s, Lv2: +1s, Lv3: +2s, Lv4: +3s, Lv5: +4s
    return (config.baseDurationSec + extraSec) * 1000;
  }

  /**
   * Lấy thời gian hiệu lực (tính bằng giây) của vật phẩm
   */
  getDurationSec(type) {
    const level = this.getLevel(type);
    const config = POWERUP_UPGRADE_CONFIG[type];
    if (!config) return 5;
    return config.baseDurationSec + (level - 1);
  }

  /**
   * Lấy chi phí Cà phê nâng cấp lên cấp tiếp theo
   */
  getNextUpgradeCost(type) {
    const level = this.getLevel(type);
    const config = POWERUP_UPGRADE_CONFIG[type];
    if (!config || level >= 5) return 0; // Max level
    return config.costs[level]; // Cost for level + 1
  }

  /**
   * Thực hiện nâng cấp vật phẩm lên 1 cấp
   */
  upgrade(type) {
    const currentLv = this.getLevel(type);
    if (currentLv >= 5) {
      return { success: false, reason: 'MAX_LEVEL' };
    }

    const cost = this.getNextUpgradeCost(type);
    if (!this.currencyManager.hasEnoughCoins(cost)) {
      return { success: false, reason: 'NOT_ENOUGH_COFFEE' };
    }

    // Trừ Cà phê và nâng cấp
    this.currencyManager.deductCoins(cost);
    this.levels[type] = currentLv + 1;
    this._saveLevels();

    return { success: true, newLevel: this.levels[type] };
  }
}
