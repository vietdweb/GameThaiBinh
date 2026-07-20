import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * ModelPipelineManager.js - Quáº£n lÃ½ Táº£i & Override Váº­t Liá»‡u PBR cho MÃ´ HÃ¬nh GLB
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
   * 1. Táº£i cÃ¡c mÃ´ hÃ¬nh GLTF/GLB vá»›i Ä‘áº¿m báº¥t Ä‘á»“ng bá»™ fail-safe 100%
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
    let isDone = false;

    // Fail-safe timeout 3.5 giÃ¢y Ä‘áº£m báº£o 100% khÃ´ng bao giá» Ä‘Æ¡ mÃ n hÃ¬nh loading
    const failSafeTimer = setTimeout(() => {
      if (!isDone) {
        isDone = true;
        this.isLoaded = true;
        console.warn('âš ï¸ [ModelPipeline] Háº¿t thá»i gian náº¡p 3D, tá»± Ä‘á»™ng kÃ­ch hoáº¡t game!');
        if (onLoad) onLoad();
      }
    }, 3500);

    const checkItemCompleted = () => {
      if (isDone) return;
      completedItems++;
      const progressPercentage = Math.min((completedItems / totalItems) * 100, 100);
      if (onProgress) onProgress(progressPercentage);

      if (completedItems >= totalItems) {
        isDone = true;
        clearTimeout(failSafeTimer);
        this.isLoaded = true;
        console.log('âœ… [ModelPipeline] Táº¥t cáº£ mÃ´ hÃ¬nh 3D Ä‘Ã£ Ä‘Æ°á»£c náº¡p thÃ nh cÃ´ng!');
        if (onLoad) onLoad();
      }
    };

    entries.forEach(([key, path]) => {
      try {
        this.gltfLoader.load(
          path,
          (gltf) => {
            try {
              this.loadedGLTFs[key] = gltf;

              // Chá»‰ xá»­ lÃ½ Shader Ä‘á»¥c lÃ¡ cho mÃ´ hÃ¬nh CÃ¢y
              if (key.includes('tree')) {
                this.processGLTFMaterials(gltf.scene);
              }

              this.loadedModels[key] = gltf.scene;
            } catch (err) {
              console.warn(`[ModelPipeline] Lá»—i xá»­ lÃ½ model '${key}':`, err);
            } finally {
              checkItemCompleted();
            }
          },
          undefined,
          (error) => {
            console.warn(`[ModelPipeline] KhÃ´ng tÃ¬m tháº¥y file 3D '${key}' táº¡i '${path}'. Bá» qua an toÃ n.`);
            checkItemCompleted();
          }
        );
      } catch (e) {
        checkItemCompleted();
      }
    });
  }

  processGLTFMaterials(scene) {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((mat) => {
            mat.transparent = false;
            mat.depthWrite = true;
            mat.depthTest = true;
            mat.side = THREE.DoubleSide;

            if (mat.map) {
              mat.map.colorSpace = THREE.SRGBColorSpace;
              mat.color.setHex(0x999999);

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
          });
        }
      }
    });
  }

  cloneModel(key) {
    if (this.loadedModels[key]) {
      return this.loadedModels[key].clone();
    }
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
   * 3. Thuáº­t toÃ¡n Gá»™p HÃ¬nh Há»c (BufferGeometryUtils.mergeGeometries) & Khá»Ÿi Táº¡o InstancedMesh
   * Gá»™p táº¥t cáº£ sub-mesh cá»§a maple_tree.glb thÃ nh 1-2 geometry duy nháº¥t Ä‘á»ƒ giáº£m Draw Calls tá»« 1000s xuá»‘ng 1-2!
   * @param {string} modelKey Key mÃ´ hÃ¬nh (vd: 'maple_tree')
   * @param {number} maxCount Sá»‘ lÆ°á»£ng thá»±c thá»ƒ tá»‘i Ä‘a (máº·c Ä‘á»‹nh 100)
   * @param {number} targetHeight Chiá»u cao má»¥c tiÃªu chuáº©n (máº·c Ä‘á»‹nh 4.8m)
   */
  createInstancedTreeGroup(modelKey, maxCount = 100, targetHeight = 5.8) {
    const rawModel = this.cloneModel(modelKey);
    if (!rawModel) return null;

    // 3a. Auto-scale mÃ´ hÃ¬nh gá»‘c vá» chiá»u cao chuáº©n 5.8m cao lá»›n thanh thoÃ¡t
    const bbox = new THREE.Box3().setFromObject(rawModel);
    const size = bbox.getSize(new THREE.Vector3());
    if (size.y > 0 && isFinite(size.y)) {
      const scaleFactor = targetHeight / size.y;
      rawModel.scale.set(scaleFactor, scaleFactor, scaleFactor);
    }

    // Cáº­p nháº­t ma tráº­n toÃ n cá»¥c trÆ°á»›c khi trÃ­ch xuáº¥t Geometry
    rawModel.updateMatrixWorld(true);

    // 3b. Gom nhÃ³m cÃ¡c geometry theo cháº¥t liá»‡u (Material)
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

    // 3c. Gá»™p geometry (mergeGeometries) & Táº¡o InstancedMesh cho tá»«ng cháº¥t liá»‡u
    materialMap.forEach((geometries, mat) => {
      if (geometries.length > 0) {
        const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries, false);
        if (mergedGeometry) {
          mat.transparent = false; // Táº¯t transparent dáº¡ng blend Ä‘á»ƒ loáº¡i bá» Depth Sorting Bug
          mat.depthWrite = true;
          mat.depthTest = true;
          mat.side = THREE.DoubleSide;

          if (mat.map) {
            mat.map.colorSpace = THREE.SRGBColorSpace;
            
            // Xá»­ lÃ½ Ä‘á»™ sÃ¡ng riÃªng cho CÃ¢y ThÃ´ng (Pine Tree): Báº­t emissive phÃ¡t sÃ¡ng nháº¹ trong Ä‘Ãªm
            if (modelKey === 'pine_tree') {
              mat.emissive = new THREE.Color(0x333333); // Tá»± phÃ¡t sÃ¡ng nháº¹ xÃ¡m/xanh tá»‘i kÃ­ch sÃ¡ng chi tiáº¿t
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
          instancedMesh.count = 0; // Ban Ä‘áº§u 0 thá»±c thá»ƒ

          instancedGroup.add(instancedMesh);
          instancedMeshes.push(instancedMesh);
        }
      }
    });

    // Dummy Matrix4 cho viá»‡c tÃ­nh toÃ¡n biáº¿n Ä‘á»•i vá»‹ trÃ­
    const dummyMatrix = new THREE.Matrix4();
    const dummyPos = new THREE.Vector3();
    const dummyQuat = new THREE.Quaternion();
    const dummyScale = new THREE.Vector3();

    return {
      group: instancedGroup,
      instancedMeshes: instancedMeshes,

      /**
       * Cáº­p nháº­t ma tráº­n vá»‹ trÃ­ thá»±c thá»ƒ cÃ¢y táº¡i chá»‰ sá»‘ index (0..maxCount-1)
       */
      setInstanceTransform(index, x, y, z, scale = 1.0, rotY = 0) {
        if (index < 0 || index >= maxCount) return; // Báº£o vá»‡ an toÃ n chá»‘ng lá»—i crash/Ä‘Æ¡ mÃ n hÃ¬nh náº¿u vÆ°á»£t maxCount

        dummyPos.set(x, y, z);
        dummyQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY);

        // KÃ©o giÃ£n riÃªng trá»¥c Y (chiá»u cao) cho cáº£ CÃ¢y ThÃ´ng (1.65x) vÃ  CÃ¢y Phong (1.5x)
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
       * ThÃ´ng bÃ¡o cho GPU cáº­p nháº­t ma tráº­n biáº¿n Ä‘á»•i & sá»‘ lÆ°á»£ng thá»±c thá»ƒ hiá»ƒn thá»‹
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
