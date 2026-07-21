import * as THREE from 'three'; //Code viet anh sửa start
import { PipelineManager } from './ModelPipelineManager.js';
import { CHARACTERS, EXTRA_MODELS } from '../utils/Constants.js';

class AssetManagerClass {
  constructor() {
    this.pipeline = PipelineManager;
    this.loaded = false;
  }

  // Tải TOÀN BỘ model GLB ngay khi bật game -> Đảm bảo Showroom & Game không bao giờ bị trắng/mất model
  loadAll(onProgress, onLoad) {
    if (this.loaded) {
      if (onLoad) onLoad();
      return;
    }

    // Tự động gom toàn bộ file GLB khai báo từ Constants
    const modelsToLoad = { ...EXTRA_MODELS };

    Object.values(CHARACTERS).forEach((char) => {
      if (char.modelKey && char.modelPath) {
        modelsToLoad[char.modelKey] = char.modelPath;
      }
    });

    // Thêm các alias để tương thích ngược 100% với code cũ
    if (modelsToLoad.student) modelsToLoad.player = modelsToLoad.student;
    if (modelsToLoad.lamborghini) modelsToLoad.car_driver = modelsToLoad.lamborghini;

    this.pipeline.loadModels(
      modelsToLoad,
      (progress) => {
        if (onProgress) onProgress(progress);
      },
      () => {
        this.loaded = true;
        if (onLoad) onLoad();
      }
    );
  }

  getModel(key) {
    return this.pipeline.cloneModel(key);
  }

  spawnRealModel(modelKey, zOffset, side = 'left', options = {}) {
    return this.pipeline.spawnRealModel(modelKey, zOffset, side, options);
  }

  /**
   * Khởi tạo cụm InstancedMesh cho mô hình Cây 3D (maple_tree.glb hoặc pine_tree.glb)
   */
  createInstancedTreeGroup(modelKey = 'maple_tree', maxCount = 100, targetHeight = 5.8) {
    return this.pipeline.createInstancedTreeGroup(modelKey, maxCount, targetHeight);
  }
}

export const AssetManager = new AssetManagerClass();
//Code viet anh sửa end