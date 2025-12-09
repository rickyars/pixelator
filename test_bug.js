// Test to find the exact bug

const width = 1000;
const layer = 7;
const scale = Math.pow(2, layer); // 128
const layerWidth = Math.max(1, Math.floor(width / scale)); // floor(1000/128) = 7

console.log(`Layer ${layer}: scale=${scale}, layerWidth=${layerWidth}`);
console.log(`Expected block size: ${width / layerWidth} = ${width / layerWidth}\n`);

// Check the formula for pixels near block boundaries
console.log('Testing cell calculation formula:\n');

for (let x = 0; x <= 1000; x += Math.floor(1000/7)) {
    const cellX_current = Math.floor((x / width) * layerWidth);
    console.log(`x=${x.toString().padStart(4)}: cellX = floor((${x}/${width}) * ${layerWidth}) = floor(${(x/width) * layerWidth}) = ${cellX_current}`);
}

console.log('\n\nNow let me trace what happens when we upscale a 7-pixel noise grid to 1000 pixels:');
console.log('Using standard nearest-neighbor formula: source[x] = input[floor(x * src_width / dst_width)]\n');

// For nearest neighbor upscaling from 7 to 1000:
// Which source pixel does each dest pixel map to?
const transitions = [];
for (let x = 0; x < 1000; x++) {
    const cellX = Math.floor((x / width) * layerWidth);
    if (x === 0 || cellX !== Math.floor(((x-1) / width) * layerWidth)) {
        transitions.push({ x, cellX });
    }
}

console.log('Block transitions (where cellX changes):');
transitions.forEach((t, i) => {
    const nextX = transitions[i + 1]?.x || 1000;
    const blockSize = nextX - t.x;
    console.log(`  Cell ${t.cellX}: pixels ${t.x}-${nextX-1} (${blockSize} pixels)`);
});

// Now let's check what Python's cv2.resize with INTER_NEAREST would do
console.log('\n\nWhat cv2.resize with INTER_NEAREST actually does:');
console.log('OpenCV formula: dst[x] = src[floor(x * src_size / dst_size)]');
console.log('BUT this might use a slightly different formula!\n');

// Check if there's a difference with pixel-center-based sampling
console.log('Alternative formula (pixel centers): dst[x] = src[floor((x + 0.5) * src_size / dst_size)]\n');

for (let x = 0; x <= 150; x += 10) {
    const cell1 = Math.floor((x / width) * layerWidth);
    const cell2 = Math.floor(((x + 0.5) / width) * layerWidth);
    if (cell1 !== cell2) {
        console.log(`x=${x}: corner-based=${cell1}, center-based=${cell2} ***DIFFERENCE***`);
    }
}
