/**
 * ShopManager.js - Quản lý Dữ liệu Cửa hàng & Giao dịch
 */
export const CAR_MODELS = {
    FUTURISTIC_CAR: {
        id: 'futuristic_car',
        name: 'FUTURISTIC CAR',
        price: 250,
        currency: 'gems',
        badge: '⚡ CYBERPUNK',
        desc: '+15% Tốc độ cơ bản & Khởi chạy vệt đuôi Neon Cyan',
        modelPath: 'models/futuristic_car.glb',
        modelKey: 'futuristic_car',
        targetWidth: 3.2,
        position: { x: -9, y: 0, z: -2 }
    },
    CYBERPSYCHO: {
        id: 'cyberpsycho',
        name: 'CYBERPSYCHO',
        price: 500,
        currency: 'gems',
        badge: '🔥 RARE',
        desc: 'Kháng 1 va chạm đầu tiên & Tăng 20% điểm Cà phê',
        modelPath: 'models/cyberpsycho_car.glb',
        modelKey: 'cyberpsycho_car',
        targetWidth: 3.4,
        position: { x: -3, y: 0, z: -2 }
    },
    LAMBORGHINI: {
        id: 'lamborghini',
        name: 'LAMBORGHINI V12',
        price: 800,
        currency: 'gems',
        badge: '✨ EPIC',
        desc: 'Động cơ gầm rú V12, tự động hút Coin cách 5m',
        modelPath: 'models/lamborghini.glb',
        modelKey: 'lamborghini',
        targetWidth: 3.2,
        position: { x: 3, y: 0, z: -2 }
    },
    FLYING_CAR: {
        id: 'flying_car',
        name: 'FLYING CAR',
        price: 1200,
        currency: 'gems',
        badge: '👑 LEGENDARY',
        desc: 'Xe bay đệm khí, lướt qua chướng ngại vật thấp mượt mà',
        modelPath: 'models/flying_car.glb',
        modelKey: 'flying_car',
        targetWidth: 3.4,
        position: { x: 9, y: 0, z: -2 }
    }
};

export class ShopManager {
    constructor(currencyManager) {
        this.currencyManager = currencyManager;
        this.ownedItems = this._loadOwnedItems();
    }

    _loadOwnedItems() {
        try {
            const data = localStorage.getItem('tb_rush_owned_items');
            return data ? JSON.parse(data) : ['shipper'];
        } catch (e) {
            return ['shipper'];
        }
    }

    _saveOwnedItems() {
        try {
            localStorage.setItem('tb_rush_owned_items', JSON.stringify(this.ownedItems));
        } catch (e) {
            console.warn('[ShopManager] Failed to save owned items:', e);
        }
    }

    isOwned(itemId) {
        return this.ownedItems.includes(itemId);
    }

    buyItem(itemId, price, currencyType = 'gems') {
        if (this.isOwned(itemId)) return { success: false, reason: 'ALREADY_OWNED' };

        let hasEnough = false;
        if (currencyType === 'gems') {
            hasEnough = this.currencyManager.hasEnoughGems(price);
        } else {
            hasEnough = this.currencyManager.hasEnoughCoins(price);
        }

        if (!hasEnough) return { success: false, reason: 'NOT_ENOUGH_CURRENCY' };

        if (currencyType === 'gems') {
            this.currencyManager.deductGems(price);
        } else {
            this.currencyManager.deductCoins(price);
        }

        this.ownedItems.push(itemId);
        this._saveOwnedItems();
        return { success: true };
    }
}