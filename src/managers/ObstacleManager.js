import * as THREE from 'three';
import {
  Roadblock,
  Barrier,
  VendorCart,
  Vehicle,
  CargoCrate,
  TrafficSign,
  OBSTACLE_TYPES,
  OBSTACLE_CATEGORIES
} from '../entities/Obstacle.js';
import { LANE } from '../utils/Constants.js';

/**
 * ObstacleManager - Quản lý toàn bộ vòng đời, phân loại chướng ngại vật (Thấp, Cao, Dài & Phẳng)
 * và xử lý va chạm AABB + cơ chế chạy trên nóc xe (Platforming) mượt mà.
 */
export class ObstacleManager {
  constructor(scene) {
    this.scene = scene;
    this.obstacles = [];
    this._tempBox = new THREE.Box3();
  }

  /**
   * Sinh ngẫu nhiên chướng ngại vật trên đường chạy
   * @param {Array} collectibles - Danh sách ly cà phê / vật phẩm hiện có để né khoảng cách
   */
  spawnRandomObstacle(collectibles = []) {
    const laneIndex = Math.floor(Math.random() * 3);
    const spawnZ = -85 - Math.random() * 20;

    // 1. Kiểm tra mật độ: không sinh chướng ngại vật quá gần trên cùng làn đường
    const nearbyObstaclesInLane = this.obstacles.filter(obs => {
      const dz = Math.abs(obs.meshGroup.position.z - spawnZ);
      return dz < 18 && obs.laneIndex === laneIndex;
    });

    if (nearbyObstaclesInLane.length > 0) return;

    // 2. Kiểm tra khoảng cách an toàn với ly cà phê CÙNG làn đường (giữ khoảng cách tối thiểu 25m)
    if (collectibles && collectibles.length > 0) {
      const nearbyCollectibleInLane = collectibles.filter(col => {
        if (!col || !col.isAlive || col.isCollected) return false;
        const colLane = col.laneIndex;
        const colZ = col.meshGroup ? col.meshGroup.position.z : 0;
        const dz = Math.abs(colZ - spawnZ);
        return colLane === laneIndex && dz < 25;
      });

      if (nearbyCollectibleInLane.length > 0) return;
    }

    // 3. Đảm bảo không bị nghẽn 3 làn cùng mốc Z (luôn chừa ít nhất 1 làn trống)
    const obstaclesAtSameZ = this.obstacles.filter(obs => Math.abs(obs.meshGroup.position.z - spawnZ) < 8);
    const occupiedLanes = new Set(obstaclesAtSameZ.map(obs => obs.laneIndex));
    if (occupiedLanes.size >= 2 && !occupiedLanes.has(laneIndex)) {
      // 2 làn đã có chướng ngại vật gần đó, bỏ qua để người chơi có đường thoát
      return;
    }

    // Phân bổ tỉ lệ các loại chướng ngại vật:
    // - LOW (Thấp): Roadblock, CargoCrate
    // - HIGH (Cao): Barrier, TrafficSign
    // - LONG_PLATFORM (Dài & Phẳng): Vehicle Bus, Vehicle Double Decker, Vehicle Bike, VendorCart
    const availableTypes = [
      OBSTACLE_TYPES.ROADBLOCK,
      OBSTACLE_TYPES.BARRIER,
      OBSTACLE_TYPES.VENDOR_CART,
      OBSTACLE_TYPES.VEHICLE_BUS,
      OBSTACLE_TYPES.VEHICLE_DOUBLE_DECKER,
      OBSTACLE_TYPES.VEHICLE_HANOI_BUS,
      OBSTACLE_TYPES.VEHICLE_VINBUS,
      OBSTACLE_TYPES.VEHICLE_BIKE,
      'CARGO_CRATE',
      'TRAFFIC_SIGN'
    ];

    const chosenType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    let obstacle = null;

    switch (chosenType) {
      case OBSTACLE_TYPES.ROADBLOCK:
        obstacle = new Roadblock(this.scene, laneIndex, spawnZ);
        break;
      case OBSTACLE_TYPES.BARRIER:
        obstacle = new Barrier(this.scene, laneIndex, spawnZ);
        break;
      case OBSTACLE_TYPES.VENDOR_CART:
        obstacle = new VendorCart(this.scene, laneIndex, spawnZ);
        break;
      case OBSTACLE_TYPES.VEHICLE_BUS:
        obstacle = new Vehicle(this.scene, OBSTACLE_TYPES.VEHICLE_BUS, laneIndex, spawnZ);
        break;
      case OBSTACLE_TYPES.VEHICLE_DOUBLE_DECKER:
        obstacle = new Vehicle(this.scene, OBSTACLE_TYPES.VEHICLE_DOUBLE_DECKER, laneIndex, spawnZ);
        break;
      case OBSTACLE_TYPES.VEHICLE_HANOI_BUS:
        obstacle = new Vehicle(this.scene, OBSTACLE_TYPES.VEHICLE_HANOI_BUS, laneIndex, spawnZ);
        break;
      case OBSTACLE_TYPES.VEHICLE_VINBUS:
        obstacle = new Vehicle(this.scene, OBSTACLE_TYPES.VEHICLE_VINBUS, laneIndex, spawnZ);
        break;
      case OBSTACLE_TYPES.VEHICLE_BIKE:
        obstacle = new Vehicle(this.scene, OBSTACLE_TYPES.VEHICLE_BIKE, laneIndex, spawnZ);
        break;
      case 'CARGO_CRATE':
        obstacle = new CargoCrate(this.scene, laneIndex, spawnZ, Math.random() < 0.5 ? 'WOOD' : 'PLASTIC');
        break;
      case 'TRAFFIC_SIGN':
        obstacle = new TrafficSign(this.scene, laneIndex, spawnZ);
        break;
    }

    if (obstacle) {
      obstacle.laneIndex = laneIndex;
      obstacle.isAlive = true;
      this.obstacles.push(obstacle);
    }
  }

  /**
   * Cập nhật vị trí toàn bộ chướng ngại vật
   */
  update(deltaTime, currentSpeed) {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.update(deltaTime, currentSpeed);
    }
  }

  /**
   * Xử lý va chạm nâng cao & Platforming (chạy trên nóc xe)
   * @param {Player} player - Đối tượng nhân vật
   * @param {boolean} isFeverOrBoost - Đang ở trạng thái Fever / Boost bất tử
   * @param {number} scoreMult - Hệ số nhân điểm
   * @param {AudioManager} audioManager - Bộ quản lý âm thanh
   * @param {Object} callbacks - Chứa onSmash, onShieldBreak, onGameOver
   */
  checkCollisionAndPlatforming(player, isFeverOrBoost, scoreMult, audioManager, callbacks) {
    if (!player) return;

    const playerPos = player.meshGroup.position;
    const playerBox = player.boundingBox;
    let standingOnVehicleRoof = false;

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      const obsBox = obs.boundingBox;

      // ----------------------------------------------------
      // 1. LOGIC CHẠY TRÊN NÓC XE (PLATFORMING)
      // ----------------------------------------------------
      if (obs.category === OBSTACLE_CATEGORIES.LONG_PLATFORM) {
        const vehicleRoofY = obsBox.max.y;

        // Kiểm tra xem vị trí X, Z của nhân vật có nằm trong diện tích mặt nóc ô tô/xe máy/container không
        const isOverVehicleRoof = (
          playerPos.x >= obsBox.min.x - 0.25 &&
          playerPos.x <= obsBox.max.x + 0.25 &&
          playerPos.z >= obsBox.min.z - 0.35 &&
          playerPos.z <= obsBox.max.z + 0.35
        );

        // Nếu chân nhân vật cao hơn hoặc ngang đỉnh ô tô (với dung sai 0.35m)
        if (isOverVehicleRoof && playerPos.y >= vehicleRoofY - 0.35) {
          standingOnVehicleRoof = true;
          // Ép vị trí mặt đất tạm thời của nhân vật bằng đỉnh ô tô
          player.currentPlatformY = vehicleRoofY;
        }
      }

      // ----------------------------------------------------
      // 2. LOGIC VA CHẠM AABB DỰA TRÊN PHÂN LOẠI
      // ----------------------------------------------------
      const isStandingSafelyOnTop = (
        obs.category === OBSTACLE_CATEGORIES.LONG_PLATFORM &&
        player.currentPlatformY > 0 &&
        playerPos.y >= obsBox.max.y - 0.25
      );

      if (!isStandingSafelyOnTop && playerBox.intersectsBox(obsBox)) {
        if (isFeverOrBoost) {
          if (callbacks.onSmash) callbacks.onSmash(obs);
          audioManager.playSmash();
          obs.dispose();
          this.obstacles.splice(i, 1);
          continue;
        } else if (player.hasShield) {
          player.consumeShield();
          audioManager.playShieldBreak();
          obs.dispose();
          this.obstacles.splice(i, 1);
          continue;
        } else {
          if (callbacks.onGameOver) callbacks.onGameOver(obs);
          return;
        }
      }

      // ----------------------------------------------------
      // 3. DỌN DẸP CHƯỚNG NGẠI VẬT ĐÃ CHẠY QUA
      // ----------------------------------------------------
      if (obs.meshGroup.position.z > 45) {
        obs.dispose();
        this.obstacles.splice(i, 1);
      }
    }

    // Khi nhân vật chạy vượt quá chiều dài ô tô hoặc đổi làn ra khỏi xe,
    // hủy cao độ nóc xe để nhân vật rơi tự do về lại mặt đường Y = 0
    if (!standingOnVehicleRoof && player.currentPlatformY > 0) {
      player.currentPlatformY = 0;
    }
  }

  /**
   * Xóa toàn bộ chướng ngại vật và giải phóng bộ nhớ
   */
  clear() {
    this.obstacles.forEach(obs => obs.dispose());
    this.obstacles = [];
  }
}
