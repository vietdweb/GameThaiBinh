import * as THREE from 'three';
import { PipelineManager } from './ModelPipelineManager.js';
import { createPremiumStylizedTree } from '../entities/StylizedTree.js';

class AssetManagerClass {
  constructor() {
    this.pipeline = PipelineManager;
    this.loaded = false;
  }

  loadAll(onProgress, onLoad) {
    if (this.loaded) {
      if (onLoad) onLoad();
      return;
    }

    // Danh sách các mô hình GLB thực tế trong public/models/
    const modelsToLoad = {
      student: '/models/student.glb',
      ferrari: '/models/ferrari.glb',
      lamborghini: '/models/lamborghini.glb',
      maple_tree: '/models/maple_tree.glb',
      pine_tree: '/models/pine_tree.glb',
      cyberpsycho_car: '/models/cyberpsycho_car.glb'
    };

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
   * Gộp geometry theo material, giảm Draw Calls xuống còn 1-2 Draw Calls duy nhất!
   */
  createInstancedTreeGroup(modelKey = 'maple_tree', maxCount = 100, targetHeight = 5.8) {
    return this.pipeline.createInstancedTreeGroup(modelKey, maxCount, targetHeight);
  }
}

export const AssetManager = new AssetManagerClass();
