/**
 * MatchHistoryManager - Quản lý Lịch Sử Đấu & LocalStorage Persistence
 */
const STORAGE_KEY = 'tb_rush_match_history';
const MAX_ENTRIES = 15;

export class MatchHistoryManager {
  constructor() {
    this.history = this._loadHistory();
  }

  /**
   * Đọc mảng lịch sử từ localStorage
   */
  _loadHistory() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn('[MatchHistoryManager] Failed to load history:', e);
      return [];
    }
  }

  /**
   * Lưu mảng lịch sử vào localStorage
   */
  _saveHistory() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.history));
    } catch (e) {
      console.warn('[MatchHistoryManager] Failed to save history:', e);
    }
  }

  /**
   * Lấy danh sách trận đấu gần đây
   */
  getHistory() {
    return this.history;
  }

  /**
   * Lấy trận đấu có điểm số cao nhất (Personal Best)
   */
  getPersonalBest() {
    if (!this.history || this.history.length === 0) return null;
    return [...this.history].sort((a, b) => b.score - a.score)[0];
  }

  /**
   * Định dạng thời gian chơi (VD: 125 giây -> 02:05)
   */
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  /**
   * Định dạng ngày giờ dạng DD/MM/YYYY - HH:mm
   */
  formatDate(dateObj = new Date()) {
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const yyyy = dateObj.getFullYear();
    const hh = String(dateObj.getHours()).padStart(2, '0');
    const min = String(dateObj.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} - ${hh}:${min}`;
  }

  /**
   * Lưu trận đấu mới vào lịch sử
   */
  saveMatch({ score, coins = 0, characterId = 'namsuo', characterName = 'Nam Suối', survivalSeconds = 0 }) {
    const finalScore = Math.floor(score);
    const currentBest = this.getPersonalBest();
    const isNewRecord = !currentBest || finalScore > currentBest.score;

    // Tính toán badge danh hiệu cho trận đấu
    let badgeText = '⚡ PHONG ĐỘ';
    let badgeClass = 'badge-normal';

    if (isNewRecord) {
      badgeText = '🏆 KỶ LỤC MỚI';
      badgeClass = 'badge-gold';
    } else if (currentBest && finalScore >= currentBest.score * 0.85) {
      badgeText = '🥈 TOP PHONG ĐỘ';
      badgeClass = 'badge-silver';
    } else if (coins >= 25) {
      badgeText = '🪙 VUA NHẶT XU';
      badgeClass = 'badge-coins';
    }

    const matchRecord = {
      id: Date.now().toString(),
      date: this.formatDate(),
      timestamp: Date.now(),
      score: finalScore,
      coins: coins,
      characterId: characterId,
      characterName: characterName,
      survivalSeconds: Math.floor(survivalSeconds),
      formattedTime: this.formatTime(survivalSeconds),
      isNewRecord: isNewRecord,
      badgeText: badgeText,
      badgeClass: badgeClass
    };

    // Chèn trận mới lên đầu danh sách và giới hạn 15 trận gần nhất
    this.history.unshift(matchRecord);
    if (this.history.length > MAX_ENTRIES) {
      this.history = this.history.slice(0, MAX_ENTRIES);
    }

    this._saveHistory();
    return matchRecord;
  }

  /**
   * Xóa toàn bộ lịch sử đấu
   */
  clearHistory() {
    this.history = [];
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('[MatchHistoryManager] Failed to clear history:', e);
    }
  }
}