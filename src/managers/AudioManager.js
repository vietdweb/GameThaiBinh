/**
 * AudioManager - Hệ thống quản lý âm thanh HTML5 Native & Web Audio API
 * - Nạp nhạc trực tiếp từ GitHub Releases CDN v1.0.0 (vietdweb/Music)
 * - Tự động Preload Audio Pool (bộ đệm bộ nhớ trước) cho toàn bộ 11 ca khúc -> Đổi bài TỨC THÌ (< 50ms)
 * - Hiệu ứng âm thanh SFX tổng hợp bằng Web Audio API (Nhảy, Trượt, Ăn Xu, Va chạm)
 * - Quản lý Volume Slider, Mute/Unmute, và Audio Ducking khi Game Over
 */

const RELEASE_BASE = 'https://github.com/vietdweb/Music/releases/download/v1.0.0/';

export const MUSIC_PLAYLIST = [
  {
    id: 'chac_ai_do_se_ve',
    title: 'Chắc Ai Đó Sẽ Về',
    artist: 'Sơn Tùng M-TP',
    icon: '❄️',
    color: '#00e5ff',
    url: RELEASE_BASE + 'chac-ai-do-se-ve.mp3'
  },
  {
    id: 'chung_ta_khong_thuoc_ve_nhau',
    title: 'Chúng Ta Không Thuộc Về Nhau',
    artist: 'Sơn Tùng M-TP',
    icon: '💔',
    color: '#7c4dff',
    url: RELEASE_BASE + 'chung-ta-khong-thuoc-ve-nhau.mp3'
  },
  {
    id: 'co_chac_yeu_la_day',
    title: 'Có Chắc Yêu Là Đây',
    artist: 'Sơn Tùng M-TP',
    icon: '🌸',
    color: '#ff6b9d',
    url: RELEASE_BASE + 'co-chac-yeu-la-day.mp3'
  },
  {
    id: 'dung_lam_trai_tim_anh_dau',
    title: 'Đừng Làm Trái Tim Anh Đau',
    artist: 'Sơn Tùng M-TP',
    icon: '💖',
    color: '#ff4081',
    url: RELEASE_BASE + 'dung-lam-trai-tim-anh-dau.mp3'
  },
  {
    id: 'khong_phai_dang_vua_dau',
    title: 'Không Phải Dạng Vừa Đâu',
    artist: 'Sơn Tùng M-TP',
    icon: '🔥',
    color: '#ff5500',
    url: RELEASE_BASE + 'khong-phai-dang-vua-dau.mp3'
  },
  {
    id: 'khong_thoi_gian',
    title: 'Không Thời Gian',
    artist: 'Dương Domic',
    icon: '⏳',
    color: '#ab47bc',
    url: RELEASE_BASE + 'khong-thoi-gian.mp3'
  },
  {
    id: 'lac_troi',
    title: 'Lạc Trôi',
    artist: 'Sơn Tùng M-TP',
    icon: '🐉',
    color: '#e91e63',
    url: RELEASE_BASE + 'lac-troi.mp3'
  },
  {
    id: 'mat_ket_noi',
    title: 'Mất Kết Nối',
    artist: 'Dương Domic',
    icon: '📡',
    color: '#00e5ff',
    url: RELEASE_BASE + 'mat-ket-noi.mp3'
  },
  {
    id: 'nang_am_xa_dan',
    title: 'Nắng Ấm Xa Dần',
    artist: 'Sơn Tùng M-TP',
    icon: '☀️',
    color: '#ff9800',
    url: RELEASE_BASE + 'nang-am-xa-dan.mp3'
  },
  {
    id: 'noi_nay_co_anh',
    title: 'Nơi Này Có Anh',
    artist: 'Sơn Tùng M-TP',
    icon: '❄️',
    color: '#29b6f6',
    url: RELEASE_BASE + 'noi-nay-co-anh.mp3'
  },
  {
    id: 'tran_bo_nho',
    title: 'Tràn Bộ Nhớ',
    artist: 'Dương Domic',
    icon: '💾',
    color: '#66bb6a',
    url: RELEASE_BASE + 'tran-bo-nho.mp3'
  }
];

export class AudioManager {
  constructor() {
    this.ctx = null;          // AudioContext cho Web Audio API (SFX)
    this.masterGain = null;   // Gain node chính cho SFX

    // Trạng thái chung
    this.enabled = true;      // Master Mute/Unmute
    this.masterVolume = 0.6;  // 0.0 -> 1.0
    this.currentTrackId = 'co_chac_yeu_la_day';
    this.isBgmPlaying = false;
    this.isStreaming = true;
    this.currentStreamId = 'co_chac_yeu_la_day';
    this.streamingPlaylist = MUSIC_PLAYLIST;

    // Ducking state
    this._isDucked = false;
    this._duckGain = 1.0;

    // --- Audio Preload Pool cho phát tức thì (< 50ms) ---
    this.audioPool = {};
    this.currentAudio = null;
    this._initAudioPool();

    // Đọc cài đặt lưu trữ từ localStorage
    this._loadSettings();
  }

  /**
   * Tạo bộ đệm Audio Pool trong bộ nhớ ngay từ màn hình Loading để phát tức thì
   */
  _initAudioPool() {
    try {
      MUSIC_PLAYLIST.forEach(track => {
        try {
          const audio = new Audio();
          audio.src = track.url;
          audio.loop = true;
          audio.preload = 'auto'; // Tải đệm trước dữ liệu MP3 từ GitHub Releases CDN
          this.audioPool[track.id] = audio;
        } catch (e) {
          console.warn(`[AudioManager] Error preloading ${track.id}:`, e);
        }
      });
      const initialId = this.currentTrackId || 'co_chac_yeu_la_day';
      this.currentAudio = this.audioPool[initialId] || this.audioPool['co_chac_yeu_la_day'];
    } catch (err) {
      console.warn('[AudioManager] Error initializing Audio Pool:', err);
    }
  }

  // Getter bgAudio để đảm bảo tương thích ngược
  get bgAudio() {
    return this.currentAudio || this.audioPool['co_chac_yeu_la_day'];
  }

  /**
   * Khởi tạo Web Audio API cho SFX (Lazy load sau user click)
   */
  _ensureContext() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.enabled ? this.masterVolume : 0;
        this.masterGain.connect(this.ctx.destination);
      } catch (e) {
        console.warn('[AudioManager] Web Audio API không hỗ trợ:', e);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Đọc settings từ localStorage
   */
  _loadSettings() {
    try {
      const muted = localStorage.getItem('sgr_audio_muted');
      const vol = localStorage.getItem('sgr_audio_volume');
      const trackId = localStorage.getItem('sgr_audio_track');

      if (muted !== null) this.enabled = muted !== 'true';
      if (vol !== null) this.masterVolume = Math.max(0, Math.min(1, parseFloat(vol)));
      if (trackId && MUSIC_PLAYLIST.some(t => t.id === trackId)) {
        this.currentTrackId = trackId;
        this.currentStreamId = trackId;
        if (this.audioPool[trackId]) {
          this.currentAudio = this.audioPool[trackId];
        }
      }
    } catch (e) {
      console.warn('[AudioManager] Error loading settings:', e);
    }
  }

  /**
   * Lưu settings vào localStorage
   */
  saveSettings() {
    try {
      localStorage.setItem('sgr_audio_muted', String(!this.enabled));
      localStorage.setItem('sgr_audio_volume', String(this.masterVolume));
      localStorage.setItem('sgr_audio_track', this.currentTrackId);
    } catch (e) {
      console.warn('[AudioManager] Error saving settings:', e);
    }
  }

  /**
   * Phát ca khúc Direct MP3 Streaming TỨC THÌ (< 50ms) từ GitHub Release CDN
   * @param {string} trackId - ID ca khúc trong MUSIC_PLAYLIST
   */
  playTrack(trackId) {
    const track = MUSIC_PLAYLIST.find(t => t.id === trackId) || MUSIC_PLAYLIST[0];
    if (!track) return;

    // Dừng ca khúc cũ đang phát ngay lập tức
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (e) {}
    }

    this.currentTrackId = track.id;
    this.currentStreamId = track.id;
    this.saveSettings();

    try {
      let targetAudio = this.audioPool[track.id];
      if (!targetAudio) {
        targetAudio = new Audio(track.url);
        targetAudio.loop = true;
        targetAudio.preload = 'auto';
        this.audioPool[track.id] = targetAudio;
      }

      this.currentAudio = targetAudio;
      this.currentAudio.volume = this.enabled ? (this.masterVolume * this._duckGain) : 0;
      this.isBgmPlaying = true;

      this.currentAudio.play().catch(err => {
        console.log('[AudioManager] Autoplay gesture required:', err);
      });
    } catch (err) {
      console.warn('[AudioManager] Error playing track:', err);
    }
  }

  /**
   * Bật/Tắt Mute hoàn toàn
   */
  setMuted(muted) {
    this.enabled = !muted;

    // Cập nhật âm lượng Web Audio SFX
    if (this.masterGain && this.ctx) {
      const targetVol = this.enabled ? this.masterVolume * this._duckGain : 0;
      this.masterGain.gain.setValueAtTime(targetVol, this.ctx.currentTime);
    }

    // Cập nhật âm lượng HTML5 Audio BGM
    if (this.currentAudio) {
      this.currentAudio.volume = this.enabled ? (this.masterVolume * this._duckGain) : 0;
      if (!this.enabled) {
        this.currentAudio.pause();
      } else if (this.isBgmPlaying) {
        this.currentAudio.play().catch(() => {});
      }
    }

    this.saveSettings();
    return this.enabled;
  }

  /**
   * Đặt Master Volume (0.0 -> 1.0) từ Volume Slider
   */
  setMasterVolume(vol) {
    this.masterVolume = Math.max(0, Math.min(1, vol));

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.enabled ? (this.masterVolume * this._duckGain) : 0, this.ctx.currentTime);
    }

    if (this.currentAudio) {
      this.currentAudio.volume = this.enabled ? (this.masterVolume * this._duckGain) : 0;
    }

    this.saveSettings();
  }

  /**
   * Bắt đầu phát BGM (mặc định bài đang chọn)
   */
  startBGM() {
    if (!this.enabled) return;
    if (!this.currentAudio || this.currentAudio.paused) {
      this.playTrack(this.currentTrackId || 'co_chac_yeu_la_day');
    }
  }

  /**
   * Dừng BGM
   */
  stopBGM() {
    this.isBgmPlaying = false;
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
      } catch (e) {}
    }
  }

  stopStreamingAudio() {
    this.stopBGM();
  }

  playStreamingTrack(trackId, onStatusCallback) {
    this.playTrack(trackId);
    if (typeof onStatusCallback === 'function') {
      onStatusCallback('playing');
    }
  }

  /**
   * Ducking volume (Giảm nhỏ BGM khi Game Over)
   */
  duckVolume(ratio = 0.15, fadeMs = 1000) {
    this._isDucked = true;
    this._duckGain = ratio;
    if (this.currentAudio) {
      this.currentAudio.volume = this.enabled ? (this.masterVolume * ratio) : 0;
    }
  }

  /**
   * Restore volume (Khôi phục BGM volume khi quay lại chơi/menu)
   */
  restoreVolume(fadeMs = 500) {
    this._isDucked = false;
    this._duckGain = 1.0;
    if (this.currentAudio) {
      this.currentAudio.volume = this.enabled ? this.masterVolume : 0;
    }
  }

  // =========================================================
  // TỔNG HỢP ÂM THANH SFX (Web Audio API Synthesizer)
  // =========================================================
  _playTone(type, freq, duration, vol = 0.1, targetFreq = null) {
    if (!this.enabled) return;
    const ctx = this._ensureContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (targetFreq !== null) {
        osc.frequency.exponentialRampToValueAtTime(targetFreq, ctx.currentTime + duration);
      }

      const volume = (vol * this.masterVolume * this._duckGain);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Ignore audio synthesize errors
    }
  }

  playJump() {
    this._playTone('sine', 320, 0.18, 0.4, 640);
  }

  playSlide() {
    this._playTone('triangle', 300, 0.2, 0.3, 150);
  }

  playLaneSwitch() {
    this._playTone('sine', 480, 0.08, 0.25, 560);
  }

  playCoin() {
    this._playTone('sine', 987, 0.1, 0.3, 1318);
  }

  playCrash() {
    this._playTone('sawtooth', 180, 0.4, 0.6, 40);
  }

  playFever() {
    this._playTone('sine', 523, 0.25, 0.5, 1046);
  }

  playGameOver() {
    this._playTone('sawtooth', 220, 0.6, 0.5, 110);
  }
}
