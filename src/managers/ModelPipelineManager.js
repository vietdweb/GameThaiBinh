import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * ModelPipelineManager.js - Quản lý Tải, Override Vật Liệu PBR & Gộp Hình Học InstancedMesh cho Mô Hình GLB
 * Áp dụng kỹ năng threejs-performance-instancing và threejs-sketchfab-pipeline
 */
export class ModelPipelineManager {
  constructor() {
    this.loadingManager = new THREE.LoadingManager();
    this.gltfLoader = new GLTFLoader(this.loadingManager);

    this.loadedGLTFs = {};
    this.loadedModels = {};
    this.isLoaded = false;

    this.defaultMaterialConfig = {
      roughness: 0.7,
      metalness: 0.1,
      overrideShadows: true
    };
  }

  /**
   * 1. Tải các mô hình GLTF/GLB với đếm bất đồng bộ fail-safe 100%
   */
  loadModels(modelManifest, onProgress, onLoad) {
    if (this.isLoaded) {
      if (onLoad) onLoad();
      return;
    }

    const entries = Object.entries(modelManifest);
    const totalItems = entries.length;

    if (totalItems === 0) {
      this.isLoaded = true;
      if (onLoad) onLoad();
      return;
    }

    let completedItems = 0;

    const checkItemCompleted = () => {
      completedItems++;
      const progressPercentage = Math.min((completedItems / totalItems) * 100, 100);
      if (onProgress) onProgress(progressPercentage);

      if (completedItems >= totalItems) {
        this.isLoaded = true;
        console.log('✅ [ModelPipeline] Tất cả mô hình 3D đã được nạp thành công!');
        if (onLoad) onLoad();
      }
    };

    entries.forEach(([key, path]) => {
      this.gltfLoader.load(
        path,
        (gltf) => {
          this.loadedGLTFs[key] = gltf;
          this.processGLTFMaterials(gltf.scene);
          this.loadedModels[key] = gltf.scene;
          checkItemCompleted();
        },
        undefined,
        (error) => {
          console.warn(`[ModelPipeline] Không tìm thấy file 3D '${key}' tại '${path}'. Bỏ qua an toàn.`);
          checkItemCompleted();
        }
      );
    });
  }

  /**
   * 2. Duyệt qua từng mesh con của GLTF để xử lý Material lá cây & thân cây theo 5 quy tắc tối ưu
   * @param {THREE.Object3D} scene 
   */
  processGLTFMaterials(scene) {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((mat) => {
            // Tắt blend để tránh lỗi đè lớp depth sorting
            mat.transparent = false;
            mat.depthWrite = true;
            mat.depthTest = true;
            mat.side = THREE.DoubleSide;

            if (mat.map) {
              mat.map.colorSpace = THREE.SRGBColorSpace;
              mat.color.setHex(0x999999);

              // Inject Shader can thiệp vào Fragment Shader để tự động đục thủng điểm ảnh trắng đục (#FFFFFF)
              mat.onBeforeCompile = (shader) => {
                shader.fragmentShader = shader.fragmentShader.replace(
                  '#include <clipping_planes_fragment>',
                  `
                  #include <clipping_planes_fragment>
                  
                  // Lấy màu sắc hiện tại của pixel texture
                  vec4 texColor = texture2D( map, vMapUv );
                  
                  // Nếu pixel đó có màu thiên về màu trắng đục của viền (R > 0.75, G > 0.75, B > 0.75)
                  if (texColor.r > 0.75 && texColor.g > 0.75 && texColor.b > 0.75) {
                      discard; // Đục thủng pixel nền trắng
                  }
                  `
                );
              };
            }

            if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
              mat.roughness = 1.0;
              mat.metalness = 0.0;
            }

            mat.needsUpdate = true;
          });
        }
      }
    });
  }

  cloneModel(key) {
    const gltf = this.loadedGLTFs[key];
    if (!gltf) return null;

    const rawScene = gltf.scene;
    const hasSkeletonOrAnimations = (gltf.animations && gltf.animations.length > 0) || this.hasSkinnedMesh(rawScene);

    if (hasSkeletonOrAnimations) {
      return SkeletonUtils.clone(rawScene);
    } else {
      return rawScene.clone();
    }
  }

  hasSkinnedMesh(object) {
    let found = false;
    object.traverse((child) => {
      if (child.isSkinnedMesh) found = true;
    });
    return found;
  }

  /**
   * 3. Thuật toán Gộp Hình Học (BufferGeometryUtils.mergeGeometries) & Khởi Tạo InstancedMesh
   * Gộp tất cả sub-mesh của maple_tree.glb thành 1-2 geometry duy nhất để giảm Draw Calls từ 1000s xuống 1-2!
   * @param {string} modelKey Key mô hình (vd: 'maple_tree')
   * @param {number} maxCount Số lượng thực thể tối đa (mặc định 100)
   * @param {number} targetHeight Chiều cao mục tiêu chuẩn (mặc định 4.8m)
   */
  createInstancedTreeGroup(modelKey, maxCount = 100, targetHeight = 5.8) {
    const rawModel = this.cloneModel(modelKey);
    if (!rawModel) return null;

    // 3a. Auto-scale mô hình gốc về chiều cao chuẩn 5.8m cao lớn thanh thoát
    const bbox = new THREE.Box3().setFromObject(rawModel);
    const size = bbox.getSize(new THREE.Vector3());
    if (size.y > 0 && isFinite(size.y)) {
      const scaleFactor = targetHeight / size.y;
      rawModel.scale.set(scaleFactor, scaleFactor, scaleFactor);
    }

    // Cập nhật ma trận toàn cục trước khi trích xuất Geometry
    rawModel.updateMatrixWorld(true);

    // 3b. Gom nhóm các geometry theo chất liệu (Material)
    const materialMap = new Map();

    rawModel.traverse((child) => {
      if (child.isMesh && child.geometry) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((mat) => {
          if (!mat) return;
          if (!materialMap.has(mat)) {
            materialMap.set(mat, []);
          }
          const geomCopy = child.geometry.clone();
          geomCopy.applyMatrix4(child.matrixWorld);
          materialMap.get(mat).push(geomCopy);
        });
      }
    });

    const instancedGroup = new THREE.Group();
    const instancedMeshes = [];

    // 3c. Gộp geometry (mergeGeometries) & Tạo InstancedMesh cho từng chất liệu
    materialMap.forEach((geometries, mat) => {
      if (geometries.length > 0) {
        const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries, false);
        if (mergedGeometry) {
          mat.transparent = false; // Tắt transparent dạng blend để loại bỏ Depth Sorting Bug
          mat.depthWrite = true;
          mat.depthTest = true;
          mat.side = THREE.DoubleSide;

          if (mat.map) {
            mat.map.colorSpace = THREE.SRGBColorSpace;
            
            // Xử lý độ sáng riêng cho Cây Thông (Pine Tree): Bật emissive phát sáng nhẹ trong đêm
            if (modelKey === 'pine_tree') {
              mat.emissive = new THREE.Color(0x333333); // Tự phát sáng nhẹ xám/xanh tối kích sáng chi tiết
              mat.emissiveIntensity = 1.0;
              mat.color.setHex(0xaaaaaa);
            } else {
              mat.color.setHex(0x999999);
            }

            mat.onBeforeCompile = (shader) => {
              shader.fragmentShader = shader.fragmentShader.replace(
                '#include <clipping_planes_fragment>',
                `
                #include <clipping_planes_fragment>
                
                vec4 texColor = texture2D( map, vMapUv );
                if (texColor.r > 0.75 && texColor.g > 0.75 && texColor.b > 0.75) {
                    discard;
                }
                `
              );
            };
          }

          if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
            mat.roughness = 1.0;
            mat.metalness = 0.0;
          }

          mat.needsUpdate = true;

          const instancedMesh = new THREE.InstancedMesh(mergedGeometry, mat, maxCount);
          instancedMesh.castShadow = true;
          instancedMesh.receiveShadow = true;
          instancedMesh.count = 0; // Ban đầu 0 thực thể

          instancedGroup.add(instancedMesh);
          instancedMeshes.push(instancedMesh);
        }
      }
    });

    // Dummy Matrix4 cho việc tính toán biến đổi vị trí
    const dummyMatrix = new THREE.Matrix4();
    const dummyPos = new THREE.Vector3();
    const dummyQuat = new THREE.Quaternion();
    const dummyScale = new THREE.Vector3();

    return {
      group: instancedGroup,
      instancedMeshes: instancedMeshes,

      /**
       * Cập nhật ma trận vị trí thực thể cây tại chỉ số index (0..maxCount-1)
       */
      setInstanceTransform(index, x, y, z, scale = 1.0, rotY = 0) {
        if (index < 0 || index >= maxCount) return; // Bảo vệ an toàn chống lỗi crash/đơ màn hình nếu vượt maxCount

        dummyPos.set(x, y, z);
        dummyQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY);

        // Kéo giãn riêng trục Y (chiều cao) cho cả Cây Thông (1.65x) và Cây Phong (1.5x)
        const scaleX = scale;
        const scaleY = (modelKey === 'pine_tree') ? scale * 1.65 : scale * 1.5;
        const scaleZ = scale;

        dummyScale.set(scaleX, scaleY, scaleZ);
        dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);

        instancedMeshes.forEach((im) => {
          im.setMatrixAt(index, dummyMatrix);
        });
      },

      /**
       * Thông báo cho GPU cập nhật ma trận biến đổi & số lượng thực thể hiển thị
       */
      updateInstances(activeCount) {
        const count = Math.min(Math.max(0, activeCount), maxCount);
        instancedMeshes.forEach((im) => {
          im.count = count;
          im.instanceMatrix.needsUpdate = true;
        });
      }
    };
  }

  spawnRealModel(modelKey, zOffset, side = 'left', customOptions = {}) {
    const clonedMesh = this.cloneModel(modelKey);
    if (!clonedMesh) return null;

    const defaultX = side === 'left' ? -4.8 : 4.8;
    const posX = customOptions.customX !== undefined ? customOptions.customX : defaultX;
    const posY = customOptions.posY || 0;

    clonedMesh.position.set(posX, posY, zOffset);

    const baseRotationY = side === 'right' ? Math.PI : 0;
    clonedMesh.rotation.y = baseRotationY + (Math.random() * Math.PI * 2);

    const scaleMin = customOptions.scaleMin || 0.9;
    const scaleMax = customOptions.scaleMax || 1.1;
    const randomScale = scaleMin + Math.random() * (scaleMax - scaleMin);
    const baseScale = customOptions.baseScale || 1.0;
    const finalScale = baseScale * randomScale;

    clonedMesh.scale.set(finalScale, finalScale, finalScale);
    return clonedMesh;
  }
}

export const PipelineManager = new ModelPipelineManager();
