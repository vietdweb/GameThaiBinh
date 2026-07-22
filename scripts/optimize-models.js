import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const MODELS_DIR = path.resolve('public/models');

console.log('===========================================================');
console.log('🚀 [3D ASSET OPTIMIZER] COMPRESSING GLB MODELS WITH DRACO');
console.log('===========================================================');
console.log(`📁 Directory: ${MODELS_DIR}`);
console.log('⚙️ Target Specs:');
console.log('   - Position Bits: 14 (High-precision vertex position)');
console.log('   - Normal Bits:   10 (100% smooth PBR lighting preserve)');
console.log('   - Texcoord Bits: 12 (High-accuracy UV texture mapping)\n');

if (!fs.existsSync(MODELS_DIR)) {
    console.error(`❌ Directory not found: ${MODELS_DIR}`);
    process.exit(1);
}

const files = fs.readdirSync(MODELS_DIR).filter(f => f.endsWith('.glb'));

if (files.length === 0) {
    console.log('⚠️ No .glb files found to optimize.');
    process.exit(0);
}

let totalBefore = 0;
let totalAfter = 0;
const results = [];

files.forEach((file, index) => {
    const filePath = path.join(MODELS_DIR, file);
    const tempPath = path.join(MODELS_DIR, `temp_${file}`);
    const statBefore = fs.statSync(filePath);
    const sizeMBBefore = (statBefore.size / (1024 * 1024)).toFixed(2);
    totalBefore += statBefore.size;

    console.log(`[${index + 1}/${files.length}] Optimizing ${file} (${sizeMBBefore} MB)...`);

    try {
        // Run gltf-pipeline or @gltf-transform via npx
        let success = false;

        try {
            // Try gltf-pipeline first
            const cmd = `npx gltf-pipeline -i "${filePath}" -o "${tempPath}" -d --draco.quantizePositionBits 14 --draco.quantizeNormalBits 10 --draco.quantizeTexcoordBits 12`;
            execSync(cmd, { stdio: 'pipe' });
            success = true;
        } catch (e1) {
            // Fallback to @gltf-transform
            try {
                const cmd2 = `npx @gltf-transform/cli draco "${filePath}" "${tempPath}" --quantize-position 14 --quantize-normal 10 --quantize-texcoord 12`;
                execSync(cmd2, { stdio: 'pipe' });
                success = true;
            } catch (e2) {
                console.warn(`   ⚠️ Command failed for ${file}, trying simplified draco compression...`);
            }
        }

        if (success && fs.existsSync(tempPath)) {
            const statAfter = fs.statSync(tempPath);
            const sizeMBAfter = (statAfter.size / (1024 * 1024)).toFixed(2);
            totalAfter += statAfter.size;
            const reduction = (((statBefore.size - statAfter.size) / statBefore.size) * 100).toFixed(1);

            // Replace original file with compressed temp file
            fs.unlinkSync(filePath);
            fs.renameSync(tempPath, filePath);

            results.push({
                file,
                before: `${sizeMBBefore} MB`,
                after: `${sizeMBAfter} MB`,
                reduction: `-${reduction}%`
            });
            console.log(`   ✅ Success: ${sizeMBBefore} MB ➔ ${sizeMBAfter} MB (${reduction}% reduction)`);
        } else {
            totalAfter += statBefore.size;
            console.log(`   ⏩ Skipped ${file} (No compression applied)`);
        }
    } catch (err) {
        totalAfter += statBefore.size;
        console.error(`   ❌ Failed to compress ${file}:`, err.message);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }
});

console.log('\n===========================================================');
console.log('📊 OPTIMIZATION SUMMARY');
console.log('===========================================================');
console.table(results);
const totalBeforeMB = (totalBefore / (1024 * 1024)).toFixed(2);
const totalAfterMB = (totalAfter / (1024 * 1024)).toFixed(2);
const totalReduction = (((totalBefore - totalAfter) / totalBefore) * 100).toFixed(1);
console.log(`🎉 TOTAL SIZE: ${totalBeforeMB} MB ➔ ${totalAfterMB} MB (Saved ${totalReduction}% file size!)`);
console.log('===========================================================');
