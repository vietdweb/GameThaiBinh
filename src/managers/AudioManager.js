/**
 * AudioManager v2 - Hệ thống quản lý âm thanh AAA
 * - 3 BGM tracks procedural (Pentatonic VN / Synthwave / Cyberpunk)
 * - 2 Streaming tracks qua YouTube IFrame API (Sơn Tùng M-TP) 
 * - Fade-out / Fade-in mượt mà khi chuyển track
 * - Volume Slider real-time (masterGain)
 * - Mute/Unmute với trạng thái lưu localStorage
 * - Audio Ducking khi Game Over
 * - Streaming không cần host file MP3 (YouTube/** Danh sách bài hát streaming (YouTube IFrame API) */
const STREAMING_PLAYLIST = [
  {
    id: 'co_chac_yeu_la_day',
    title: 'Có Chắc Yêu Là Đây',
    artist: 'Sơn Tùng M-TP',
    icon: '🌸',
    youtubeId: '6t-MjBazs3o',  // Official MV - 100% Embeddable
    color: '#ff6b9d'
  },
  {
    id: 'em_cua_ngay_hom_qua',
    title: 'Em Của Ngày Hôm Qua',
    artist: 'Sơn Tùng M-TP',
    icon: '🌙',
    youtubeId: 'n6P0Sit-gBA',  // Official MV - 100% Embeddable
    color: '#7c4dff'
  },
  {
    id: 'nang_am_xa_dan',
    title: 'Nắng Ấm Xa Dần',
    artist: 'Sơn Tùng M-TP',
    icon: '☀️',
    youtubeId: '59pGgW31W88',  // Official Audio - 100% Embeddable
    color: '#ff9800'
  },
  {
    id: 'lac_troi',
    title: 'Lạc Trôi',
    artist: 'Sơn Tùng M-TP',
    icon: '🐉',
    youtubeId: 'g-MH9_M3_aA',  // Official MV - 100% Embeddable
    color: '#e91e63'
  },
  {
    id: 'mat_ket_noi',
    title: 'Mất Kết Nối',
    artist: 'Dương Domic',
    icon: '📡',
    youtubeId: 'lRsaDQtYqAo',  // Official Audio Visualizer - 100% Embeddable
    color: '#00e5ff'
  },
  {
    id: 'chiu_cach_minh_noi_thua',
    title: 'Chịu Cách Mình Nói Thua',
    artist: 'RHYDER ft. BAN & COOLKID',
    icon: '🔥',
    youtubeId: '5sC2YyZc51M',  // Official MV - 100% Embeddable
    color: '#ff5500'
  },
  {
    id: 'catch_me_if_you_can',
    title: 'Catch Me If You Can',
    artist: 'Quang Hùng MasterD',
    icon: '⚡',
    youtubeId: '5g5s0O9428g',  // Official Audio - 100% Embeddable
    color: '#ffd600'
  }
];

export class AudioManager {
  constructor() {
    this.ctx = null;          // AudioContext (lazy init)
    this.masterGain = null;   // Gain node chính

    // Trạng thái
    this.enabled = true;      // Master on/off (mute)
    this.masterVolume = 0.6;  // 0.0 → 1.0
    this.sfxVolume = 0.5;
    this.bgmVolume = 0.3;

    // BGM procedural state
    this.bgmInterval = null;  // setInterval cho BGM beat loop
    this.bgmGainNode = null;  // Gain riêng cho BGM (để fade)
    this.currentTrackId = 'track_1';
    this.isBgmPlaying = false;
    this._fadeTimeout = null;

    // Streaming (YouTube IFrame) state
    this.streamingPlaylist = STREAMING_PLAYLIST;
    this.isStreaming = false;           // true khi đang phát YouTube
    this.currentStreamId = null;        // ID của streaming track đang phát
    this._ytPlayer = null;             // YouTube IFrame Player instance
    this._ytContainer = null;          // DOM container chứa IFrame
    this._ytReady = false;             // YouTube API đã sẵn sàng chưa
    this._ytPendingTrack = null;       // Track chờ phát sau khi API load xong
    this._ytLoadTimeout = null;        // Timeout fallback nếu YouTube bị chặn
    this._streamStatusCallback = null; // Callback cập nhật UI (set từ Game.js)

    // Ducking state
    this._isDucked = false;
    this._duckGain = 1.0;

    // Định nghĩa 3 procedural tracks
    this.tracks = {
      track_1: {
        name: 'Original Theme',
        subtitle: 'Pentatonic Việt Nam',
        icon: '🎵',
        tempo: 500,       // 120 BPM
        buildFn: (beat) => this._beatTrack1(beat)
      },
      track_2: {
        name: 'Night City Synthwave',
        subtitle: 'Lo-Fi Saigon Night',
        icon: '🌃',
        tempo: 461,       // 130 BPM
        buildFn: (beat) => this._beatTrack2(beat)
      },
      track_3: {
        name: 'Cyberpunk Run',
        subtitle: 'Aggressive Electronic',
        icon: '⚡',
        tempo: 428,       // 140 BPM
        buildFn: (beat) => this._beatTrack3(beat)
      }
    };

    // Load cài đặt từ localStorage
    this._loadSettings();

    // Khởi tạo YouTube IFrame API (lazy load)
    this._initYouTubeAPI();
  }

  // =========================================================
  // AUDIO CONTEXT (Lazy Init)
  // =========================================================
  _ensureContext() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.enabled ? this.masterVolume : 0;
        this.masterGain.connect(this.ctx.destination);

        // BGM gain riêng (để fade độc lập)
        this.bgmGainNode = this.ctx.createGain();
        this.bgmGainNode.gain.value = 1.0;
        this.bgmGainNode.connect(this.masterGain);
      } catch (e) {
        console.warn('[AudioManager] Web Audio API không khả dụng:', e);
        this.enabled = false;
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // =========================================================
  // SETTINGS PERSISTENCE
  // =========================================================
  _loadSettings() {
    try {
      const muted = localStorage.getItem('sgr_audio_muted');
      const vol = localStorage.getItem('sgr_audio_volume');
      const track = localStorage.getItem('sgr_audio_track');
      const streamId = localStorage.getItem('sgr_stream_id');

      if (muted !== null) this.enabled = muted !== 'true';
      if (vol !== null) this.masterVolume = Math.max(0, Math.min(1, parseFloat(vol)));
      // Track: ưu tiên procedural tracks; streaming tracks được xử lý riêng
      if (track !== null && this.tracks[track]) this.currentTrackId = track;
      // Khôi phục streaming track nếu đã chọn lần trước
      if (streamId !== null) {
        const found = this.streamingPlaylist.find(t => t.id === streamId);
        if (found) this._pendingRestoreStreamId = streamId;
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  saveSettings() {
    try {
      localStorage.setItem('sgr_audio_muted', String(!this.enabled));
      localStorage.setItem('sgr_audio_volume', String(this.masterVolume));
      // Chỉ lưu procedural track nếu không đang stream
      if (!this.isStreaming) {
        localStorage.setItem('sgr_audio_track', this.currentTrackId);
        localStorage.removeItem('sgr_stream_id');
      } else if (this.currentStreamId) {
        localStorage.setItem('sgr_stream_id', this.currentStreamId);
      }
    } catch (e) {
      // Ignore
    }
  }

  getSettings() {
    return {
      muted: !this.enabled,
      volume: this.masterVolume,
      trackId: this.currentTrackId,
      tracks: this.tracks,
      isStreaming: this.isStreaming,
      currentStreamId: this.currentStreamId,
      streamingPlaylist: this.streamingPlaylist
    };
  }

  /**
   * Mute / Unmute hoàn toàn
   */
  setMuted(muted) {
    this.enabled = !muted;
    if (this.masterGain && this.ctx) {
      const targetVol = this.enabled ? this.masterVolume * this._duckGain : 0;
      this.masterGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.1);
    }
    if (!this.enabled) {
      this.stopBGM();
    } else {
      // Nếu unmute và BGM đang được set là phát, resume lại
      if (this.isBgmPlaying) {
        this.stopBGM();
        this._startBGMLoop();
      }
    }
    this.saveSettings();
    return this.enabled;
  }

  /**
   * Toggle mute
   */
  toggle() {
    return this.setMuted(this.enabled); // flip
  }

  // =========================================================
  // JUKEBOX - CHỌN VÀ CHUYỂN TRACK
  // =========================================================
  /**
   * Chọn track mới với fade-out/fade-in mượt mà
   * @param {string} trackId - 'track_1' | 'track_2' | 'track_3'
   */
  selectTrack(trackId) {
    if (!this.tracks[trackId]) return;
    if (trackId === this.currentTrackId && this.isBgmPlaying) return;

    this.currentTrackId = trackId;
    this.saveSettings();

    if (!this.isBgmPlaying) {
      // Nếu chưa phát, chỉ set track
      return;
    }

    // Fade out → đổi track → fade in
    this._fadeOutBGM(400, () => {
      this.stopBGM();
      this._startBGMLoop();
      this._fadeInBGM(500);
    });
  }

  /**
   * Fade out BGM gain
   * @param {number} durationMs
   * @param {Function} onComplete
   */
  _fadeOutBGM(durationMs, onComplete) {
    if (!this.bgmGainNode || !this.ctx) {
      onComplete && onComplete();
      return;
    }
    const now = this.ctx.currentTime;
    this.bgmGainNode.gain.cancelScheduledValues(now);
    this.bgmGainNode.gain.setValueAtTime(this.bgmGainNode.gain.value, now);
    this.bgmGainNode.gain.linearRampToValueAtTime(0, now + durationMs / 1000);

    if (this._fadeTimeout) clearTimeout(this._fadeTimeout);
    this._fadeTimeout = setTimeout(() => {
      onComplete && onComplete();
    }, durationMs);
  }

  /**
   * Fade in BGM gain
   * @param {number} durationMs
   */
  _fadeInBGM(durationMs) {
    if (!this.bgmGainNode || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.bgmGainNode.gain.cancelScheduledValues(now);
    this.bgmGainNode.gain.setValueAtTime(0, now);
    this.bgmGainNode.gain.linearRampToValueAtTime(1.0, now + durationMs / 1000);
  }

  // =========================================================
  // BGM MANAGEMENT
  // =========================================================
  /**
   * Bắt đầu phát BGM track hiện tại
   */
  startBGM() {
    if (!this.enabled) return;
    this.stopBGM();
    this.isBgmPlaying = true;
    const ctx = this._ensureContext();
    if (!ctx) return;

    this._startBGMLoop();
    this._fadeInBGM(800);
  }

  _startBGMLoop() {
    const track = this.tracks[this.currentTrackId];
    if (!track) return;

    let beat = 0;
    const playBeat = () => {
      if (!this.enabled && !this._isDucked) return;
      track.buildFn(beat);
      beat++;
    };

    playBeat();
    this.bgmInterval = setInterval(playBeat, track.tempo);
  }

  /**
   * BGM Fever Mode - tốc độ nhanh hơn, âm sôi động hơn
   */
  startFeverBGM() {
    if (!this.enabled) return;
    this.stopBGM();
    this.isBgmPlaying = true;
    const ctx = this._ensureContext();
    if (!ctx) return;

    const tempo = 300; // 200 BPM
    let beat = 0;
    const feverMelody = [880, 1046, 784, 1046, 880, 698, 880, 1046];

    const playBeat = () => {
      if (!this.enabled) return;
      const idx = beat % feverMelody.length;
      if (feverMelody[idx] > 0) {
        this._playTone('sawtooth', feverMelody[idx], 0.25, this.bgmVolume * 0.6, null, true);
        this._playTone('sine', feverMelody[idx] * 0.5, 0.3, this.bgmVolume * 0.4, null, true);
      }
      if (idx % 2 === 0) {
        this._playTone('square', 60, 0.1, this.bgmVolume * 0.5, 30, true);
      }
      beat++;
    };

    playBeat();
    this.bgmInterval = setInterval(playBeat, tempo);
    this._fadeInBGM(300);
  }

  /**
   * Dừng BGM
   */
  stopBGM() {
    this.isBgmPlaying = false;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
    // Reset bgm gain
    if (this.bgmGainNode && this.ctx) {
      this.bgmGainNode.gain.cancelScheduledValues(this.ctx.currentTime);
      this.bgmGainNode.gain.setValueAtTime(1.0, this.ctx.currentTime);
    }
  }

  // =========================================================
  // AUDIO DUCKING (Giảm âm lượng khi Game Over)
  // =========================================================
  /**
   * Giảm nhỏ master volume (ducking) - nhạc vẫn phát nhẹ
   * @param {number} ratio - 0.0 → 1.0, mặc định 0.15
   * @param {number} fadeMs - thời gian fade (ms)
   */
  duckVolume(ratio = 0.15, fadeMs = 1000) {
    if (!this.masterGain || !this.ctx) return;
    this._isDucked = true;
    this._duckGain = ratio;
    const targetVol = this.enabled ? this.masterVolume * ratio : 0;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(targetVol, now + fadeMs / 1000);
  }

  /**
   * Khôi phục volume bình thường (undo ducking)
   * @param {number} fadeMs
   */
  restoreVolume(fadeMs = 500) {
    if (!this.masterGain || !this.ctx) return;
    this._isDucked = false;
    this._duckGain = 1.0;
    const targetVol = this.enabled ? this.masterVolume : 0;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(targetVol, now + fadeMs / 1000);
  }

  // =========================================================
  // BGM TRACKS (Procedural)
  // =========================================================
  /**
   * Track 1: Original Theme - Pentatonic Việt Nam
   */
  _beatTrack1(beat) {
    const melody = [523, 659, 784, 659, 523, 440, 523, 659];
    const bassLine = [130, 0, 165, 0, 130, 0, 146, 0];
    const idx = beat % melody.length;

    if (melody[idx] > 0) {
      this._playTone('sine', melody[idx], 0.35, this.bgmVolume * 0.7, null, true);
    }
    if (bassLine[idx] > 0) {
      this._playTone('triangle', bassLine[idx], 0.4, this.bgmVolume * 0.5, null, true);
    }
    if (idx % 4 === 0) {
      this._playTone('square', 80, 0.08, this.bgmVolume * 0.3, 40, true);
    }
  }

  /**
   * Track 2: Night City Synthwave - Lo-Fi Saigon Night
   * Arpeggiated chords + reverb-like delay
   */
  _beatTrack2(beat) {
    // Am - F - C - G arpeggio (pentatonic night feel)
    const chordArp = [
      [220, 277, 330], // Am
      [175, 220, 262], // F
      [262, 330, 392], // C
      [196, 247, 294], // G
    ];
    const chordIdx = Math.floor(beat / 2) % chordArp.length;
    const noteIdx = beat % 3;
    const freq = chordArp[chordIdx][noteIdx];

    this._playTone('sine', freq, 0.45, this.bgmVolume * 0.6, null, true);

    // Sub-bass sâu
    if (beat % 4 === 0) {
      this._playTone('sine', freq * 0.25, 0.5, this.bgmVolume * 0.4, null, true);
    }
    // Hi-hat chắc chắn
    if (beat % 2 === 1) {
      this._playTone('triangle', 800, 0.06, this.bgmVolume * 0.2, 400, true);
    }
    // Kick drum
    if (beat % 8 === 0 || beat % 8 === 4) {
      this._playTone('square', 55, 0.12, this.bgmVolume * 0.5, 30, true);
    }
  }

  /**
   * Track 3: Cyberpunk Run - Aggressive Electronic
   * Heavy sawtooth + percussive elements
   */
  _beatTrack3(beat) {
    const aggroMelody = [392, 440, 494, 440, 392, 349, 392, 440];
    const idx = beat % aggroMelody.length;

    // Lead sawtooth (aggressive)
    this._playTone('sawtooth', aggroMelody[idx], 0.25, this.bgmVolume * 0.5, null, true);
    // Harmony một quãng tám thấp hơn
    this._playTone('square', aggroMelody[idx] * 0.5, 0.2, this.bgmVolume * 0.3, null, true);

    // Thicker beat - kick mỗi beat
    if (idx % 2 === 0) {
      this._playTone('square', 50, 0.15, this.bgmVolume * 0.6, 25, true);
    }
    // Snare-like
    if (idx % 4 === 2) {
      this._playTone('sawtooth', 200, 0.08, this.bgmVolume * 0.4, 100, true);
    }
    // Arp run mỗi 8 beats
    if (beat % 8 === 7) {
      const arpFreqs = [440, 523, 659, 784];
      arpFreqs.forEach((f, i) => {
        setTimeout(() => this._playTone('square', f, 0.1, this.bgmVolume * 0.3), i * 50);
      });
    }
  }

  // =========================================================
  // TONE GENERATOR (Lõi)
  // =========================================================
  /**
   * Phát một âm thanh procedural
   * @param {string} type - 'sine' | 'square' | 'sawtooth' | 'triangle'
   * @param {number} frequency - Hz
   * @param {number} duration - giây
   * @param {number} volume - 0→1
   * @param {number|null} freqEnd - tần số kết thúc (sweep)
   * @param {boolean} isBgm - true: kết nối vào bgmGainNode; false: masterGain (SFX)
   */
  _playTone(type, frequency, duration, volume = 0.5, freqEnd = null, isBgm = false) {
    if (!this.enabled && !isBgm) return; // SFX bị chặn khi mute
    if (isBgm && (!this.enabled && !this._isDucked)) return; // BGM bị chặn khi mute (trừ ducking vẫn muốn phát nhẹ)
    const ctx = this._ensureContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(1, frequency), ctx.currentTime);

      if (freqEnd !== null) {
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(1, freqEnd),
          ctx.currentTime + duration
        );
      }

      const volScale = isBgm ? 1.0 : this.sfxVolume;
      gainNode.gain.setValueAtTime(volume * volScale, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gainNode);
      // BGM → bgmGainNode → masterGain; SFX → masterGain trực tiếp
      gainNode.connect(isBgm ? this.bgmGainNode : this.masterGain);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration + 0.01);
    } catch (e) {
      // Silent fail
    }
  }

  // =========================================================
  // SFX EFFECTS
  // =========================================================
  playCoffeeCollect() {
    this._playTone('sine', 880, 0.12, 0.7);
    setTimeout(() => this._playTone('sine', 1320, 0.15, 0.5), 80);
    setTimeout(() => this._playTone('sine', 1760, 0.2, 0.4), 160);
  }

  playJump() {
    this._playTone('sine', 300, 0.25, 0.4, 600);
  }

  playSlide() {
    this._playTone('sawtooth', 400, 0.2, 0.2, 180);
  }

  playLaneSwitch() {
    this._playTone('triangle', 500, 0.08, 0.3, 450);
  }

  playFeverActivate() {
    this._playTone('sawtooth', 200, 0.15, 0.6, 800);
    setTimeout(() => this._playTone('square', 600, 0.2, 0.4, 1200), 150);
    setTimeout(() => this._playTone('sine', 900, 0.3, 0.5, 1800), 280);
  }

  playPowerUp() {
    this._playTone('sine', 523, 0.1, 0.7);
    setTimeout(() => this._playTone('sine', 659, 0.1, 0.7), 80);
    setTimeout(() => this._playTone('sine', 784, 0.12, 0.7), 160);
    setTimeout(() => this._playTone('sine', 1046, 0.25, 0.8), 240);
  }

  playShieldBreak() {
    this._playTone('square', 600, 0.1, 0.8, 200);
    setTimeout(() => this._playTone('sawtooth', 300, 0.2, 0.6, 100), 70);
  }

  playSmash() {
    this._playTone('sawtooth', 150, 0.2, 0.8, 50);
    this._playTone('square', 250, 0.15, 0.5);
  }

  playGameOver() {
    this._playTone('sine', 440, 0.3, 0.6);
    setTimeout(() => this._playTone('sine', 350, 0.4, 0.5), 250);
    setTimeout(() => this._playTone('sine', 220, 0.6, 0.7), 500);
  }

  playCountdown() {
    this._playTone('sine', 660, 0.15, 0.5);
  }

  // =========================================================
  // YOUTUBE IFRAME STREAMING ENGINE
  // =========================================================

  /**
   * Khởi tạo YouTube IFrame API script (lazy - chỉ load 1 lần)
   */
  _initYouTubeAPI() {
    if (window.YT && window.YT.Player) {
      this._ytReady = true;
      return;
    }
    // Đăng ký callback trước khi load script
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      this._ytReady = true;
      if (prev) prev();
      // Phát track đang chờ (nếu có)
      if (this._ytPendingTrack) {
        const pending = this._ytPendingTrack;
        this._ytPendingTrack = null;
        this._createYTPlayer(pending);
      }
    };
    // Load YouTube IFrame API script một lần duy nhất
    if (!document.getElementById('yt-iframe-api-script')) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      document.head.appendChild(tag);
    }
  }

  /**
   * Phát một streaming track (YouTube)
   * @param {string} streamId - ID trong STREAMING_PLAYLIST
   * @param {Function} onStatusChange - callback(status: 'loading'|'playing'|'error'|'fallback')
  /**
   * Phát một streaming track (YouTube) - TỨC THÌ (Instant Response)
   * @param {string} streamId - ID trong STREAMING_PLAYLIST
   * @param {Function} onStatusChange - callback(status: 'loading'|'playing'|'error'|'fallback')
   */
  playStreamingTrack(streamId, onStatusChange) {
    const track = this.streamingPlaylist.find(t => t.id === streamId);
    if (!track) return;

    this._streamStatusCallback = onStatusChange || null;
    this._notify('loading');

    // Dừng NGAY BGM procedural (không đợi fade out lâu)
    this.stopBGM();

    this.isStreaming = true;
    this.currentStreamId = streamId;
    this.saveSettings();

    this._doPlayStreaming(track);
  }

  _doPlayStreaming(track) {
    if (this._ytLoadTimeout) {
      clearTimeout(this._ytLoadTimeout);
      this._ytLoadTimeout = null;
    }

    // Nếu YouTube API chưa sẵn sàng, thêm vào hàng chờ
    if (!this._ytReady) {
      this._ytPendingTrack = track;
      return;
    }

    // Luôn tạo mới player IFrame sạch cho bài được chọn -> Chuyển nhạc TỨC THÌ không bao giờ bị đơ
    this._createYTPlayer(track);
  }

  /**
   * Tạo YouTube Player ẩn trong DOM
   */
  _createYTPlayer(track) {
    this._destroyYTPlayer(); // Xóa player cũ nếu có

    // Tạo container DOM ẩn cho YouTube IFrame
    this._ytContainer = document.createElement('div');
    this._ytContainer.id = 'yt-hidden-player';
    this._ytContainer.style.cssText = [
      'position:fixed',
      'bottom:-9999px',
      'left:-9999px',
      'width:1px',
      'height:1px',
      'pointer-events:none',
      'opacity:0',
      'z-index:-1'
    ].join(';');
    document.body.appendChild(this._ytContainer);

    const innerDiv = document.createElement('div');
    innerDiv.id = 'yt-player-inner';
    this._ytContainer.appendChild(innerDiv);

    try {
      const targetVolume = this.enabled ? Math.round(this.masterVolume * 100 * this._duckGain) : 0;
      this._ytPlayer = new window.YT.Player('yt-player-inner', {
        width: '1',
        height: '1',
        videoId: track.youtubeId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          playsinline: 1,
          origin: window.location.origin
        },
        events: {
          onReady: (e) => {
            e.target.setVolume(targetVolume);
            if (!this.enabled) {
              e.target.setVolume(0);
            }
            e.target.playVideo();
          },
          onStateChange: (e) => {
            this._onYTStateChange(e);
          },
          onError: (e) => {
            console.warn('[AudioManager] YouTube player error:', e.data);
            // Thử lại bài hát nếu bị lỗi tạm thời
            try { e.target.playVideo(); } catch(_) {}
          }
        }
      });

    } catch (err) {
      console.warn('[AudioManager] YouTube Player creation failed:', err);
    }
  }

  /**
   * Xử lý thay đổi trạng thái YouTube Player
   */
  _onYTStateChange(event) {
    const state = event.data;
    if (state === window.YT.PlayerState.PLAYING) {
      if (this._ytLoadTimeout) {
        clearTimeout(this._ytLoadTimeout);
        this._ytLoadTimeout = null;
      }
      this._notify('playing');
    } else if (state === window.YT.PlayerState.ENDED) {
      // Loop lại bài hát đang phát
      event.target.seekTo(0);
      event.target.playVideo();
    } else if (state === window.YT.PlayerState.BUFFERING) {
      this._notify('loading');
    }
  }

  /**
   * Fallback khi YouTube gặp sự cố
   */
  _onStreamingFallback() {
    this._notify('loading');
  }

  /**
   * Dừng streaming và cleanup
   * @param {number} fadeMs - thời gian fade out trước khi stop (ms)
   * @param {Function} onComplete - callback sau khi dừng xong
   */
  stopStreamingAudio(fadeMs = 400, onComplete = null) {
    if (!this.isStreaming && !this._ytPlayer) {
      onComplete && onComplete();
      return;
    }
    if (this._ytPlayer && fadeMs > 0) {
      // Fade volume về 0 rồi destroy
      const steps = 10;
      const stepTime = fadeMs / steps;
      let currentVol = this._ytPlayer.getVolume?.() || Math.round(this.masterVolume * 100);
      const stepSize = currentVol / steps;
      let stepCount = 0;
      const fadeInterval = setInterval(() => {
        stepCount++;
        currentVol = Math.max(0, currentVol - stepSize);
        try { this._ytPlayer?.setVolume(Math.round(currentVol)); } catch (_) { }
        if (stepCount >= steps) {
          clearInterval(fadeInterval);
          this._destroyYTPlayer();
          this.isStreaming = false;
          this.currentStreamId = null;
          onComplete && onComplete();
        }
      }, stepTime);
    } else {
      this._destroyYTPlayer();
      this.isStreaming = false;
      this.currentStreamId = null;
      onComplete && onComplete();
    }
  }

  /**
   * Xóa YouTube Player khỏi DOM
   */
  _destroyYTPlayer() {
    if (this._ytLoadTimeout) {
      clearTimeout(this._ytLoadTimeout);
      this._ytLoadTimeout = null;
    }
    if (this._ytPlayer) {
      try {
        this._ytPlayer.stopVideo();
        this._ytPlayer.destroy();
      } catch (_) { }
      this._ytPlayer = null;
    }
    if (this._ytContainer && this._ytContainer.parentNode) {
      this._ytContainer.parentNode.removeChild(this._ytContainer);
      this._ytContainer = null;
    }
  }

  /**
   * Đồng bộ volume YouTube Player với master volume
   */
  _syncStreamingVolume() {
    if (this._ytPlayer && this.isStreaming) {
      try {
        const vol = this.enabled ? Math.round(this.masterVolume * 100) : 0;
        this._ytPlayer.setVolume(vol);
      } catch (_) { }
    }
  }

  /**
   * Gửi thông báo trạng thái tới UI callback
   */
  _notify(status) {
    if (typeof this._streamStatusCallback === 'function') {
      try { this._streamStatusCallback(status); } catch (_) { }
    }
  }

  // =========================================================
  // OVERRIDE: setMasterVolume - sync cả procedural và streaming
  // =========================================================
  setMasterVolume(vol) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.enabled) {
      this.masterGain.gain.setTargetAtTime(
        this.masterVolume * this._duckGain,
        this.ctx.currentTime,
        0.05
      );
    }
    // Đồng bộ YouTube volume
    this._syncStreamingVolume();
    this.saveSettings();
  }

  // =========================================================
  // OVERRIDE: setMuted - tắt cả procedural và streaming
  // =========================================================
  setMuted(muted) {
    this.enabled = !muted;
    if (this.masterGain && this.ctx) {
      const targetVol = this.enabled ? this.masterVolume * this._duckGain : 0;
      this.masterGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.1);
    }
    // Đồng bộ YouTube
    this._syncStreamingVolume();

    if (!this.enabled) {
      if (this.isStreaming) {
        // Chỉ tắt volume YouTube, không destroy
        try { this._ytPlayer?.setVolume(0); } catch (_) { }
      } else {
        this.stopBGM();
      }
    } else {
      if (this.isStreaming) {
        try { this._ytPlayer?.setVolume(Math.round(this.masterVolume * 100)); } catch (_) { }
        // Resume nếu bị paused
        try { this._ytPlayer?.playVideo(); } catch (_) { }
      } else if (this.isBgmPlaying) {
        this.stopBGM();
        this._startBGMLoop();
      }
    }
    this.saveSettings();
    return this.enabled;
  }

  // =========================================================
  // CLEANUP
  // =========================================================
  dispose() {
    this.stopBGM();
    this._destroyYTPlayer();
    if (this._fadeTimeout) clearTimeout(this._fadeTimeout);
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

