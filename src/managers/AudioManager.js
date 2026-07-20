/**
 * AudioManager v3 - Direct HTML5 Audio Streaming Engine + Procedural Web Audio SFX
 * - HTML5 Native Audio API (new Audio()) cho 7 bÃ i hÃ¡t Hot MP3 tá»« GitHub Storage
 * - Web Audio API cho SFX hiá»‡u á»©ng game (CÃ  phÃª, Nháº£y, TrÆ°á»£t, Fever, Game Over)
 * - Volume Slider & Mute/Unmute real-time
 * - Ducking mÆ°á»£t mÃ  khi Game Over
 */

const MUSIC_PLAYLIST = [
  {
    id: 'co_chac_yeu_la_day',
    title: 'CÃ³ Cháº¯c YÃªu LÃ  ÄÃ¢y',
    artist: 'SÆ¡n TÃ¹ng M-TP',
    icon: 'ðŸŒ¸',
    color: '#ff6b9d',
    url: 'https://github.com/vietdweb/Music/raw/refs/heads/main/C%C3%93%20CH%E1%BA%AEC%20Y%C3%8AU%20L%C3%80%20%C4%90%C3%82Y.mp3'
  },
  {
    id: 'em_cua_ngay_hom_qua',
    title: 'Em Cá»§a NgÃ y HÃ´m Qua',
    artist: 'SÆ¡n TÃ¹ng M-TP',
    icon: 'ðŸŒ™',
    color: '#7c4dff',
    url: 'https://github.com/vietdweb/Music/raw/refs/heads/main/Em%20C%E1%BB%A7a%20Ng%C3%A0y%20H%C3%B4m%20Qua.mp3'
  },
  {
    id: 'chung_ta_khong_thuoc_ve_nhau',
    title: 'ChÃºng Ta KhÃ´ng Thuá»™c Vá» Nhau',
    artist: 'SÆ¡n TÃ¹ng M-TP',
    icon: 'ðŸ’”',
    color: '#ff4081',
    url: 'https://github.com/vietdweb/Music/raw/refs/heads/main/Ch%C3%BAng%20Ta%20Kh%C3%B4ng%20Thu%E1%BB%99c%20V%E1%BB%81%20Nhau.mp3'
  },
  {
    id: 'dung_lam_trai_tim_anh_dau',
    title: 'Äá»«ng LÃ m TrÃ¡i Tim Anh Äau',
    artist: 'SÆ¡n TÃ¹ng M-TP',
    icon: 'â¤ï¸',
    color: '#e91e63',
    url: 'https://github.com/vietdweb/Music/raw/refs/heads/main/%C4%90%E1%BB%ABng%20L%C3%A0m%20Tr%C3%A1i%20Tim%20Anh%20%C4%90au.mp3'
  },
  {
    id: 'lac_troi',
    title: 'Láº¡c TrÃ´i',
    artist: 'SÆ¡n TÃ¹ng M-TP',
    icon: 'ðŸ‰',
    color: '#9c27b0',
    url: 'https://github.com/vietdweb/Music/raw/refs/heads/main/L%E1%BA%A1c%20Tr%C3%B4i.mp3'
  },
  {
    id: 'nang_am_xa_dan',
    title: 'Náº¯ng áº¤m Xa Dáº§n',
    artist: 'SÆ¡n TÃ¹ng M-TP',
    icon: 'â˜€ï¸',
    color: '#ff9800',
    url: 'https://github.com/vietdweb/Music/raw/refs/heads/main/N%E1%BA%AFng%20%E1%BA%A4m%20Xa%20D%E1%BA%A7n.mp3'
  },
  {
    id: 'khong_phai_dang_vua_dau',
    title: 'KhÃ´ng Pháº£i Dáº¡ng Vá»«a ÄÃ¢u',
    artist: 'SÆ¡n TÃ¹ng M-TP',
    icon: 'âš¡',
    color: '#ffd600',
    url: 'https://github.com/vietdweb/Music/raw/refs/heads/main/Kh%C3%B4ng%20Ph%E1%BA%A3i%20D%E1%BA%A7n%20V%E1%BB%ABa%20%C4%90%C3%A2u.mp3'
  }
];

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;

    // Tráº¡ng thÃ¡i
    this.enabled = true;
    this.masterVolume = 0.6;
    this.sfxVolume = 0.5;
    this.bgmVolume = 0.3;

    // HTML5 Native Audio Engine cho MP3 BGM Streaming
    this.bgAudio = new Audio();
    this.bgAudio.loop = true;
    this.bgAudio.preload = 'auto';

    // BGM State
    this.streamingPlaylist = MUSIC_PLAYLIST;
    this.isStreaming = false;
    this.currentStreamId = null;
    this._streamStatusCallback = null;

    // Procedural BGM state (dÃ¹ng cho 3 track BGM game phá»¥)
    this.bgmInterval = null;
    this.bgmGainNode = null;
    this.currentTrackId = 'track_1';
    this.isBgmPlaying = false;
    this._fadeTimeout = null;

    // Ducking state
    this._isDucked = false;
    this._duckGain = 1.0;

    // Procedural tracks
    this.tracks = {
      track_1: {
        name: 'Original Theme',
        subtitle: 'Pentatonic Viá»‡t Nam',
        icon: 'ðŸŽµ',
        tempo: 500,
        buildFn: (beat) => this._beatTrack1(beat)
      },
      track_2: {
        name: 'Night City Synthwave',
        subtitle: 'Lo-Fi Saigon Night',
        icon: 'ðŸŒƒ',
        tempo: 461,
        buildFn: (beat) => this._beatTrack2(beat)
      },
      track_3: {
        name: 'Cyberpunk Run',
        subtitle: 'Aggressive Electronic',
        icon: 'âš¡',
        tempo: 428,
        buildFn: (beat) => this._beatTrack3(beat)
      }
    };

    this._loadSettings();
  }

  _ensureContext() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.enabled ? this.masterVolume : 0;
        this.masterGain.connect(this.ctx.destination);

        this.bgmGainNode = this.ctx.createGain();
        this.bgmGainNode.gain.value = 1.0;
        this.bgmGainNode.connect(this.masterGain);
      } catch (e) {
        console.warn('[AudioManager] Web Audio API khÃ´ng kháº£ dá»¥ng:', e);
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  _loadSettings() {
    try {
      const muted = localStorage.getItem('sgr_audio_muted');
      const vol = localStorage.getItem('sgr_audio_volume');
      const track = localStorage.getItem('sgr_audio_track');
      const streamId = localStorage.getItem('sgr_stream_id');

      if (muted !== null) this.enabled = muted !== 'true';
      if (vol !== null) this.masterVolume = Math.max(0, Math.min(1, parseFloat(vol)));
      if (track !== null && this.tracks[track]) this.currentTrackId = track;
      if (streamId !== null) {
        const found = this.streamingPlaylist.find(t => t.id === streamId);
        if (found) this._pendingRestoreStreamId = streamId;
      }
    } catch (e) {}
  }

  saveSettings() {
    try {
      localStorage.setItem('sgr_audio_muted', String(!this.enabled));
      localStorage.setItem('sgr_audio_volume', String(this.masterVolume));
      if (!this.isStreaming) {
        localStorage.setItem('sgr_audio_track', this.currentTrackId);
        localStorage.removeItem('sgr_stream_id');
      } else if (this.currentStreamId) {
        localStorage.setItem('sgr_stream_id', this.currentStreamId);
      }
    } catch (e) {}
  }

  // =========================================================
  // HTML5 DIRECT MP3 AUDIO STREAMING METHODS
  // =========================================================

  _updateAudioVolume() {
    const effectiveVol = this.enabled ? this.masterVolume * this._duckGain : 0;
    this.bgAudio.volume = Math.max(0, Math.min(1, effectiveVol));
    this.bgAudio.muted = !this.enabled;
  }

  playStreamingTrack(streamId, onStatusChange) {
    const track = this.streamingPlaylist.find(t => t.id === streamId);
    if (!track) return false;

    this._streamStatusCallback = onStatusChange || null;
    this._notify('loading');

    // Dá»«ng procedural BGM náº¿u Ä‘ang phÃ¡t
    this.stopBGM();

    this.isStreaming = true;
    this.currentStreamId = streamId;

    this.bgAudio.pause();
    this.bgAudio.src = track.url;
    this.bgAudio.currentTime = 0;
    this._updateAudioVolume();

    const playPromise = this.bgAudio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this._notify('playing');
        })
        .catch(err => {
          console.log('[AudioManager] Autoplay gesture required:', err);
          this._notify('ready');
        });
    }

    this.saveSettings();
    return true;
  }

  stopStreamingAudio(fadeMs = 300, onComplete = null) {
    this.bgAudio.pause();
    this.isStreaming = false;
    this.currentStreamId = null;
    if (onComplete) onComplete();
  }

  _notify(status) {
    if (typeof this._streamStatusCallback === 'function') {
      try { this._streamStatusCallback(status); } catch (_) {}
    }
  }

  // =========================================================
  // BGM & AUDIO CONTROLS
  // =========================================================

  startBGM() {
    if (this.isStreaming && this.currentStreamId) {
      this.playStreamingTrack(this.currentStreamId, this._streamStatusCallback);
      return;
    }
    this.stopBGM();
    this.isBgmPlaying = true;
    this._startBGMLoop();
  }

  stopBGM() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
    if (this.bgAudio) {
      this.bgAudio.pause();
    }
    this.isBgmPlaying = false;
  }

  selectTrack(trackId) {
    if (!this.tracks[trackId]) return;
    this.stopStreamingAudio(0);
    this.currentTrackId = trackId;
    this.isStreaming = false;
    this.currentStreamId = null;
    this.saveSettings();
    if (this.isBgmPlaying || this.enabled) {
      this.startBGM();
    }
  }

  duckVolume(duckRatio = 0.2, fadeMs = 600) {
    this._isDucked = true;
    this._duckGain = duckRatio;
    this._updateAudioVolume();
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.enabled ? this.masterVolume * this._duckGain : 0,
        this.ctx.currentTime,
        fadeMs / 1000
      );
    }
  }

  restoreVolume(fadeMs = 600) {
    this._isDucked = false;
    this._duckGain = 1.0;
    this._updateAudioVolume();
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.enabled ? this.masterVolume : 0,
        this.ctx.currentTime,
        fadeMs / 1000
      );
    }
  }

  setMasterVolume(vol) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    this._updateAudioVolume();
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.enabled ? this.masterVolume * this._duckGain : 0,
        this.ctx.currentTime,
        0.05
      );
    }
    this.saveSettings();
  }

  setMuted(muted) {
    this.enabled = !muted;
    this._updateAudioVolume();
    if (this.masterGain && this.ctx) {
      const targetVol = this.enabled ? this.masterVolume * this._duckGain : 0;
      this.masterGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.1);
    }

    if (!this.enabled) {
      if (this.isStreaming) {
        this.bgAudio.pause();
      } else {
        this.stopBGM();
      }
    } else {
      if (this.isStreaming && this.currentStreamId) {
        this.bgAudio.play().catch(_ => {});
      } else if (this.isBgmPlaying) {
        this.startBGM();
      }
    }
    this.saveSettings();
    return this.enabled;
  }

  // =========================================================
  // PROCEDURAL BGM LOOPS (Web Audio API)
  // =========================================================
  _startBGMLoop() {
    const track = this.tracks[this.currentTrackId] || this.tracks.track_1;
    let beat = 0;
    track.buildFn(beat);
    beat++;

    this.bgmInterval = setInterval(() => {
      if (!this.isBgmPlaying) return;
      track.buildFn(beat);
      beat = (beat + 1) % 32;
    }, track.tempo);
  }

  _beatTrack1(beat) {
    const bassPentatonic = [110, 123.47, 138.59, 164.81, 185.00];
    if (beat % 4 === 0) {
      const note = bassPentatonic[Math.floor(beat / 4) % bassPentatonic.length];
      this._playTone('triangle', note, 0.35, 0.25, null, true);
    }
    if (beat % 2 === 0) {
      this._playTone('sine', 440, 0.1, 0.08, null, true);
    }
  }

  _beatTrack2(beat) {
    if (beat % 4 === 0) {
      this._playTone('sawtooth', 65.41, 0.4, 0.3, null, true);
    }
    if (beat % 2 === 1) {
      this._playTone('square', 220, 0.15, 0.1, null, true);
    }
  }

  _beatTrack3(beat) {
    if (beat % 2 === 0) {
      this._playTone('sawtooth', 55, 0.25, 0.4, 30, true);
    }
    if (beat % 4 === 2) {
      this._playTone('square', 330, 0.12, 0.15, null, true);
    }
  }

  startFeverBGM() {
    this.stopBGM();
    this.isBgmPlaying = true;
    let beat = 0;
    this.bgmInterval = setInterval(() => {
      this._playTone('sawtooth', beat % 2 === 0 ? 130.81 : 164.81, 0.15, 0.35, null, true);
      beat++;
    }, 200);
  }

  // SFX TONE GENERATOR & SOUNDS
  _playTone(type, frequency, duration, volume = 0.5, freqEnd = null, isBgm = false) {
    if (!this.enabled && !isBgm) return;
    if (isBgm && (!this.enabled && !this._isDucked)) return;
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
      gainNode.connect(isBgm ? this.bgmGainNode : this.masterGain);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration + 0.01);
    } catch (e) {}
  }

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

  dispose() {
    this.stopBGM();
    if (this.bgAudio) {
      this.bgAudio.pause();
    }
    if (this._fadeTimeout) clearTimeout(this._fadeTimeout);
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}
