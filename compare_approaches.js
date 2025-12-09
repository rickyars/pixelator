// Compare Python vs JavaScript noise generation approach

// Simple deterministic noise function (same as in imageProcessor.js)
function deterministicNoise(x, y, seed) {
    let h = seed + x * 374761393 + y * 668265263;
    h = (h ^ (h >> 13)) * 1274126177;
    return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

// JavaScript approach: evaluate noise for a specific pixel
function evaluateMultiScaleNoiseJS(x, y, layers, exponent, seed, width, height) {
    let maxNoise = 0;

    for (let layer = 0; layer < layers; layer++) {
        const scale = Math.pow(2, layer);
        const layerWidth = Math.max(1, Math.floor(width / scale));
        const layerHeight = Math.max(1, Math.floor(height / scale));

        const cellX = Math.floor((x / width) * layerWidth);
        const cellY = Math.floor((y / height) * layerHeight);

        const noise = deterministicNoise(cellX, cellY, seed + layer);
        const powered = Math.pow(noise, exponent);
        maxNoise = Math.max(maxNoise, powered);
    }

    return maxNoise;
}

// Test parameters
const width = 1000;
const height = 1000;
const layers = 10;
const exponent = 5.0;
const seed = 12345;

console.log('=== Testing noise generation for 1000x1000 image ===\n');

// Test specific pixels to see which layers contribute
const testPixels = [[0, 0], [1, 1], [100, 100], [500, 500]];

for (const [px, py] of testPixels) {
    console.log(`\nPixel (${px}, ${py}):`);

    let maxNoise = 0;
    let contributingLayers = [];

    for (let layer = 0; layer < layers; layer++) {
        const scale = Math.pow(2, layer);
        const layerWidth = Math.max(1, Math.floor(width / scale));
        const layerHeight = Math.max(1, Math.floor(height / scale));

        const cellX = Math.floor((px / width) * layerWidth);
        const cellY = Math.floor((py / height) * layerHeight);

        const noise = deterministicNoise(cellX, cellY, seed + layer);
        const powered = Math.pow(noise, exponent);

        const blockSize = Math.floor(width / layerWidth);

        console.log(`  Layer ${layer}: cell=(${cellX},${cellY}), noise=${noise.toFixed(4)}, powered=${powered.toFixed(6)}, blockSize=${blockSize}px`);

        if (powered > maxNoise) {
            maxNoise = powered;
            contributingLayers.push({ layer, powered, blockSize });
        }
    }

    console.log(`  Final maxNoise: ${maxNoise.toFixed(6)}`);
    console.log(`  Contributing layers: ${contributingLayers.map(l => `L${l.layer}(${l.blockSize}px)`).join(', ')}`);
}

// Now check if pixels that should share the same block actually get the same noise
console.log('\n\n=== Checking block consistency ===\n');

// For layer 7 (blockSize ~142px), check if pixels in the same block get same noise
const layer = 7;
const scale = Math.pow(2, layer);
const layerWidth = Math.max(1, Math.floor(width / scale));
const blockSize = Math.floor(width / layerWidth);

console.log(`Layer ${layer}: layerWidth=${layerWidth}, blockSize=${blockSize}px`);
console.log('Checking pixels that should be in the same block:\n');

// Pixels 0-141 should all be in block 0
const pixelsInBlock0 = [0, 1, 50, 100, 141];
for (const x of pixelsInBlock0) {
    const cellX = Math.floor((x / width) * layerWidth);
    const noise = deterministicNoise(cellX, 0, seed + layer);
    console.log(`  Pixel x=${x}: cellX=${cellX}, noise=${noise.toFixed(6)}`);
}

// Pixel 142 should be in block 1
const cellX142 = Math.floor((142 / width) * layerWidth);
const noise142 = deterministicNoise(cellX142, 0, seed + layer);
console.log(`  Pixel x=142: cellX=${cellX142}, noise=${noise142.toFixed(6)}`);
