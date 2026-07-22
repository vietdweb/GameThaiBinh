import * as THREE from 'three';
import { ShopManager } from '../managers/ShopManager.js';
import { Shop3DScene } from './Shop3DScene.js';
import { City3DScene } from './City3DScene.js';
import { CityManager } from '../managers/CityManager.js';
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
    // 1. Đọc trạng thái debug từ query string
    const urlParams = new URLSearchParams(window.location.search);
    const debugMode = urlParams.get('debug') === 'true';

    // 2. BẮT BUỘC khởi tạo SceneManager & các Manager hệ thống TRƯỚC!
    this.sceneManager = new SceneManager('game-canvas', debugMode);
    this.matchHistoryManager = new MatchHistoryManager();
    this.currencyManager = new CurrencyManager();

    // 3. Sau khi đã có sceneManager & currencyManager -> Mới khởi tạo Cửa Hàng 3D
    this.shopManager = new ShopManager(this.currencyManager);
    this.shop3DScene = new Shop3DScene(this.sceneManager.renderer, this);

    // 4. Hệ thống State Machine, Va chạm & Âm thanh
    this.stateMachine = new StateMachine();
    this.collisionManager = new CollisionManager();
    this.audioManager = new AudioManager();

    // 5. Trạng thái chọn nhân vật
    this.skinKeys = Object.keys(CHARACTERS);
    const savedSkin = localStorage.getItem('saigon_selected_skin');
    this.selectedSkinIndex = savedSkin ? Math.max(0, this.skinKeys.indexOf(savedSkin.toUpperCase())) : 1;
    if (this.selectedSkinIndex === -1) this.selectedSkinIndex = 1;

    // 6. Trạng thái chơi game
    this.score = 0;
    this.coffees = 0;
    this.feverEnergy = 0;
    this.isFeverActive = false;
    this.feverTimer = 0;
    this.gameTimer = 0;
    this.currentSpeed = GAME_CONFIG.BASE_SPEED;

    // 7. Quản lý Timers của Power-ups
    this.doubleScoreTimer = 0;
    this.boostTimer = 0;
    this.highJumpTimer = 0;

    // 8. Quản lý các thực thể game
    this.player = null;
    this.environment = null;
    this.obstacleManager = null;
    this.collectibles = [];
    this.obstacleSpawnTimer = 0;
    this.collectibleSpawnTimer = 0;

    // Override model cho viewer
    this.pendingViewerOverride = null;

    // Hiệu ứng hạt Fever
    this.feverParticles = null;
    this.feverParticleTime = 0;

    // Quản lý thời gian vòng lặp
    this.clock = new THREE.Clock();

    // Liên kết giao diện UI
    this.domScreens = {
      loading: document.getElementById('loading-screen'),
      menu: document.getElementById('main-menu'),
      viewer: document.getElementById('character-viewer-panel'),
      hud: document.getElementById('hud'),
      gameOver: document.getElementById('game-over-screen')
    };

    // Hệ thống Quản lý Lịch Sử Đấu & Tài Nguyên
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

    // Khởi tạo Quản lý Phòng Xem 360°
    this.characterViewerManager = new CharacterViewerManager(this.sceneManager.renderer, this);

    this.init();
  }

  init() {
    // 1. Thiết lập State Machine callbacks
    this._setupStateMachine();

    // 2. Khởi tạo ShopManager & Shop3DScene TRƯỚC khi gắn sự kiện UI
    this.shopManager = new ShopManager(this.currencyManager);
    this.shop3DScene = new Shop3DScene(this.sceneManager.renderer, this);
    this.city3DScene = new City3DScene(this.sceneManager.renderer, this);
    this.cityManager = new CityManager(this, this.city3DScene);

    // 3. Gắn sự kiện các nút bấm UI & Cửa hàng
    this._setupUIEvents();
    this._setupShopEvents();

    // 4. Gắn Carousel chọn nhân vật
    this._setupCharacterCarousel();

    // 5. Gắn điều khiển bàn phím
    this._setupKeyboardControls();

    // 6. Gắn điều khiển vuốt cảm ứng (Swipe)
    this._setupSwipeControls();

    // 7. Khởi tạo Audio Control Panel
    this._setupAudioControlPanel();

    // Resize listener cho phòng xem 360°
    window.addEventListener('resize', () => {
      if (this.characterViewerManager) {
        this.characterViewerManager.onWindowResize(window.innerWidth, window.innerHeight);
      }
    });

    // 8. Chạy quá trình tải (Loading)
    this._runSimulatedLoading();

    // 9. Bắt đầu vòng lặp render
    this._animate();
  }

  // =========================================================
  // THIẾT LẬP STATE MACHINE
  // =========================================================
  _setupStateMachine() {
    const sm = this.stateMachine;

    // Khi vào MENU
    sm.onEnter(GAME_STATES.MENU, () => {
      this._showScreen('menu');
      this._updateHighScoreDisplay();
      // Khôi phục volume từ ducking (khi từ GAMEOVER về MENU)
      this.audioManager.restoreVolume(600);
      // Nếu BGM chưa phát, bắt đầu phát track đang chọn
      if (!this.audioManager.isBgmPlaying) {
        this.audioManager.startBGM();
      }
      if (this.characterViewerManager) {
        this.characterViewerManager.closeViewer();
      }
      // Hiện panel audio khi vào menu
      this._setAudioPanelVisible(true);
    });

    // Khi vào VIEWER (Phòng xem 360°)
    sm.onEnter(GAME_STATES.VIEWER, () => {
      this._showScreen('viewer');
      // Ẩn panel audio khi ở phòng xem 360° (chỉ hiện ở Menu chính)
      this._setAudioPanelVisible(false);
      // Ưu tiên override nếu có (VD: Lamborghini viewer)
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

    // Khi vào PLAYING
    sm.onEnter(GAME_STATES.PLAYING, () => {
      this._showScreen('hud');
      if (this.characterViewerManager) {
        this.characterViewerManager.closeViewer();
      }
      if (this.isFeverActive) {
        // Thoát Fever Mode nhưng vẫn PLAYING
        this._deactivateFeverVisuals();
        this.isFeverActive = false;
        this.audioManager.startBGM();
      }
      // Khôi phục volume nếu đang bị duck (từ GAMEOVER → PLAYING restart)
      this.audioManager.restoreVolume(400);
      // Ẩn panel audio khi đang chơi
      this._setAudioPanelVisible(false);
    });

    // Khi vào FEVER
    sm.onEnter(GAME_STATES.FEVER, () => {
      this._showScreen('hud');
      this._activateFeverVisuals();
      this.isFeverActive = true;
      this.feverTimer = GAME_CONFIG.FEVER_DURATION;
      this.audioManager?.startFeverBGM?.();
      this._setAudioPanelVisible(false);
    });

    // Khi vào GAMEOVER
    sm.onEnter(GAME_STATES.GAMEOVER, () => {
      this._showScreen('gameOver');
      this._updateGameOverDisplay();
      // Duck volume thay vì stopBGM - nhạc vẫn phát nhẹ ở nền
      this.audioManager.duckVolume(0.12, 1200);
      this.audioManager.playGameOver();
      this._destroyFeverParticles();
      // Ẩn panel audio khi game over
      this._setAudioPanelVisible(false);

      // Lưu high score
      const highScore = parseInt(localStorage.getItem('saigon_high_score') || '0');
      if (this.score > highScore) {
        localStorage.setItem('saigon_high_score', this.score.toString());
      }

      // Tự động lưu trận đấu mới vào Lịch Sử Đấu (Fix lấy chuẩn tên nhân vật & số giây)
      const skinKey = this.skinKeys[this.selectedSkinIndex] || 'SHIPPER';
      const charConfig = CHARACTERS[skinKey] || { name: 'Nam Suối', id: 'shipper' };

      this.matchHistoryManager.saveMatch({
        score: this.score,
        coins: this.coffees || 0,
        characterId: charConfig.id || 'shipper',
        characterName: charConfig.name,
        survivalSeconds: this.gameTimer || 0
      });

      // Cộng Xu tích lũy trong trận vào tài khoản tổng
      if (this.coffees && this.coffees > 0) {
        this.currencyManager.addCoins(this.coffees);
      }
    });

    // Buộc trạng thái ban đầu thành LOADING
    sm.forceState(GAME_STATES.LOADING);
    this._showScreen('loading');
    this._setAudioPanelVisible(false);
  }

  // =========================================================
  // THIẾT LẬP UI EVENTS
  // =========================================================
  _setupUIEvents() {
    this.domElements.btnStart.addEventListener('click', () => {
      this.audioManager._ensureContext(); // Unlock AudioContext sau user gesture
      this.startGame();
    });

    if (this.domElements.btnView360) {
      this.domElements.btnView360.addEventListener('click', () => {
        this.audioManager._ensureContext();
        this.stateMachine.transition(GAME_STATES.VIEWER);
      });
    }

    if (this.domElements.btnViewLamborghini) {
      this.domElements.btnViewLamborghini.addEventListener('click', () => {
        this.audioManager._ensureContext();
        // Đặt override model Lamborghini trước khi chuyển state
        this.pendingViewerOverride = {
          id: 'lamborghini',
          name: '🏎️ Lamborghini',
          desc: 'Siêu xe thể thao đỉnh cao | Kéo chuột / Vuốt để xoay 360°'
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
        const isAutoOn = this.characterViewerManager.toggleAutoRotate();
        this.domElements.btnToggleAutoRotate.textContent = isAutoOn
          ? '🔄 Tự Động Xoay: Bật'
          : '🔄 Tự Động Xoay: Tắt';
      });
    }

    if (this.domElements.btnResetViewerCam) {
      this.domElements.btnResetViewerCam.addEventListener('click', () => {
        this.characterViewerManager.resetCamera();
      });
    }

    this.domElements.btnRestart.addEventListener('click', () => {
      this.startGame();
    });

    this.domElements.btnHome.addEventListener('click', () => {
      this.stateMachine.transition(GAME_STATES.MENU);
    });
  }

  /* 🛒 QUẢN LÝ CHUYỂN CẢNH MAP SHOWROOM 3D */
  _setupShopEvents() {
    const mainMenuPanel = document.querySelector('.main-menu-panel') || document.getElementById('main-menu');
    const btnExit3D = document.getElementById('btn-exit-shop-3d');

    document.addEventListener('click', (e) => {
      // 1. Click nút "CỬA HÀNG" ở Menu chính -> Sang Map 3D
      const btnOpen = e.target.closest('#btn-open-shop');
      if (btnOpen) {
        e.stopPropagation();
        this.audioManager?._ensureContext?.();

        if (mainMenuPanel) mainMenuPanel.style.display = 'none';
        if (btnExit3D) btnExit3D.classList.remove('hidden');

        // Ẩn Top Currency Bar & Audio Panel khi vào Showroom 3D theo đúng UI HUD Rules
        this._setAudioPanelVisible(false);

        if (this.shop3DScene) {
          this.shop3DScene.openShowroom();
        }
      }

      // 2. Click nút "THOÁT CỬA HÀNG" -> Quay lại Menu chính
      const btnExit = e.target.closest('#btn-exit-shop-3d');
      if (btnExit) {
        if (this.shop3DScene) {
          this.shop3DScene.closeShowroom();
        }

        if (btnExit3D) btnExit3D.classList.add('hidden');
        if (mainMenuPanel) mainMenuPanel.style.display = 'flex';

        // Hiển thị lại Top Currency Bar & Audio Panel ở Menu chính
        this._setAudioPanelVisible(true);
      }
    });
  }

  /* AUDIO CONTROL PANEL - Setup đầy đủ */
  _setupAudioControlPanel() {
    const am = this.audioManager;
    const dom = this.domElements;

    // Đồng bộ UI với settings đã load từ localStorage
    this._syncAudioPanelUI();

    // --- 1. Mute Toggle ---
    if (dom.btnAudioMute) {
      dom.btnAudioMute.addEventListener('click', () => {
        am._ensureContext();
        const isMuted = !am.enabled; // hiện tại
        const nowEnabled = am.setMuted(!isMuted); // flip
        this._syncAudioPanelUI();
        // Feedback nhẹ
        dom.btnAudioMute.style.transform = 'scale(0.88)';
        setTimeout(() => { dom.btnAudioMute.style.transform = ''; }, 150);
      });
    }

    // --- 2. Volume Slider - Real-time (hover tren mute btn) ---
    if (dom.volumeSlider) {
      dom.volumeSlider.addEventListener('input', () => {
        am._ensureContext();
        const val = parseInt(dom.volumeSlider.value);
        am.setMasterVolume(val / 100);
        if (dom.volumeFillBar) dom.volumeFillBar.style.width = `${val}%`;
        if (dom.volumeLabel) dom.volumeLabel.textContent = `${val}%`;
      });

      // Giữ slider mở mượt mà khi đang kéo chuột điều chỉnh âm lượng
      dom.volumeSlider.addEventListener('pointerdown', () => {
        dom.volumeSliderWrap?.classList.add('active-sliding');
      });
      window.addEventListener('pointerup', () => {
        dom.volumeSliderWrap?.classList.remove('active-sliding');
      });
    }

    // --- 4. Jukebox Toggle ---
    if (dom.btnJukebox) {
      dom.btnJukebox.addEventListener('click', (e) => {
        e.stopPropagation();
        am._ensureContext();
        const isOpen = dom.jukeboxModal && dom.jukeboxModal.classList.contains('open');
        this._setJukeboxOpen(!isOpen);
      });
    }

    // Đóng Jukebox khi click backdrop hoặc nút X
    if (dom.btnCloseJukebox) {
      dom.btnCloseJukebox.addEventListener('click', () => this._setJukeboxOpen(false));
    }
    if (dom.jukeboxModal) {
      dom.jukeboxModal.querySelector('.jukebox-backdrop')?.addEventListener('click', () => {
        this._setJukeboxOpen(false);
      });
    }

    // --- 6. Match History Toggle & Clear ---
    const btnHistoryEl = this.domElements.btnHistory || document.getElementById('btn-history');
    if (btnHistoryEl) {
      btnHistoryEl.addEventListener('click', (e) => {
        e.stopPropagation();
        am._ensureContext();
        const modal = this.domElements.historyModal || document.getElementById('history-modal');
        const isOpen = modal && modal.classList.contains('open');
        this._setHistoryOpen(!isOpen);
      });
    }

    // Event Delegation fallback cho nút Lịch sử
    document.addEventListener('click', (e) => {
      const historyBtn = e.target.closest('#btn-history, .history-btn');
      if (historyBtn) {
        e.stopPropagation();
        am._ensureContext();
        const modal = this.domElements.historyModal || document.getElementById('history-modal');
        const isOpen = modal && modal.classList.contains('open');
        this._setHistoryOpen(!isOpen);
      }
    });

    const btnCloseHistoryEl = this.domElements.btnCloseHistory || document.getElementById('btn-close-history');
    if (btnCloseHistoryEl) {
      btnCloseHistoryEl.addEventListener('click', () => this._setHistoryOpen(false));
    }
    const historyModalEl = this.domElements.historyModal || document.getElementById('history-modal');
    if (historyModalEl) {
      historyModalEl.querySelector('.history-backdrop')?.addEventListener('click', () => {
        this._setHistoryOpen(false);
      });
    }

    // Nút Xóa Lịch Sử - Sử dụng Game Box Confirm tùy chỉnh
    const btnClearHistoryEl = this.domElements.btnClearHistory || document.getElementById('btn-clear-history');
    if (btnClearHistoryEl) {
      btnClearHistoryEl.addEventListener('click', async () => {
        const confirmed = await this._showCustomConfirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử thi đấu không?');
        if (confirmed) {
          this.matchHistoryManager.clearHistory();
          this._renderHistoryModal();
        }
      });
    }

    // --- 7. Currency Top Bar Quick Buy Buttons & Meat Alert Modal ---
    if (dom.btnAddMeat) {
      dom.btnAddMeat.addEventListener('click', () => {
        this.currencyManager.addMeat(100);
        this._showStreamToast('🍖 Đã nhận +100 Thịt Thể Lực!');
      });
    }
    if (dom.btnAddCoins) {
      dom.btnAddCoins.addEventListener('click', () => {
        this.currencyManager.addCoins(500);
        this._showStreamToast('🪙 Đã nhận +500 Xu Vàng!');
      });
    }
    if (dom.btnAddGems) {
      dom.btnAddGems.addEventListener('click', () => {
        this.currencyManager.addGems(50);
        this._showStreamToast('💎 Đã nhận +50 Kim Cương!');
      });
    }
    if (dom.btnQuickFillMeat) {
      dom.btnQuickFillMeat.addEventListener('click', () => {
        this.currencyManager.addMeat(100);
        this._setMeatAlertOpen(false);
        this._showStreamToast('🍖 Đã nạp thành công +100 Thịt! Có thể chơi ngay.');
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

    // --- 5. Track Items Click - Phân biệt STREAMING vs PROCEDURAL ---
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
          // Dừng streaming cũ nếu đang phát track khác
          if (am.isStreaming && am.currentStreamId !== trackId) {
            am.stopStreamingAudio(300);
          }
          // Callback cập nhật UI trạng thái streaming
          const onStatus = (status) => {
            this._setStreamingLoadingUI(trackId, status);
            if (status === 'fallback') {
              this._showStreamToast('⚠️ Đang chuyển về nhạc mặc định...');
              // Reset về procedural track
              this._updateJukeboxActiveTrack(am.currentTrackId, null);
            }
          };
          am.playStreamingTrack(trackId, onStatus);
          this._updateJukeboxActiveTrack(null, trackId);
        } else {
          // === PROCEDURAL TRACK ===
          // Dừng streaming nếu đang phát
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

    // Khôi phục streaming track từ localStorage (nếu có)
    if (am._pendingRestoreStreamId) {
      const restoreId = am._pendingRestoreStreamId;
      am._pendingRestoreStreamId = null;
      // Phát lại sau 1 giây (đợi user interaction)
      // Chỉ restore sau khi user đã click vào game lần đầu
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

  /* Helper hiển thị Custom Game Confirm Modal */
  _showCustomConfirm(message) {
    return new Promise((resolve) => {
      const modal = document.getElementById('confirm-modal');
      const msgElem = modal?.querySelector('.confirm-modal-message');
      const btnAccept = document.getElementById('btn-accept-clear');
      const btnCancel = document.getElementById('btn-cancel-clear');

      if (!modal || !btnAccept || !btnCancel) {
        resolve(confirm(message));
        return;
      }

      if (message && msgElem) msgElem.textContent = message;

      modal.classList.remove('hidden');

      const handleAccept = () => {
        cleanup();
        resolve(true);
      };

      const handleCancel = () => {
        cleanup();
        resolve(false);
      };

      const cleanup = () => {
        modal.classList.add('hidden');
        btnAccept.removeEventListener('click', handleAccept);
        btnCancel.removeEventListener('click', handleCancel);
      };

      btnAccept.addEventListener('click', handleAccept);
      btnCancel.addEventListener('click', handleCancel);
    });
  }

  /**
   * Đồng bộ toàn bộ Audio Panel UI với trạng thái AudioManager
   */
  _syncAudioPanelUI() {
    const am = this.audioManager;
    const dom = this.domElements;

    if (!am) return;

    // Mute button state
    if (dom.btnAudioMute) {
      dom.btnAudioMute.classList.toggle('muted', !am.enabled);
    }
    if (dom.iconSoundOn) dom.iconSoundOn.classList.toggle('hidden', !am.enabled);
    if (dom.iconSoundOff) dom.iconSoundOff.classList.toggle('hidden', am.enabled);

    // Volume slider
    const volPct = Math.round(am.masterVolume * 100);
    if (dom.volumeSlider) dom.volumeSlider.value = String(volPct);
    if (dom.volumeFillBar) dom.volumeFillBar.style.width = `${volPct}%`;
    if (dom.volumeLabel) dom.volumeLabel.textContent = `${volPct}%`;

    // Highlight active track in Jukebox
    const activeId = am.currentTrackId || am.currentStreamId || 'co_chac_yeu_la_day';
    this._updateJukeboxActiveTrack(null, activeId);
  }

  /**
   * Cập nhật track active trong Jukebox
   */
  _updateJukeboxActiveTrack(proceduralId, streamId) {
    const am = this.audioManager;
    const dom = this.domElements;

    // Xóa active khỏi tất cả items
    document.querySelectorAll('.track-item').forEach(el => {
      el.classList.remove('active', 'loading', 'error');
    });

    const activeId = streamId || proceduralId || 'co_chac_yeu_la_day';
    const el = document.getElementById(`track-item-${activeId}`);
    if (el) el.classList.add('active');

    const track = am.streamingPlaylist?.find(t => t.id === activeId);
    if (track && dom.nowPlayingLabel) {
      dom.nowPlayingLabel.textContent = `▶ ${track.title}`;
    }
  }

  /**
   * Cập nhật UI loading/playing/error cho streaming track
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
      // Đã phát - active state đã được set
    } else if (status === 'error' || status === 'fallback') {
      item.classList.add('error');
      item.classList.remove('active');
    }
  }

  /**
   * Hiện toast notification
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
   * Mở / đóng Jukebox Modal
   */
  _setJukeboxOpen(open) {
    const dom = this.domElements;
    if (!dom.jukeboxModal) return;
    if (open) this._setHistoryOpen(false); // Đóng history nếu mở jukebox
    dom.jukeboxModal.classList.toggle('open', open);
    dom.jukeboxModal.setAttribute('aria-hidden', String(!open));
  }

  /**
   * Mở / đóng Match History Modal
   */
  _setHistoryOpen(open) {
    const modal = this.domElements.historyModal || document.getElementById('history-modal');
    if (!modal) return;
    if (open) {
      this._setJukeboxOpen(false); // Đóng jukebox nếu đang mở
      this._renderHistoryModal();
    }
    modal.classList.toggle('open', open);
    modal.setAttribute('aria-hidden', String(!open));
  }

  /**
   * Vẽ dữ liệu cho Modal Lịch Sử Thi Đấu
   */
  _renderHistoryModal() {
    const dom = this.domElements;
    const best = this.matchHistoryManager.getPersonalBest();

    // 1. Cập nhật Thẻ Kỷ Lục Cao Nhất
    if (best) {
      if (dom.pbScoreValue) dom.pbScoreValue.textContent = best.score.toLocaleString('vi-VN');
      if (dom.pbCoinsValue) dom.pbCoinsValue.textContent = `${best.coins} Xu`;
      if (dom.pbTimeValue) dom.pbTimeValue.textContent = best.formattedTime;
    } else {
      if (dom.pbScoreValue) dom.pbScoreValue.textContent = '0';
      if (dom.pbCoinsValue) dom.pbCoinsValue.textContent = '0 Xu';
      if (dom.pbTimeValue) dom.pbTimeValue.textContent = '00:00';
    }

    // 2. Vẽ Biểu đồ Chart.js Tiến trình điểm số
    this._renderHistoryChart();

    // 3. Render Danh sách Thẻ Trận Đấu
    const history = this.matchHistoryManager.getHistory();
    if (!dom.historyTrackList) return;

    if (history.length === 0) {
      dom.historyTrackList.innerHTML = `
        <div class="history-empty-state">
          <i data-lucide="inbox" class="empty-icon"></i>
          <span>Chưa có dữ liệu lịch sử thi đấu nào.</span>
        </div>
      `;
    } else {
      dom.historyTrackList.innerHTML = history.map(item => {
        const avatar = item.characterId === 'lambo' ? '🏎️' : '🏃';
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
                <span>🪙 ${item.coins} xu</span>
                <span>⏱️ ${item.formattedTime}</span>
              </div>
            </div>
            <div class="match-right">
              <span class="match-badge ${item.badgeClass}">${item.badgeText}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    // Cập nhật lại các Lucide Icons
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  /**
   * Vẽ biểu đồ đường Chart.js cho Lịch Sử Thi Đấu
   */
  _renderHistoryChart() {
    const canvas = document.getElementById('match-history-chart');
    if (!canvas || !window.Chart) return;

    if (this._historyChartInstance) {
      this._historyChartInstance.destroy();
      this._historyChartInstance = null;
    }

    const history = [...this.matchHistoryManager.getHistory()].reverse(); // Trận cũ -> mới
    if (history.length === 0) return;

    const labels = history.map((_, idx) => `Trận ${idx + 1}`);
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
          label: 'Điểm số',
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
              label: (ctx) => ` Điểm: ${ctx.parsed.y.toLocaleString('vi-VN')}`
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
   * Ẩn / hiện Audio Control Panel và Top Bar Currency HUD (chỉ hiện duy nhất ở Menu chính)
   */
  _setAudioPanelVisible(visible) {
    const panel = this.domElements.audioPanel;
    if (panel) {
      panel.classList.toggle('visible-in-menu', visible);
    }
    const topBar = this.domElements.topCurrencyBar;
    if (topBar) {
      topBar.classList.toggle('visible-in-menu', visible);
    }
    if (visible) {
      this.currencyManager.updateUI();
    }
  }

  /**
   * Mở / đóng Pop-up thông báo Không Đủ Thịt
   */
  _setMeatAlertOpen(open) {
    const dom = this.domElements;
    if (!dom.meatAlertModal) return;
    dom.meatAlertModal.classList.toggle('open', open);
    dom.meatAlertModal.setAttribute('aria-hidden', String(!open));
  }

  // =========================================================
  // ĐIỀU KHIỂN BÀN PHÍM
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
        e.preventDefault(); // Ngăn Space scroll trang
        if (this.player?.jump()) {
          this.audioManager.playJump();
        }
      } else if (key === 'S' || e.key === 'ArrowDown') {
        this.player?.slide();
        this.audioManager.playSlide();
      }

      // Phím Debug
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
  // ĐIỀU KHIỂN VUỐT CẢM ỨNG & CHUỘT (TOUCH, MOUSE DRAG & CLICK)
  // =========================================================
  _setupSwipeControls() {
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let isMouseDown = false;
    const canvas = document.getElementById('game-canvas');
    const raycaster = new THREE.Raycaster();
    const mouseVector = new THREE.Vector2();

    // 1. Gắn sự kiện các nút bấm cảm ứng ảo (Virtual Touch Buttons)
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

    // 2. Logic Kéo/Vuốt chuột & Cảm ứng trên Màn hình
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

      // Nếu kéo/vuốt rõ ràng (khoảng cách > 30px và nhanh < 500ms)
      if (absDx > 30 || absDy > 30) {
        if (!this.stateMachine.is(GAME_STATES.PLAYING, GAME_STATES.FEVER)) return;

        if (absDx > absDy) {
          // Vuốt ngang
          if (dx > 0) {
            this.player?.moveRight();
            this.audioManager.playLaneSwitch();
          } else {
            this.player?.moveLeft();
            this.audioManager.playLaneSwitch();
          }
        } else {
          // Vuốt dọc
          if (dy < 0) {
            if (this.player?.jump()) this.audioManager.playJump();
          } else {
            this.player?.slide();
            this.audioManager.playSlide();
          }
        }
      } else if (dt < 300) {
        // TƯƠNG TÁC CLICK/TAP NHANH
        // 2.1. Kiểm tra Raycaster click thẳng vào nhân vật 3D
        mouseVector.x = (clientX / window.innerWidth) * 2 - 1;
        mouseVector.y = -(clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouseVector, this.sceneManager.camera);

        if (this.player && this.player.visualGroup) {
          const intersects = raycaster.intersectObjects(this.player.visualGroup.children, true);
          if (intersects.length > 0) {
            // Click vào nhân vật 3D -> Làm nhân vật nhảy lên chào vui nhộn!
            if (this.player.jump()) {
              this.audioManager.playJump();
            }
            return;
          }
        }

        // 2.2. Click phân vùng màn hình khi đang chơi (Trái: Sang Trái | Phải: Sang Phải | Giữa: Nhảy)
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
  // QUẢN LÝ MÀN HÌNH UI
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
  // LOADING UI HỢP THỜI TRANG CYBERPUNK SCI-FI
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
      "KÍCH HOẠT ĐỘNG CƠ CYBERPUNK 3D...",
      "ĐANG BUỘC THUN CHẰN THÙNG HÀNG SHIPPER...",
      "PHA CÀ PHÊ SỮA ĐÁ NĂNG LƯỢNG RUSH FEVER...",
      "NẠP BẢN ĐỒ ĐƯỜNG PHỐ THÁI BÌNH NEON...",
      "HOÀN TẤT ĐỘNG CƠ - SẴN SÀNG LAO PHỐ!"
    ];

    AssetManager.loadAll(
      (progress) => {
        const msgIndex = Math.min(statusMessages.length - 1, Math.floor((progress / 100) * statusMessages.length));
        this.updateLoadingProgress(progress, statusMessages[msgIndex]);
      },
      () => {
        this.updateLoadingProgress(100, "THÁI BÌNH RUSH - KHỞI CHẠY!");
        this._initEntities();
        this._updateCharacterCardDisplay();
        setTimeout(() => {
          this.stateMachine.transition(GAME_STATES.MENU);
        }, 400);
      }
    );
  }

  // =========================================================
  // THIẾT LẬP CAROUSEL CHỌN NHÂN VẬT
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
  // KHỞI TẠO ENTITIES
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
    // 1. Kiểm tra xem người chơi có đủ 10 Thịt Thể Lực không
    if (!this.currencyManager.hasEnoughMeat(10)) {
      this._setMeatAlertOpen(true);
      return;
    }
    // 2. Trừ 10 Thịt khi bắt đầu trận đấu
    this.currencyManager.deductMeat(10);

    this.score = 0;
    this.coffees = 0;
    this.gameTimer = 0;
    this.feverEnergy = 0;
    this.isFeverActive = false;
    this.feverTimer = 0;
    this.doubleScoreTimer = 0;
    this.boostTimer = 0;
    this.highJumpTimer = 0;
    this.currentSpeed = 4.0; // Bắt đầu cuộn mượt mà từ tốc độ Menu 4.0 m/s lên tốc độ chơi!
    this.obstacleSpawnTimer = 1.5;
    this.collectibleSpawnTimer = 2.0;

    // Dọn dẹp chướng ngại vật & vật phẩm cũ
    this._clearObstacles();
    this._clearCollectibles();
    this._destroyFeverParticles();

    // Căn chỉnh nhân vật về lại làn giữa chuẩn
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

    // Hiện hướng dẫn rồi ẩn đi
    if (this.domElements.desktopInstructions) {
      this.domElements.desktopInstructions.style.opacity = '1';
      setTimeout(() => {
        this.domElements.desktopInstructions.style.opacity = '0';
      }, 4000);
    }

    this.stateMachine.transition(GAME_STATES.PLAYING);
    // Nhạc tiếp tục phát từ Menu vào Gameplay (không restart)
    // Chỉ startBGM nếu chưa phát (VD: lần đầu hoặc sau khi bị tắt)
    if (!this.audioManager.isBgmPlaying) {
      this.audioManager.startBGM();
    } else {
      // Restore volume nếu đang bị duck từ GAMEOVER
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
      this.audioManager?.playFeverActivate?.();
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
  // HIỆU ỨNG TĂNG TỐC VỆT GIÓ MÉP MÀN HÌNH (PERIPHERAL SPEED STREAKS)
  // =========================================================
  _createFeverParticles() {
    // Đã xóa bỏ các hạt chấm liti theo yêu cầu người dùng
  }

  _updateFeverParticles(deltaTime, playerPos) {
    // Đã xóa bỏ các hạt chấm liti theo yêu cầu người dùng
  }

  _destroyFeverParticles() {
    // Đã xóa bỏ các hạt chấm liti
  }

  // =========================================================
  // SINH CHƯỚNG NGẠI VẬT
  // =========================================================
  _spawnRandomObstacle() {
    if (this.obstacleManager) {
      this.obstacleManager.spawnRandomObstacle(this.collectibles);
    }
  }

  // =========================================================
  // SINH VẬT PHẨM (CÀ PHÊ & POWER-UPS)
  // =========================================================
  _spawnCollectible() {
    const scene = this.sceneManager.scene;
    const laneIndex = Math.floor(Math.random() * 3);
    const spawnZ = -80 - Math.random() * 20;

    // Kiểm tra khoảng cách an toàn với Chướng ngại vật trong CÙNG làn đường!
    // Giữ khoảng cách tối thiểu 25m để người chơi ăn hết dãy cà phê mà không bị xe tông giữa chừng
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

    // 25% cơ hội sinh Power-up
    const isPowerUp = Math.random() < 0.25;
    if (isPowerUp) {
      const pTypes = [POWERUP_TYPES.SHIELD, POWERUP_TYPES.DOUBLE_SCORE, POWERUP_TYPES.BOOST];
      const pType = pTypes[Math.floor(Math.random() * pTypes.length)];
      const col = new Collectible(scene, laneIndex, spawnZ, pType);
      col.isAlive = true;
      this.collectibles.push(col);
    } else {
      // Sinh dãy 4 ly cà phê nối tiếp nhau (khoảng cách 3.0m giữa các ly)
      const groupCount = 4;
      for (let i = 0; i < groupCount; i++) {
        const col = new Collectible(scene, laneIndex, spawnZ - i * 3.0, 'COFFEE');
        col.isAlive = true;
        this.collectibles.push(col);
      }
    }
  }

  // =========================================================
  // THU THẬP CÀ PHÊ & POWER-UPS
  // =========================================================
  _onCoffeeCollected(count = 1) {
    const skinKey = this.skinKeys[this.selectedSkinIndex] || 'SHIPPER';
    const perk = CHARACTERS[skinKey] || CHARACTERS.SHIPPER;

    const coffeeBonus = perk.coffeeBonus || 1.0;
    const scoreMult = (this.doubleScoreTimer > 0 ? 2 : 1) * (perk.scoreMultBonus || 1.0);

    this.coffees += count;
    this.score += Math.floor(150 * count * coffeeBonus * scoreMult);

    this.audioManager?.playCoffeeCollect?.();

    // Đồng bộ số cà phê sang Player để đếm mốc 10 ly
    if (this.player && typeof this.player.collectCoffee === 'function') {
      this.player.collectCoffee(10, (speedTier) => {
        this.currentSpeed += 3.0;
        if (typeof this._showStreamToast === 'function') {
          this._showStreamToast(`⚡ TĂNG TỐC! Đã ăn đủ 10 Cà phê (Cấp ${speedTier})`);
        }
      });
    }

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
    this.audioManager?.playPowerUp?.();

    if (type === POWERUP_TYPES.SHIELD) {
      if (this.player) this.player.enableShield(); // Khiên 3D sẽ hiện lên chuẩn 100%!
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

    // Dọn sạch toàn bộ Obstacles & Collectibles khỏi scene ngay lập tức khi Game Over
    // Không để chướng ngại vật và vật phẩm còn trên màn hình sau khi nhân vật thua
    this._clearObstacles();
    this._clearCollectibles();

    this.stateMachine.transition(GAME_STATES.GAMEOVER);
  }

  // =========================================================
  // HIỂN THỊ UI
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

    // Hiển thị Active Power-up Cards trên HUD với thanh thời gian và chú thích tác dụng
    if (this.domElements.activePowerups) {
      let cardsHTML = '';

      // 1. Giáp Nón Lá
      if (this.player && this.player.hasShield) {
        cardsHTML += `
          <div class="powerup-card shield-card">
            <div class="powerup-header">
              <div class="powerup-title-group">
                <span class="powerup-icon">🛡️</span>
                <span class="powerup-title">Giáp Nón Lá</span>
              </div>
              <span class="powerup-timer-text">Bảo Vệ</span>
            </div>
            <div class="powerup-progress-track">
              <div class="powerup-progress-fill shield-fill" style="width: 100%"></div>
            </div>
            <div class="powerup-effect-desc">Đỡ 1 va chạm chướng ngại vật mà không bị Game Over</div>
          </div>
        `;
      }

      // 2. Bánh Mì X2 Score
      if (this.doubleScoreTimer > 0) {
        const pct = ((this.doubleScoreTimer / POWERUP_CONFIG.DOUBLE_SCORE_DURATION) * 100).toFixed(1);
        const secs = (this.doubleScoreTimer / 1000).toFixed(1);
        cardsHTML += `
          <div class="powerup-card double-card">
            <div class="powerup-header">
              <div class="powerup-title-group">
                <span class="powerup-icon">🥖</span>
                <span class="powerup-title">Nhân Đôi Bánh Mì</span>
              </div>
              <span class="powerup-timer-text">${secs}s</span>
            </div>
            <div class="powerup-progress-track">
              <div class="powerup-progress-fill double-fill" style="width: ${pct}%"></div>
            </div>
            <div class="powerup-effect-desc">Nhân 2 toàn bộ điểm số quãng đường & cà phê thu thập</div>
          </div>
        `;
      }

      // 3. Xe Ôm Boost Siêu Tốc
      if (this.boostTimer > 0) {
        const pct = ((this.boostTimer / POWERUP_CONFIG.BOOST_DURATION) * 100).toFixed(1);
        const secs = (this.boostTimer / 1000).toFixed(1);
        cardsHTML += `
          <div class="powerup-card boost-card">
            <div class="powerup-header">
              <div class="powerup-title-group">
                <span class="powerup-icon">🛵</span>
                <span class="powerup-title">Xe Ôm Boost</span>
              </div>
              <span class="powerup-timer-text">${secs}s</span>
            </div>
            <div class="powerup-progress-track">
              <div class="powerup-progress-fill boost-fill" style="width: ${pct}%"></div>
            </div>
            <div class="powerup-effect-desc">Bất tử đâm văng vật cản & tự động hút toàn bộ cà phê</div>
          </div>
        `;
      }

      // 4. Giày Nhảy Cao Phản Lực Neon
      if (this.highJumpTimer > 0) {
        const pct = ((this.highJumpTimer / POWERUP_CONFIG.HIGH_JUMP_DURATION) * 100).toFixed(1);
        const secs = (this.highJumpTimer / 1000).toFixed(1);
        cardsHTML += `
          <div class="powerup-card boost-card" style="border-color: #00e5ff">
            <div class="powerup-header">
              <div class="powerup-title-group">
                <span class="powerup-icon">👟</span>
                <span class="powerup-title">Giày Nhảy Cao</span>
              </div>
              <span class="powerup-timer-text">${secs}s</span>
            </div>
            <div class="powerup-progress-track">
              <div class="powerup-progress-fill" style="width: ${pct}%; background: linear-gradient(90deg, #00b0ff, #00e5ff)"></div>
            </div>
            <div class="powerup-effect-desc">Tăng siêu lực nhảy - Nhảy qua đầu xe bus Hà Nội 3.4m dễ dàng</div>
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
  // VÒNG LẶP GAME
  // =========================================================
  _animate() {
    requestAnimationFrame(this._animate.bind(this));
    try {
      const deltaTime = Math.min(this.clock.getDelta(), 0.05);

      // 🏎️ NẾU SHOP 3D ĐANG BẬT: CHỈ RENDER SCENE CỦA SHOP (Xóa sạch map cũ đằng sau)
      if (this.shop3DScene && this.shop3DScene.isActive) {
        this.shop3DScene.update(deltaTime);
        this.shop3DScene.render();
        return; // BẮT BUỘC RETURN ĐỂ KHÔNG RENDER MAP PHỐ THÁI BÌNH CŨ
      }

      // Nếu không bật Shop thì render game chính như bình thường
      this._update(deltaTime);
      this._render();
    } catch (err) {
      console.error('⚠️ [Game Loop Error]:', err);
    }
  }

  _update(deltaTime) {
    if (this.city3DScene && this.city3DScene.isActive) {
      this.city3DScene.update(deltaTime);
      return;
    }

    if (this.stateMachine.is(GAME_STATES.VIEWER)) {
      if (this.characterViewerManager) {
        this.characterViewerManager.update();
      }
      return;
    }

    this.sceneManager.update(deltaTime);

    // Cập nhật phố xá 3D cuộn nhẹ (4m/s) & hiển thị cây cối rợp bóng trong màn hình MENU / LOADING
    if (this.stateMachine.is(GAME_STATES.MENU, GAME_STATES.LOADING)) {
      if (this.environment) {
        this.environment.update(deltaTime, 4.0);
      }
      if (this.player) {
        this.player.update(deltaTime);
      }
      return;
    }

    // Khi GAMEOVER: Dừng hoàn toàn cuộn màn hình (tốc độ = 0), giữ nguyên vị trí va chạm va đâm!
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

    // --- 0. Cập nhật Timers của Power-ups ---
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

    // --- 1. Tính tốc độ game ---
    const speedTier = Math.floor(this.coffees / GAME_CONFIG.COFFEES_PER_TIER);
    let targetSpeed = GAME_CONFIG.BASE_SPEED + speedTier * GAME_CONFIG.SPEED_INCREMENT;
    targetSpeed = Math.min(targetSpeed, GAME_CONFIG.MAX_SPEED);
    if (this.isFeverActive || this.boostTimer > 0) {
      targetSpeed *= GAME_CONFIG.FEVER_SPEED_MULTIPLIER;
    }
    this.currentSpeed = THREE.MathUtils.lerp(this.currentSpeed, targetSpeed, deltaTime * 2);

    // --- 2. Tính điểm & Thời gian sinh tồn ---
    const skinKey = this.skinKeys[this.selectedSkinIndex] || 'SHIPPER';
    const perk = CHARACTERS[skinKey] || CHARACTERS.SHIPPER;
    const scoreMult = (this.doubleScoreTimer > 0 ? 2 : 1) * (perk.scoreMultBonus || 1.0);

    const scoreGain = (this.isFeverActive || this.boostTimer > 0 ? 40 : 15) * deltaTime * scoreMult;
    this.score += scoreGain;

    // Cộng dồn thời gian chơi tính theo giây
    this.gameTimer = (this.gameTimer || 0) + deltaTime;

    this._updateHUDDisplay();

    // --- 3. Xử lý FOV camera, Motion Blur, Camera Shake & Audio Shift khi Tăng tốc ---
    const speedBlurElem = document.getElementById('speed-motion-blur');
    const isBoosting = this.isFeverActive || this.boostTimer > 0;

    if (isBoosting) {
      // 3a. Mở rộng góc nhìn FOV kéo giãn cảnh vật 2 bên (60° -> 82°)
      this.sceneManager.camera.fov = THREE.MathUtils.lerp(
        this.sceneManager.camera.fov,
        82,
        deltaTime * GAME_CONFIG.CAMERA_LERP_SPEED * 1.5
      );
      this.sceneManager.camera.updateProjectionMatrix();

      // 3b. Hiệu ứng Motion Blur mờ chuyển động viền màn hình
      if (speedBlurElem && !speedBlurElem.classList.contains('active')) {
        speedBlurElem.classList.add('active');
      }

      // 3c. Hiệu ứng Rung lắc Camera (Camera Shake) mô phỏng động cơ gầm rú ở tốc độ tối đa
      const shakeIntensity = 0.045;
      this.sceneManager.camera.position.x += (Math.random() - 0.5) * shakeIntensity;
      this.sceneManager.camera.position.y += (Math.random() - 0.5) * shakeIntensity;

      // 3e. Đẩy âm thanh BGM / Động cơ lên cao độ (Audio Shift & Pitch)
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

    // --- 4. Cập nhật nhân vật ---
    if (this.player) {
      this.player.update(deltaTime, this.currentSpeed);
    }

    // --- 5. Cập nhật môi trường ---
    if (this.environment) {
      this.environment.update(deltaTime, this.currentSpeed);
    }

    // --- 6. Sinh chướng ngại vật ---
    this.obstacleSpawnTimer -= deltaTime;
    if (this.obstacleSpawnTimer <= 0) {
      this._spawnRandomObstacle();
      const spawnDelay = 2.2 - Math.min(1.2, (this.currentSpeed - GAME_CONFIG.BASE_SPEED) / 15);
      this.obstacleSpawnTimer = spawnDelay + Math.random() * 0.8;
    }

    // --- 7. Sinh ly cà phê / Power-ups dầy đặc ---
    this.collectibleSpawnTimer -= deltaTime;
    if (this.collectibleSpawnTimer <= 0) {
      this._spawnCollectible();
      this.collectibleSpawnTimer = 1.0 + Math.random() * 0.8;
    }

    const playerPos = this.player ? this.player.meshGroup.position : null;

    // --- 8. Cập nhật Obstacles & Kiểm tra Va chạm Nâng cao & Platforming running on roof ---
    if (this.obstacleManager) {
      const hadShieldBefore = this.player ? this.player.hasShield : false;

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

      if (hadShieldBefore && this.player && !this.player.hasShield) {
        this._updateHUDDisplay();
      }
    }

    // --- 9. Cập nhật Collectibles ---
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const col = this.collectibles[i];
      col.update(deltaTime, this.currentSpeed, playerPos, this.isFeverActive || this.boostTimer > 0);

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

      if (col.meshGroup.position.z > 15) {
        col.dispose();
        this.collectibles.splice(i, 1);
      }
    }

    // --- 10. Cập nhật hiệu ứng Vệt Lửa Ống Xả Xe ExhaustFlameBoostEffect ---
    if (this.exhaustFlameEffect) {
      this.exhaustFlameEffect.triggerSpeedBoost(isBoosting);
      this.exhaustFlameEffect.update(deltaTime, playerPos);
    }
  }

  _render() {
    if (this.city3DScene && this.city3DScene.isActive) {
      this.city3DScene.render();
      return;
    }

    if (this.stateMachine.is(GAME_STATES.VIEWER)) {
      if (this.characterViewerManager) {
        this.characterViewerManager.render();
      }
      return;
    }
    this.sceneManager.render();
  }
}
