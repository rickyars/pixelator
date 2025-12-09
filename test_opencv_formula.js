// Test if OpenCV uses pixel-center-based sampling for INTER_NEAREST

const width = 1000;
const layer = 7;
const layerWidth = 7;

console.log('Comparing two nearest-neighbor formulas:\n');
console.log('Formula 1 (corner-based): cellX = floor((x / width) * layerWidth)');
console.log('Formula 2 (center-based): cellX = floor(((x + 0.5) / width) * layerWidth)\n');

console.log('Testing pixels near block boundaries:\n');

let differences = [];

for (let x = 0; x <= 200; x++) {
    const cell1 = Math.floor((x / width) * layerWidth);
    const cell2 = Math.floor(((x + 0.5) / width) * layerWidth);

    if (cell1 !== cell2) {
        differences.push({ x, cell1, cell2 });
    }
}

if (differences.length > 0) {
    console.log('FOUND DIFFERENCES:');
    differences.forEach(d => {
        console.log(`  x=${d.x}: corner-based=${d.cell1}, center-based=${d.cell2}`);
    });
} else {
    console.log('No differences found in range 0-200');
}

// Now check the entire image
console.log('\n\nChecking all transitions for both formulas:\n');

// Formula 1 transitions
const transitions1 = [];
for (let x = 0; x < width; x++) {
    const cellX = Math.floor((x / width) * layerWidth);
    if (x === 0 || cellX !== Math.floor(((x-1) / width) * layerWidth)) {
        transitions1.push({ x, cellX });
    }
}

// Formula 2 transitions
const transitions2 = [];
for (let x = 0; x < width; x++) {
    const cellX = Math.floor(((x + 0.5) / width) * layerWidth);
    if (x === 0 || cellX !== Math.floor(((x - 0.5) / width) * layerWidth)) {
        transitions2.push({ x, cellX });
    }
}

console.log('Formula 1 (corner-based) transitions:');
transitions1.forEach((t, i) => {
    const nextX = transitions1[i + 1]?.x || width;
    const blockSize = nextX - t.x;
    console.log(`  Cell ${t.cellX}: pixels ${t.x}-${nextX-1} (${blockSize} pixels)`);
});

console.log('\nFormula 2 (center-based) transitions:');
transitions2.forEach((t, i) => {
    const nextX = transitions2[i + 1]?.x || width;
    const blockSize = nextX - t.x;
    console.log(`  Cell ${t.cellX}: pixels ${t.x}-${nextX-1} (${blockSize} pixels)`);
});

console.log('\n\n=== TESTING WITH LARGER LAYER (layer 9, layerWidth=1) ===\n');

const layer9Width = 1;

console.log('Formula 1 (corner-based):');
let cell1_0 = Math.floor((0 / width) * layer9Width);
let cell1_500 = Math.floor((500 / width) * layer9Width);
let cell1_999 = Math.floor((999 / width) * layer9Width);
console.log(`  x=0: cellX=${cell1_0}`);
console.log(`  x=500: cellX=${cell1_500}`);
console.log(`  x=999: cellX=${cell1_999}`);

console.log('\nFormula 2 (center-based):');
let cell2_0 = Math.floor(((0 + 0.5) / width) * layer9Width);
let cell2_500 = Math.floor(((500 + 0.5) / width) * layer9Width);
let cell2_999 = Math.floor(((999 + 0.5) / width) * layer9Width);
console.log(`  x=0: cellX=${cell2_0}`);
console.log(`  x=500: cellX=${cell2_500}`);
console.log(`  x=999: cellX=${cell2_999}`);
