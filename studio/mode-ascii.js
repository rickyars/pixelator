/**
 * ASCII Mode - Multiple algorithm support
 *
 * Algorithms:
 * 1. Brightness - Simple density mapping
 * 2. Shade + Shape - Two-phase matching (asciiart.club style)
 * 3. Edge Detection - Sobel-based directional matching
 */
const AsciiMode = {
    // Character data
    characters: [],

    // Pre-computed character data
    charDensities: null,      // Map<char, density>
    charShapes: null,         // Map<char, 6D vector>
    sortedByDensity: null,    // Array of {char, density} sorted by density

    // Edge detection specific
    edgeChars: ' `|^"\\,./V_-',  // Characters suited for edge representation
    edgeCharImages: null,     // Map<char, flattened binary array>

    // Rendering settings
    bgColor: '#ffffff',
    fgColor: '#000000',

    // Cache keys
    _lastCellSize: null,
    _lastFont: null,
    _lastSquareCells: null,
    _useSquareCells: false,

    /**
     * Initialize with default character set
     */
    init() {
        this.characters = ' .`\'^",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$';
        this.bgColor = '#ffffff';
        this.fgColor = '#000000';

        // Initialize stops from characters
        this.stops = this.characters.split('').map((char, i) => ({
            id: i,
            percentage: Math.round(i / (this.characters.length - 1) * 100),
            value: char,
            color: this.fgColor,
            bgColor: this.bgColor
        }));
        this.stopIdCounter = this.stops.length;
    },

    /**
     * Set character set
     */
    setCharacters(chars) {
        this.characters = chars;
        this.charDensities = null;
        this.charShapes = null;
        this.sortedByDensity = null;
        this.edgeCharImages = null;
    },

    /**
     * Pre-compute all character data
     */
    precomputeCharData(cellSize, fontFamily) {
        this.computeDensities(cellSize, fontFamily);
        this.computeShapes(cellSize, fontFamily);
        this.computeEdgeCharImages(cellSize, fontFamily);
    },

    /**
     * Compute character densities (ink coverage)
     */
    computeDensities(cellSize, fontFamily) {
        const canvas = document.createElement('canvas');
        let charWidth, charHeight;

        if (this._useSquareCells) {
            charWidth = cellSize;
            charHeight = cellSize;
        } else {
            const measureCtx = document.createElement('canvas').getContext('2d');
            measureCtx.font = `${cellSize}px ${fontFamily}`;
            const metrics = measureCtx.measureText('M');
            charWidth = Math.ceil(metrics.width);
            charHeight = cellSize;
        }

        canvas.width = charWidth;
        canvas.height = charHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        this.charDensities = new Map();
        const densityList = [];

        for (const char of this.characters) {
            // Check if this char has an image stop
            const stop = this.stops.find(s => s.value === char);
            let density = 0;

            if (stop && stop.imageData) {
                // Compute density from uploaded image
                const imgData = stop.imageData.data;
                let darkPixels = 0;
                for (let i = 0; i < imgData.length; i += 4) {
                    // Use luminance to determine darkness
                    const luma = (imgData[i] * 0.299 + imgData[i + 1] * 0.587 + imgData[i + 2] * 0.114) / 255;
                    darkPixels += (1 - luma);
                }
                density = darkPixels / (imgData.length / 4);
            } else {
                // Render text character and measure density
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, charWidth, charHeight);

                if (char !== ' ') {
                    ctx.fillStyle = 'black';
                    ctx.font = `${cellSize}px ${fontFamily}`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(char, charWidth / 2, charHeight / 2);
                }

                const imageData = ctx.getImageData(0, 0, charWidth, charHeight);
                let blackPixels = 0;
                const totalPixels = charWidth * charHeight;

                for (let i = 0; i < imageData.data.length; i += 4) {
                    // Count dark pixels (inverted: 0=white, 255=black)
                    blackPixels += (255 - imageData.data[i]) / 255;
                }

                density = blackPixels / totalPixels;
            }

            this.charDensities.set(char, density);
            densityList.push({ char, density });
        }

        // Sort by density for brightness algorithm
        this.sortedByDensity = densityList.sort((a, b) => a.density - b.density);
    },

    /**
     * Compute 6D shape vectors (per-vector normalization)
     */
    computeShapes(cellSize, fontFamily) {
        const canvas = document.createElement('canvas');
        let charWidth, charHeight;

        if (this._useSquareCells) {
            charWidth = cellSize;
            charHeight = cellSize;
        } else {
            const measureCtx = document.createElement('canvas').getContext('2d');
            measureCtx.font = `${cellSize}px ${fontFamily}`;
            const metrics = measureCtx.measureText('M');
            charWidth = Math.ceil(metrics.width);
            charHeight = cellSize;
        }

        canvas.width = charWidth;
        canvas.height = charHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // 6 sampling regions (2 cols × 3 rows)
        const regions = [
            { x: 0.25, y: 0.167 }, { x: 0.75, y: 0.167 },  // top
            { x: 0.25, y: 0.5 },   { x: 0.75, y: 0.5 },    // middle
            { x: 0.25, y: 0.833 }, { x: 0.75, y: 0.833 }   // bottom
        ];
        const radius = Math.min(charWidth, charHeight) * 0.25;

        this.charShapes = new Map();
        this._shapeCharWidth = charWidth;
        this._shapeCharHeight = charHeight;
        this._regions = regions;
        this._radius = radius;

        for (const char of this.characters) {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, charWidth, charHeight);

            if (char !== ' ') {
                ctx.fillStyle = 'black';
                ctx.font = `${cellSize}px ${fontFamily}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(char, charWidth / 2, charHeight / 2);
            }

            const imageData = ctx.getImageData(0, 0, charWidth, charHeight);

            // Sample 6 regions
            const vector = regions.map(region => {
                const cx = region.x * charWidth;
                const cy = region.y * charHeight;
                let sum = 0, count = 0;

                for (let py = 0; py < charHeight; py++) {
                    for (let px = 0; px < charWidth; px++) {
                        const dx = px - cx, dy = py - cy;
                        if (dx * dx + dy * dy <= radius * radius) {
                            const idx = (py * charWidth + px) * 4;
                            sum += 1 - imageData.data[idx] / 255;
                            count++;
                        }
                    }
                }
                return count > 0 ? sum / count : 0;
            });

            // Per-vector normalization
            const max = Math.max(...vector);
            const normalized = max > 0 ? vector.map(v => v / max) : vector;
            this.charShapes.set(char, normalized);
        }
    },

    /**
     * Compute binary edge images for edge-friendly characters
     */
    computeEdgeCharImages(cellSize, fontFamily) {
        const canvas = document.createElement('canvas');
        let charWidth, charHeight;

        if (this._useSquareCells) {
            charWidth = cellSize;
            charHeight = cellSize;
        } else {
            const measureCtx = document.createElement('canvas').getContext('2d');
            measureCtx.font = `${cellSize}px ${fontFamily}`;
            const metrics = measureCtx.measureText('M');
            charWidth = Math.ceil(metrics.width);
            charHeight = cellSize;
        }

        canvas.width = charWidth;
        canvas.height = charHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        this.edgeCharImages = new Map();
        this._edgeCharWidth = charWidth;
        this._edgeCharHeight = charHeight;

        // Pre-render each edge character as a binary image
        for (const char of this.edgeChars) {
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, charWidth, charHeight);

            if (char !== ' ') {
                ctx.fillStyle = 'white';
                ctx.font = `${cellSize}px ${fontFamily}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(char, charWidth / 2, charHeight / 2);
            }

            const imageData = ctx.getImageData(0, 0, charWidth, charHeight);

            // Convert to binary array (0 or 1)
            const binary = new Float32Array(charWidth * charHeight);
            for (let i = 0; i < binary.length; i++) {
                binary[i] = imageData.data[i * 4] > 127 ? 1 : 0;
            }

            this.edgeCharImages.set(char, binary);
        }
    },

    /**
     * Apply Gaussian blur to grayscale image (3x3 kernel)
     */
    gaussianBlur(gray, width, height) {
        const blurred = new Float32Array(gray.length);
        // 3x3 Gaussian kernel (approximation)
        const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
        const kernelSum = 16;

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let sum = 0;
                let ki = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        sum += gray[(y + ky) * width + (x + kx)] * kernel[ki];
                        ki++;
                    }
                }
                blurred[y * width + x] = sum / kernelSum;
            }
        }

        return blurred;
    },

    /**
     * Apply Sobel edge detection to full image
     * Returns edge magnitude array (0-1 normalized)
     */
    sobelFullImage(data, width, height) {
        // First convert to grayscale
        const gray = new Float32Array(width * height);
        for (let i = 0; i < gray.length; i++) {
            const idx = i * 4;
            gray[i] = Core.getLuma(data[idx], data[idx + 1], data[idx + 2]);
        }

        // Apply Gaussian blur to reduce noise
        const blurred = this.gaussianBlur(gray, width, height);

        // Apply Sobel
        const edges = new Float32Array(width * height);
        const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
        const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

        let maxMag = 0;

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let gx = 0, gy = 0;
                let ki = 0;

                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const val = blurred[(y + ky) * width + (x + kx)];
                        gx += val * sobelX[ki];
                        gy += val * sobelY[ki];
                        ki++;
                    }
                }

                const mag = Math.sqrt(gx * gx + gy * gy);
                edges[y * width + x] = mag;
                if (mag > maxMag) maxMag = mag;
            }
        }

        // Normalize to 0-1
        if (maxMag > 0) {
            for (let i = 0; i < edges.length; i++) {
                edges[i] /= maxMag;
            }
        }

        return edges;
    },

    /**
     * Main render - delegates to algorithm
     */
    render(ctx, canvas, img, params) {
        const algorithm = params.asciiAlgorithm || 'shadeShape';

        switch (algorithm) {
            case 'brightness':
                return this.renderBrightness(ctx, canvas, img, params);
            case 'shadeShape':
                return this.renderShadeShape(ctx, canvas, img, params);
            case 'edge':
                return this.renderEdge(ctx, canvas, img, params);
            default:
                return this.renderShadeShape(ctx, canvas, img, params);
        }
    },

    /**
     * Apply black point / white point levels adjustment
     */
    applyLevels(value, blackPoint, whitePoint) {
        if (whitePoint <= blackPoint) return value > blackPoint ? 1 : 0;
        return Math.max(0, Math.min(1, (value - blackPoint) / (whitePoint - blackPoint)));
    },

    /**
     * Get stop data for a character (colors and optional image)
     */
    getStopData(char) {
        const stop = this.stops.find(s => s.value === char);
        return {
            fg: stop && stop.color ? stop.color : this.fgColor,
            bg: stop && stop.bgColor ? stop.bgColor : this.bgColor,
            image: stop ? stop.image : null,
            imageData: stop ? stop.imageData : null
        };
    },

    /**
     * Draw an image stop with FG/BG colors applied
     * Black pixels -> FG color, White pixels -> BG color
     */
    drawImageStop(ctx, stopData, x, y, w, h) {
        if (!stopData.imageData) {
            if (stopData.image) {
                ctx.drawImage(stopData.image, x, y, w, h);
            }
            return;
        }

        const fg = this.parseColor(stopData.fg);
        const bg = this.parseColor(stopData.bg);

        const srcW = stopData.imageData.width;
        const srcH = stopData.imageData.height;
        const src = stopData.imageData.data;

        // Create temp canvas for colorized image at source size
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = srcW;
        tempCanvas.height = srcH;
        const tempCtx = tempCanvas.getContext('2d');

        const outData = tempCtx.createImageData(srcW, srcH);
        const dst = outData.data;

        for (let i = 0; i < src.length; i += 4) {
            const r = src[i];
            const g = src[i + 1];
            const b = src[i + 2];
            const a = src[i + 3];

            if (a < 128) {
                dst[i] = bg.r;
                dst[i + 1] = bg.g;
                dst[i + 2] = bg.b;
                dst[i + 3] = 255;
            } else {
                const luma = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
                dst[i] = Math.round(fg.r * luma + bg.r * (1 - luma));
                dst[i + 1] = Math.round(fg.g * luma + bg.g * (1 - luma));
                dst[i + 2] = Math.round(fg.b * luma + bg.b * (1 - luma));
                dst[i + 3] = 255;
            }
        }

        tempCtx.putImageData(outData, 0, 0);

        // Draw colorized image scaled to cell with nearest-neighbor
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(tempCanvas, x, y, w, h);
        ctx.imageSmoothingEnabled = true;
    },

    parseColor(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    },

    /**
     * Load an image into a stop
     */
    loadStopImage(stopId, file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // Get image data
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    const imageData = ctx.getImageData(0, 0, img.width, img.height);

                    // Store in stop
                    const stop = this.stops.find(s => s.id === stopId);
                    if (stop) {
                        stop.image = img;
                        stop.imageData = imageData;
                        // Recompute densities since we have a new "character"
                        this.charDensities = null;
                        this.charShapes = null;
                        this.sortedByDensity = null;
                    }
                    resolve();
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    /**
     * Remove image from a stop
     */
    removeStopImage(stopId) {
        const stop = this.stops.find(s => s.id === stopId);
        if (stop) {
            stop.image = null;
            stop.imageData = null;
            this.charDensities = null;
            this.charShapes = null;
            this.sortedByDensity = null;
        }
    },

    /**
     * Setup canvas and precompute if needed
     */
    setupRender(ctx, canvas, img, params) {
        const prepared = Core.prepareImage(img);
        const { width, height, data } = prepared;

        const cellSize = params.cellSize;
        const fontFamily = params.fontFamily || 'monospace';

        // Use square cells ONLY if checkbox is checked
        const useSquareCells = params.asciiForceSquareCells || false;

        let charWidth, charHeight;
        if (useSquareCells) {
            charWidth = cellSize;
            charHeight = cellSize;
        } else {
            ctx.font = `${cellSize}px ${fontFamily}`;
            const metrics = ctx.measureText('M');
            charWidth = Math.ceil(metrics.width);
            charHeight = cellSize;
        }

        const cols = Math.floor(width / charWidth);
        const rows = Math.floor(height / charHeight);

        canvas.width = cols * charWidth;
        canvas.height = rows * charHeight;

        // Recompute character data if needed
        if (!this.charDensities ||
            this._lastCellSize !== cellSize ||
            this._lastFont !== fontFamily ||
            this._lastSquareCells !== useSquareCells) {
            this._useSquareCells = useSquareCells; // Set before computing
            this.precomputeCharData(cellSize, fontFamily);
            this._lastCellSize = cellSize;
            this._lastFont = fontFamily;
            this._lastSquareCells = useSquareCells;
        }

        // Fill background
        ctx.fillStyle = this.bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Setup font
        ctx.fillStyle = this.fgColor;
        ctx.font = `${cellSize}px ${fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Get levels params
        const blackPoint = params.asciiBlackPoint || 0;
        const whitePoint = params.asciiWhitePoint !== undefined ? params.asciiWhitePoint : 1;
        const invert = params.asciiInvert || false;
        const useOriginalColor = params.asciiUseOriginalColor || false;

        return { data, width, height, charWidth, charHeight, cols, rows, blackPoint, whitePoint, invert, useOriginalColor };
    },

    /**
     * Algorithm 1: Simple brightness mapping
     */
    renderBrightness(ctx, canvas, img, params) {
        const { data, width, height, charWidth, charHeight, cols, rows, blackPoint, whitePoint, invert, useOriginalColor } =
            this.setupRender(ctx, canvas, img, params);

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const imgX = col * charWidth;
                const imgY = row * charHeight;

                // Get average brightness and color of cell
                let brightness = 0;
                let rSum = 0, gSum = 0, bSum = 0;
                let count = 0;

                for (let py = 0; py < charHeight && imgY + py < height; py++) {
                    for (let px = 0; px < charWidth && imgX + px < width; px++) {
                        const idx = ((imgY + py) * width + (imgX + px)) * 4;
                        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
                        const luma = Core.getLuma(r, g, b);
                        brightness += luma;
                        rSum += r; gSum += g; bSum += b;
                        count++;
                    }
                }
                brightness = count > 0 ? brightness / count : 1;

                // Apply levels adjustment
                brightness = this.applyLevels(brightness, blackPoint, whitePoint);

                // Normal: dark areas = dense characters. Invert: bright areas = dense characters
                const density = invert ? brightness : 1 - brightness;

                // Map to character by density
                const charIndex = Math.min(
                    this.sortedByDensity.length - 1,
                    Math.floor(density * this.sortedByDensity.length)
                );
                const char = this.sortedByDensity[charIndex].char;

                const stopData = this.getStopData(char);
                const drawX = col * charWidth;
                const drawY = row * charHeight;

                // Determine colors
                let fgColor = stopData.fg;
                let bgColor = stopData.bg;
                if (useOriginalColor && count > 0) {
                    const r = Math.round(rSum / count);
                    const g = Math.round(gSum / count);
                    const b = Math.round(bSum / count);
                    fgColor = `rgb(${r},${g},${b})`;
                }

                // Draw cell background
                ctx.fillStyle = bgColor;
                ctx.fillRect(drawX, drawY, charWidth, charHeight);

                if (char !== ' ') {
                    if (stopData.image) {
                        // Draw uploaded image
                        this.drawImageStop(ctx, stopData, drawX, drawY, charWidth, charHeight);
                    } else {
                        // Draw text character
                        ctx.fillStyle = fgColor;
                        ctx.fillText(char, drawX + charWidth / 2, drawY + charHeight / 2);
                    }
                }
            }
        }
    },

    /**
     * Algorithm 2: Shade + Shape hybrid (asciiart.club style)
     */
    renderShadeShape(ctx, canvas, img, params) {
        const { data, width, height, charWidth, charHeight, cols, rows, blackPoint, whitePoint, invert, useOriginalColor } =
            this.setupRender(ctx, canvas, img, params);

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const imgX = col * charWidth;
                const imgY = row * charHeight;

                // Phase 1: Get cell brightness and color
                let brightness = 0;
                let rSum = 0, gSum = 0, bSum = 0;
                let count = 0;

                for (let py = 0; py < charHeight && imgY + py < height; py++) {
                    for (let px = 0; px < charWidth && imgX + px < width; px++) {
                        const idx = ((imgY + py) * width + (imgX + px)) * 4;
                        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
                        const luma = Core.getLuma(r, g, b);
                        brightness += luma;
                        rSum += r; gSum += g; bSum += b;
                        count++;
                    }
                }
                brightness = count > 0 ? brightness / count : 1;

                // Apply levels adjustment
                brightness = this.applyLevels(brightness, blackPoint, whitePoint);

                // Normal: dark areas = dense characters. Invert: bright areas = dense characters
                const targetDensity = invert ? brightness : 1 - brightness;

                // Find top 8 candidates by density
                const candidates = this.getCharsByDensity(targetDensity, 8);

                // Phase 2: Get shape vector from image
                const imageShape = this.sampleImageShape(
                    data, width, height,
                    imgX, imgY, charWidth, charHeight,
                    blackPoint, whitePoint, invert
                );

                // Find best shape match among candidates
                const char = this.findBestShapeMatch(candidates, imageShape);

                const stopData = this.getStopData(char);
                const drawX = col * charWidth;
                const drawY = row * charHeight;

                // Determine colors
                let fgColor = stopData.fg;
                let bgColor = stopData.bg;
                if (useOriginalColor && count > 0) {
                    const r = Math.round(rSum / count);
                    const g = Math.round(gSum / count);
                    const b = Math.round(bSum / count);
                    fgColor = `rgb(${r},${g},${b})`;
                }

                // Draw cell background
                ctx.fillStyle = bgColor;
                ctx.fillRect(drawX, drawY, charWidth, charHeight);

                if (char !== ' ') {
                    if (stopData.image) {
                        // Draw uploaded image
                        this.drawImageStop(ctx, stopData, drawX, drawY, charWidth, charHeight);
                    } else {
                        // Draw text character
                        ctx.fillStyle = fgColor;
                        ctx.fillText(char, drawX + charWidth / 2, drawY + charHeight / 2);
                    }
                }
            }
        }
    },

    /**
     * Get top N characters closest to target density
     */
    getCharsByDensity(targetDensity, n) {
        const scored = this.sortedByDensity.map(item => ({
            char: item.char,
            diff: Math.abs(item.density - targetDensity)
        }));
        scored.sort((a, b) => a.diff - b.diff);
        return scored.slice(0, n).map(s => s.char);
    },

    /**
     * Sample 6D shape vector from image region (per-vector normalization)
     */
    sampleImageShape(data, imgWidth, imgHeight, x, y, cellW, cellH, blackPoint, whitePoint, invert) {
        const regions = this._regions;
        const radius = this._radius;
        const vector = [];

        for (const region of regions) {
            const cx = x + region.x * cellW;
            const cy = y + region.y * cellH;
            let sum = 0, count = 0;

            const minPx = Math.max(0, Math.floor(cx - radius));
            const maxPx = Math.min(imgWidth - 1, Math.ceil(cx + radius));
            const minPy = Math.max(0, Math.floor(cy - radius));
            const maxPy = Math.min(imgHeight - 1, Math.ceil(cy + radius));

            for (let py = minPy; py <= maxPy; py++) {
                for (let px = minPx; px <= maxPx; px++) {
                    const dx = px - cx, dy = py - cy;
                    if (dx * dx + dy * dy <= radius * radius) {
                        const idx = (py * imgWidth + px) * 4;
                        let luma = Core.getLuma(data[idx], data[idx + 1], data[idx + 2]);
                        // Apply levels adjustment
                        luma = this.applyLevels(luma, blackPoint, whitePoint);
                        // Normal: dark = ink. Invert: bright = ink
                        sum += invert ? luma : 1 - luma;
                        count++;
                    }
                }
            }
            vector.push(count > 0 ? sum / count : 0);
        }

        // Per-vector normalization
        const max = Math.max(...vector);
        const normalized = max > 0 ? vector.map(v => v / max) : vector;

        return normalized;
    },

    /**
     * Find best shape match from candidates
     */
    findBestShapeMatch(candidates, inputVector) {
        let bestChar = candidates[0] || ' ';
        let bestDist = Infinity;

        for (const char of candidates) {
            const shapeVector = this.charShapes.get(char);
            if (!shapeVector) continue;

            let dist = 0;
            for (let i = 0; i < 6; i++) {
                const diff = inputVector[i] - shapeVector[i];
                dist += diff * diff;
            }

            if (dist < bestDist) {
                bestDist = dist;
                bestChar = char;
            }
        }

        return bestChar;
    },

    /**
     * Algorithm 3: Edge detection mode
     * Runs Sobel on full image, then matches tiles to edge characters
     */
    renderEdge(ctx, canvas, img, params) {
        const { data, width, height, charWidth, charHeight, cols, rows, blackPoint, whitePoint, invert, useOriginalColor } =
            this.setupRender(ctx, canvas, img, params);

        // Step 1: Run Sobel edge detection on full image
        const edges = this.sobelFullImage(data, width, height);

        // Step 2: Apply levels and threshold to binary
        const threshold = 0.1; // Edge threshold
        const binaryEdges = new Float32Array(edges.length);
        for (let i = 0; i < edges.length; i++) {
            let val = this.applyLevels(edges[i], blackPoint, whitePoint);
            if (invert) val = 1 - val;
            binaryEdges[i] = val > threshold ? 1 : 0;
        }

        // Step 3: Match each tile to best edge character
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const imgX = col * charWidth;
                const imgY = row * charHeight;

                // Extract tile from binary edge image
                const tile = new Float32Array(charWidth * charHeight);
                let edgeCount = 0;
                let rSum = 0, gSum = 0, bSum = 0, colorCount = 0;

                for (let py = 0; py < charHeight; py++) {
                    for (let px = 0; px < charWidth; px++) {
                        const srcX = Math.min(imgX + px, width - 1);
                        const srcY = Math.min(imgY + py, height - 1);
                        const edgeIdx = srcY * width + srcX;
                        const tileIdx = py * charWidth + px;

                        tile[tileIdx] = binaryEdges[edgeIdx];
                        if (binaryEdges[edgeIdx] > 0) edgeCount++;

                        // Collect color info
                        if (useOriginalColor) {
                            const dataIdx = edgeIdx * 4;
                            rSum += data[dataIdx];
                            gSum += data[dataIdx + 1];
                            bSum += data[dataIdx + 2];
                            colorCount++;
                        }
                    }
                }

                // Find best matching edge character
                const char = this.matchEdgeTile(tile, edgeCount);

                const stopData = this.getStopData(char);
                const drawX = col * charWidth;
                const drawY = row * charHeight;

                // Determine colors
                let fgColor = stopData.fg;
                let bgColor = stopData.bg;
                if (useOriginalColor && colorCount > 0) {
                    const r = Math.round(rSum / colorCount);
                    const g = Math.round(gSum / colorCount);
                    const b = Math.round(bSum / colorCount);
                    fgColor = `rgb(${r},${g},${b})`;
                }

                // Draw cell background
                ctx.fillStyle = bgColor;
                ctx.fillRect(drawX, drawY, charWidth, charHeight);

                if (char !== ' ') {
                    if (stopData.image) {
                        // Draw uploaded image
                        this.drawImageStop(ctx, stopData, drawX, drawY, charWidth, charHeight);
                    } else {
                        // Draw text character
                        ctx.fillStyle = fgColor;
                        ctx.fillText(char, drawX + charWidth / 2, drawY + charHeight / 2);
                    }
                }
            }
        }
    },

    /**
     * Match a binary edge tile to the best edge character
     * Uses Euclidean distance on flattened pixel arrays
     */
    matchEdgeTile(tile, edgeCount) {
        // If tile has very few edge pixels, return space
        const edgeRatio = edgeCount / tile.length;
        if (edgeRatio < 0.02) return ' ';

        let bestChar = ' ';
        let bestDist = Infinity;

        for (const [char, charImage] of this.edgeCharImages) {
            // Euclidean distance between tile and character image
            let dist = 0;
            for (let i = 0; i < tile.length; i++) {
                const diff = tile[i] - charImage[i];
                dist += diff * diff;
            }

            if (dist < bestDist) {
                bestDist = dist;
                bestChar = char;
            }
        }

        return bestChar;
    },

    // Legacy API for compatibility with stops editor
    stops: [],
    stopIdCounter: 0,

    syncFromStops() {
        if (this.stops.length > 0) {
            this.characters = this.stops.map(s => s.value).join('');
            this.charDensities = null;
            this.charShapes = null;
            this.sortedByDensity = null;
            this.edgeCharImages = null;
        }
    },

    addStop(percentage, value, color, bgColor) {
        this.stops.push({ id: this.stopIdCounter++, percentage, value, color, bgColor });
        this.stops.sort((a, b) => a.percentage - b.percentage);
        this.syncFromStops();
    },

    removeStop(id) {
        this.stops = this.stops.filter(s => s.id !== id);
        this.syncFromStops();
    },

    updateStop(id, updates) {
        const stop = this.stops.find(s => s.id === id);
        if (stop) {
            Object.assign(stop, updates);
        }
        this.stops.sort((a, b) => a.percentage - b.percentage);
        this.syncFromStops();
    },

    // Presets
    loadPreset(preset) {
        const presets = {
            basic: ' .:-=+*#%@',
            blocks: ' ░▒▓█',
            detailed: ' .`\'^",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
            minimal: ' .-:=+*#@',
            dense: '.:;+xX#@',
            letters: ' .oO0@',
            dots: ' .·•●',
        };

        if (presets[preset]) {
            this.characters = presets[preset];
            this.charDensities = null;
            this.charShapes = null;
            this.sortedByDensity = null;
            this.edgeCharImages = null;

            this.stops = this.characters.split('').map((char, i) => ({
                id: i,
                percentage: Math.round(i / (this.characters.length - 1) * 100),
                value: char,
                color: this.fgColor,
                bgColor: this.bgColor
            }));
            this.stopIdCounter = this.stops.length;
        }
    },

    randomizePositions() {
        // No-op for new system
    },

    evenSpacing() {
        // No-op for new system
    }
};

AsciiMode.init();
