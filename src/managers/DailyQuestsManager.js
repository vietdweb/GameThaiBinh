import { GAME_CONFIG } from '../utils/Constants.js';

/**
 * DailyQuestsManager.js - Quản lý Bảng Nhiệm Vụ Hằng Ngày & Phần Thưởng Xu / Kim Cương
 * 
 * Nhiệm vụ 1: "Thu thập 80 ly Cà phê trong 1 lượt chạy" (0/80) -> +100 Xu 🪙 / +10 Kim Cương 💎
 * Nhiệm vụ 2: "Chạy trên nóc xe buýt VinBus 3 lần" (0/3) -> +150 Xu 🪙 / +15 Kim Cương 💎
 * Nhiệm vụ 3: "Chơi game trên máy tính Win98 CRT 1 lần" (0/1) -> +200 Xu 🪙 / +20 Kim Cương 💎
 */
export class DailyQuestsManager {
  constructor(game) {
    this.game = game;
    this.currencyManager = game ? game.currencyManager : null;

    this.todayStr = new Date().toDateString();
    this.quests = this._loadQuestData();

    this.currentRunCoffees = 0;
  }

  _loadQuestData() {
    try {
      const saved = localStorage.getItem('sgr_daily_quests');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Nếu cùng ngày -> Giữ nguyên tiến độ
        if (parsed.date === this.todayStr) {
          return parsed.quests;
        }
      }
    } catch (e) {
      console.warn('[DailyQuestsManager] Error loading quest data:', e);
    }

    // Ngày mới -> Khởi tạo lại 3 Nhiệm vụ hằng ngày
    return this._getInitialQuests();
  }

  _getInitialQuests() {
    return [
      {
        id: 'coffee_run',
        title: '☕ Vua Cà Phê Đường Phố',
        desc: 'Thu thập 80 ly Cà phê trong 1 lượt chạy',
        target: 80,
        current: 0,
        rewardCoins: 100,
        rewardGems: 10,
        claimed: false
      },
      {
        id: 'vinbus_roof',
        title: '🚌 Nhảy Nóc Xe Buýt VinBus',
        desc: 'Chạy trên nóc xe buýt VinBus 3 lần',
        target: 3,
        current: 0,
        rewardCoins: 150,
        rewardGems: 15,
        claimed: false
      },
      {
        id: 'win98_game',
        title: '💻 Gamer Retro 90s',
        desc: 'Chơi game trên máy tính Win98 CRT 1 lần',
        target: 1,
        current: 0,
        rewardCoins: 200,
        rewardGems: 20,
        claimed: false
      }
    ];
  }

  _saveQuestData() {
    try {
      localStorage.setItem('sgr_daily_quests', JSON.stringify({
        date: this.todayStr,
        quests: this.quests
      }));
    } catch (e) {
      console.warn('[DailyQuestsManager] Error saving quest data:', e);
    }
  }

  init() {
    this._setupUIEvents();
    this.updateUI();
  }

  /* ============================================================ */
  /* 📈 TRACKING EVENTS LOGIC                                     */
  /* ============================================================ */
  
  /**
   * Reset tiến độ của run hiện tại khi bắt đầu trận chạy mới
   */
  onStartRun() {
    this.currentRunCoffees = 0;
  }

  /**
   * Theo dõi thu thập Cà phê trong lượt chạy
   */
  onCoffeeCollected(count = 1) {
    this.currentRunCoffees += count;
    const q1 = this.quests.find(q => q.id === 'coffee_run');
    if (q1 && !q1.claimed) {
      if (this.currentRunCoffees > q1.current) {
        q1.current = Math.min(q1.target, this.currentRunCoffees);
        this._saveQuestData();
        this.updateUI();
      }
    }
  }

  /**
   * Theo dõi nhảy / chạy trên nóc xe VinBus (Platforming)
   */
  onVinBusRoofJump() {
    const q2 = this.quests.find(q => q.id === 'vinbus_roof');
    if (q2 && !q2.claimed) {
      q2.current = Math.min(q2.target, q2.current + 1);
      this._saveQuestData();
      this.updateUI();
      if (q2.current === q2.target) {
        this._showToast('🎉 HOÀN THÀNH: Chạy trên nóc xe buýt VinBus 3 lần!');
      }
    }
  }

  /**
   * Theo dõi chơi game trên máy tính CRT Win98
   */
  onWin98GamePlayed() {
    const q3 = this.quests.find(q => q.id === 'win98_game');
    if (q3 && !q3.claimed) {
      q3.current = Math.min(q3.target, q3.current + 1);
      this._saveQuestData();
      this.updateUI();
      if (q3.current === q3.target) {
        this._showToast('🎉 HOÀN THÀNH: Chơi game trên máy tính Win98 CRT!');
      }
    }
  }

  /* ============================================================ */
  /* 🎁 CLAIM REWARDS                                             */
  /* ============================================================ */
  claimReward(questId) {
    const q = this.quests.find(item => item.id === questId);
    if (!q || q.claimed || q.current < q.target) return false;

    q.claimed = true;
    this._saveQuestData();

    if (this.currencyManager) {
      if (q.rewardCoins > 0) this.currencyManager.addCoins(q.rewardCoins);
      if (q.rewardGems > 0) this.currencyManager.addGems(q.rewardGems);
    }

    this.game?.audioManager?.playCoinCollect?.();
    this._showToast(`💎 NHẬN THƯỞNG: +${q.rewardCoins} Xu & +${q.rewardGems} Kim Cương!`);
    this.updateUI();
    return true;
  }

  /* ============================================================ */
  /* 🖼️ UI MODAL & RENDERING                                      */
  /* ============================================================ */
  _setupUIEvents() {
    document.addEventListener('click', (e) => {
      // 1. Mở Modal Nhiệm vụ hằng ngày
      const btnOpen = e.target.closest('#btn-open-daily-quests') || e.target.closest('.sub-daily-quests');
      if (btnOpen) {
        e.stopPropagation();
        this.openModal();
      }

      // 2. Đóng Modal Nhiệm vụ
      const btnClose = e.target.closest('#btn-close-daily-quests');
      if (btnClose) {
        e.stopPropagation();
        this.closeModal();
      }

      // 3. Click nút Nhận thưởng trong modal
      const btnClaim = e.target.closest('.btn-claim-quest');
      if (btnClaim) {
        e.stopPropagation();
        const questId = btnClaim.dataset.id;
        this.claimReward(questId);
      }
    });
  }

  openModal() {
    const modal = document.getElementById('daily-quests-modal');
    if (modal) {
      this.updateUI();
      modal.style.display = 'flex';
    }
  }

  closeModal() {
    const modal = document.getElementById('daily-quests-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  updateUI() {
    const container = document.getElementById('daily-quests-list');
    if (!container) return;

    container.innerHTML = '';

    this.quests.forEach(q => {
      const isDone = q.current >= q.target;
      const progressPercent = Math.min(100, (q.current / q.target) * 100);

      const card = document.createElement('div');
      card.className = 'quest-card';
      card.style.cssText = `
        background: rgba(15, 23, 42, 0.85);
        border: 2px solid ${q.claimed ? '#475569' : isDone ? '#00f5d4' : '#334155'};
        border-radius: 12px;
        padding: 14px 18px;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        box-shadow: 0 8px 20px rgba(0,0,0,0.4);
      `;

      card.innerHTML = `
        <div style="flex: 1;">
          <div style="font-weight: 800; font-size: 15px; color: ${q.claimed ? '#94a3b8' : '#ffffff'}; margin-bottom: 4px;">${q.title}</div>
          <div style="font-size: 12px; color: #cbd5e1; margin-bottom: 8px;">${q.desc}</div>

          <!-- Progress Bar -->
          <div style="background: #1e293b; height: 8px; border-radius: 4px; overflow: hidden; width: 100%; position: relative;">
            <div style="width: ${progressPercent}%; height: 100%; background: linear-gradient(90deg, #00f5d4, #00b894); transition: width 0.3s ease;"></div>
          </div>
          <div style="font-size: 11px; font-weight: bold; color: #00f5d4; margin-top: 4px; text-align: right;">${q.current}/${q.target}</div>
        </div>

        <!-- Rewards & Action Button -->
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
          <div style="display: flex; gap: 8px; font-size: 12px; font-weight: bold;">
            <span style="color: #ffd600;">🪙 +${q.rewardCoins}</span>
            <span style="color: #00f5d4;">💎 +${q.rewardGems}</span>
          </div>

          ${
            q.claimed
              ? `<button disabled style="background: #475569; color: #cbd5e1; border: none; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: bold;">✓ Đã Nhận</button>`
              : isDone
              ? `<button class="btn-claim-quest" data-id="${q.id}" style="background: linear-gradient(135deg, #00f5d4, #00b894); color: #0f172a; border: none; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 900; cursor: pointer; box-shadow: 0 4px 12px rgba(0,245,212,0.4);">🎁 NHẬN THƯỞNG</button>`
              : `<button disabled style="background: #334155; color: #94a3b8; border: none; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: bold;">Chưa Xong</button>`
          }
        </div>
      `;

      container.appendChild(card);
    });

    // Cập nhật Badge số nhiệm vụ hoàn thành chưa nhận thưởng ở Menu
    const claimableCount = this.quests.filter(q => q.current >= q.target && !q.claimed).length;
    const badgeEl = document.getElementById('daily-quests-badge');
    if (badgeEl) {
      if (claimableCount > 0) {
        badgeEl.textContent = claimableCount.toString();
        badgeEl.style.display = 'inline-flex';
      } else {
        badgeEl.style.display = 'none';
      }
    }
  }

  _showToast(msg) {
    let toast = document.getElementById('quest-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'quest-toast';
      toast.style.cssText = `
        position: fixed; top: 70px; left: 50%; transform: translateX(-50%);
        background: linear-gradient(135deg, #00f5d4, #7928ca); color: #ffffff;
        font-family: "Space Grotesk", sans-serif; font-weight: 800; font-size: 13px;
        padding: 8px 20px; border-radius: 30px; box-shadow: 0 8px 25px rgba(0,245,212,0.4);
        z-index: 100000; pointer-events: none; opacity: 0; transition: all 0.3s ease;
      `;
      document.body.appendChild(toast);
    }

    toast.textContent = msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(-12px)';
    }, 2800);
  }
}
