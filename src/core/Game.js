import * as THREE from 'three';
import { SceneManager } from './SceneManager.js';
import { StateMachine } from '../managers/StateMachine.js';
import { CollisionManager } from '../managers/CollisionManager.js';
import { AudioManager } from '../managers/AudioManager.js';
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
import { Collectible } from '../entities/Collectible.js';
import {
  Roadblock,
  Barrier,
  VendorCart,
  Vehicle,
  OBSTACLE_TYPES
} from '../entities/Obstacle.js';

export class Game {
  constructor() {
    // Đọc trạng thái debug từ query string (e.g. ?debug=true)
    const urlParams = new URLSearchParams(window.location.search);
    const debugMode = urlParams.get('debug') === 'true';

    // Khởi tạo SceneManager
    this.sceneManager = new SceneManager('game-canvas', debugMode);

    // Hệ thống State Machine
    this.stateMachine = new StateMachine();

    // Hệ thống va chạm
    this.collisionManager = new CollisionManager();

    // Hệ thống âm thanh
    this.audioManager = new AudioManager();

    // Trạng thái chọn nhân vật (Mặc định chọn Nữ Sinh Áo Dài)
    this.skinKeys = Object.keys(CHARACTERS);
    const savedSkin = localStorage.getItem('saigon_selected_skin');
    this.selectedSkinIndex = savedSkin ? Math.max(0, this.skinKeys.indexOf(savedSkin.toUpperCase())) : 1;
    if (this.selectedSkinIndex === -1) this.selectedSkinIndex = 1;

    // Trạng thái chơi game
    this.score = 0;
    this.coffees = 0;
    this.feverEnergy = 0;
    this.isFeverActive = false;
    this.feverTimer = 0;
    this.currentSpeed = GAME_CONFIG.BASE_SPEED;

    // Quản lý Timers của Power-ups
    this.doubleScoreTimer = 0;
    this.boostTimer = 0;

    // Quản lý các thực thể game
    this.player = null;
    this.environment = null;
    this.obstacles = [];
    this.collectibles = [];
    this.obstacleSpawnTimer = 0;
    this.collectibleSpawnTimer = 0;

    // Hiệu ứng hạt Fever (particles)
    this.feverParticles = null;
    this.feverParticleTime = 0;

    // Quản lý thời gian vòng lặp
    this.clock = new THREE.Clock();

    // Liên kết giao diện UI
    this.domScreens = {
      loading: document.getElementById('loading-screen'),
      menu: document.getElementById('main-menu'),
      hud: document.getElementById('hud'),
      gameOver: document.getElementById('game-over-screen')
    };

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
      btnRestart: document.getElementById('btn-restart'),
      btnHome: document.getElementById('btn-home'),
      btnMute: document.getElementById('btn-mute'),
      charPrev: document.getElementById('char-prev'),
      charNext: document.getElementById('char-next'),
      charAvatar: document.getElementById('char-avatar'),
      charName: document.getElementById('char-name'),
      charDesc: document.getElementById('char-desc'),
      desktopInstructions: document.getElementById('desktop-instructions'),
      btnTouchLeft: document.getElementById('touch-btn-left'),
      btnTouchRight: document.getElementById('touch-btn-right'),
      btnTouchJump: document.getElementById('touch-btn-jump'),
      btnTouchSlide: document.getElementById('touch-btn-slide')
    };

    this.init();
  }

  init() {
    // 1. Thiết lập State Machine callbacks
    this._setupStateMachine();

    // 2. Gắn sự kiện các nút bấm UI
    this._setupUIEvents();

    // 3. Gắn Carousel chọn nhân vật
    this._setupCharacterCarousel();

    // 4. Gắn điều khiển bàn phím
    this._setupKeyboardControls();

    // 5. Gắn điều khiển vuốt cảm ứng (Swipe)
    this._setupSwipeControls();

    // 6. Chạy quá trình tải (Loading)
    this._runSimulatedLoading();

    // 7. Bắt đầu vòng lặp render
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
      this.audioManager.stopBGM();
    });

    // Khi vào PLAYING
    sm.onEnter(GAME_STATES.PLAYING, () => {
      this._showScreen('hud');
      if (this.isFeverActive) {
        // Thoát Fever Mode nhưng vẫn PLAYING
        this._deactivateFeverVisuals();
        this.isFeverActive = false;
        this.audioManager.startBGM();
      }
    });

    // Khi vào FEVER
    sm.onEnter(GAME_STATES.FEVER, () => {
      this._showScreen('hud');
      this._activateFeverVisuals();
      this.isFeverActive = true;
      this.feverTimer = GAME_CONFIG.FEVER_DURATION;
      this.audioManager.startFeverBGM();
    });

    // Khi vào GAMEOVER
    sm.onEnter(GAME_STATES.GAMEOVER, () => {
      this._showScreen('gameOver');
      this._updateGameOverDisplay();
      this.audioManager.stopBGM();
      this.audioManager.playGameOver();
      this._destroyFeverParticles();

      // Lưu high score
      const highScore = parseInt(localStorage.getItem('saigon_high_score') || '0');
      if (this.score > highScore) {
        localStorage.setItem('saigon_high_score', this.score.toString());
      }
    });

    // Buộc trạng thái ban đầu thành LOADING
    sm.forceState(GAME_STATES.LOADING);
    this._showScreen('loading');
  }

  // =========================================================
  // THIẾT LẬP UI EVENTS
  // =========================================================
  _setupUIEvents() {
    this.domElements.btnStart.addEventListener('click', () => {
      this.audioManager._ensureContext(); // Unlock AudioContext sau user gesture
      this.startGame();
    });

    this.domElements.btnRestart.addEventListener('click', () => {
      this.startGame();
    });

    this.domElements.btnHome.addEventListener('click', () => {
      this.stateMachine.transition(GAME_STATES.MENU);
    });

    this.domElements.btnMute.addEventListener('click', () => {
      const isEnabled = this.audioManager.toggle();
      this.domElements.btnMute.innerHTML = isEnabled
        ? '<span class="sound-icon">🔊</span> Âm Thanh: Bật'
        : '<span class="sound-icon">🔇</span> Âm Thanh: Tắt';
    });
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
      "NẠP BẢN ĐỒ ĐƯỜNG PHỐ SÀI GÒN NEON...",
      "HOÀN TẤT ĐỘNG CƠ - SẴN SÀNG LAO PHỐ!"
    ];

    AssetManager.loadAll(
      (progress) => {
        const msgIndex = Math.min(statusMessages.length - 1, Math.floor((progress / 100) * statusMessages.length));
        this.updateLoadingProgress(progress, statusMessages[msgIndex]);
      },
      () => {
        this.updateLoadingProgress(100, "SÀI GÒN RUSH - KHỞI CHẠY!");
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

    if (this.player) this.player.dispose();
    this.player = new Player(scene, skinId);

    if (this.exhaustFlameEffect) this.exhaustFlameEffect.dispose();
    this.exhaustFlameEffect = new ExhaustFlameBoostEffect(scene);

    this._clearObstacles();
    this._clearCollectibles();
    this._destroyFeverParticles();
  }

  _clearObstacles() {
    this.obstacles.forEach(obs => obs.dispose());
    this.obstacles = [];
  }

  _clearCollectibles() {
    this.collectibles.forEach(col => col.dispose());
    this.collectibles = [];
  }

  // =========================================================
  // GAME FLOW
  // =========================================================
  startGame() {
    this.score = 0;
    this.coffees = 0;
    this.feverEnergy = 0;
    this.isFeverActive = false;
    this.feverTimer = 0;
    this.doubleScoreTimer = 0;
    this.boostTimer = 0;
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
    this.audioManager.startBGM();
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
    const scene = this.sceneManager.scene;
    const laneIndex = Math.floor(Math.random() * 3);
    const spawnZ = -85 - Math.random() * 20;

    const nearbyObstaclesInLane = this.obstacles.filter(obs => {
      const dz = Math.abs(obs.meshGroup.position.z - spawnZ);
      const obsLane = obs.laneIndex;
      return dz < 15 && obsLane === laneIndex;
    });

    if (nearbyObstaclesInLane.length > 0) return;

    const types = Object.values(OBSTACLE_TYPES);
    const chosenType = types[Math.floor(Math.random() * types.length)];

    let obstacle = null;
    switch (chosenType) {
      case OBSTACLE_TYPES.ROADBLOCK:
        obstacle = new Roadblock(scene, laneIndex, spawnZ);
        break;
      case OBSTACLE_TYPES.BARRIER:
        obstacle = new Barrier(scene, laneIndex, spawnZ);
        break;
      case OBSTACLE_TYPES.VENDOR_CART:
        obstacle = new VendorCart(scene, laneIndex, spawnZ);
        break;
      case OBSTACLE_TYPES.VEHICLE_BUS:
        obstacle = new Vehicle(scene, OBSTACLE_TYPES.VEHICLE_BUS, laneIndex, spawnZ);
        break;
      case OBSTACLE_TYPES.VEHICLE_DOUBLE_DECKER:
        obstacle = new Vehicle(scene, OBSTACLE_TYPES.VEHICLE_DOUBLE_DECKER, laneIndex, spawnZ);
        break;
      case OBSTACLE_TYPES.VEHICLE_BIKE:
        obstacle = new Vehicle(scene, OBSTACLE_TYPES.VEHICLE_BIKE, laneIndex, spawnZ);
        break;
    }

    if (obstacle) {
      obstacle.laneIndex = laneIndex;
      obstacle.isAlive = true;
      this.obstacles.push(obstacle);
    }
  }

  // =========================================================
  // SINH VẬT PHẨM (CÀ PHÊ & POWER-UPS)
  // =========================================================
  _spawnCollectible() {
    const scene = this.sceneManager.scene;
    const laneIndex = Math.floor(Math.random() * 3);
    const spawnZ = -80 - Math.random() * 20;

    // 25% cơ hội sinh Power-up
    const isPowerUp = Math.random() < 0.25;
    if (isPowerUp) {
      const pTypes = [POWERUP_TYPES.SHIELD, POWERUP_TYPES.DOUBLE_SCORE, POWERUP_TYPES.BOOST];
      const pType = pTypes[Math.floor(Math.random() * pTypes.length)];
      const col = new Collectible(scene, laneIndex, spawnZ, pType);
      col.isAlive = true;
      this.collectibles.push(col);
    } else {
      // Sinh dãy 4-6 ly cà phê nối tiếp nhau kéo dài trên làn đường
      const groupCount = 4 + Math.floor(Math.random() * 3);
      for (let i = 0; i < groupCount; i++) {
        const col = new Collectible(scene, laneIndex, spawnZ - i * 3.5, 'COFFEE');
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
      const deltaTime = Math.min(this.clock.getDelta(), 0.05); // Cap delta ở 50ms
      this._update(deltaTime);
      this._render();
    } catch (err) {
      console.error('⚠️ [Game Loop Error]:', err);
    }
  }

  _update(deltaTime) {
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

    // --- 1. Tính tốc độ game ---
    const speedTier = Math.floor(this.coffees / GAME_CONFIG.COFFEES_PER_TIER);
    let targetSpeed = GAME_CONFIG.BASE_SPEED + speedTier * GAME_CONFIG.SPEED_INCREMENT;
    targetSpeed = Math.min(targetSpeed, GAME_CONFIG.MAX_SPEED);
    if (this.isFeverActive || this.boostTimer > 0) {
      targetSpeed *= GAME_CONFIG.FEVER_SPEED_MULTIPLIER;
    }
    this.currentSpeed = THREE.MathUtils.lerp(this.currentSpeed, targetSpeed, deltaTime * 2);

    // --- 2. Tính điểm ---
    const skinKey = this.skinKeys[this.selectedSkinIndex] || 'SHIPPER';
    const perk = CHARACTERS[skinKey] || CHARACTERS.SHIPPER;
    const scoreMult = (this.doubleScoreTimer > 0 ? 2 : 1) * (perk.scoreMultBonus || 1.0);

    const scoreGain = (this.isFeverActive || this.boostTimer > 0 ? 40 : 15) * deltaTime * scoreMult;
    this.score += scoreGain;
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
      this.player.update(deltaTime);
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

    // --- 8. Cập nhật Obstacles & Kiểm tra Va chạm Nâng cao & Platforming chạy trên nóc xe ---
    const playerPos = this.player ? this.player.meshGroup.position : null;
    let standingOnVehicleRoof = false;

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.update(deltaTime, this.currentSpeed);

      if (!this.player) continue;

      const playerBox = this.player.boundingBox;
      const obsBox = obs.boundingBox;
      const isVehiclePlatform = (
        obs.type === OBSTACLE_TYPES.VEHICLE_BUS ||
        obs.type === OBSTACLE_TYPES.VEHICLE_DOUBLE_DECKER ||
        obs.type === OBSTACLE_TYPES.VEHICLE_BIKE ||
        obs.type === OBSTACLE_TYPES.VENDOR_CART
      );

      // --- LOGIC CHẠY TRÊN NÓC XE (PLATFORMING) ---
      if (isVehiclePlatform && playerPos) {
        const vehicleTopY = obsBox.max.y;
        const isOverVehicleRoof = (
          playerPos.x >= obsBox.min.x - 0.2 && playerPos.x <= obsBox.max.x + 0.2 &&
          playerPos.z >= obsBox.min.z - 0.3 && playerPos.z <= obsBox.max.z + 0.3
        );

        if (isOverVehicleRoof && playerPos.y >= vehicleTopY - 0.35) {
          // Người chơi tiếp đất an toàn và CHẠY TRÊN NÓC XE/CONTAINER!
          standingOnVehicleRoof = true;
          this.player.currentPlatformY = vehicleTopY;
        }
      }

      // --- LOGIC VA CHẠM AABB ---
      const isStandingSafelyOnTop = (
        isVehiclePlatform &&
        this.player.currentPlatformY > 0 &&
        playerPos.y >= obsBox.max.y - 0.25
      );

      if (!isStandingSafelyOnTop && playerBox.intersectsBox(obsBox)) {
        if (this.isFeverActive || this.boostTimer > 0) {
          this.score += 300 * scoreMult;
          this.audioManager.playSmash();
          obs.dispose();
          this.obstacles.splice(i, 1);
          continue;
        } else if (this.player.hasShield) {
          this.player.consumeShield();
          this.audioManager.playShieldBreak();
          obs.dispose();
          this.obstacles.splice(i, 1);
          continue;
        } else {
          this._triggerGameOver();
          return;
        }
      }

      // Dọn dẹp obstacle đã vượt qua phía sau camera
      if (obs.meshGroup.position.z > 45) {
        obs.dispose();
        this.obstacles.splice(i, 1);
      }
    }

    // Nếu chạy vượt qua chiều dài ô tô hoặc đổi làn ra khỏi xe, cho rơi tự do về mặt đất Y=0
    if (this.player && !standingOnVehicleRoof && this.player.currentPlatformY > 0) {
      this.player.currentPlatformY = 0;
    }

    // --- 9. Cập nhật Collectibles ---
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const col = this.collectibles[i];
      col.update(deltaTime, this.currentSpeed, playerPos, this.isFeverActive || this.boostTimer > 0);

      // Kiểm tra thu thập
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

      // Dọn dẹp item đã qua camera
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
    this.sceneManager.render();
  }
}
