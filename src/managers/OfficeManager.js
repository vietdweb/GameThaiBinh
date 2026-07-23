/**
 * OfficeManager.js - Manager for Computer Office 3D Retro Scene
 * Features:
 * 1. Manages Entering & Exiting 3D Retro Office Scene
 * 2. Enforces UI HUD Visibility Rules (Hides Top Currency Bar & Audio Panel in 3D Office)
 * 3. Handles Menu button (#btn-open-office) and Exit Map button (#btn-exit-office-3d)
 */
export class OfficeManager {
  constructor(game, computerOfficeScene) {
    this.game = game;
    this.computerOfficeScene = computerOfficeScene;
    this._setupEvents();
  }

  _setupEvents() {
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

  /* 💻 ENTER 3D RETRO OFFICE MAP */
  enterOfficeMap() {
    const mainMenuPanel = document.querySelector('.main-menu-panel') || document.getElementById('main-menu');
    const btnExitOffice = document.getElementById('btn-exit-office-3d');

    // 1. Enforce UI HUD Visibility Rules (Hide Top Currency Bar & Audio Panel)
    if (typeof this.game._setAudioPanelVisible === 'function') {
      this.game._setAudioPanelVisible(false);
    }
    const currencyBar = document.getElementById('top-currency-bar');
    if (currencyBar) currencyBar.classList.remove('visible-in-menu');

    // 2. Hide Main Menu
    if (mainMenuPanel) mainMenuPanel.style.display = 'none';

    // 3. Activate 3D Computer Office Scene
    if (this.computerOfficeScene) {
      this.computerOfficeScene.activate();
    }

    // 4. Show Exit Office Map Button
    if (btnExitOffice) {
      btnExitOffice.classList.remove('hidden');
    }
  }

  /* 🚪 EXIT 3D RETRO OFFICE MAP -> RETURN TO MENU */
  exitOfficeMap() {
    const mainMenuPanel = document.querySelector('.main-menu-panel') || document.getElementById('main-menu');
    const btnExitOffice = document.getElementById('btn-exit-office-3d');

    // 1. Deactivate Scene
    if (this.computerOfficeScene) {
      this.computerOfficeScene.deactivate();
    }

    // 2. Restore Main Menu
    if (mainMenuPanel) mainMenuPanel.style.display = 'flex';

    // 3. Hide Exit Map Button
    if (btnExitOffice) {
      btnExitOffice.classList.add('hidden');
    }

    // 4. Restore Currency Bar & Audio Panel for Menu
    const currencyBar = document.getElementById('top-currency-bar');
    if (currencyBar) currencyBar.classList.add('visible-in-menu');

    if (typeof this.game._setAudioPanelVisible === 'function') {
      this.game._setAudioPanelVisible(true);
    }
  }
}
