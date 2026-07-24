import * as THREE from 'three';
import { WEATHER_TYPES, WEATHER_CONFIG, POWERUP_CONFIG, MAP_TYPES } from '../utils/Constants.js';

export class WeatherManager {
  /**
   * @param {Game} game - Instance chính của Game
   */
  constructor(game) {
    this.game = game;
    this.isActive = false;

    // Trạng thái Thời Tiết & Chu Kỳ Ngày/Đêm
    this.currentWeather = WEATHER_TYPES.CLEAR_DAY;
    this.cycleTime = 0;
    this.isRaining = false;
    this.rainDurationLeft = 0;
    this.roadWetness = 0; // 0 (khô) -> 1 (ướt sũng)

    // Sấm sét lightning
    this.lightningTimer = 0;
    this.isLightningFlashing = false;

    // Power-up Áo Mưa Tiện Lợi
    this.raincoatTimer = 0;

    // Rain Particle System
    this.rainParticleCount = 600;
    this.rainGroup = null;
    this.rainGeometry = null;

    // Cached lighting targets
    this.targetSunColor = new THREE.Color(0xfff8e7);
    this.targetSunIntensity = 1.5;
    this.targetSkyColor = new THREE.Color(0x8ad2f1);
    this.targetFogColor = new THREE.Color(0x8ad2f1);

    // Weather Badge HUD
    this.badgeEl = null;
  }

  /**
   * Khởi tạo hệ thống Thời Tiết & Hạt Mưa 3D
   */
  init() {
    this.badgeEl = document.getElementById('weather-status-badge');
    this._createRainParticleSystem();
  }

  /**
   * Tạo Hệ Thống Hạt Mưa 3D (800 Rain Streaks)
   */
  _createRainParticleSystem() {
    if (!this.game.sceneManager || !this.game.sceneManager.scene) return;

    this.rainGroup = new THREE.Group();
    const positions = new Float32Array(this.rainParticleCount * 6); // 2 vertices per line streak

    for (let i = 0; i < this.rainParticleCount; i++) {
      const x = (Math.random() - 0.5) * 35;
      const y = Math.random() * 20;
      const z = (Math.random() - 0.5) * 60;

      // Top vertex
      positions[i * 6 + 0] = x;
      positions[i * 6 + 1] = y + 1.2;
      positions[i * 6 + 2] = z;

      // Bottom vertex
      positions[i * 6 + 3] = x - 0.2;
      positions[i * 6 + 4] = y;
      positions[i * 6 + 5] = z - 0.5;
    }

    this.rainGeometry = new THREE.BufferGeometry();
    this.rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const rainMaterial = new THREE.LineBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.65,
      linewidth: 1.5
    });

    this.rainMesh = new THREE.LineSegments(this.rainGeometry, rainMaterial);
    this.rainGroup.add(this.rainMesh);
    this.rainGroup.visible = false;

    this.game.sceneManager.scene.add(this.rainGroup);
  }

  /**
   * Kích hoạt Áo Mưa Tiện Lợi (Power-up)
   */
  activateRaincoat() {
    this.raincoatTimer = POWERUP_CONFIG.RAINCOAT_DURATION;
    if (this.game._showStreamToast) {
      this.game._showStreamToast('🧥 Đã khoác Áo Mưa Tiện Lợi! (Chống trượt & X2 điểm trên đường ướt)');
    }
  }

  /**
   * Cập nhật logic Ngày/Đêm & Mưa Rào thời gian thực trong Game Loop
   */
  update(dt, playerPosition, camera) {
    if (this.game.stateMachine.currentState !== 'PLAYING' && this.game.stateMachine.currentState !== 'FEVER') {
      if (this.badgeEl) this.badgeEl.style.display = 'none';
      return;
    }

    // Nếu ở Map 1 (Đường Phố Thái Bình - Nắng Ấm Mặc Định): Khôi phục thời tiết nắng rực rỡ, không mưa
    if (this.game.selectedMap === MAP_TYPES.MAP1_THAIBINH) {
      if (this.badgeEl) this.badgeEl.style.display = 'none';
      if (this.isRaining) this.isRaining = false;
      if (this.rainGroup) this.rainGroup.visible = false;
      if (this.game.environment) {
        this.game.environment.setRoadWetness(0);
        this.game.environment.setStreetLightsState(false);
      }
      return;
    }

    if (this.badgeEl) this.badgeEl.style.display = 'flex';

    // 0. Giảm đếm ngược Áo Mưa Tiện Lợi
    if (this.raincoatTimer > 0) {
      this.raincoatTimer = Math.max(0, this.raincoatTimer - dt * 1000);
    }

    // 1. Cập nhật Chu Kỳ Ngày / Đêm Động (90 giây / chu kỳ)
    this.cycleTime += dt;
    const normTime = (this.cycleTime % WEATHER_CONFIG.CYCLE_DURATION_SECONDS) / WEATHER_CONFIG.CYCLE_DURATION_SECONDS;

    this._updateDayNightCycle(normTime, dt);

    // 2. Cập nhật Cơn Mưa Rào Sài Gòn (Mưa ngẫu nhiên)
    this._updateRainstormSystem(dt, playerPosition, camera);

    // 3. Cập nhật Độ Ướt Mặt Đường PBR & Đèn Đường
    this._updateRoadAndLightingPBR(dt);
  }

  /**
   * Tính toán hòa trộn màu sắc Ngày -> Hoàng Hôn -> Đêm Neon -> Bình Minh
   */
  _updateDayNightCycle(normTime, dt) {
    const scene = this.game.sceneManager ? this.game.sceneManager.scene : null;
    const sunLight = this.game.sceneManager ? this.game.sceneManager.dirLight : null;
    const hemiLight = this.game.sceneManager ? this.game.sceneManager.hemiLight : null;

    if (!scene) return;

    let phaseName = 'BAN NGÀY';
    let icon = '🌤️';

    // 0.0 -> 0.35: BAN NGÀY (CLEAR_DAY)
    if (normTime < 0.35) {
      this.targetSunColor.setHex(0xfff8e7);
      this.targetSunIntensity = 1.5;
      this.targetSkyColor.setHex(0x8ad2f1);
      this.targetFogColor.setHex(0x8ad2f1);
      phaseName = 'BAN NGÀY';
      icon = '🌤️';
      if (this.game.environment) this.game.environment.setStreetLightsState(false);
    }
    // 0.35 -> 0.55: HOÀNG HÔN (SUNSET)
    else if (normTime < 0.55) {
      this.targetSunColor.setHex(0xf97316); // Cam ấm hoàng hôn
      this.targetSunIntensity = 1.1;
      this.targetSkyColor.setHex(0xd97706);
      this.targetFogColor.setHex(0x9a3412);
      phaseName = 'HOÀNG HÔN';
      icon = '🌇';
      if (this.game.environment) this.game.environment.setStreetLightsState(true, 0.6);
    }
    // 0.55 -> 0.85: ĐÊM NEON (NEON_NIGHT)
    else if (normTime < 0.85) {
      this.targetSunColor.setHex(0x4338ca); // Tím neon đêm
      this.targetSunIntensity = 0.4;
      this.targetSkyColor.setHex(0x0f172a);
      this.targetFogColor.setHex(0x1e1b4b);
      phaseName = 'ĐÊM NEON';
      icon = '🌃';
      if (this.game.environment) this.game.environment.setStreetLightsState(true, 1.2);
    }
    // 0.85 -> 1.0: BÌNH MINH (DAYBREAK)
    else {
      this.targetSunColor.setHex(0xfdba74);
      this.targetSunIntensity = 1.0;
      this.targetSkyColor.setHex(0x38bdf8);
      this.targetFogColor.setHex(0x0284c7);
      phaseName = 'BÌNH MINH';
      icon = '🌅';
      if (this.game.environment) this.game.environment.setStreetLightsState(false);
    }

    // Nội suy mượt mà ánh sáng (Lerp)
    const lerpSpeed = dt * 1.5;

    if (sunLight) {
      sunLight.color.lerp(this.targetSunColor, lerpSpeed);
      sunLight.intensity = THREE.MathUtils.lerp(sunLight.intensity, this.targetSunIntensity, lerpSpeed);
    }

    if (scene.fog) {
      scene.fog.color.lerp(this.targetFogColor, lerpSpeed);
    }

    if (this.game.sceneManager.renderer) {
      this.game.sceneManager.renderer.setClearColor(scene.fog ? scene.fog.color : this.targetSkyColor);
    }

    // Cập nhật Badge HUD
    if (this.badgeEl && !this.isRaining) {
      this.badgeEl.innerHTML = `<span>${icon}</span> <span>${phaseName}</span>`;
    }
  }

  /**
   * Quản lý Cơn Mưa Rào Sài Gòn & Hạt Mưa 3D
   */
  _updateRainstormSystem(dt, playerPosition, camera) {
    // Ngẫu nhiên kích hoạt mưa rào rầm rộ
    if (!this.isRaining) {
      // 35% xác suất mưa khi đếm timer
      if (Math.random() < (WEATHER_CONFIG.RAIN_CHANCE_PERCENT / 100) * dt * 0.05) {
        this.isRaining = true;
        this.rainDurationLeft = WEATHER_CONFIG.RAIN_DURATION_SECONDS;
        if (this.game._showStreamToast) {
          this.game._showStreamToast('🌧️ Cơn Mưa Rào Sài Gòn ập đến! Đường sũng nước!');
        }
      }
    } else {
      this.rainDurationLeft -= dt;
      if (this.rainDurationLeft <= 0) {
        this.isRaining = false;
        if (this.game._showStreamToast) {
          this.game._showStreamToast('🌤️ Mưa rào đã tạnh! Đường phố khô ráo.');
        }
      }
    }

    // Tăng / Giảm độ ướt mặt đường
    const targetWetness = this.isRaining ? 1.0 : 0.0;
    this.roadWetness = THREE.MathUtils.lerp(this.roadWetness, targetWetness, dt * 0.8);

    // Di chuyển Hạt Mưa 3D theo vị trí xe & camera
    if (this.rainGroup && camera) {
      this.rainGroup.visible = this.roadWetness > 0.05;

      if (this.rainGroup.visible) {
        const camPos = camera.position;
        this.rainGroup.position.set(camPos.x, camPos.y - 4, camPos.z - 15);

        // Animate rơi hạt mưa cuồn cuộn
        const posAttr = this.rainGeometry.attributes.position;
        const array = posAttr.array;

        for (let i = 0; i < this.rainParticleCount; i++) {
          array[i * 6 + 1] -= dt * 35; // Rơi xuống nhanh
          array[i * 6 + 4] -= dt * 35;

          // Loop reset khi rơi quá thấp
          if (array[i * 6 + 1] < -10) {
            array[i * 6 + 1] += 25;
            array[i * 6 + 4] += 25;
          }
        }
        posAttr.needsUpdate = true;

        // Sấm sét lóe sáng ngẫu nhiên
        if (Math.random() < WEATHER_CONFIG.LIGHTNING_CHANCE && !this.isLightningFlashing) {
          this._triggerLightningFlash();
        }
      }
    }

    // Cập nhật Badge HUD khi đang mưa
    if (this.badgeEl && this.isRaining) {
      this.badgeEl.innerHTML = `<span style="color: #60a5fa;">🌧️ MƯA RÀO SÀI GÒN</span>`;
    }
  }

  /**
   * Hiệu ứng Chớp Sáng Sấm Sét
   */
  _triggerLightningFlash() {
    const sunLight = this.game.sceneManager ? this.game.sceneManager.dirLight : null;
    if (!sunLight) return;

    this.isLightningFlashing = true;
    const oldIntensity = sunLight.intensity;
    sunLight.intensity = 4.2; // Surge chớp lóe sáng rực rỡ
    sunLight.color.setHex(0xffffff);

    setTimeout(() => {
      sunLight.intensity = oldIntensity;
      this.isLightningFlashing = false;
    }, 90);
  }

  /**
   * Cập nhật độ nhẵn bóng PBR mặt đường nhựa ướt nước
   */
  _updateRoadAndLightingPBR(dt) {
    if (this.game.environment) {
      this.game.environment.setRoadWetness(this.roadWetness);
    }
  }
}
