/**
 * Typewriter Mode - Port of Jules Kuehn's typewriter-art algorithm
 * https://github.com/juleskuehn/typewriter-art
 *
 * Uses simulated annealing optimization with multiple overlapping layers.
 * Each layer is offset, causing characters to overlap when multiplied together,
 * creating rich tonal range impossible with single-layer ASCII art.
 */
const TypewriterMode = {
    // Character set as grayscale images (Float32Arrays)
    chars: null,      // Array of character images [numChars][charHeight][charWidth]
    charWidth: 0,
    charHeight: 0,

    // Stops for UI compatibility
    stops: [],

    // Layer configurations (fractional offsets [y, x])
    layerConfigs: {
        '1x1': [[0, 0]],
        '2H': [[0, 0], [0, 0.5]],
        '2V': [[0, 0], [0.5, 0]],
        '4x1': [[0, 0], [0, 0.5], [0.5, 0], [0.5, 0.5]],
        '4x2': [[0, 0], [0, 0.5], [0.5, 0], [0.5, 0.5], [0, 0], [0, 0.5], [0.5, 0], [0.5, 0.5]],
        '16x1': [
            [0, 0], [0, 0.25], [0, 0.5], [0, 0.75],
            [0.25, 0], [0.25, 0.25], [0.25, 0.5], [0.25, 0.75],
            [0.5, 0], [0.5, 0.25], [0.5, 0.5], [0.5, 0.75],
            [0.75, 0], [0.75, 0.25], [0.75, 0.5], [0.75, 0.75]
        ]
    },

    // Default character set - standard ASCII gradient
    defaultChars: ' .\'`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',

    /**
     * Initialize with default stops
     */
    init() {
        this.stops = [
            { percentage: 0, value: ' ', color: '#000000' },
            { percentage: 10, value: '.', color: '#000000' },
            { percentage: 20, value: ':', color: '#000000' },
            { percentage: 30, value: ';', color: '#000000' },
            { percentage: 40, value: 'i', color: '#000000' },
            { percentage: 50, value: 'o', color: '#000000' },
            { percentage: 60, value: 'x', color: '#000000' },
            { percentage: 70, value: 'X', color: '#000000' },
            { percentage: 80, value: '#', color: '#000000' },
            { percentage: 90, value: '@', color: '#000000' },
            { percentage: 100, value: 'M', color: '#000000' }
        ];
    },

    /**
     * Get charset string from stops
     */
    getCharsetFromStops() {
        if (this.stops.length === 0) return this.defaultChars;
        const chars = new Set([' ']);
        for (const stop of this.stops) {
            if (stop.value) chars.add(stop.value);
        }
        return Array.from(chars).join('');
    },

    /**
     * Pre-render characters to grayscale images
     * Generates multiple "strike force" variants per character for tonal range
     * Simulates real typewriter ink: uneven density, texture, force variation
     */
    initCharset(params) {
        const charset = params.charset || this.getCharsetFromStops();
        const cellSize = params.cellSize || 12;
        const fontFamily = params.fontFamily || 'Courier New';
        const strikeVariants = params.strikeVariants || 3; // How many force levels per char

        // Character dimensions - slightly larger to capture full glyph
        this.charWidth = Math.ceil(cellSize * 0.8);
        this.charHeight = Math.ceil(cellSize * 1.2);

        // Ensure even dimensions for half-character offsets
        if (this.charWidth % 2 !== 0) this.charWidth++;
        if (this.charHeight % 2 !== 0) this.charHeight++;

        const canvas = document.createElement('canvas');
        canvas.width = this.charWidth;
        canvas.height = this.charHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        this.chars = [];

        // First: blank character (all white = 1.0)
        this.chars.push(new Float32Array(this.charWidth * this.charHeight).fill(1.0));

        const centerX = this.charWidth / 2;
        const centerY = this.charHeight / 2;
        const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

        // Render each character at multiple strike forces
        for (const char of charset) {
            if (char === ' ') continue; // Already added blank

            // Generate variants at different "strike forces"
            for (let v = 0; v < strikeVariants; v++) {
                // Strike force: 0.25 (very light) to 1.0 (full) - wider range like real typewriter
                const strikeForce = strikeVariants === 1 ? 1.0 : 0.25 + (v / (strikeVariants - 1)) * 0.75;

                // Render character at full black first
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, this.charWidth, this.charHeight);
                ctx.fillStyle = 'black';
                ctx.font = `${cellSize}px ${fontFamily}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(char, this.charWidth / 2, this.charHeight / 2);

                const imageData = ctx.getImageData(0, 0, this.charWidth, this.charHeight);
                const grayscale = new Float32Array(this.charWidth * this.charHeight);

                for (let i = 0; i < grayscale.length; i++) {
                    const x = i % this.charWidth;
                    const y = Math.floor(i / this.charWidth);

                    const r = imageData.data[i * 4];
                    const g = imageData.data[i * 4 + 1];
                    const b = imageData.data[i * 4 + 2];
                    let value = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

                    // Only process ink pixels (non-white)
                    if (value < 0.98) {
                        // 1. Apply strike force (lighter = more white mixed in)
                        value = 1 - (1 - value) * strikeForce;

                        // 2. Uneven ink density: darker in center, lighter at edges
                        // This simulates how typewriter keys hit harder in the center
                        const dx = (x - centerX) / centerX;
                        const dy = (y - centerY) / centerY;
                        const distFromCenter = Math.sqrt(dx * dx + dy * dy);
                        const densityFalloff = 1 - distFromCenter * 0.15 * (1 - strikeForce);
                        value = 1 - (1 - value) * Math.max(0.5, densityFalloff);

                        // 3. Ink texture noise (speckle from ribbon/paper)
                        const noise = (Math.random() - 0.5) * 0.12;
                        value = Math.max(0, Math.min(1, value + noise));

                        // 4. Occasional ink dropout (light strikes miss some pixels)
                        if (strikeForce < 0.5 && Math.random() > strikeForce + 0.3) {
                            value = Math.min(1, value + 0.3); // Partial dropout
                        }
                    }

                    grayscale[i] = value;
                }

                this.chars.push(grayscale);
            }
        }

        console.log(`Initialized ${this.chars.length} character variants (${this.charWidth}x${this.charHeight})`);
    },

    /**
     * Main render function
     */
    render(ctx, canvas, img, params) {
        // Initialize charset if needed
        const currentCharset = this.getCharsetFromStops();
        if (!this.chars ||
            this._lastCellSize !== params.cellSize ||
            this._lastFont !== params.fontFamily ||
            this._lastCharset !== currentCharset) {
            this.initCharset(params);
            this._lastCellSize = params.cellSize;
            this._lastFont = params.fontFamily;
            this._lastCharset = currentCharset;
        }

        // Prepare source image
        const prepared = Core.prepareImage(img);
        const srcData = this.imageToGrayscale(prepared.data, prepared.width, prepared.height);

        // Calculate grid dimensions
        // If rowLength not specified, calculate to match input width
        const numCols = params.rowLength || Math.round(prepared.width / this.charWidth);
        const numRows = Math.ceil((numCols / prepared.width) * prepared.height * (this.charWidth / this.charHeight));

        // Target dimensions (must be exact multiple of char dimensions)
        const targetWidth = numCols * this.charWidth;
        const targetHeight = numRows * this.charHeight;

        // Resize source to target dimensions
        const target = this.resizeImage(srcData, prepared.width, prepared.height, targetWidth, targetHeight);

        // Get layer offsets
        const layerKey = params.layers || '4x1';
        const fractionalOffsets = this.layerConfigs[layerKey] || this.layerConfigs['4x1'];

        // Convert to pixel offsets
        const layerOffsets = fractionalOffsets.map(([y, x]) => [
            Math.round(y * this.charHeight),
            Math.round(x * this.charWidth)
        ]);

        // Pad dimensions for layer offsets
        const maxOffsetY = Math.max(...layerOffsets.map(o => o[0]));
        const maxOffsetX = Math.max(...layerOffsets.map(o => o[1]));
        const paddedWidth = targetWidth + maxOffsetX;
        const paddedHeight = targetHeight + maxOffsetY;

        // Pad target (white padding)
        const paddedTarget = new Float32Array(paddedWidth * paddedHeight).fill(1.0);
        for (let y = 0; y < targetHeight; y++) {
            for (let x = 0; x < targetWidth; x++) {
                paddedTarget[y * paddedWidth + x] = target[y * targetWidth + x];
            }
        }

        // Initialize layers (each is full image size, all white)
        const layers = layerOffsets.map(() =>
            new Float32Array(paddedWidth * paddedHeight).fill(1.0)
        );

        // Initialize choices (character index for each grid cell in each layer)
        const choices = layerOffsets.map(() =>
            new Uint16Array(numRows * numCols).fill(0)
        );

        // Initialize mockup as product of all layers (starts all white)
        let mockup = new Float32Array(paddedWidth * paddedHeight).fill(1.0);

        // Optimization parameters
        const numLoops = params.numLoops || 5;
        const asymmetry = params.asymmetry !== undefined ? params.asymmetry : 0.1;
        const initTemp = params.initTemp || 0.001;
        const mode = params.searchMode || 'simAnneal';

        console.log(`Optimizing: ${numLoops} loops, ${layerOffsets.length} layers, ${numRows}x${numCols} grid`);
        const startTime = performance.now();

        // Main optimization loop
        for (let loop = 0; loop < numLoops; loop++) {
            const temperature = initTemp / (loop + 1);

            // Shuffle layer order each loop
            const shuffledLayers = [...Array(layerOffsets.length).keys()];
            for (let i = shuffledLayers.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledLayers[i], shuffledLayers[j]] = [shuffledLayers[j], shuffledLayers[i]];
            }

            for (const layerNum of shuffledLayers) {
                const layerOffset = layerOffsets[layerNum];

                // Compute background: product of all OTHER layers
                const bg = this.computeBackground(layers, layerNum, paddedWidth, paddedHeight);

                // Optimize this layer
                this.optimizeLayer(
                    bg, mockup, paddedTarget, layers[layerNum],
                    choices[layerNum], layerOffset,
                    numCols, numRows, paddedWidth,
                    asymmetry, mode, temperature
                );
            }

            console.log(`Loop ${loop + 1}/${numLoops}`);
        }

        console.log(`Optimization: ${((performance.now() - startTime) / 1000).toFixed(2)}s`);

        // Render to canvas (scaled, with gaps)
        const scale = params.outputScale || 1;
        const gap = params.gap || 0;
        const scaledGap = gap * scale;
        const scaledCharWidth = this.charWidth * scale;
        const scaledCharHeight = this.charHeight * scale;

        canvas.width = numCols * scaledCharWidth + (numCols - 1) * scaledGap;
        canvas.height = numRows * scaledCharHeight + (numRows - 1) * scaledGap;

        this.renderMockup(ctx, mockup, paddedWidth, targetWidth, targetHeight, params, scale,
            numCols, numRows, this.charWidth, this.charHeight, scaledGap);
    },

    /**
     * Convert RGBA to grayscale Float32Array
     */
    imageToGrayscale(data, width, height) {
        const result = new Float32Array(width * height);
        for (let i = 0; i < result.length; i++) {
            const r = data[i * 4];
            const g = data[i * 4 + 1];
            const b = data[i * 4 + 2];
            result[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        }
        return result;
    },

    /**
     * Resize grayscale image (bilinear interpolation)
     */
    resizeImage(src, srcW, srcH, dstW, dstH) {
        const dst = new Float32Array(dstW * dstH);
        const xRatio = srcW / dstW;
        const yRatio = srcH / dstH;

        for (let y = 0; y < dstH; y++) {
            for (let x = 0; x < dstW; x++) {
                const srcX = x * xRatio;
                const srcY = y * yRatio;
                const x0 = Math.floor(srcX);
                const y0 = Math.floor(srcY);
                const x1 = Math.min(x0 + 1, srcW - 1);
                const y1 = Math.min(y0 + 1, srcH - 1);
                const xf = srcX - x0;
                const yf = srcY - y0;

                const v = src[y0 * srcW + x0] * (1 - xf) * (1 - yf) +
                          src[y0 * srcW + x1] * xf * (1 - yf) +
                          src[y1 * srcW + x0] * (1 - xf) * yf +
                          src[y1 * srcW + x1] * xf * yf;

                dst[y * dstW + x] = v;
            }
        }
        return dst;
    },

    /**
     * Compute background as product of all layers except one
     */
    computeBackground(layers, excludeIdx, width, height) {
        const bg = new Float32Array(width * height).fill(1.0);
        for (let i = 0; i < layers.length; i++) {
            if (i === excludeIdx) continue;
            const layer = layers[i];
            for (let j = 0; j < bg.length; j++) {
                bg[j] *= layer[j];
            }
        }
        return bg;
    },

    /**
     * Optimize character choices for one layer
     */
    optimizeLayer(bg, mockup, target, layer, choices, layerOffset, numCols, numRows, width, asymmetry, mode, temperature) {
        const [offsetY, offsetX] = layerOffset;
        const charW = this.charWidth;
        const charH = this.charHeight;
        const chars = this.chars;
        const numChars = chars.length;

        // Process cells in random order
        const cellIndices = [...Array(numRows * numCols).keys()];
        for (let i = cellIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cellIndices[i], cellIndices[j]] = [cellIndices[j], cellIndices[i]];
        }

        for (const cellIdx of cellIndices) {
            const row = Math.floor(cellIdx / numCols);
            const col = cellIdx % numCols;

            // Character position in image (with layer offset)
            const startY = row * charH + offsetY;
            const startX = col * charW + offsetX;

            // Current error for this cell
            let curError = this.computeCellError(mockup, target, startX, startY, charW, charH, width, asymmetry);
            let bestChoice = choices[cellIdx];

            // Try characters in random order
            const charOrder = [...Array(numChars).keys()];
            for (let i = charOrder.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [charOrder[i], charOrder[j]] = [charOrder[j], charOrder[i]];
            }

            for (const newChoice of charOrder) {
                if (newChoice === bestChoice) continue;

                // Compute error with this character: bg * char
                const newError = this.computeCellErrorWithChar(
                    bg, chars[newChoice], target,
                    startX, startY, charW, charH, width, asymmetry
                );

                let accept = false;

                if (mode === 'greedy') {
                    // Greedy: accept if better
                    if (newError < curError) {
                        accept = true;
                    }
                } else {
                    // Simulated annealing
                    const delta = curError - newError;
                    if (delta > 0) {
                        accept = true;
                    } else {
                        const p = Math.exp(delta / temperature);
                        if (Math.random() < p) {
                            accept = true;
                        }
                    }
                }

                if (accept) {
                    bestChoice = newChoice;
                    curError = newError;

                    // Update layer image with new character
                    this.blitChar(layer, chars[newChoice], startX, startY, charW, charH, width);

                    // Update mockup: this cell becomes bg * char
                    this.blitComposite(mockup, bg, chars[newChoice], startX, startY, charW, charH, width);

                    if (mode === 'simAnneal') break; // Accept first improvement
                }
            }

            choices[cellIdx] = bestChoice;
        }
    },

    /**
     * Compute asymmetric MSE for a cell region
     */
    computeCellError(mockup, target, startX, startY, charW, charH, width, asymmetry) {
        let sum = 0;
        for (let dy = 0; dy < charH; dy++) {
            for (let dx = 0; dx < charW; dx++) {
                const idx = (startY + dy) * width + (startX + dx);
                const err = target[idx] - mockup[idx];
                const ae = err > 0 ? err * (1 + asymmetry) : err;
                sum += ae * ae;
            }
        }
        return sum / (charW * charH);
    },

    /**
     * Compute error with a hypothetical character (bg * char)
     */
    computeCellErrorWithChar(bg, char, target, startX, startY, charW, charH, width, asymmetry) {
        let sum = 0;
        for (let dy = 0; dy < charH; dy++) {
            for (let dx = 0; dx < charW; dx++) {
                const imgIdx = (startY + dy) * width + (startX + dx);
                const charIdx = dy * charW + dx;
                const composite = bg[imgIdx] * char[charIdx];
                const err = target[imgIdx] - composite;
                const ae = err > 0 ? err * (1 + asymmetry) : err;
                sum += ae * ae;
            }
        }
        return sum / (charW * charH);
    },

    /**
     * Copy character to layer
     */
    blitChar(layer, char, startX, startY, charW, charH, width) {
        for (let dy = 0; dy < charH; dy++) {
            for (let dx = 0; dx < charW; dx++) {
                const imgIdx = (startY + dy) * width + (startX + dx);
                const charIdx = dy * charW + dx;
                layer[imgIdx] = char[charIdx];
            }
        }
    },

    /**
     * Write composite (bg * char) to mockup
     */
    blitComposite(mockup, bg, char, startX, startY, charW, charH, width) {
        for (let dy = 0; dy < charH; dy++) {
            for (let dx = 0; dx < charW; dx++) {
                const imgIdx = (startY + dy) * width + (startX + dx);
                const charIdx = dy * charW + dx;
                mockup[imgIdx] = bg[imgIdx] * char[charIdx];
            }
        }
    },

    /**
     * Render mockup to canvas
     */
    renderMockup(ctx, mockup, mockupWidth, targetWidth, targetHeight, params, scale = 1,
                 numCols = 0, numRows = 0, charWidth = 0, charHeight = 0, scaledGap = 0) {
        // Paper color (background) and ink color
        const paper = Core.hexToRgb(params.bgColor || '#ffffff');
        const ink = { r: 0, g: 0, b: 0 }; // Typewriter ink is always black

        // Fill background first
        ctx.fillStyle = params.bgColor || '#ffffff';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        const scaledCharWidth = charWidth * scale;
        const scaledCharHeight = charHeight * scale;

        // If no gap info provided, render without gaps (legacy behavior)
        if (numCols === 0 || scaledGap === 0) {
            const scaledWidth = targetWidth * scale;
            const scaledHeight = targetHeight * scale;
            const imageData = ctx.createImageData(scaledWidth, scaledHeight);

            for (let y = 0; y < scaledHeight; y++) {
                for (let x = 0; x < scaledWidth; x++) {
                    const srcX = Math.floor(x / scale);
                    const srcY = Math.floor(y / scale);
                    const srcIdx = srcY * mockupWidth + srcX;
                    const dstIdx = (y * scaledWidth + x) * 4;

                    const value = mockup[srcIdx];
                    imageData.data[dstIdx] = Math.round(ink.r * (1 - value) + paper.r * value);
                    imageData.data[dstIdx + 1] = Math.round(ink.g * (1 - value) + paper.g * value);
                    imageData.data[dstIdx + 2] = Math.round(ink.b * (1 - value) + paper.b * value);
                    imageData.data[dstIdx + 3] = 255;
                }
            }
            ctx.putImageData(imageData, 0, 0);
            return;
        }

        // Render with gaps between character cells
        for (let row = 0; row < numRows; row++) {
            for (let col = 0; col < numCols; col++) {
                // Source position in mockup
                const srcStartX = col * charWidth;
                const srcStartY = row * charHeight;

                // Destination position with gaps
                const dstStartX = col * (scaledCharWidth + scaledGap);
                const dstStartY = row * (scaledCharHeight + scaledGap);

                // Create imageData for this cell
                const cellData = ctx.createImageData(scaledCharWidth, scaledCharHeight);

                for (let py = 0; py < scaledCharHeight; py++) {
                    for (let px = 0; px < scaledCharWidth; px++) {
                        const srcX = srcStartX + Math.floor(px / scale);
                        const srcY = srcStartY + Math.floor(py / scale);
                        const srcIdx = srcY * mockupWidth + srcX;
                        const dstIdx = (py * scaledCharWidth + px) * 4;

                        const value = mockup[srcIdx];
                        cellData.data[dstIdx] = Math.round(ink.r * (1 - value) + paper.r * value);
                        cellData.data[dstIdx + 1] = Math.round(ink.g * (1 - value) + paper.g * value);
                        cellData.data[dstIdx + 2] = Math.round(ink.b * (1 - value) + paper.b * value);
                        cellData.data[dstIdx + 3] = 255;
                    }
                }

                ctx.putImageData(cellData, dstStartX, dstStartY);
            }
        }
    },

    /**
     * Load preset character set
     */
    loadPreset(preset) {
        const presets = {
            typewriter: [
                { percentage: 0, value: ' ', color: '#000000' },
                { percentage: 8, value: '.', color: '#000000' },
                { percentage: 16, value: ',', color: '#000000' },
                { percentage: 24, value: "'", color: '#000000' },
                { percentage: 32, value: ':', color: '#000000' },
                { percentage: 40, value: ';', color: '#000000' },
                { percentage: 48, value: 'i', color: '#000000' },
                { percentage: 56, value: 'l', color: '#000000' },
                { percentage: 64, value: 'x', color: '#000000' },
                { percentage: 72, value: 'o', color: '#000000' },
                { percentage: 80, value: 'X', color: '#000000' },
                { percentage: 88, value: '#', color: '#000000' },
                { percentage: 94, value: '@', color: '#000000' },
                { percentage: 100, value: 'M', color: '#000000' }
            ],
            dense: [
                { percentage: 0, value: ' ', color: '#000000' },
                { percentage: 5, value: '.', color: '#000000' },
                { percentage: 10, value: "'", color: '#000000' },
                { percentage: 15, value: '`', color: '#000000' },
                { percentage: 20, value: '^', color: '#000000' },
                { percentage: 25, value: '"', color: '#000000' },
                { percentage: 30, value: ',', color: '#000000' },
                { percentage: 35, value: ':', color: '#000000' },
                { percentage: 40, value: ';', color: '#000000' },
                { percentage: 45, value: 'I', color: '#000000' },
                { percentage: 50, value: 'l', color: '#000000' },
                { percentage: 55, value: '!', color: '#000000' },
                { percentage: 60, value: 'i', color: '#000000' },
                { percentage: 65, value: '>', color: '#000000' },
                { percentage: 70, value: '<', color: '#000000' },
                { percentage: 75, value: '~', color: '#000000' },
                { percentage: 80, value: '+', color: '#000000' },
                { percentage: 85, value: 'x', color: '#000000' },
                { percentage: 90, value: 'X', color: '#000000' },
                { percentage: 95, value: '#', color: '#000000' },
                { percentage: 100, value: '@', color: '#000000' }
            ]
        };

        if (presets[preset]) {
            this.stops = JSON.parse(JSON.stringify(presets[preset]));
            this.chars = null; // Force rebuild
        }
    }
};

// Initialize
TypewriterMode.init();
