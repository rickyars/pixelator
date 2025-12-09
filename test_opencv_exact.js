// Test the EXACT OpenCV INTER_NEAREST formula

const width = 1000;
const layer = 1;
const layerWidth = 500;

console.log('=== Testing different nearest-neighbor formulas ===\n');

console.log('For layer 1: layerWidth=500, width=1000 (should give 2x2 blocks)\n');

// Formula 1: Simple (what JavaScript currently uses)
console.log('Formula 1 (simple): cellX = floor(x * layerWidth / width)');
for (let x = 0; x <= 10; x++) {
    const cellX = Math.floor((x / width) * layerWidth);
    console.log(`  x=${x}: cellX=${cellX}`);
}

// Formula 2: OpenCV-style with 0.5 offsets
console.log('\nFormula 2 (OpenCV-style): cellX = floor((x + 0.5) * layerWidth / width - 0.5)');
for (let x = 0; x <= 10; x++) {
    const cellX = Math.floor(((x + 0.5) * layerWidth / width) - 0.5);
    console.log(`  x=${x}: cellX=${cellX}`);
}

// Formula 3: Alternative
console.log('\nFormula 3 (alternative): cellX = round(x * layerWidth / width - 0.5)');
for (let x = 0; x <= 10; x++) {
    const cellX = Math.round((x * layerWidth / width) - 0.5);
    console.log(`  x=${x}: cellX=${cellX}`);
}

console.log('\n\n=== Now testing with layer 9 (layerWidth=1, should give 1000x1000 block) ===\n');

const layer9Width = 1;

console.log('Formula 1 (simple):');
console.log(`  x=0: cellX=${Math.floor((0 / width) * layer9Width)}`);
console.log(`  x=500: cellX=${Math.floor((500 / width) * layer9Width)}`);
console.log(`  x=999: cellX=${Math.floor((999 / width) * layer9Width)}`);

console.log('\nFormula 2 (OpenCV-style):');
console.log(`  x=0: cellX=${Math.floor(((0 + 0.5) * layer9Width / width) - 0.5)}`);
console.log(`  x=500: cellX=${Math.floor(((500 + 0.5) * layer9Width / width) - 0.5)}`);
console.log(`  x=999: cellX=${Math.floor(((999 + 0.5) * layer9Width / width) - 0.5)}`);

// Most important: check if there's a difference in which formula creates the blocky effect
console.log('\n\n=== CRITICAL TEST: Do adjacent pixels get same cell? ===\n');

console.log('Layer 1 (2x2 blocks expected):');
console.log('Formula 1:');
console.log(`  Pixels 0,1: cells ${Math.floor((0 / width) * 500)}, ${Math.floor((1 / width) * 500)} ${Math.floor((0 / width) * 500) === Math.floor((1 / width) * 500) ? '✓ SAME' : '✗ DIFFERENT'}`);
console.log(`  Pixels 2,3: cells ${Math.floor((2 / width) * 500)}, ${Math.floor((3 / width) * 500)} ${Math.floor((2 / width) * 500) === Math.floor((3 / width) * 500) ? '✓ SAME' : '✗ DIFFERENT'}`);

console.log('Formula 2:');
const cell_0_f2 = Math.floor(((0 + 0.5) * 500 / width) - 0.5);
const cell_1_f2 = Math.floor(((1 + 0.5) * 500 / width) - 0.5);
const cell_2_f2 = Math.floor(((2 + 0.5) * 500 / width) - 0.5);
const cell_3_f2 = Math.floor(((3 + 0.5) * 500 / width) - 0.5);
console.log(`  Pixels 0,1: cells ${cell_0_f2}, ${cell_1_f2} ${cell_0_f2 === cell_1_f2 ? '✓ SAME' : '✗ DIFFERENT'}`);
console.log(`  Pixels 2,3: cells ${cell_2_f2}, ${cell_3_f2} ${cell_2_f2 === cell_3_f2 ? '✓ SAME' : '✗ DIFFERENT'}`);
