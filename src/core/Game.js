import * as THREE from 'three';
import { SceneManager } from './SceneManager.js';
import { StateMachine } from '../managers/StateMachine.js';
import { CollisionManager } from '../managers/CollisionManager.js';
import { AudioManager } from '../managers/AudioManager.js';
import { CharacterViewerManager } from '../managers/CharacterViewerManager.js';
import {
  GAME_STATES,
  GAME_CONFIG,
  LANE,
  PHYSICS,
  POWERUP_TYPES,
  POWERUP_CONFIG,
  CHARACTERS
} from '../utils/Constants.js';
import { Player } from '../entities/Player.js';
import { Environment } from '../entities/Environment.js';
import { ExhaustFlameBoostEffect } from '../effects/ExhaustFlameBoostEffect.js';
import { AssetManager } from '../managers/AssetManager.js';
import { MatchHistoryManager } from '../managers/MatchHistoryManager.js';
import { CurrencyManager } from '../managers/CurrencyManager.js';
import { Collectible } from '../entities/Collectible.js';
import {
  Roadblock,
  Barrier,
  VendorCart,
  Vehicle,
  OBSTACLE_TYPES
} from '../entities/Obstacle.js';
import { ObstacleManager } from '../managers/ObstacleManager.js';

export class Game {
  constructor() {
    // Äá»c tráº¡ng thÃ¡i debug tá»« query string (e.g. ?debug=true)
    const urlParams = new URLSearchParams(window.location.search);
    const debugMode = urlParams.get('debug') === 'true';

    // Khá»Ÿi táº¡o SceneManager
    this.sceneManager = new SceneManager('game-canvas', debugMode);

    // Há»‡ thá»‘ng State Machine
    this.stateMachine = new StateMachine();

    // Há»‡ thá»‘ng va cháº¡m
    this.collisionManager = new CollisionManager();

    // Há»‡ thá»‘ng Ã¢m thanh
    this.audioManager = new AudioManager();

    // Tráº¡ng thÃ¡i chá»n nhÃ¢n váº­t (Máº·c Ä‘á»‹nh chá»n Ná»¯ Sinh Ão DÃ i)
    this.skinKeys = Object.keys(CHARACTERS);
    const savedSkin = localStorage.getItem('saigon_selected_skin');
    this.selectedSkinIndex = savedSkin ? Math.max(0, this.skinKeys.indexOf(savedSkin.toUpperCase())) : 1;
    if (this.selectedSkinIndex === -1) this.selectedSkinIndex = 1;

    // Tráº¡ng thÃ¡i chÆ¡i game
    this.score = 0;
    this.coffees = 0;
    this.feverEnergy = 0;
    this.isFeverActive = false;
    this.feverTimer = 0;
    this.currentSpeed = GAME_CONFIG.BASE_SPEED;

    // Quáº£n lÃ½ Timers cá»§a Power-ups
    this.doubleScoreTimer = 0;
    this.boostTimer = 0;
    this.highJumpTimer = 0;

    // Quáº£n lÃ½ cÃ¡c thá»±c thá»ƒ game
    this.player = null;
    this.environment = null;
    this.obstacleManager = null;
    this.collectibles = [];
    this.obstacleSpawnTimer = 0;
    this.collectibleSpawnTimer = 0;

    // Override model cho viewer (null = dÃ¹ng character Ä‘ang chá»n)
    this.pendingViewerOverride = null;

    // Hiá»‡u á»©ng háº¡t Fever (particles)
    this.feverParticles = null;
    this.feverParticleTime = 0;

    // Quáº£n lÃ½ thá»i gian vÃ²ng láº·p
    this.clock = new THREE.Clock();

    // LiÃªn káº¿t giao diá»‡n UI
    this.domScreens = {
      loading: document.getElementById('loading-screen'),
      menu: document.getElementById('main-menu'),
      viewer: document.getElementById('character-viewer-panel'),
      hud: document.getElementById('hud'),
      gameOver: document.getElementById('game-over-screen')
    };

    // Há»‡ thá»‘ng Quáº£n lÃ½ Lá»‹ch Sá»­ Äáº¥u & TÃ i NguyÃªn
    this.matchHistoryManager = new MatchHistoryManager();
    this.currencyManager = new CurrencyManager();
    this._historyChartInstance = null;

    this.domElements = {
      loadingBarFill: document.getElementById('loading-bar-fill'),
      loadingText: document.getElementById('loading-text'),
      menuHighScore: document.getElementById('menu-high-score'),
      hudScore: document.getElementById('hud-score'),
      hudCoffeeCount: document.getElementById('hud-coffee-count'),
      hudFeverPercent: document.getElementById('hud-fever-percent'),
      feverBarFill: document.getElementById('fever-bar-fill'),
      activePowerups: document.getElementById('active-powerups'),
      overScore: document.getElementById('over-score'),
      overCoffee: document.getElementById('over-coffee'),
      overHighScore: document.getElementById('over-high-score'),
      btnStart: document.getElementById('btn-start'),
      btnView360: document.getElementById('btn-view-360'),
      btnViewLamborghini: document.getElementById('btn-view-lamborghini'),
      btnCloseViewer: document.getElementById('btn-close-viewer'),
      btnToggleAutoRotate: document.getElementById('btn-toggle-auto-rotate'),
      btnResetViewerCam: document.getElementById('btn-reset-viewer-cam'),
      btnRestart: document.getElementById('btn-restart'),
      btnHome: document.getElementById('btn-home'),
      charPrev: document.getElementById('char-prev'),
      charNext: document.getElementById('char-next'),
      charAvatar: document.getElementById('char-avatar'),
      charName: document.getElementById('char-name'),
      charDesc: document.getElementById('char-desc'),
      desktopInstructions: document.getElementById('desktop-instructions'),
      btnTouchLeft: document.getElementById('touch-btn-left'),
      btnTouchRight: document.getElementById('touch-btn-right'),
      btnTouchJump: document.getElementById('touch-btn-jump'),
      btnTouchSlide: document.getElementById('touch-btn-slide'),
      // Audio Control Panel elements
      audioPanel: document.getElementById('audio-control-panel'),
      btnAudioMute: document.getElementById('btn-audio-mute'),
      iconSoundOn: document.getElementById('icon-sound-on'),
      iconSoundOff: document.getElementById('icon-sound-off'),
      volumeSliderWrap: document.getElementById('volume-slider-wrap'),
      volumeSlider: document.getElementById('volume-slider'),
      volumeFillBar: document.getElementById('volume-fill-bar'),
      volumeLabel: document.getElementById('volume-label'),
      btnJukebox: document.getElementById('btn-jukebox'),
      jukeboxModal: document.getElementById('jukebox-modal'),
      btnCloseJukebox: document.getElementById('btn-close-jukebox'),
      nowPlayingLabel: document.getElementById('now-playing-label'),
      jukeboxTrackList: document.getElementById('jukebox-track-list'),
      // Match History elements
      btnHistory: document.getElementById('btn-history'),
      historyModal: document.getElementById('history-modal'),
      btnCloseHistory: document.getElementById('btn-close-history'),
      btnClearHistory: document.getElementById('btn-clear-history'),
      historyTrackList: document.getElementById('history-track-list'),
      pbScoreValue: document.getElementById('pb-score-value'),
      pbCoinsValue: document.getElementById('pb-coins-value'),
      pbTimeValue: document.getElementById('pb-time-value'),
      // Top Bar Currency elements
      topCurrencyBar: document.getElementById('top-currency-bar'),
      meatAlertModal: document.getElementById('meat-alert-modal'),
      btnAddMeat: document.getElementById('btn-add-meat'),
      btnAddCoins: document.getElementById('btn-add-coins'),
      btnAddGems: document.getElementById('btn-add-gems'),
      btnQuickFillMeat: document.getElementById('btn-quick-fill-meat'),
      btnCloseMeatAlert: document.getElementById('btn-close-meat-alert')
    };

    // Khá»Ÿi táº¡o Quáº£n lÃ½ PhÃ²ng Xem 360Â°
    this.characterViewerManager = new CharacterViewerManager(this.sceneManager.renderer, this);

    this.init();
  }

  init() {
    try {
      // 1. Thiáº¿t láº­p State Machine callbacks
      this._setupStateMachine();

      // 2. Gáº¯n sá»± kiá»‡n cÃ¡c nÃºt báº¥m UI
      this._setupUIEvents();

      // 3. Gáº¯n Carousel chá»n nhÃ¢n váº­t
      this._setupCharacterCarousel();

      // 4. Gáº¯n Ä‘iá»u khiá»ƒn bÃ n phÃ­m
      this._setupKeyboardControls();

      // 5. Gáº¯n Ä‘iá»u khiá»ƒn vuá»‘t cáº£m á»©ng (Swipe)
      this._setupSwipeControls();

      // 6. Khá»Ÿi táº¡o Audio Control Panel (má»›i)
      this._setupAudioControlPanel();
    } catch (err) {
      console.warn('[Game] Init UI setup warning:', err);
    }

    // Resize listener cho phÃ²ng xem 360Â°
    window.addEventListener('resize', () => {
      if (this.characterViewerManager) {
        this.characterViewerManager.onWindowResize(window.innerWidth, window.innerHeight);
      }
    });

    // 7. Cháº¡y quÃ¡ trÃ¬nh táº£i (Loading)
    this._runSimulatedLoading();

    // 8. Báº¯t Ä‘áº§u vÃ²ng láº·p render
    this._animate();
  }

  // =========================================================
  // THIáº¾T Láº¬P STATE MACHINE
  // =========================================================
  _setupStateMachine() {
    const sm = this.stateMachine;

    // Khi vÃ o MENU
    sm.onEnter(GAME_STATES.MENU, () => {
      this._showScreen('menu');
      this._updateHighScoreDisplay();
      // KhÃ´i phá»¥c volume tá»« ducking (khi tá»« GAMEOVER vá» MENU)
      this.audioManager.restoreVolume(600);
      // Náº¿u BGM chÆ°a phÃ¡t, báº¯t Ä‘áº§u phÃ¡t track Ä‘ang chá»n
      if (!this.audioManager.isBgmPlaying) {
        this.audioManager.startBGM();
      }
      if (this.characterViewerManager) {
        this.characterViewerManager.closeViewer();
      }
      // Hiá»‡n panel audio khi vÃ o menu
      this._setAudioPanelVisible(true);
    });

    // Khi vÃ o VIEWER (PhÃ²ng xem 360Â°)
    sm.onEnter(GAME_STATES.VIEWER, () => {
      this._showScreen('viewer');
      // áº¨n panel audio khi á»Ÿ phÃ²ng xem 360Â° (chá»‰ hiá»‡n á»Ÿ Menu chÃ­nh)
      this._setAudioPanelVisible(false);
      // Æ¯u tiÃªn override náº¿u cÃ³ (VD: Lamborghini viewer)
      if (this.pendingViewerOverride) {
        const override = this.pendingViewerOverride;
        this.pendingViewerOverride = null;
        if (this.characterViewerManager) {
          this.characterViewerManager.openViewer(override.id, override);
        }
      } else {
        const skinKey = this.skinKeys[this.selectedSkinIndex] || 'SHIPPER';
        const perk = CHARACTERS[skinKey] || CHARACTERS.SHIPPER;
        if (this.characterViewerManager) {
          this.characterViewerManager.openViewer(perk.id, perk);
        }
      }
    });

    // Khi vÃ o PLAYING
    sm.onEnter(GAME_STATES.PLAYING, () => {
      this._showScreen('hud');
      if (this.characterViewerManager) {
        this.characterViewerManager.closeViewer();
      }
      if (this.isFeverActive) {
        // ThoÃ¡t Fever Mode nhÆ°ng váº«n PLAYING
        this._deactivateFeverVisuals();
        this.isFeverActive = false;
        this.audioManager.startBGM();
      }
      // KhÃ´i phá»¥c volume náº¿u Ä‘ang bá»‹ duck (tá»« GAMEOVER â†’ PLAYING restart)
      this.audioManager.restoreVolume(400);
      // áº¨n panel audio khi Ä‘ang chÆ¡i
      this._setAudioPanelVisible(false);
    });

    // Khi vÃ o FEVER
    sm.onEnter(GAME_STATES.FEVER, () => {
      this._showScreen('hud');
      this._activateFeverVisuals();
      this.isFeverActive = true;
      this.feverTimer = GAME_CONFIG.FEVER_DURATION;
      this.audioManager.startFeverBGM();
      this._setAudioPanelVisible(false);
    });

    // Khi vÃ o GAMEOVER
    sm.onEnter(GAME_STATES.GAMEOVER, () => {
      this._showScreen('gameOver');
      this._updateGameOverDisplay();
      // Duck volume thay vÃ¬ stopBGM - nháº¡c váº«n phÃ¡t nháº¹ á»Ÿ ná»n
      this.audioManager.duckVolume(0.12, 1200);
      this.audioManager.playGameOver();
      this._destroyFeverParticles();
      // áº¨n panel audio khi game over
      this._setAudioPanelVisible(false);

      // LÆ°u high score
      const highScore = parseInt(localStorage.getItem('saigon_high_score') || '0');
      if (this.score > highScore) {
        localStorage.setItem('saigon_high_score', this.score.toString());
      }

      // Tá»± Ä‘á»™ng lÆ°u tráº­n Ä‘áº¥u má»›i vÃ o Lá»‹ch Sá»­ Äáº¥u
      const charConfig = CHARACTERS[this.selectedCharId] || { name: 'Nam Suá»‘' };
      this.matchHistoryManager.saveMatch({
        score: this.score,
        coins: this.coffees || 0,
        characterId: this.selectedCharId,
        characterName: charConfig.name,
        survivalSeconds: this.gameTimer || 0
      });

      // Cá»™ng Xu tÃ­ch lÅ©y trong tráº­n vÃ o tÃ i khoáº£n tá»•ng
      if (this.coffees && this.coffees > 0) {
        this.currencyManager.addCoins(this.coffees);
      }
    });

    // Buá»™c tráº¡ng thÃ¡i ban Ä‘áº§u thÃ nh LOADING
    sm.forceState(GAME_STATES.LOADING);
    this._showScreen('loading');
    this._setAudioPanelVisible(false);
  }

  // =========================================================
  // THIáº¾T Láº¬P UI EVENTS
  // =========================================================
  _setupUIEvents() {
    if (this.domElements.btnStart) {
      this.domElements.btnStart.addEventListener('click', () => {
        this.audioManager._ensureContext();
        this.startGame();
      });
    }

    if (this.domElements.btnView360) {
      this.domElements.btnView360.addEventListener('click', () => {
        this.audioManager._ensureContext();
        this.stateMachine.transition(GAME_STATES.VIEWER);
      });
    }

    if (this.domElements.btnViewLamborghini) {
      this.domElements.btnViewLamborghini.addEventListener('click', () => {
        this.audioManager._ensureContext();
        this.pendingViewerOverride = {
          id: 'car_driver',
          name: 'ðŸŽï¸ Lamborghini Huáº­n',
          desc: 'SiÃªu xe thá»ƒ thao Ä‘á»‰nh cao | KÃ©o chuá»™t / Vuá»‘t Ä‘á»ƒ xoay 360Â°'
        };
        this.stateMachine.transition(GAME_STATES.VIEWER);
      });
    }

    if (this.domElements.btnCloseViewer) {
      this.domElements.btnCloseViewer.addEventListener('click', () => {
        this.stateMachine.transition(GAME_STATES.MENU);
      });
    }

    if (this.domElements.btnToggleAutoRotate) {
      this.domElements.btnToggleAutoRotate.addEventListener('click', () => {
        const isAutoOn = this.characterViewerManager?.toggleAutoRotate();
        if (this.domElements.btnToggleAutoRotate) {
          this.domElements.btnToggleAutoRotate.textContent = isAutoOn
            ? 'ðŸ”„ Tá»± Äá»™ng Xoay: Báº­t'
            : 'ðŸ”„ Tá»± Äá»™ng Xoay: Táº¯t';
        }
      });
    }

    if (this.domElements.btnResetViewerCam) {
      this.domElements.btnResetViewerCam.addEventListener('click', () => {
        this.characterViewerManager?.resetCamera();
      });
    }

    if (this.domElements.btnRestart) {
      this.domElements.btnRestart.addEventListener('click', () => {
        this.startGame();
      });
    }

    if (this.domElements.btnHome) {
      this.domElements.btnHome.addEventListener('click', () => {
        this.stateMachine.transition(GAME_STATES.MENU);
      });
    }
  }

  // =========================================================
  // AUDIO CONTROL PANEL - Setup Ä‘áº§y Ä‘á»§
  // =========================================================
  _setupAudioControlPanel() {
    const am = this.audioManager;

    this._syncAudioPanelUI();

    const toggleHistory = () => {
      am._ensureContext();
      const modal = document.getElementById('history-modal');
      const isOpen = modal && modal.classList.contains('open');
      this._setHistoryOpen(!isOpen);
    };

    const toggleJukebox = () => {
      am._ensureContext();
      const modal = document.getElementById('jukebox-modal');
      const isOpen = modal && modal.classList.contains('open');
      this._setJukeboxOpen(!isOpen);
    };

    const toggleMute = () => {
      am._ensureContext();
      const isMuted = !am.enabled;
      am.setMuted(!isMuted);
      this._syncAudioPanelUI();
    };

    // 1. Gáº¯n trá»±c tiáº¿p onclick
    const btnHistory = document.getElementById('btn-history');
    if (btnHistory) {
      btnHistory.onclick = (e) => { e.stopPropagation(); toggleHistory(); };
    }

    const btnJukebox = document.getElementById('btn-jukebox');
    if (btnJukebox) {
      btnJukebox.onclick = (e) => { e.stopPropagation(); toggleJukebox(); };
    }

    const btnMute = document.getElementById('btn-audio-mute');
    if (btnMute) {
      btnMute.onclick = (e) => { e.stopPropagation(); toggleMute(); };
    }

    // 2. Event Delegation toÃ n diá»‡n trÃªn document
    document.addEventListener('click', (e) => {
      const historyBtn = e.target.closest('#btn-history, .history-btn');
      if (historyBtn) {
        e.stopPropagation();
        toggleHistory();
        return;
      }

      const jukeboxBtn = e.target.closest('#btn-jukebox, .jukebox-btn');
      if (jukeboxBtn) {
        e.stopPropagation();
        toggleJukebox();
        return;
      }

      const muteBtn = e.target.closest('#btn-audio-mute, .mute-btn');
      if (muteBtn) {
        e.stopPropagation();
        toggleMute();
        return;
      }
    });

    // Volume Slider
    const volumeSlider = document.getElementById('volume-slider');
    if (volumeSlider) {
      volumeSlider.addEventListener('input', () => {
        am._ensureContext();
        const val = parseInt(volumeSlider.value);
        am.setMasterVolume(val / 100);
        const fillBar = document.getElementById('volume-fill-bar');
        const label = document.getElementById('volume-label');
        if (fillBar) fillBar.style.width = `${val}%`;
        if (label) label.textContent = `${val}%`;
      });

      volumeSlider.addEventListener('pointerdown', () => {
        const wrap = document.getElementById('volume-slider-wrap');
        wrap?.classList.add('active-sliding');
      });
      window.addEventListener('pointerup', () => {
        const wrap = document.getElementById('volume-slider-wrap');
        wrap?.classList.remove('active-sliding');
      });
    }

    // ÄÃ³ng Jukebox khi click backdrop hoáº·c nÃºt X
    const btnCloseJukebox = document.getElementById('btn-close-jukebox');
    if (btnCloseJukebox) {
      btnCloseJukebox.onclick = () => this._setJukeboxOpen(false);
    }
    const jukeboxModal = document.getElementById('jukebox-modal');
    if (jukeboxModal) {
      jukeboxModal.querySelector('.jukebox-backdrop')?.addEventListener('click', () => {
        this._setJukeboxOpen(false);
      });
    }

    const btnCloseHistory = document.getElementById('btn-close-history');
    if (btnCloseHistory) {
      btnCloseHistory.onclick = () => this._setHistoryOpen(false);
    }
    const historyModal = document.getElementById('history-modal');
    if (historyModal) {
      historyModal.querySelector('.history-backdrop')?.addEventListener('click', () => {
        this._setHistoryOpen(false);
      });
    }
    const btnClearHistory = document.getElementById('btn-clear-history');
    if (btnClearHistory) {
      btnClearHistory.onclick = () => {
        if (confirm('Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n xÃ³a toÃ n bá»™ lá»‹ch sá»­ thi Ä‘áº¥u?')) {
          this.matchHistoryManager.clearHistory();
          this._renderHistoryModal();
        }
      };
    }
  }

    // --- 7. Currency Top Bar Quick Buy Buttons & Meat Alert Modal ---
    if (dom.btnAddMeat) {
      dom.btnAddMeat.addEventListener('click', () => {
        this.currencyManager.addMeat(100);
        this._showStreamToast('ðŸ– ÄÃ£ nháº­n +100 Thá»‹t Thá»ƒ Lá»±c!');
      });
    }
    if (dom.btnAddCoins) {
      dom.btnAddCoins.addEventListener('click', () => {
        this.currencyManager.addCoins(500);
        this._showStreamToast('ðŸª™ ÄÃ£ nháº­n +500 Xu VÃ ng!');
      });
    }
    if (dom.btnAddGems) {
      dom.btnAddGems.addEventListener('click', () => {
        this.currencyManager.addGems(50);
        this._showStreamToast('ðŸ’Ž ÄÃ£ nháº­n +50 Kim CÆ°Æ¡ng!');
      });
    }
    if (dom.btnQuickFillMeat) {
      dom.btnQuickFillMeat.addEventListener('click', () => {
        this.currencyManager.addMeat(100);
        this._setMeatAlertOpen(false);
        this._showStreamToast('ðŸ– ÄÃ£ náº¡p thÃ nh cÃ´ng +100 Thá»‹t! CÃ³ thá»ƒ chÆ¡i ngay.');
      });
    }
    if (dom.btnCloseMeatAlert) {
      dom.btnCloseMeatAlert.addEventListener('click', () => this._setMeatAlertOpen(false));
    }
    if (dom.meatAlertModal) {
      dom.meatAlertModal.querySelector('.meat-alert-backdrop')?.addEventListener('click', () => {
        this._setMeatAlertOpen(false);
      });
    }

    // --- 5. Track Items Click - PhÃ¢n biá»‡t STREAMING vs PROCEDURAL ---
    if (dom.jukeboxTrackList) {
      dom.jukeboxTrackList.addEventListener('click', (e) => {
        const item = e.target.closest('.track-item');
        if (!item) return;
        const trackId = item.dataset.track;
        const trackType = item.dataset.type || 'procedural';
        if (!trackId) return;

        am._ensureContext();

        if (trackType === 'streaming') {
          // === STREAMING TRACK (YouTube) ===
          // Dá»«ng streaming cÅ© náº¿u Ä‘ang phÃ¡t track khÃ¡c
          if (am.isStreaming && am.currentStreamId !== trackId) {
            am.stopStreamingAudio(300);
          }
          // Callback cáº­p nháº­t UI tráº¡ng thÃ¡i streaming
          const onStatus = (status) => {
            this._setStreamingLoadingUI(trackId, status);
            if (status === 'fallback') {
              this._showStreamToast('âš ï¸ Äang chuyá»ƒn vá» nháº¡c máº·c Ä‘á»‹nh...');
              // Reset vá» procedural track
              this._updateJukeboxActiveTrack(am.currentTrackId, null);
            }
          };
          am.playStreamingTrack(trackId, onStatus);
          this._updateJukeboxActiveTrack(null, trackId);
        } else {
          // === PROCEDURAL TRACK ===
          // Dá»«ng streaming náº¿u Ä‘ang phÃ¡t
          if (am.isStreaming) {
            am.stopStreamingAudio(350, () => {
              am.selectTrack(trackId);
              if (!am.isBgmPlaying) am.startBGM();
            });
          } else {
            am.selectTrack(trackId);
            if (!am.isBgmPlaying) am.startBGM();
          }
          this._updateJukeboxActiveTrack(trackId, null);
        }
      });
    }

    // KhÃ´i phá»¥c streaming track tá»« localStorage (náº¿u cÃ³)
    if (am._pendingRestoreStreamId) {
      const restoreId = am._pendingRestoreStreamId;
      am._pendingRestoreStreamId = null;
      // PhÃ¡t láº¡i sau 1 giÃ¢y (Ä‘á»£i user interaction)
      // Chá»‰ restore sau khi user Ä‘Ã£ click vÃ o game láº§n Ä‘áº§u
      const restoreOnce = () => {
        am._ensureContext();
        const onStatus = (status) => this._setStreamingLoadingUI(restoreId, status);
        am.playStreamingTrack(restoreId, onStatus);
        this._updateJukeboxActiveTrack(null, restoreId);
        document.removeEventListener('click', restoreOnce);
      };
      document.addEventListener('click', restoreOnce, { once: true });
    }
  }

  /**
   * Äá»“ng bá»™ toÃ n bá»™ Audio Panel UI vá»›i tráº¡ng thÃ¡i AudioManager
   */
  _syncAudioPanelUI() {
    const am = this.audioManager;
    const dom = this.domElements;
    const settings = am.getSettings();

    // Mute button state
    if (dom.btnAudioMute) {
      dom.btnAudioMute.classList.toggle('muted', settings.muted);
    }
    if (dom.iconSoundOn) dom.iconSoundOn.classList.toggle('hidden', settings.muted);
    if (dom.iconSoundOff) dom.iconSoundOff.classList.toggle('hidden', !settings.muted);

    // Volume slider
    const volPct = Math.round(settings.volume * 100);
    if (dom.volumeSlider) dom.volumeSlider.value = String(volPct);
    if (dom.volumeFillBar) dom.volumeFillBar.style.width = `${volPct}%`;
    if (dom.volumeLabel) dom.volumeLabel.textContent = `${volPct}%`;

    // Track active state - Æ°u tiÃªn streaming náº¿u Ä‘ang phÃ¡t
    if (settings.isStreaming && settings.currentStreamId) {
      this._updateJukeboxActiveTrack(null, settings.currentStreamId);
    } else {
      this._updateJukeboxActiveTrack(settings.trackId, null);
    }
  }

  /**
   * Cáº­p nháº­t track active trong Jukebox
   * @param {string|null} proceduralId - ID cá»§a procedural track (track_1/2/3) hoáº·c null
   * @param {string|null} streamId - ID cá»§a streaming track hoáº·c null
   */
  _updateJukeboxActiveTrack(proceduralId, streamId) {
    const am = this.audioManager;
    const dom = this.domElements;

    // XÃ³a active khá»i táº¥t cáº£ items
    document.querySelectorAll('.track-item').forEach(el => {
      el.classList.remove('active');
      el.classList.remove('loading');
      el.classList.remove('error');
    });

    // áº¨n táº¥t cáº£ loading rings
    document.querySelectorAll('.track-loading-ring').forEach(r => r.classList.remove('visible'));

    if (streamId) {
      // Streaming track active
      const el = document.getElementById(`track-item-${streamId}`);
      if (el) el.classList.add('active');

      // Now-playing bar - streaming mode
      const nowPlayingBar = document.querySelector('.now-playing-bar');
      if (nowPlayingBar) nowPlayingBar.classList.add('streaming-mode');

      // Update now-playing label
      const track = am.streamingPlaylist?.find(t => t.id === streamId);
      if (track && dom.nowPlayingLabel) {
        dom.nowPlayingLabel.textContent = `\u25B6 ${track.title} - ${track.artist}`;
      }
    } else if (proceduralId) {
      // Procedural track active
      const el = document.getElementById(`track-item-${proceduralId}`);
      if (el) el.classList.add('active');

      // Now-playing bar - normal mode
      const nowPlayingBar = document.querySelector('.now-playing-bar');
      if (nowPlayingBar) nowPlayingBar.classList.remove('streaming-mode');

      // Update now-playing label
      const track = am.tracks[proceduralId];
      if (track && dom.nowPlayingLabel) {
        dom.nowPlayingLabel.textContent = `\u25B6 ${track.name}`;
      }
    }
  }

  /**
   * Cáº­p nháº­t UI loading/playing/error cho streaming track
   */
  _setStreamingLoadingUI(streamId, status) {
    const item = document.getElementById(`track-item-${streamId}`);
    const loadingRing = document.getElementById(`loading-${streamId}`);

    if (!item) return;
    item.classList.remove('loading', 'error');
    if (loadingRing) loadingRing.classList.remove('visible');

    if (status === 'loading') {
      item.classList.add('loading');
      if (loadingRing) loadingRing.classList.add('visible');
    } else if (status === 'playing') {
      // ÄÃ£ phÃ¡t - active state Ä‘Ã£ Ä‘Æ°á»£c set
    } else if (status === 'error' || status === 'fallback') {
      item.classList.add('error');
      item.classList.remove('active');
    }
  }

  /**
   * Hiá»‡n toast notification
   */
  _showStreamToast(message) {
    let toast = document.getElementById('stream-toast-el');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'stream-toast-el';
      toast.className = 'stream-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
  }

  /**
   * Má»Ÿ / Ä‘Ã³ng Jukebox Modal
   */
  _setJukeboxOpen(open) {
    const modal = this.domElements.jukeboxModal || document.getElementById('jukebox-modal');
    if (!modal) return;
    if (open) this._setHistoryOpen(false); // ÄÃ³ng history náº¿u má»Ÿ jukebox
    modal.classList.toggle('open', open);
    modal.setAttribute('aria-hidden', String(!open));
  }

  /**
   * Má»Ÿ / Ä‘Ã³ng Match History Modal
   */
  _setHistoryOpen(open) {
    const modal = this.domElements.historyModal || document.getElementById('history-modal');
    if (!modal) return;
    if (open) {
      this._setJukeboxOpen(false); // ÄÃ³ng jukebox náº¿u Ä‘ang má»Ÿ
      this._renderHistoryModal();
    }
    modal.classList.toggle('open', open);
    modal.setAttribute('aria-hidden', String(!open));
  }

  /**
   * Váº½ dá»¯ liá»‡u cho Modal Lá»‹ch Sá»­ Thi Äáº¥u
   */
  _renderHistoryModal() {
    const dom = this.domElements;
    const best = this.matchHistoryManager.getPersonalBest();

    // 1. Cáº­p nháº­t Tháº» Ká»· Lá»¥c Cao Nháº¥t
    if (best) {
      if (dom.pbScoreValue) dom.pbScoreValue.textContent = best.score.toLocaleString('vi-VN');
      if (dom.pbCoinsValue) dom.pbCoinsValue.textContent = `${best.coins} Xu`;
      if (dom.pbTimeValue) dom.pbTimeValue.textContent = best.formattedTime;
    } else {
      if (dom.pbScoreValue) dom.pbScoreValue.textContent = '0';
      if (dom.pbCoinsValue) dom.pbCoinsValue.textContent = '0 Xu';
      if (dom.pbTimeValue) dom.pbTimeValue.textContent = '00:00';
    }

    // 2. Váº½ Biá»ƒu Ä‘á»“ Chart.js Tiáº¿n trÃ¬nh Ä‘iá»ƒm sá»‘
    this._renderHistoryChart();

    // 3. Render Danh sÃ¡ch Tháº» Tráº­n Äáº¥u
    const history = this.matchHistoryManager.getHistory();
    if (!dom.historyTrackList) return;

    if (history.length === 0) {
      dom.historyTrackList.innerHTML = `
        <div class="history-empty-state">
          <i data-lucide="inbox" class="empty-icon"></i>
          <span>ChÆ°a cÃ³ dá»¯ liá»‡u lá»‹ch sá»­ thi Ä‘áº¥u nÃ o.</span>
        </div>
      `;
    } else {
      dom.historyTrackList.innerHTML = history.map(item => {
        const avatar = item.characterId === 'lambo' ? 'ðŸŽï¸' : 'ðŸƒ';
        return `
          <div class="match-card ${item.isNewRecord ? 'is-new-record' : ''}">
            <div class="match-left">
              <div class="match-char-avatar">${avatar}</div>
              <div class="match-details">
                <span class="match-char-name">${item.characterName}</span>
                <span class="match-date">${item.date}</span>
              </div>
            </div>
            <div class="match-center">
              <span class="match-score">${item.score.toLocaleString('vi-VN')}</span>
              <div class="match-meta-row">
                <span>ðŸª™ ${item.coins} xu</span>
                <span>â±ï¸ ${item.formattedTime}</span>
              </div>
            </div>
            <div class="match-right">
              <span class="match-badge ${item.badgeClass}">${item.badgeText}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    // Cáº­p nháº­t láº¡i cÃ¡c Lucide Icons
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  /**
   * Váº½ biá»ƒu Ä‘á»“ Ä‘Æ°á»ng Chart.js cho Lá»‹ch Sá»­ Thi Äáº¥u
   */
  _renderHistoryChart() {
    const canvas = document.getElementById('match-history-chart');
    if (!canvas || !window.Chart) return;

    if (this._historyChartInstance) {
      this._historyChartInstance.destroy();
      this._historyChartInstance = null;
    }

    const history = [...this.matchHistoryManager.getHistory()].reverse(); // Tráº­n cÅ© -> má»›i
    if (history.length === 0) return;

    const labels = history.map((_, idx) => `Tráº­n ${idx + 1}`);
    const data = history.map(item => item.score);

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 120);
    gradient.addColorStop(0, 'rgba(0, 229, 255, 0.45)');
    gradient.addColorStop(1, 'rgba(160, 60, 255, 0.0)');

    this._historyChartInstance = new window.Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Äiá»ƒm sá»‘',
          data: data,
          borderColor: '#00e5ff',
          borderWidth: 2.5,
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#ffd700',
          pointBorderColor: '#00e5ff',
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` Äiá»ƒm: ${ctx.parsed.y.toLocaleString('vi-VN')}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: 'rgba(200, 210, 240, 0.6)', font: { size: 9 } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: 'rgba(200, 210, 240, 0.6)', font: { size: 9 } }
          }
        }
      }
    });
  }

  /**
   * áº¨n / hiá»‡n Audio Control Panel vÃ  Top Bar Currency HUD (chá»‰ hiá»‡n duy nháº¥t á»Ÿ Menu chÃ­nh)
   */
  _setAudioPanelVisible(visible) {
    const panel = this.domElements.audioPanel || document.getElementById('audio-control-panel');
    if (panel) {
      panel.classList.toggle('visible-in-menu', visible);
      panel.style.display = visible ? 'flex' : 'none';
    }
    const topBar = this.domElements.topCurrencyBar || document.getElementById('top-currency-bar');
    if (topBar) {
      topBar.classList.toggle('visible-in-menu', visible);
      topBar.style.display = visible ? 'flex' : 'none';
    }
    if (visible && this.currencyManager) {
      this.currencyManager.updateUI();
    } else if (!visible) {
      this._setJukeboxOpen(false);
      this._setHistoryOpen(false);
      this._setMeatAlertOpen(false);
    }
  }

  /**
   * Má»Ÿ / Ä‘Ã³ng Pop-up thÃ´ng bÃ¡o KhÃ´ng Äá»§ Thá»‹t
   */
  _setMeatAlertOpen(open) {
    const dom = this.domElements;
    if (!dom.meatAlertModal) return;
    dom.meatAlertModal.classList.toggle('open', open);
    dom.meatAlertModal.setAttribute('aria-hidden', String(!open));
  }

  // =========================================================
  // ÄIá»€U KHIá»‚N BÃ€N PHÃM
  // =========================================================
  _setupKeyboardControls() {
    window.addEventListener('keydown', (e) => {
      if (!this.stateMachine.is(GAME_STATES.PLAYING, GAME_STATES.FEVER)) return;

      const key = e.key.toUpperCase();

      if (key === 'A' || e.key === 'ArrowLeft') {
        this.player?.moveLeft();
        this.audioManager.playLaneSwitch();
      } else if (key === 'D' || e.key === 'ArrowRight') {
        this.player?.moveRight();
        this.audioManager.playLaneSwitch();
      } else if (key === 'W' || e.key === 'ArrowUp' || e.key === ' ') {
        e.preventDefault(); // NgÄƒn Space scroll trang
        if (this.player?.jump()) {
          this.audioManager.playJump();
        }
      } else if (key === 'S' || e.key === 'ArrowDown') {
        this.player?.slide();
        this.audioManager.playSlide();
      }

      // PhÃ­m Debug
      if (key === 'F') {
        this._activateFeverMode();
      } else if (key === 'C') {
        this._simulateCoffeeCollect();
      } else if (key === 'G') {
        this._triggerGameOver();
      }
    });
  }

  // =========================================================
  // ÄIá»€U KHIá»‚N VUá»T Cáº¢M á»¨NG & CHUá»˜T (TOUCH, MOUSE DRAG & CLICK)
  // =========================================================
  _setupSwipeControls() {
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let isMouseDown = false;
    const canvas = document.getElementById('game-canvas');
    const raycaster = new THREE.Raycaster();
    const mouseVector = new THREE.Vector2();

    // 1. Gáº¯n sá»± kiá»‡n cÃ¡c nÃºt báº¥m cáº£m á»©ng áº£o (Virtual Touch Buttons)
    const bindTouchBtn = (btn, action) => {
      if (!btn) return;
      const handler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!this.stateMachine.is(GAME_STATES.PLAYING, GAME_STATES.FEVER)) return;
        action();
      };
      btn.addEventListener('touchstart', handler, { passive: false });
      btn.addEventListener('mousedown', handler);
    };

    bindTouchBtn(this.domElements.btnTouchLeft, () => {
      this.player?.moveLeft();
      this.audioManager.playLaneSwitch();
    });

    bindTouchBtn(this.domElements.btnTouchRight, () => {
      this.player?.moveRight();
      this.audioManager.playLaneSwitch();
    });

    bindTouchBtn(this.domElements.btnTouchJump, () => {
      if (this.player?.jump()) this.audioManager.playJump();
    });

    bindTouchBtn(this.domElements.btnTouchSlide, () => {
      this.player?.slide();
      this.audioManager.playSlide();
    });

    // 2. Logic KÃ©o/Vuá»‘t chuá»™t & Cáº£m á»©ng trÃªn MÃ n hÃ¬nh
    const handleStart = (clientX, clientY) => {
      startX = clientX;
      startY = clientY;
      startTime = Date.now();
      isMouseDown = true;
    };

    const handleEnd = (clientX, clientY) => {
      if (!isMouseDown) return;
      isMouseDown = false;

      const dx = clientX - startX;
      const dy = clientY - startY;
      const dt = Date.now() - startTime;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Náº¿u kÃ©o/vuá»‘t rÃµ rÃ ng (khoáº£ng cÃ¡ch > 30px vÃ  nhanh < 500ms)
      if (absDx > 30 || absDy > 30) {
        if (!this.stateMachine.is(GAME_STATES.PLAYING, GAME_STATES.FEVER)) return;

        if (absDx > absDy) {
          // Vuá»‘t ngang
          if (dx > 0) {
            this.player?.moveRight();
            this.audioManager.playLaneSwitch();
          } else {
            this.player?.moveLeft();
            this.audioManager.playLaneSwitch();
          }
        } else {
          // Vuá»‘t dá»c
          if (dy < 0) {
            if (this.player?.jump()) this.audioManager.playJump();
          } else {
            this.player?.slide();
            this.audioManager.playSlide();
          }
        }
      } else if (dt < 300) {
        // TÆ¯Æ NG TÃC CLICK/TAP NHANH
        // 2.1. Kiá»ƒm tra Raycaster click tháº³ng vÃ o nhÃ¢n váº­t 3D
        mouseVector.x = (clientX / window.innerWidth) * 2 - 1;
        mouseVector.y = -(clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouseVector, this.sceneManager.camera);

        if (this.player && this.player.visualGroup) {
          const intersects = raycaster.intersectObjects(this.player.visualGroup.children, true);
          if (intersects.length > 0) {
            // Click vÃ o nhÃ¢n váº­t 3D -> LÃ m nhÃ¢n váº­t nháº£y lÃªn chÃ o vui nhá»™n!
            if (this.player.jump()) {
              this.audioManager.playJump();
            }
            return;
          }
        }

        // 2.2. Click phÃ¢n vÃ¹ng mÃ n hÃ¬nh khi Ä‘ang chÆ¡i (TrÃ¡i: Sang TrÃ¡i | Pháº£i: Sang Pháº£i | Giá»¯a: Nháº£y)
        if (this.stateMachine.is(GAME_STATES.PLAYING, GAME_STATES.FEVER)) {
          const ratioX = clientX / window.innerWidth;
          if (ratioX < 0.35) {
            this.player?.moveLeft();
            this.audioManager.playLaneSwitch();
          } else if (ratioX > 0.65) {
            this.player?.moveRight();
            this.audioManager.playLaneSwitch();
          } else {
            if (this.player?.jump()) this.audioManager.playJump();
          }
        }
      }
    };

    // Touch Events
    canvas.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY);
    }, { passive: true });

    canvas.addEventListener('touchend', (e) => {
      const touch = e.changedTouches[0];
      handleEnd(touch.clientX, touch.clientY);
    }, { passive: true });

    // Mouse Drag Events
    canvas.addEventListener('mousedown', (e) => {
      handleStart(e.clientX, e.clientY);
    });

    canvas.addEventListener('mouseup', (e) => {
      handleEnd(e.clientX, e.clientY);
    });
  }

  // =========================================================
  // QUáº¢N LÃ MÃ€N HÃŒNH UI
  // =========================================================
  _showScreen(screenKey) {
    Object.values(this.domScreens).forEach(screen => {
      if (screen) screen.classList.remove('active');
    });
    if (this.domScreens[screenKey]) {
      this.domScreens[screenKey].classList.add('active');
    }
  }

  // =========================================================
  // LOADING UI Há»¢P THá»œI TRANG CYBERPUNK SCI-FI
  // =========================================================
  updateLoadingProgress(percent, statusText) {
    const roundedPercent = Math.min(100, Math.floor(percent));
    if (this.domElements.loadingBarFill) {
      this.domElements.loadingBarFill.style.width = `${roundedPercent}%`;
    }
    const percentElem = document.getElementById('loading-percent');
    if (percentElem) {
      percentElem.textContent = `${roundedPercent}%`;
    }
    if (this.domElements.loadingText && statusText) {
      this.domElements.loadingText.textContent = statusText;
    }
  }

  _runSimulatedLoading() {
    const statusMessages = [
      "KÃCH HOáº T Äá»˜NG CÆ  CYBERPUNK 3D...",
      "ÄANG BUá»˜C THUN CHáº°N THÃ™NG HÃ€NG SHIPPER...",
      "PHA CÃ€ PHÃŠ Sá»®A ÄÃ NÄ‚NG LÆ¯á»¢NG RUSH FEVER...",
      "Náº P Báº¢N Äá»’ ÄÆ¯á»œNG PHá» THÃI BÃŒNH NEON...",
      "HOÃ€N Táº¤T Äá»˜NG CÆ  - Sáº´N SÃ€NG LAO PHá»!"
    ];

    let currentProgress = 0;
    let completed = false;

    const finishLoading = () => {
      if (completed) return;
      completed = true;
      if (progressInterval) clearInterval(progressInterval);
      this.updateLoadingProgress(100, "THÃI BÃŒNH RUSH - KHá»žI CHáº Y!");
      try {
        this._initEntities();
        this._updateCharacterCardDisplay();
      } catch (e) {
        console.warn('[Game] Init entities warning:', e);
      }
      setTimeout(() => {
        this.stateMachine.transition(GAME_STATES.MENU);
      }, 250);
    };

    // Smooth visual progress interval tá»« 0% lÃªn 100%
    const progressInterval = setInterval(() => {
      if (completed) return;
      currentProgress += Math.floor(Math.random() * 15) + 12;
      if (currentProgress >= 100) {
        currentProgress = 100;
        finishLoading();
      } else {
        const msgIndex = Math.min(statusMessages.length - 1, Math.floor((currentProgress / 100) * statusMessages.length));
        this.updateLoadingProgress(currentProgress, statusMessages[msgIndex]);
      }
    }, 100);

    // Asset loading song song á»Ÿ ná»n
    try {
      AssetManager.loadAll(
        (progress) => {
          if (progress > currentProgress && !completed) {
            currentProgress = Math.floor(progress);
            const msgIndex = Math.min(statusMessages.length - 1, Math.floor((progress / 100) * statusMessages.length));
            this.updateLoadingProgress(currentProgress, statusMessages[msgIndex]);
          }
        },
        finishLoading
      );
    } catch (e) {
      console.warn('[Game] Asset load warning:', e);
      finishLoading();
    }

    // Hard fallback sau 2.2 giÃ¢y báº£o Ä‘áº£m 100% khÃ´ng bao giá» bá»‹ Ä‘Æ¡
    setTimeout(finishLoading, 2200);
  }

  // =========================================================
  // THIáº¾T Láº¬P CAROUSEL CHá»ŒN NHÃ‚N Váº¬T
  // =========================================================
  _setupCharacterCarousel() {
    this._updateCharacterCardDisplay();

    if (this.domElements.charPrev) {
      this.domElements.charPrev.addEventListener('click', () => {
        this.selectedSkinIndex = (this.selectedSkinIndex - 1 + this.skinKeys.length) % this.skinKeys.length;
        this._updateCharacterCardDisplay();
        this.audioManager.playLaneSwitch();
      });
    }

    if (this.domElements.charNext) {
      this.domElements.charNext.addEventListener('click', () => {
        this.selectedSkinIndex = (this.selectedSkinIndex + 1) % this.skinKeys.length;
        this._updateCharacterCardDisplay();
        this.audioManager.playLaneSwitch();
      });
    }
  }

  _updateCharacterCardDisplay() {
    const skinKey = this.skinKeys[this.selectedSkinIndex];
    const charInfo = CHARACTERS[skinKey];
    if (!charInfo) return;

    localStorage.setItem('thaibinh_selected_skin', skinKey);

    if (this.domElements.charName) this.domElements.charName.textContent = charInfo.name;
    if (this.domElements.charDesc) this.domElements.charDesc.textContent = charInfo.desc;
    if (this.domElements.charAvatar) {
      this.domElements.charAvatar.className = `character-avatar ${charInfo.id}-skin`;
    }

    if (this.player) {
      this.player.setSkin(charInfo.id);
    }
  }

  // =========================================================
  // KHá»žI Táº O ENTITIES
  // =========================================================
  _initEntities() {
    const scene = this.sceneManager.scene;
    const skinKey = this.skinKeys[this.selectedSkinIndex] || 'SHIPPER';
    const skinId = CHARACTERS[skinKey]?.id || 'shipper';

    if (this.environment) this.environment.dispose();
    this.environment = new Environment(scene);

    if (this.obstacleManager) this.obstacleManager.clear();
    this.obstacleManager = new ObstacleManager(scene);

    if (this.player) this.player.dispose();
    this.player = new Player(scene, skinId);

    if (this.exhaustFlameEffect) this.exhaustFlameEffect.dispose();
    this.exhaustFlameEffect = new ExhaustFlameBoostEffect(scene);

    this._clearObstacles();
    this._clearCollectibles();
    this._destroyFeverParticles();
  }

  _clearObstacles() {
    if (this.obstacleManager) {
      this.obstacleManager.clear();
    }
  }

  _clearCollectibles() {
    this.collectibles.forEach(col => col.dispose());
    this.collectibles = [];
  }

  // =========================================================
  // GAME FLOW
  // =========================================================
  startGame() {
    // 1. Kiá»ƒm tra xem ngÆ°á»i chÆ¡i cÃ³ Ä‘á»§ 10 Thá»‹t Thá»ƒ Lá»±c khÃ´ng
    if (!this.currencyManager.hasEnoughMeat(10)) {
      this._setMeatAlertOpen(true);
      return;
    }
    // 2. Trá»« 10 Thá»‹t khi báº¯t Ä‘áº§u tráº­n Ä‘áº¥u
    this.currencyManager.deductMeat(10);

    this.score = 0;
    this.coffees = 0;
    this.feverEnergy = 0;
    this.isFeverActive = false;
    this.feverTimer = 0;
    this.doubleScoreTimer = 0;
    this.boostTimer = 0;
    this.highJumpTimer = 0;
    this.currentSpeed = 4.0; // Báº¯t Ä‘áº§u cuá»™n mÆ°á»£t mÃ  tá»« tá»‘c Ä‘á»™ Menu 4.0 m/s lÃªn tá»‘c Ä‘á»™ chÆ¡i!
    this.obstacleSpawnTimer = 1.5;
    this.collectibleSpawnTimer = 2.0;

    // Dá»n dáº¹p chÆ°á»›ng ngáº¡i váº­t & váº­t pháº©m cÅ©
    this._clearObstacles();
    this._clearCollectibles();
    this._destroyFeverParticles();

    // CÄƒn chá»‰nh nhÃ¢n váº­t vá» láº¡i lÃ n giá»¯a chuáº©n
    if (this.player) {
      this.player.currentLaneIndex = 1;
      this.player.updateTargetLane();
      this.player.meshGroup.position.set(LANE.CENTER, 0, 0);
      this.player.isJumping = false;
      this.player.isSliding = false;
      this.player.velocityY = 0;
      this.player.currentPlatformY = 0;
    }

    // Reset camera FOV
    this.sceneManager.camera.fov = GAME_CONFIG.CAMERA_FOV;
    this.sceneManager.camera.updateProjectionMatrix();

    this._updateHUDDisplay();

    // Hiá»‡n hÆ°á»›ng dáº«n rá»“i áº©n Ä‘i
    if (this.domElements.desktopInstructions) {
      this.domElements.desktopInstructions.style.opacity = '1';
      setTimeout(() => {
        this.domElements.desktopInstructions.style.opacity = '0';
      }, 4000);
    }

    this.stateMachine.transition(GAME_STATES.PLAYING);
    // Nháº¡c tiáº¿p tá»¥c phÃ¡t tá»« Menu vÃ o Gameplay (khÃ´ng restart)
    // Chá»‰ startBGM náº¿u chÆ°a phÃ¡t (VD: láº§n Ä‘áº§u hoáº·c sau khi bá»‹ táº¯t)
    if (!this.audioManager.isBgmPlaying) {
      this.audioManager.startBGM();
    } else {
      // Restore volume náº¿u Ä‘ang bá»‹ duck tá»« GAMEOVER
      this.audioManager.restoreVolume(300);
    }
    this.clock.getDelta(); // Reset clock
  }


  // =========================================================
  // FEVER MODE
  // =========================================================
  _activateFeverMode() {
    if (this.stateMachine.is(GAME_STATES.PLAYING)) {
      this.feverEnergy = 100;
      this.stateMachine.transition(GAME_STATES.FEVER);
      this.audioManager.playFeverActivate();
      this._createFeverParticles();
    }
  }

  _activateFeverVisuals() {
    if (!this.player) return;
    this.player.visualGroup.traverse(child => {
      if (child.isMesh && child.material) {
        if (!child.userData.originalColor) {
          child.userData.originalColor = child.material.color.clone();
        }
        child.material.color.setHex(0xffd600);
        if (child.material.emissive) {
          child.userData.originalEmissive = child.material.emissive.clone();
          child.userData.originalEmissiveIntensity = child.material.emissiveIntensity;
          child.material.emissive.setHex(0xffab00);
          child.material.emissiveIntensity = 0.6;
        }
      }
    });
  }

  _deactivateFeverMode() {
    this.isFeverActive = false;
    this.feverEnergy = 0;
    this._deactivateFeverVisuals();
    this._destroyFeverParticles();
    if (this.stateMachine.is(GAME_STATES.FEVER)) {
      this.stateMachine.transition(GAME_STATES.PLAYING);
      this.audioManager.startBGM();
    }
  }

  _deactivateFeverVisuals() {
    if (!this.player) return;
    this.player.restoreOriginalSkin();
  }

  // =========================================================
  // HIá»†U á»¨NG TÄ‚NG Tá»C Vá»†T GIÃ“ MÃ‰P MÃ€N HÃŒNH (PERIPHERAL SPEED STREAKS)
  // =========================================================
  _createFeverParticles() {
    // ÄÃ£ xÃ³a bá» cÃ¡c háº¡t cháº¥m liti theo yÃªu cáº§u ngÆ°á»i dÃ¹ng
  }

  _updateFeverParticles(deltaTime, playerPos) {
    // ÄÃ£ xÃ³a bá» cÃ¡c háº¡t cháº¥m liti theo yÃªu cáº§u ngÆ°á»i dÃ¹ng
  }

  _destroyFeverParticles() {
    // ÄÃ£ xÃ³a bá» cÃ¡c háº¡t cháº¥m liti
  }

  // =========================================================
  // SINH CHÆ¯á»šNG NGáº I Váº¬T
  // =========================================================
  _spawnRandomObstacle() {
    if (this.obstacleManager) {
      this.obstacleManager.spawnRandomObstacle(this.collectibles);
    }
  }

  // =========================================================
  // SINH Váº¬T PHáº¨M (CÃ€ PHÃŠ & POWER-UPS)
  // =========================================================
  _spawnCollectible() {
    const scene = this.sceneManager.scene;
    const laneIndex = Math.floor(Math.random() * 3);
    const spawnZ = -80 - Math.random() * 20;

    // Kiá»ƒm tra khoáº£ng cÃ¡ch an toÃ n vá»›i ChÆ°á»›ng ngáº¡i váº­t trong CÃ™NG lÃ n Ä‘Æ°á»ng!
    // Giá»¯ khoáº£ng cÃ¡ch tá»‘i thiá»ƒu 25m Ä‘á»ƒ ngÆ°á»i chÆ¡i Äƒn háº¿t dÃ£y cÃ  phÃª mÃ  khÃ´ng bá»‹ xe tÃ´ng giá»¯a chá»«ng
    if (this.obstacleManager && this.obstacleManager.obstacles.length > 0) {
      const nearbyObstacleInLane = this.obstacleManager.obstacles.filter(obs => {
        if (!obs || !obs.isAlive) return false;
        const obsLane = obs.laneIndex;
        const obsZ = obs.meshGroup ? obs.meshGroup.position.z : 0;
        const dz = Math.abs(obsZ - spawnZ);
        return obsLane === laneIndex && dz < 25;
      });
      if (nearbyObstacleInLane.length > 0) return;
    }

    // 25% cÆ¡ há»™i sinh Power-up
    const isPowerUp = Math.random() < 0.25;
    if (isPowerUp) {
      const pTypes = [POWERUP_TYPES.SHIELD, POWERUP_TYPES.DOUBLE_SCORE, POWERUP_TYPES.BOOST];
      const pType = pTypes[Math.floor(Math.random() * pTypes.length)];
      const col = new Collectible(scene, laneIndex, spawnZ, pType);
      col.isAlive = true;
      this.collectibles.push(col);
    } else {
      // Sinh dÃ£y 4 ly cÃ  phÃª ná»‘i tiáº¿p nhau (khoáº£ng cÃ¡ch 3.0m giá»¯a cÃ¡c ly)
      const groupCount = 4;
      for (let i = 0; i < groupCount; i++) {
        const col = new Collectible(scene, laneIndex, spawnZ - i * 3.0, 'COFFEE');
        col.isAlive = true;
        this.collectibles.push(col);
      }
    }
  }

  // =========================================================
  // THU THáº¬P CÃ€ PHÃŠ & POWER-UPS
  // =========================================================
  _onCoffeeCollected(count = 1) {
    const skinKey = this.skinKeys[this.selectedSkinIndex] || 'SHIPPER';
    const perk = CHARACTERS[skinKey] || CHARACTERS.SHIPPER;

    const coffeeBonus = perk.coffeeBonus || 1.0;
    const scoreMult = (this.doubleScoreTimer > 0 ? 2 : 1) * (perk.scoreMultBonus || 1.0);

    this.coffees += count;
    this.score += Math.floor(150 * count * coffeeBonus * scoreMult);
    this.audioManager.playCoffeeCollect();

    if (!this.isFeverActive) {
      const feverCharge = 10 * count * (perk.feverChargeBonus || 1.0);
      this.feverEnergy = Math.min(100, this.feverEnergy + feverCharge);
      if (this.feverEnergy >= 100) {
        this._activateFeverMode();
      }
    }

    this._updateHUDDisplay();
  }

  _onPowerUpCollected(type) {
    this.audioManager.playPowerUp();
    if (type === POWERUP_TYPES.SHIELD) {
      if (this.player) this.player.enableShield();
    } else if (type === POWERUP_TYPES.DOUBLE_SCORE) {
      this.doubleScoreTimer = POWERUP_CONFIG.DOUBLE_SCORE_DURATION;
    } else if (type === POWERUP_TYPES.BOOST) {
      this.boostTimer = POWERUP_CONFIG.BOOST_DURATION;
      this._activateFeverMode();
    } else if (type === POWERUP_TYPES.HIGH_JUMP) {
      this.highJumpTimer = POWERUP_CONFIG.HIGH_JUMP_DURATION;
      if (this.player) this.player.enableHighJump();
    }
    this._updateHUDDisplay();
  }

  _simulateCoffeeCollect() {
    this._onCoffeeCollected(1);
  }

  // =========================================================
  // GAME OVER
  // =========================================================
  _triggerGameOver() {
    if (this.stateMachine.is(GAME_STATES.GAMEOVER)) return;

    if (this.isFeverActive) {
      this.isFeverActive = false;
      this._deactivateFeverVisuals();
      this._destroyFeverParticles();
    }

    this.stateMachine.transition(GAME_STATES.GAMEOVER);
  }

  // =========================================================
  // HIá»‚N THá»Š UI
  // =========================================================
  _updateHUDDisplay() {
    if (this.domElements.hudScore) {
      this.domElements.hudScore.textContent = Math.floor(this.score).toLocaleString('vi-VN');
    }
    if (this.domElements.hudCoffeeCount) {
      this.domElements.hudCoffeeCount.textContent = this.coffees;
    }
    if (this.domElements.hudFeverPercent) {
      this.domElements.hudFeverPercent.textContent = `${Math.floor(this.feverEnergy)}%`;
    }
    if (this.domElements.feverBarFill) {
      this.domElements.feverBarFill.style.width = `${this.feverEnergy}%`;
    }

    // Hiá»ƒn thá»‹ Active Power-up Cards trÃªn HUD vá»›i thanh thá»i gian vÃ  chÃº thÃ­ch tÃ¡c dá»¥ng
    if (this.domElements.activePowerups) {
      let cardsHTML = '';

      // 1. GiÃ¡p NÃ³n LÃ¡
      if (this.player && this.player.hasShield) {
        cardsHTML += `
          <div class="powerup-card shield-card">
            <div class="powerup-header">
              <div class="powerup-title-group">
                <span class="powerup-icon">ðŸ›¡ï¸</span>
                <span class="powerup-title">GiÃ¡p NÃ³n LÃ¡</span>
              </div>
              <span class="powerup-timer-text">Báº£o Vá»‡</span>
            </div>
            <div class="powerup-progress-track">
              <div class="powerup-progress-fill shield-fill" style="width: 100%"></div>
            </div>
            <div class="powerup-effect-desc">Äá»¡ 1 va cháº¡m chÆ°á»›ng ngáº¡i váº­t mÃ  khÃ´ng bá»‹ Game Over</div>
          </div>
        `;
      }

      // 2. BÃ¡nh MÃ¬ X2 Score
      if (this.doubleScoreTimer > 0) {
        const pct = ((this.doubleScoreTimer / POWERUP_CONFIG.DOUBLE_SCORE_DURATION) * 100).toFixed(1);
        const secs = (this.doubleScoreTimer / 1000).toFixed(1);
        cardsHTML += `
          <div class="powerup-card double-card">
            <div class="powerup-header">
              <div class="powerup-title-group">
                <span class="powerup-icon">ðŸ¥–</span>
                <span class="powerup-title">NhÃ¢n ÄÃ´i BÃ¡nh MÃ¬</span>
              </div>
              <span class="powerup-timer-text">${secs}s</span>
            </div>
            <div class="powerup-progress-track">
              <div class="powerup-progress-fill double-fill" style="width: ${pct}%"></div>
            </div>
            <div class="powerup-effect-desc">NhÃ¢n 2 toÃ n bá»™ Ä‘iá»ƒm sá»‘ quÃ£ng Ä‘Æ°á»ng & cÃ  phÃª thu tháº­p</div>
          </div>
        `;
      }

      // 3. Xe Ã”m Boost SiÃªu Tá»‘c
      if (this.boostTimer > 0) {
        const pct = ((this.boostTimer / POWERUP_CONFIG.BOOST_DURATION) * 100).toFixed(1);
        const secs = (this.boostTimer / 1000).toFixed(1);
        cardsHTML += `
          <div class="powerup-card boost-card">
            <div class="powerup-header">
              <div class="powerup-title-group">
                <span class="powerup-icon">ðŸ›µ</span>
                <span class="powerup-title">Xe Ã”m Boost</span>
              </div>
              <span class="powerup-timer-text">${secs}s</span>
            </div>
            <div class="powerup-progress-track">
              <div class="powerup-progress-fill boost-fill" style="width: ${pct}%"></div>
            </div>
            <div class="powerup-effect-desc">Báº¥t tá»­ Ä‘Ã¢m vÄƒng váº­t cáº£n & tá»± Ä‘á»™ng hÃºt toÃ n bá»™ cÃ  phÃª</div>
          </div>
        `;
      }

      // 4. GiÃ y Nháº£y Cao Pháº£n Lá»±c Neon
      if (this.highJumpTimer > 0) {
        const pct = ((this.highJumpTimer / POWERUP_CONFIG.HIGH_JUMP_DURATION) * 100).toFixed(1);
        const secs = (this.highJumpTimer / 1000).toFixed(1);
        cardsHTML += `
          <div class="powerup-card boost-card" style="border-color: #00e5ff">
            <div class="powerup-header">
              <div class="powerup-title-group">
                <span class="powerup-icon">ðŸ‘Ÿ</span>
                <span class="powerup-title">GiÃ y Nháº£y Cao</span>
              </div>
              <span class="powerup-timer-text">${secs}s</span>
            </div>
            <div class="powerup-progress-track">
              <div class="powerup-progress-fill" style="width: ${pct}%; background: linear-gradient(90deg, #00b0ff, #00e5ff)"></div>
            </div>
            <div class="powerup-effect-desc">TÄƒng siÃªu lá»±c nháº£y - Nháº£y qua Ä‘áº§u xe bus HÃ  Ná»™i 3.4m dá»… dÃ ng</div>
          </div>
        `;
      }

      this.domElements.activePowerups.innerHTML = cardsHTML;
    }
  }

  _updateHighScoreDisplay() {
    const highScore = localStorage.getItem('saigon_high_score') || '0';
    if (this.domElements.menuHighScore) {
      this.domElements.menuHighScore.textContent = parseInt(highScore).toLocaleString('vi-VN');
    }
  }

  _updateGameOverDisplay() {
    const highScore = localStorage.getItem('saigon_high_score') || '0';
    if (this.domElements.overScore) {
      this.domElements.overScore.textContent = `${Math.floor(this.score)} m`;
    }
    if (this.domElements.overCoffee) {
      this.domElements.overCoffee.textContent = `${this.coffees} ly`;
    }
    if (this.domElements.overHighScore) {
      this.domElements.overHighScore.textContent = parseInt(highScore).toLocaleString('vi-VN');
    }
  }

  // =========================================================
  // VÃ’NG Láº¶P GAME
  // =========================================================
  _animate() {
    requestAnimationFrame(this._animate.bind(this));
    try {
      const deltaTime = Math.min(this.clock.getDelta(), 0.05); // Cap delta á»Ÿ 50ms
      this._update(deltaTime);
      this._render();
    } catch (err) {
      console.error('âš ï¸ [Game Loop Error]:', err);
    }
  }

  _update(deltaTime) {
    if (this.stateMachine.is(GAME_STATES.VIEWER)) {
      if (this.characterViewerManager) {
        this.characterViewerManager.update();
      }
      return;
    }

    this.sceneManager.update(deltaTime);

    // Cáº­p nháº­t phá»‘ xÃ¡ 3D cuá»™n nháº¹ (4m/s) & hiá»ƒn thá»‹ cÃ¢y cá»‘i rá»£p bÃ³ng trong mÃ n hÃ¬nh MENU / LOADING
    if (this.stateMachine.is(GAME_STATES.MENU, GAME_STATES.LOADING)) {
      if (this.environment) {
        this.environment.update(deltaTime, 4.0);
      }
      if (this.player) {
        this.player.update(deltaTime);
      }
      return;
    }

    // Khi GAMEOVER: Dá»«ng hoÃ n toÃ n cuá»™n mÃ n hÃ¬nh (tá»‘c Ä‘á»™ = 0), giá»¯ nguyÃªn vá»‹ trÃ­ va cháº¡m va Ä‘Ã¢m!
    if (this.stateMachine.is(GAME_STATES.GAMEOVER)) {
      if (this.environment) {
        this.environment.update(0, 0);
      }
      if (this.player) {
        this.player.update(0);
      }
      return;
    }

    if (!this.stateMachine.is(GAME_STATES.PLAYING, GAME_STATES.FEVER)) return;

    const isPlaying = this.stateMachine.is(GAME_STATES.PLAYING, GAME_STATES.FEVER);
    if (!isPlaying) return;

    // --- 0. Cáº­p nháº­t Timers cá»§a Power-ups ---
    if (this.doubleScoreTimer > 0) {
      this.doubleScoreTimer = Math.max(0, this.doubleScoreTimer - deltaTime * 1000);
    }
    if (this.boostTimer > 0) {
      this.boostTimer = Math.max(0, this.boostTimer - deltaTime * 1000);
      if (this.boostTimer <= 0 && !this.isFeverActive) {
        this._deactivateFeverVisuals();
        this._destroyFeverParticles();
      }
    }
    if (this.highJumpTimer > 0) {
      this.highJumpTimer = Math.max(0, this.highJumpTimer - deltaTime * 1000);
      if (this.highJumpTimer <= 0 && this.player) {
        this.player.disableHighJump();
      }
    }

    // --- 1. TÃ­nh tá»‘c Ä‘á»™ game ---
    const speedTier = Math.floor(this.coffees / GAME_CONFIG.COFFEES_PER_TIER);
    let targetSpeed = GAME_CONFIG.BASE_SPEED + speedTier * GAME_CONFIG.SPEED_INCREMENT;
    targetSpeed = Math.min(targetSpeed, GAME_CONFIG.MAX_SPEED);
    if (this.isFeverActive || this.boostTimer > 0) {
      targetSpeed *= GAME_CONFIG.FEVER_SPEED_MULTIPLIER;
    }
    this.currentSpeed = THREE.MathUtils.lerp(this.currentSpeed, targetSpeed, deltaTime * 2);

    // --- 2. TÃ­nh Ä‘iá»ƒm ---
    const skinKey = this.skinKeys[this.selectedSkinIndex] || 'SHIPPER';
    const perk = CHARACTERS[skinKey] || CHARACTERS.SHIPPER;
    const scoreMult = (this.doubleScoreTimer > 0 ? 2 : 1) * (perk.scoreMultBonus || 1.0);

    const scoreGain = (this.isFeverActive || this.boostTimer > 0 ? 40 : 15) * deltaTime * scoreMult;
    this.score += scoreGain;
    this._updateHUDDisplay();

    // --- 3. Xá»­ lÃ½ FOV camera, Motion Blur, Camera Shake & Audio Shift khi TÄƒng tá»‘c ---
    const speedBlurElem = document.getElementById('speed-motion-blur');
    const isBoosting = this.isFeverActive || this.boostTimer > 0;

    if (isBoosting) {
      // 3a. Má»Ÿ rá»™ng gÃ³c nhÃ¬n FOV kÃ©o giÃ£n cáº£nh váº­t 2 bÃªn (60Â° -> 82Â°)
      this.sceneManager.camera.fov = THREE.MathUtils.lerp(
        this.sceneManager.camera.fov,
        82,
        deltaTime * GAME_CONFIG.CAMERA_LERP_SPEED * 1.5
      );
      this.sceneManager.camera.updateProjectionMatrix();

      // 3b. Hiá»‡u á»©ng Motion Blur má» chuyá»ƒn Ä‘á»™ng viá»n mÃ n hÃ¬nh
      if (speedBlurElem && !speedBlurElem.classList.contains('active')) {
        speedBlurElem.classList.add('active');
      }

      // 3c. Hiá»‡u á»©ng Rung láº¯c Camera (Camera Shake) mÃ´ phá»ng Ä‘á»™ng cÆ¡ gáº§m rÃº á»Ÿ tá»‘c Ä‘á»™ tá»‘i Ä‘a
      const shakeIntensity = 0.045;
      this.sceneManager.camera.position.x += (Math.random() - 0.5) * shakeIntensity;
      this.sceneManager.camera.position.y += (Math.random() - 0.5) * shakeIntensity;

      // 3e. Äáº©y Ã¢m thanh BGM / Äá»™ng cÆ¡ lÃªn cao Ä‘á»™ (Audio Shift & Pitch)
      if (this.audioManager.bgm) {
        this.audioManager.bgm.playbackRate = 1.28;
      }

      if (this.isFeverActive) {
        this.feverTimer -= deltaTime * 1000;
        this.feverEnergy = Math.max(0, (this.feverTimer / GAME_CONFIG.FEVER_DURATION) * 100);
      }

      if (this.isFeverActive && this.feverTimer <= 0 && this.boostTimer <= 0) {
        this._deactivateFeverMode();
      }
    } else {
      this.sceneManager.camera.fov = THREE.MathUtils.lerp(
        this.sceneManager.camera.fov,
        GAME_CONFIG.CAMERA_FOV,
        deltaTime * GAME_CONFIG.CAMERA_LERP_SPEED
      );
      this.sceneManager.camera.updateProjectionMatrix();
    }

    // --- 4. Cáº­p nháº­t nhÃ¢n váº­t ---
    if (this.player) {
      this.player.update(deltaTime, this.currentSpeed);
    }

    // --- 5. Cáº­p nháº­t mÃ´i trÆ°á»ng ---
    if (this.environment) {
      this.environment.update(deltaTime, this.currentSpeed);
    }

    // --- 6. Sinh chÆ°á»›ng ngáº¡i váº­t ---
    this.obstacleSpawnTimer -= deltaTime;
    if (this.obstacleSpawnTimer <= 0) {
      this._spawnRandomObstacle();
      const spawnDelay = 2.2 - Math.min(1.2, (this.currentSpeed - GAME_CONFIG.BASE_SPEED) / 15);
      this.obstacleSpawnTimer = spawnDelay + Math.random() * 0.8;
    }

    // --- 7. Sinh ly cÃ  phÃª / Power-ups dáº§y Ä‘áº·c ---
    this.collectibleSpawnTimer -= deltaTime;
    if (this.collectibleSpawnTimer <= 0) {
      this._spawnCollectible();
      this.collectibleSpawnTimer = 1.0 + Math.random() * 0.8;
    }

    const playerPos = this.player ? this.player.meshGroup.position : null;

    // --- 8. Cáº­p nháº­t Obstacles & Kiá»ƒm tra Va cháº¡m NÃ¢ng cao & Platforming cháº¡y trÃªn nÃ³c xe ---
    if (this.obstacleManager) {
      this.obstacleManager.update(deltaTime, this.currentSpeed);
      this.obstacleManager.checkCollisionAndPlatforming(
        this.player,
        this.isFeverActive || this.boostTimer > 0,
        scoreMult,
        this.audioManager,
        {
          onSmash: (obs) => {
            this.score += 300 * scoreMult;
          },
          onGameOver: (obs) => {
            this._triggerGameOver();
          }
        }
      );
    }

    // --- 9. Cáº­p nháº­t Collectibles ---
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const col = this.collectibles[i];
      col.update(deltaTime, this.currentSpeed, playerPos, this.isFeverActive || this.boostTimer > 0);

      // Kiá»ƒm tra thu tháº­p
      if (playerPos && col.checkCollection(playerPos)) {
        const pType = col.type;
        col.collect();
        this.collectibles.splice(i, 1);

        if (pType === 'COFFEE' || !pType) {
          this._onCoffeeCollected(1);
        } else {
          this._onPowerUpCollected(pType);
        }
        continue;
      }

      // Dá»n dáº¹p item Ä‘Ã£ qua camera
      if (col.meshGroup.position.z > 15) {
        col.dispose();
        this.collectibles.splice(i, 1);
      }
    }

    // --- 10. Cáº­p nháº­t hiá»‡u á»©ng Vá»‡t Lá»­a á»ng Xáº£ Xe ExhaustFlameBoostEffect ---
    if (this.exhaustFlameEffect) {
      this.exhaustFlameEffect.triggerSpeedBoost(isBoosting);
      this.exhaustFlameEffect.update(deltaTime, playerPos);
    }
  }

  _render() {
    if (this.stateMachine.is(GAME_STATES.VIEWER)) {
      if (this.characterViewerManager) {
        this.characterViewerManager.render();
      }
      return;
    }
    this.sceneManager.render();
  }
}
