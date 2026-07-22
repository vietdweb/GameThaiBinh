const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'inspect_output.txt');
const logs = [];
function log(...args) {
  const line = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
  logs.push(line);
  console.log(line);
}

const filePath = path.join(__dirname, 'public', 'models', 'city.glb');

log('Checking file:', filePath);
if (!fs.existsSync(filePath)) {
  log('File does NOT exist!');
  fs.writeFileSync(logFile, logs.join('\n'));
  process.exit(1);
}

const stats = fs.statSync(filePath);
log('File size:', stats.size, 'bytes');

const buffer = fs.readFileSync(filePath);
const magic = buffer.toString('utf8', 0, 4);
const version = buffer.readUInt32LE(4);
const length = buffer.readUInt32LE(8);

log('GLB Magic:', magic);
log('GLB Version:', version);
log('GLB Header Length:', length);

const chunkLength = buffer.readUInt32LE(12);
const chunkType = buffer.readUInt32LE(16);
const jsonString = buffer.toString('utf8', 20, 20 + chunkLength);

try {
  const json = JSON.parse(jsonString);
  log('\n--- GLTF JSON METADATA ---');
  log('Asset:', json.asset);
  log('Extensions Used:', json.extensionsUsed);
  log('Extensions Required:', json.extensionsRequired);
  log('Scenes count:', json.scenes ? json.scenes.length : 0);
  log('Nodes count:', json.nodes ? json.nodes.length : 0);
  log('Meshes count:', json.meshes ? json.meshes.length : 0);
  log('Materials count:', json.materials ? json.materials.length : 0);
  log('Accessors count:', json.accessors ? json.accessors.length : 0);

  if (json.nodes) {
    log('\n--- FIRST 20 NODES ---');
    json.nodes.slice(0, 20).forEach((n, idx) => {
      log(`Node ${idx}: name="${n.name}", mesh=${n.mesh}, translation=${n.translation}, rotation=${n.rotation}, scale=${n.scale}, children=${n.children}`);
    });
  }

  if (json.meshes && json.meshes[0]) {
    log('\n--- FIRST MESH DETAILS ---');
    log('Mesh 0:', json.meshes[0]);
  }
} catch (e) {
  log('Failed to parse GLTF JSON:', e.message);
}

fs.writeFileSync(logFile, logs.join('\n'));
log('Wrote diagnostic report to:', logFile);
