// Test the JavaScript formula
function testCellCalculation() {
    const width = 1000;
    console.log('Testing cell calculations for 1000x1000 image:\n');

    for (let layer = 0; layer <= 9; layer++) {
        const scale = Math.pow(2, layer);
        const layerWidth = Math.max(1, Math.floor(width / scale));

        // Test a few pixel positions
        const testPixels = [0, 1, 2, 3, 4, 100, 500, 999];
        const cells = testPixels.map(x => Math.floor((x / width) * layerWidth));

        console.log(`Layer ${layer}: scale=${scale}, layerWidth=${layerWidth}`);
        console.log(`  Pixels: ${testPixels.join(', ')}`);
        console.log(`  Cells:  ${cells.join(', ')}`);
        console.log(`  Block size: ~${Math.floor(width / layerWidth)}px\n`);
    }
}

testCellCalculation();
