/**
 * MatchHistoryManager - Quáº£n lÃ½ Lá»‹ch Sá»­ Äáº¥u & LocalStorage Persistence
 */
const STORAGE_KEY = 'tb_rush_match_history';
const MAX_ENTRIES = 15;

export class MatchHistoryManager {
  constructor() {
    this.history = this._loadHistory();
  }

  /**
   * Äá»c máº£ng lá»‹ch sá»­ tá»« localStorage
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
   * LÆ°u máº£ng lá»‹ch sá»­ vÃ o localStorage
   */
  _saveHistory() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.history));
    } catch (e) {
      console.warn('[MatchHistoryManager] Failed to save history:', e);
    }
  }

  /**
   * Láº¥y danh sÃ¡ch tráº­n Ä‘áº¥u gáº§n Ä‘Ã¢y
   */
  getHistory() {
    return this.history;
  }

  /**
   * Láº¥y tráº­n Ä‘áº¥u cÃ³ Ä‘iá»ƒm sá»‘ cao nháº¥t (Personal Best)
   */
  getPersonalBest() {
    if (!this.history || this.history.length === 0) return null;
    return [...this.history].sort((a, b) => b.score - a.score)[0];
  }

  /**
   * Äá»‹nh dáº¡ng thá»i gian chÆ¡i (VD: 125 giÃ¢y -> 02:05)
   */
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  /**
   * Äá»‹nh dáº¡ng ngÃ y giá» dáº¡ng DD/MM/YYYY - HH:mm
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
   * LÆ°u tráº­n Ä‘áº¥u má»›i vÃ o lá»‹ch sá»­
   */
  saveMatch({ score, coins = 0, characterId = 'namsuo', characterName = 'Nam Suá»‘', survivalSeconds = 0 }) {
    const finalScore = Math.floor(score);
    const currentBest = this.getPersonalBest();
    const isNewRecord = !currentBest || finalScore > currentBest.score;

    // TÃ­nh toÃ¡n badge danh hiá»‡u cho tráº­n Ä‘áº¥u
    let badgeText = 'âš¡ PHONG Äá»˜';
    let badgeClass = 'badge-normal';

    if (isNewRecord) {
      badgeText = 'ðŸ† Ká»¶ Lá»¤C Má»šI';
      badgeClass = 'badge-gold';
    } else if (currentBest && finalScore >= currentBest.score * 0.85) {
      badgeText = 'ðŸ¥ˆ TOP PHONG Äá»˜';
      badgeClass = 'badge-silver';
    } else if (coins >= 25) {
      badgeText = 'ðŸª™ VUA NHáº¶T XU';
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

    // ChÃ¨n tráº­n má»›i lÃªn Ä‘áº§u danh sÃ¡ch vÃ  giá»›i háº¡n 15 tráº­n gáº§n nháº¥t
    this.history.unshift(matchRecord);
    if (this.history.length > MAX_ENTRIES) {
      this.history = this.history.slice(0, MAX_ENTRIES);
    }

    this._saveHistory();
    return matchRecord;
  }

  /**
   * XÃ³a toÃ n bá»™ lá»‹ch sá»­ Ä‘áº¥u
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
