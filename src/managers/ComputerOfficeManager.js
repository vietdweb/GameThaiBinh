import * as THREE from 'three';

/**
 * ComputerOfficeManager.js - Trình Quản lý Toàn diện Map Computer Office 3D & Hệ Điều Hành Windows 98 Retro
 * 
 * Tổng hợp 3 chức năng chính trong 1 Module duy nhất:
 * 1. OFFICE SCENE FLOW: Quản lý vào/thoát Map 3D Bàn làm việc CRT, tuân thủ UI HUD Visibility Rules.
 * 2. WINDOW MANAGEMENT: Quản lý Cửa sổ Win98 (Drag di chuyển, Phóng to/Thu nhỏ, Ẩn giữ tab Taskbar, Focus Z-Index).
 * 3. RETRO MINI-GAMES & PAINT 98: Rắn Săn Mồi 98 (Snake), Xếp Hình 98 (Tetris) thưởng Kim Cương thật & Paint 98 độ tem xe 3D.
 */
export class ComputerOfficeManager {
  constructor(game, computerOfficeScene) {
    this.game = game;
    this.computerOfficeScene = computerOfficeScene;
    this.currencyManager = game ? game.currencyManager : null;

    // --- 1. Quản lý Window OS ---
    this.topZIndex = 100;
    this.apps = {}; // Map appId -> { el, title, icon, isMinimized, isMaximized, rect }
    this.activeAppId = null;
    this.isDragging = false;
    this.dragTarget = null;
    this.dragOffset = { x: 0, y: 0 };

    // --- 2. Trạng thái Snake Game ---
    this.snakeState = {
      running: false,
      timer: null,
      score: 0,
      highScore: parseInt(localStorage.getItem('sgr_snake_highscore') || '0', 10),
      gridSize: 15,
      snake: [{ x: 7, y: 7 }],
      dir: { x: 1, y: 0 },
      nextDir: { x: 1, y: 0 },
      food: { x: 3, y: 3 },
      gemsEarned: 0
    };

    // --- 3. Trạng thái Tetris Game ---
    this.tetrisState = {
      running: false,
      timer: null,
      score: 0,
      lines: 0,
      highScore: parseInt(localStorage.getItem('sgr_tetris_highscore') || '0', 10),
      grid: Array(20).fill(null).map(() => Array(10).fill(0)),
      currentPiece: null,
      currentPos: { x: 3, y: 0 },
      gemsEarned: 0
    };

    // --- 4. Trạng thái Paint 98 ---
    this.paintState = {
      isDrawing: false,
      brushColor: '#00ffff',
      brushSize: 4,
      fontStyle: 'bold 24px "Space Grotesk", sans-serif',
      bgColor: '#111827',
      sloganText: 'THÁI BÌNH LỠ BƯỚC'
    };

    this.tetrisShapes = [
      [[1, 1, 1, 1]], // I
      [[1, 1], [1, 1]], // O
      [[0, 1, 0], [1, 1, 1]], // T
      [[1, 0, 0], [1, 1, 1]], // L
      [[0, 0, 1], [1, 1, 1]], // J
      [[0, 1, 1], [1, 1, 0]], // S
      [[1, 1, 0], [0, 1, 1]]  // Z
    ];

    this.tetrisColors = [
      null, '#00ffff', '#ffff00', '#aa00ff', '#ffaa00', '#0000ff', '#00ff00', '#ff0000'
    ];

    this._setupOfficeFlowEvents();
  }

  init() {
    this._setupDesktopWorkspace();
    this._setupClock();
    this._bindGlobalWindowEvents();
    this._setupTaskbarInteractions();

    this._bindSnakeEvents();
    this._bindTetrisEvents();
    this._bindPaintEvents();

    // Nạp lại khẩu hiệu độ xe đã lưu
    const savedDecal = localStorage.getItem('sgr_custom_car_decal');
    if (savedDecal && this.game && this.game.player) {
      this.game.player.updateCustomDecalTexture(savedDecal);
    }
  }

  /* ============================================================ */
  /* 💻 1. MAP FLOW & UI HUD VISIBILITY RULES                     */
  /* ============================================================ */
  _setupOfficeFlowEvents() {
    document.addEventListener('click', (e) => {
      // 1. Click button "💻 BÀN LÀM VIỆC CRT" at Main Menu
      const btnOpen = e.target.closest('#btn-open-office') || e.target.closest('.sub-pc-office');
      if (btnOpen) {
        e.stopPropagation();
        this.game.audioManager?._ensureContext?.();
        this.enterOfficeMap();
      }

      // 2. Click button "✕ THOÁT VĂN PHÒNG" -> Return to Main Menu
      const btnExit = e.target.closest('#btn-exit-office-3d');
      if (btnExit) {
        e.stopPropagation();
        this.exitOfficeMap();
      }
    });
  }

  enterOfficeMap() {
    const mainMenuPanel = document.querySelector('.main-menu-panel') || document.getElementById('main-menu');
    const btnExitOffice = document.getElementById('btn-exit-office-3d');

    // Ẩn Top Currency Bar & Audio Panel theo đúng UI HUD Rules
    if (typeof this.game._setAudioPanelVisible === 'function') {
      this.game._setAudioPanelVisible(false);
    }
    const currencyBar = document.getElementById('top-currency-bar');
    if (currencyBar) currencyBar.classList.remove('visible-in-menu');

    if (mainMenuPanel) mainMenuPanel.style.display = 'none';

    if (this.computerOfficeScene) {
      this.computerOfficeScene.activate();
    }

    if (btnExitOffice) {
      btnExitOffice.classList.remove('hidden');
    }

    this.init();
  }

  exitOfficeMap() {
    const mainMenuPanel = document.querySelector('.main-menu-panel') || document.getElementById('main-menu');
    const btnExitOffice = document.getElementById('btn-exit-office-3d');

    if (this.computerOfficeScene) {
      this.computerOfficeScene.deactivate();
    }

    if (mainMenuPanel) mainMenuPanel.style.display = 'flex';
    if (btnExitOffice) btnExitOffice.classList.add('hidden');

    // Hiện lại Top Currency Bar & Audio Panel ở Menu chính
    const currencyBar = document.getElementById('top-currency-bar');
    if (currencyBar) currencyBar.classList.add('visible-in-menu');

    if (typeof this.game._setAudioPanelVisible === 'function') {
      this.game._setAudioPanelVisible(true);
    }
  }


  /* ============================================================ */
  /* 🪟 2. WIN98 WINDOW MANAGEMENT ENGINE (DRAG/MIN/MAX/FOCUS)     */
  /* ============================================================ */
  _setupClock() {
    const clockEl = document.getElementById('win98-clock');
    if (!clockEl) return;
    const updateTime = () => {
      const now = new Date();
      clockEl.textContent = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };
    updateTime();
    setInterval(updateTime, 1000);
  }

  _setupDesktopWorkspace() {
    const desktopEl = document.querySelector('.win98-desktop') || document.getElementById('crt-os-overlay');
    if (!desktopEl) return;

    const windows = desktopEl.querySelectorAll('.win98-window');
    windows.forEach(win => {
      const appId = win.id.replace('win98-app-', '');
      this._registerWindow(appId, win);
    });

    window.openWin98App = (appId) => this.openApp(appId);
    window.closeWin98App = (appId) => this.closeApp(appId);
    window.minimizeWin98App = (appId) => this.minimizeApp(appId);
    window.maximizeWin98App = (appId) => this.toggleMaximizeApp(appId);
  }

  _registerWindow(appId, win) {
    if (!win) return;

    const titlebar = win.querySelector('.win98-titlebar');
    const titleTextEl = win.querySelector('.win98-title-text');
    const titleText = titleTextEl ? titleTextEl.textContent : `Ứng dụng Win98`;

    let icon = '🪟';
    if (titleText.includes('📝')) icon = '📝';
    if (titleText.includes('💣')) icon = '💣';
    if (titleText.includes('🐍')) icon = '🐍';
    if (titleText.includes('🧩')) icon = '🧩';
    if (titleText.includes('🎨')) icon = '🎨';
    if (titleText.includes('🏎️')) icon = '🏎️';
    if (titleText.includes('🌐')) icon = '🌐';

    if (titlebar && !titlebar.querySelector('.win98-btn-group')) {
      const closeBtn = titlebar.querySelector('.win98-close-btn');
      if (closeBtn) closeBtn.remove();

      const btnGroup = document.createElement('div');
      btnGroup.className = 'win98-btn-group';
      btnGroup.style.cssText = 'display: flex; gap: 2px; align-items: center;';
      btnGroup.innerHTML = `
        <button class="win98-btn-ctrl win98-min-btn" title="Minimize" onclick="window.minimizeWin98App && window.minimizeWin98App('${appId}')">_</button>
        <button class="win98-btn-ctrl win98-max-btn" title="Maximize" onclick="window.maximizeWin98App && window.maximizeWin98App('${appId}')">🗖</button>
        <button class="win98-btn-ctrl win98-close-btn" title="Close" onclick="window.closeWin98App && window.closeWin98App('${appId}')">✕</button>
      `;
      titlebar.appendChild(btnGroup);
    }

    if (titlebar) {
      titlebar.style.cursor = 'move';
      titlebar.addEventListener('mousedown', (e) => this._startDrag(e, appId, win));
      titlebar.addEventListener('touchstart', (e) => this._startDrag(e, appId, win), { passive: false });
    }

    win.addEventListener('mousedown', () => this.focusApp(appId));
    win.addEventListener('touchstart', () => this.focusApp(appId), { passive: true });

    this.apps[appId] = {
      el: win,
      title: titleText,
      icon,
      isMinimized: false,
      isMaximized: false,
      originalRect: {
        top: win.style.top || '60px',
        left: win.style.left || '120px',
        width: win.style.width || '450px',
        height: win.style.height || 'auto'
      }
    };
  }

  _startDrag(e, appId, win) {
    if (e.target.closest('.win98-btn-ctrl') || e.target.closest('button')) return;

    const app = this.apps[appId];
    if (app && app.isMaximized) return;

    if (e.type === 'touchstart') e.preventDefault();

    this.isDragging = true;
    this.dragTarget = win;
    this.activeAppId = appId;
    this.focusApp(appId);

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const rect = win.getBoundingClientRect();
    this.dragOffset.x = clientX - rect.left;
    this.dragOffset.y = clientY - rect.top;
  }

  _bindGlobalWindowEvents() {
    const onMove = (e) => {
      if (!this.isDragging || !this.dragTarget) return;

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const parentEl = this.dragTarget.offsetParent || document.body;
      const parentRect = parentEl.getBoundingClientRect();

      let newLeft = clientX - parentRect.left - this.dragOffset.x;
      let newTop = clientY - parentRect.top - this.dragOffset.y;

      const maxLeft = Math.max(10, parentRect.width - 80);
      const maxTop = Math.max(10, parentRect.height - 60);

      newLeft = Math.max(0, Math.min(newLeft, maxLeft));
      newTop = Math.max(0, Math.min(newTop, maxTop));

      this.dragTarget.style.left = `${newLeft}px`;
      this.dragTarget.style.top = `${newTop}px`;

      const app = this.apps[this.activeAppId];
      if (app && !app.isMaximized) {
        app.originalRect.left = `${newLeft}px`;
        app.originalRect.top = `${newTop}px`;
      }
    };

    const onEnd = () => {
      this.isDragging = false;
      this.dragTarget = null;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchend', onEnd);
  }

  openApp(appId) {
    let app = this.apps[appId];
    if (!app) {
      const win = document.getElementById(`win98-app-${appId}`);
      if (win) {
        this._registerWindow(appId, win);
        app = this.apps[appId];
      }
    }
    if (!app) return;

    app.el.classList.remove('hidden');
    app.el.style.display = 'block';
    app.isMinimized = false;

    if (appId === 'snake') this.startSnake();
    if (appId === 'tetris') this.startTetris();
    if (appId === 'paint') this._resetPaintCanvas();

    this.focusApp(appId);
    this._updateTaskbarItems();
  }

  minimizeApp(appId) {
    const app = this.apps[appId];
    if (!app) return;

    app.isMinimized = true;
    app.el.style.display = 'none';

    if (this.activeAppId === appId) {
      this.activeAppId = null;
    }
    this._updateTaskbarItems();
  }

  toggleMaximizeApp(appId) {
    const app = this.apps[appId];
    if (!app) return;

    const maxBtn = app.el.querySelector('.win98-max-btn');

    if (!app.isMaximized) {
      app.originalRect.top = app.el.style.top || '60px';
      app.originalRect.left = app.el.style.left || '120px';
      app.originalRect.width = app.el.style.width || '450px';
      app.originalRect.height = app.el.style.height || 'auto';

      app.el.style.top = '0px';
      app.el.style.left = '0px';
      app.el.style.width = '100%';
      app.el.style.height = 'calc(100% - 30px)';
      app.isMaximized = true;

      if (maxBtn) maxBtn.textContent = '🗗';
    } else {
      app.el.style.top = app.originalRect.top;
      app.el.style.left = app.originalRect.left;
      app.el.style.width = app.originalRect.width;
      app.el.style.height = app.originalRect.height;
      app.isMaximized = false;

      if (maxBtn) maxBtn.textContent = '🗖';
    }

    this.focusApp(appId);
  }

  closeApp(appId) {
    const app = this.apps[appId];
    if (!app) return;

    app.el.classList.add('hidden');
    app.el.style.display = 'none';
    app.isMinimized = false;
    app.isMaximized = false;

    if (this.activeAppId === appId) {
      this.activeAppId = null;
    }
    this._updateTaskbarItems();
  }

  focusApp(appId) {
    const app = this.apps[appId];
    if (!app || app.isMinimized) return;

    this.topZIndex += 1;
    app.el.style.zIndex = this.topZIndex;
    this.activeAppId = appId;

    Object.keys(this.apps).forEach(id => {
      const item = this.apps[id];
      const titlebar = item.el.querySelector('.win98-titlebar');
      if (titlebar) {
        if (id === appId) {
          titlebar.style.background = 'linear-gradient(90deg, #000080, #1084d0)';
        } else {
          titlebar.style.background = 'linear-gradient(90deg, #808080, #b0b0b0)';
        }
      }
    });

    this._updateTaskbarItems();
  }

  _setupTaskbarInteractions() {
    const taskbarContainer = document.getElementById('win98-task-items');
    if (!taskbarContainer) return;
    this._updateTaskbarItems();
  }

  _updateTaskbarItems() {
    const taskbarContainer = document.getElementById('win98-task-items');
    if (!taskbarContainer) return;

    taskbarContainer.innerHTML = '';

    Object.keys(this.apps).forEach(appId => {
      const app = this.apps[appId];
      if (!app.el.classList.contains('hidden')) {
        const itemBtn = document.createElement('button');
        const isActive = this.activeAppId === appId && !app.isMinimized;

        itemBtn.className = `win98-taskbar-item ${isActive ? 'active' : ''}`;
        itemBtn.style.cssText = `
          background: ${isActive ? '#dfdfdf' : '#c0c0c0'};
          border: 2px solid;
          border-color: ${isActive ? '#808080 #ffffff #ffffff #808080' : '#ffffff #808080 #808080 #ffffff'};
          font-weight: ${isActive ? '900' : 'bold'};
          font-size: 11px;
          padding: 2px 8px;
          height: 22px;
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          max-width: 140px;
          text-overflow: ellipsis;
          white-space: nowrap;
          overflow: hidden;
          font-family: 'Space Grotesk', sans-serif;
        `;

        itemBtn.innerHTML = `<span>${app.icon}</span><span>${app.title}</span>`;

        itemBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (app.isMinimized) {
            this.openApp(appId);
          } else if (this.activeAppId === appId) {
            this.minimizeApp(appId);
          } else {
            this.focusApp(appId);
          }
        });

        taskbarContainer.appendChild(itemBtn);
      }
    });
  }


  /* ============================================================ */
  /* 🐍 3. RẮN SĂN MỒI 98 (SNAKE GAME) ENGINE                    */
  /* ============================================================ */
  _bindSnakeEvents() {
    const btnStart = document.getElementById('btn-snake-start');
    const btnReset = document.getElementById('btn-snake-reset');

    if (btnStart) {
      btnStart.addEventListener('click', (e) => {
        e.stopPropagation();
        this.startSnake();
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', (e) => {
        e.stopPropagation();
        this.resetSnake();
      });
    }

    const dpadBtns = document.querySelectorAll('.snake-dpad-btn');
    dpadBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dir = btn.dataset.dir;
        this.setSnakeDirection(dir);
      });
    });

    window.addEventListener('keydown', (e) => {
      const appEl = document.getElementById('win98-app-snake');
      if (!appEl || appEl.classList.contains('hidden') || !this.snakeState.running) return;

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.setSnakeDirection('up');
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.setSnakeDirection('down');
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.setSnakeDirection('left');
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.setSnakeDirection('right');
    });
  }

  setSnakeDirection(dir) {
    const current = this.snakeState.dir;
    if (dir === 'up' && current.y !== 1) this.snakeState.nextDir = { x: 0, y: -1 };
    if (dir === 'down' && current.y !== -1) this.snakeState.nextDir = { x: 0, y: 1 };
    if (dir === 'left' && current.x !== 1) this.snakeState.nextDir = { x: -1, y: 0 };
    if (dir === 'right' && current.x !== -1) this.snakeState.nextDir = { x: 1, y: 0 };
  }

  startSnake() {
    this.resetSnake();
    this.snakeState.running = true;
    if (this.snakeState.timer) clearInterval(this.snakeState.timer);
    this.snakeState.timer = setInterval(() => this._tickSnake(), 140);

    const statusEl = document.getElementById('snake-status-text');
    if (statusEl) statusEl.textContent = '🟢 Đang săn mồi...';
  }

  resetSnake() {
    if (this.snakeState.timer) clearInterval(this.snakeState.timer);
    this.snakeState.running = false;
    this.snakeState.score = 0;
    this.snakeState.gemsEarned = 0;
    this.snakeState.snake = [
      { x: 7, y: 7 },
      { x: 6, y: 7 },
      { x: 5, y: 7 }
    ];
    this.snakeState.dir = { x: 1, y: 0 };
    this.snakeState.nextDir = { x: 1, y: 0 };
    this._spawnSnakeFood();
    this._renderSnakeCanvas();
    this._updateSnakeHUD();

    const statusEl = document.getElementById('snake-status-text');
    if (statusEl) statusEl.textContent = 'Sẵn sàng! Săn mồi nhận Kim Cương';
  }

  _spawnSnakeFood() {
    const size = this.snakeState.gridSize;
    let valid = false;
    while (!valid) {
      const fx = Math.floor(Math.random() * size);
      const fy = Math.floor(Math.random() * size);
      valid = !this.snakeState.snake.some(seg => seg.x === fx && seg.y === fy);
      if (valid) {
        this.snakeState.food = { x: fx, y: fy };
      }
    }
  }

  _tickSnake() {
    if (!this.snakeState.running) return;

    this.snakeState.dir = { ...this.snakeState.nextDir };
    const head = {
      x: this.snakeState.snake[0].x + this.snakeState.dir.x,
      y: this.snakeState.snake[0].y + this.snakeState.dir.y
    };

    const size = this.snakeState.gridSize;
    if (
      head.x < 0 || head.x >= size || head.y < 0 || head.y >= size ||
      this.snakeState.snake.some(seg => seg.x === head.x && seg.y === head.y)
    ) {
      this._gameOverSnake();
      return;
    }

    this.snakeState.snake.unshift(head);

    if (head.x === this.snakeState.food.x && head.y === this.snakeState.food.y) {
      this.snakeState.score += 10;

      if (this.snakeState.score % 30 === 0) {
        const rewardGems = 5;
        this.snakeState.gemsEarned += rewardGems;
        if (this.game && this.game.currencyManager) {
          this.game.currencyManager.addGems(rewardGems);
        }
        this._showRewardToast(`💎 THƯỞNG +${rewardGems} KIM CƯƠNG THẬT!`);
      }

      if (this.snakeState.score > this.snakeState.highScore) {
        this.snakeState.highScore = this.snakeState.score;
        localStorage.setItem('sgr_snake_highscore', this.snakeState.highScore.toString());
      }
      this._spawnSnakeFood();
    } else {
      this.snakeState.snake.pop();
    }

    this._renderSnakeCanvas();
    this._updateSnakeHUD();
  }

  _gameOverSnake() {
    this.snakeState.running = false;
    if (this.snakeState.timer) clearInterval(this.snakeState.timer);

    const statusEl = document.getElementById('snake-status-text');
    if (statusEl) {
      statusEl.textContent = `💥 GAME OVER! Tổng nhận: ${this.snakeState.gemsEarned} 💎`;
    }
    this.game?.audioManager?.playCollisionSFX?.();
  }

  _updateSnakeHUD() {
    const scoreEl = document.getElementById('snake-score');
    const highEl = document.getElementById('snake-highscore');
    const gemsEl = document.getElementById('snake-gems-earned');

    if (scoreEl) scoreEl.textContent = this.snakeState.score;
    if (highEl) highEl.textContent = this.snakeState.highScore;
    if (gemsEl) gemsEl.textContent = this.snakeState.gemsEarned;
  }

  _renderSnakeCanvas() {
    const canvas = document.getElementById('snake-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = this.snakeState.gridSize;
    const cellW = canvas.width / size;

    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= size; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellW, 0); ctx.lineTo(i * cellW, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellW); ctx.lineTo(canvas.width, i * cellW);
      ctx.stroke();
    }

    const food = this.snakeState.food;
    ctx.fillStyle = '#ff0055';
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(food.x * cellW + cellW / 2, food.y * cellW + cellW / 2, cellW / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    this.snakeState.snake.forEach((seg, index) => {
      ctx.fillStyle = index === 0 ? '#00ffcc' : '#00b894';
      ctx.shadowColor = index === 0 ? '#00ffcc' : 'transparent';
      ctx.shadowBlur = index === 0 ? 6 : 0;
      ctx.fillRect(seg.x * cellW + 1, seg.y * cellW + 1, cellW - 2, cellW - 2);
    });
    ctx.shadowBlur = 0;
  }


  /* ============================================================ */
  /* 🧩 4. XẾP HÌNH 98 (TETRIS GAME) ENGINE                       */
  /* ============================================================ */
  _bindTetrisEvents() {
    const btnStart = document.getElementById('btn-tetris-start');
    const btnReset = document.getElementById('btn-tetris-reset');

    if (btnStart) {
      btnStart.addEventListener('click', (e) => {
        e.stopPropagation();
        this.startTetris();
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', (e) => {
        e.stopPropagation();
        this.resetTetris();
      });
    }

    const tetrisBtns = document.querySelectorAll('.tetris-ctrl-btn');
    tetrisBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        this.handleTetrisAction(action);
      });
    });

    window.addEventListener('keydown', (e) => {
      const appEl = document.getElementById('win98-app-tetris');
      if (!appEl || appEl.classList.contains('hidden') || !this.tetrisState.running) return;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.handleTetrisAction('left');
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.handleTetrisAction('right');
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S' || e.key === ' ') this.handleTetrisAction('drop'); // Phím Xuống / Space lập tức thả rơi gạch!
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.handleTetrisAction('rotate');
    });
  }

  handleTetrisAction(action) {
    if (!this.tetrisState.running) return;

    if (action === 'left') {
      if (this._canMoveTetris(this.tetrisState.currentPiece, { x: this.tetrisState.currentPos.x - 1, y: this.tetrisState.currentPos.y })) {
        this.tetrisState.currentPos.x--;
      }
    } else if (action === 'right') {
      if (this._canMoveTetris(this.tetrisState.currentPiece, { x: this.tetrisState.currentPos.x + 1, y: this.tetrisState.currentPos.y })) {
        this.tetrisState.currentPos.x++;
      }
    } else if (action === 'down') {
      this._dropTetrisPiece();
    } else if (action === 'rotate') {
      const rotated = this._rotateTetrisShape(this.tetrisState.currentPiece);
      if (this._canMoveTetris(rotated, this.tetrisState.currentPos)) {
        this.tetrisState.currentPiece = rotated;
      }
    } else if (action === 'drop') {
      while (this._canMoveTetris(this.tetrisState.currentPiece, { x: this.tetrisState.currentPos.x, y: this.tetrisState.currentPos.y + 1 })) {
        this.tetrisState.currentPos.y++;
      }
      this._lockTetrisPiece();
    }

    this._renderTetrisCanvas();
  }

  startTetris() {
    this.resetTetris();
    this.tetrisState.running = true;
    this._spawnTetrisPiece();
    if (this.tetrisState.timer) clearInterval(this.tetrisState.timer);
    this.tetrisState.timer = setInterval(() => this._dropTetrisPiece(), 500);

    const statusEl = document.getElementById('tetris-status-text');
    if (statusEl) statusEl.textContent = '🧩 Đang xếp gạch...';
  }

  resetTetris() {
    if (this.tetrisState.timer) clearInterval(this.tetrisState.timer);
    this.tetrisState.running = false;
    this.tetrisState.score = 0;
    this.tetrisState.lines = 0;
    this.tetrisState.gemsEarned = 0;
    this.tetrisState.grid = Array(20).fill(null).map(() => Array(10).fill(0));
    this._renderTetrisCanvas();
    this._updateTetrisHUD();

    const statusEl = document.getElementById('tetris-status-text');
    if (statusEl) statusEl.textContent = 'Sẵn sàng! Xếp gạch nhận Kim Cương';
  }

  _spawnTetrisPiece() {
    const idx = Math.floor(Math.random() * this.tetrisShapes.length);
    this.tetrisState.currentPiece = this.tetrisShapes[idx];
    this.tetrisState.currentPieceColorIdx = idx + 1;
    this.tetrisState.currentPos = { x: 3, y: 0 };

    if (!this._canMoveTetris(this.tetrisState.currentPiece, this.tetrisState.currentPos)) {
      this._gameOverTetris();
    }
  }

  _canMoveTetris(shape, pos) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const newX = pos.x + c;
          const newY = pos.y + r;
          if (newX < 0 || newX >= 10 || newY >= 20) return false;
          if (newY >= 0 && this.tetrisState.grid[newY][newX]) return false;
        }
      }
    }
    return true;
  }

  _rotateTetrisShape(shape) {
    const rows = shape.length;
    const cols = shape[0].length;
    const rotated = Array(cols).fill(null).map(() => Array(rows).fill(0));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        rotated[c][rows - 1 - r] = shape[r][c];
      }
    }
    return rotated;
  }

  _dropTetrisPiece() {
    if (!this.tetrisState.running) return;

    if (this._canMoveTetris(this.tetrisState.currentPiece, { x: this.tetrisState.currentPos.x, y: this.tetrisState.currentPos.y + 1 })) {
      this.tetrisState.currentPos.y++;
    } else {
      this._lockTetrisPiece();
    }

    this._renderTetrisCanvas();
  }

  _lockTetrisPiece() {
    const piece = this.tetrisState.currentPiece;
    const pos = this.tetrisState.currentPos;
    const colorIdx = this.tetrisState.currentPieceColorIdx;

    for (let r = 0; r < piece.length; r++) {
      for (let c = 0; c < piece[r].length; c++) {
        if (piece[r][c]) {
          const gy = pos.y + r;
          const gx = pos.x + c;
          if (gy >= 0 && gy < 20) {
            this.tetrisState.grid[gy][gx] = colorIdx;
          }
        }
      }
    }

    let linesCleared = 0;
    for (let r = 19; r >= 0; r--) {
      if (this.tetrisState.grid[r].every(val => val > 0)) {
        this.tetrisState.grid.splice(r, 1);
        this.tetrisState.grid.unshift(Array(10).fill(0));
        linesCleared++;
        r++;
      }
    }

    if (linesCleared > 0) {
      const scoreAdd = [0, 100, 300, 500, 800][linesCleared] || 1000;
      this.tetrisState.score += scoreAdd;
      this.tetrisState.lines += linesCleared;

      const rewardGems = linesCleared * 5;
      this.tetrisState.gemsEarned += rewardGems;
      if (this.game && this.game.currencyManager) {
        this.game.currencyManager.addGems(rewardGems);
      }
      this._showRewardToast(`🧩 XẾP GẠCH TĂNG +${rewardGems} KIM CƯƠNG!`);

      if (this.tetrisState.score > this.tetrisState.highScore) {
        this.tetrisState.highScore = this.tetrisState.score;
        localStorage.setItem('sgr_tetris_highscore', this.tetrisState.highScore.toString());
      }
    }

    this._updateTetrisHUD();
    this._spawnTetrisPiece();
  }

  _gameOverTetris() {
    this.tetrisState.running = false;
    if (this.tetrisState.timer) clearInterval(this.tetrisState.timer);

    const statusEl = document.getElementById('tetris-status-text');
    if (statusEl) {
      statusEl.textContent = `💥 KẾT THÚC! Đã nhận: ${this.tetrisState.gemsEarned} 💎`;
    }
  }

  _updateTetrisHUD() {
    const scoreEl = document.getElementById('tetris-score');
    const linesEl = document.getElementById('tetris-lines');
    const highEl = document.getElementById('tetris-highscore');
    const gemsEl = document.getElementById('tetris-gems-earned');

    if (scoreEl) scoreEl.textContent = this.tetrisState.score;
    if (linesEl) linesEl.textContent = this.tetrisState.lines;
    if (highEl) highEl.textContent = this.tetrisState.highScore;
    if (gemsEl) gemsEl.textContent = this.tetrisState.gemsEarned;
  }

  _renderTetrisCanvas() {
    const canvas = document.getElementById('tetris-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cellW = canvas.width / 10;
    const cellH = canvas.height / 20;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < 20; r++) {
      for (let c = 0; c < 10; c++) {
        const val = this.tetrisState.grid[r][c];
        if (val > 0) {
          ctx.fillStyle = this.tetrisColors[val] || '#38bdf8';
          ctx.fillRect(c * cellW + 1, r * cellH + 1, cellW - 2, cellH - 2);
        } else {
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(c * cellW, r * cellH, cellW, cellH);
        }
      }
    }

    if (this.tetrisState.running && this.tetrisState.currentPiece) {
      const piece = this.tetrisState.currentPiece;
      const pos = this.tetrisState.currentPos;
      ctx.fillStyle = this.tetrisColors[this.tetrisState.currentPieceColorIdx] || '#00ffcc';

      for (let r = 0; r < piece.length; r++) {
        for (let c = 0; c < piece[r].length; c++) {
          if (piece[r][c]) {
            const gx = pos.x + c;
            const gy = pos.y + r;
            if (gy >= 0) {
              ctx.fillRect(gx * cellW + 1, gy * cellH + 1, cellW - 2, cellH - 2);
            }
          }
        }
      }
    }
  }


  /* ============================================================ */
  /* 🎨 5. PAINT 98 (ĐỘ TEM XE / KHẨU HIỆU 3D) ENGINE             */
  /* ============================================================ */
  _bindPaintEvents() {
    const canvas = document.getElementById('paint-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    this._resetPaintCanvas();

    let drawing = false;
    canvas.addEventListener('mousedown', (e) => {
      drawing = true;
      ctx.beginPath();
      const rect = canvas.getBoundingClientRect();
      ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!drawing) return;
      const rect = canvas.getBoundingClientRect();
      ctx.strokeStyle = this.paintState.brushColor;
      ctx.lineWidth = this.paintState.brushSize;
      ctx.lineCap = 'round';
      ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
      ctx.stroke();
    });

    window.addEventListener('mouseup', () => { drawing = false; });

    const colorSwatches = document.querySelectorAll('.paint-color-swatch');
    colorSwatches.forEach(swatch => {
      swatch.addEventListener('click', (e) => {
        e.stopPropagation();
        this.paintState.brushColor = swatch.dataset.color;
        colorSwatches.forEach(s => s.classList.remove('selected'));
        swatch.classList.add('selected');
      });
    });

    const presetBtns = document.querySelectorAll('.paint-preset-btn');
    presetBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sloganInput = document.getElementById('paint-slogan-input');
        if (sloganInput) {
          sloganInput.value = btn.dataset.text;
          this.paintState.sloganText = btn.dataset.text;
          this._renderSloganOnPaint();
        }
      });
    });

    const sloganInput = document.getElementById('paint-slogan-input');
    if (sloganInput) {
      sloganInput.addEventListener('input', () => {
        this.paintState.sloganText = sloganInput.value;
        this._renderSloganOnPaint();
      });
    }

    const btnClear = document.getElementById('btn-paint-clear');
    if (btnClear) {
      btnClear.addEventListener('click', (e) => {
        e.stopPropagation();
        this._resetPaintCanvas();
      });
    }

    const btnApply = document.getElementById('btn-paint-apply');
    if (btnApply) {
      btnApply.addEventListener('click', (e) => {
        e.stopPropagation();
        this.applyCustomDecalToCar();
      });
    }
  }

  _resetPaintCanvas() {
    const canvas = document.getElementById('paint-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#00f5d4';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

    this._renderSloganOnPaint();
  }

  _renderSloganOnPaint() {
    const canvas = document.getElementById('paint-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(8, 8, canvas.width - 16, canvas.height - 16);

    ctx.font = '900 22px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = '#00f5d4';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.paintState.sloganText || 'THÁI BÌNH LỠ BƯỚC', canvas.width / 2, canvas.height / 2);
    ctx.shadowBlur = 0;
  }

  applyCustomDecalToCar() {
    const canvas = document.getElementById('paint-canvas');
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    localStorage.setItem('sgr_custom_car_decal', dataUrl);

    if (this.game && this.game.player && typeof this.game.player.updateCustomDecalTexture === 'function') {
      this.game.player.updateCustomDecalTexture(dataUrl);
    }

    if (this.game && this.game.shop3DScene && typeof this.game.shop3DScene.updateCustomCarDecal === 'function') {
      this.game.shop3DScene.updateCustomCarDecal(dataUrl);
    }

    this._showRewardToast(`✨ ĐÃ DÁN TEM/KHẨU HIỆU LÊN XE 3D!`);
  }

  _showRewardToast(msg) {
    let toast = document.getElementById('win98-toast-reward');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'win98-toast-reward';
      toast.style.cssText = `
        position: fixed; top: 75px; left: 50%; transform: translateX(-50%);
        background: linear-gradient(135deg, #00f5d4, #7928ca); color: #ffffff;
        font-family: "Space Grotesk", sans-serif; font-weight: 800; font-size: 14px;
        padding: 10px 22px; border-radius: 30px; box-shadow: 0 10px 25px rgba(0,245,212,0.4);
        z-index: 100000; pointer-events: none; opacity: 0; transition: all 0.3s ease;
      `;
      document.body.appendChild(toast);
    }

    toast.textContent = msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(-15px)';
    }, 2800);
  }
}
