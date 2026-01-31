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
     * Invalidate all precomputed character caches
     */
    invalidateCache() {
        this.charDensities = null;
        this.charShapes = null;
        this.sortedByDensity = null;
        this.edgeCharImages = null;
    },

    /**
     * Set character set
     */
    setCharacters(chars) {
        this.characters = chars;
        this.invalidateCache();
    },

    /**
     * Create a canvas sized for a single character glyph
     */
    createCharCanvas(cellSize, fontFamily) {
        const measureCtx = document.createElement('canvas').getContext('2d');
        measureCtx.font = `${cellSize}px ${fontFamily}`;
        const charWidth = Math.ceil(measureCtx.measureText('M').width);
        const charHeight = cellSize;

        const canvas = document.createElement('canvas');
        canvas.width = charWidth;
        canvas.height = charHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        return { canvas, ctx, charWidth, charHeight };
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
        const { canvas, ctx, charWidth, charHeight } = this.createCharCanvas(cellSize, fontFamily);

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
        const { canvas, ctx, charWidth, charHeight } = this.createCharCanvas(cellSize, fontFamily);

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
        const { canvas, ctx, charWidth, charHeight } = this.createCharCanvas(cellSize, fontFamily);

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
     * Returns { magnitude, direction } arrays (both 0-1 normalized for magnitude, radians for direction)
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
        const magnitude = new Float32Array(width * height);
        const direction = new Float32Array(width * height);
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
                magnitude[y * width + x] = mag;
                direction[y * width + x] = Math.atan2(gy, gx);
                if (mag > maxMag) maxMag = mag;
            }
        }

        // Normalize magnitude to 0-1
        if (maxMag > 0) {
            for (let i = 0; i < magnitude.length; i++) {
                magnitude[i] /= maxMag;
            }
        }

        return { magnitude, direction };
    },

    /**
     * Apply Canny edge detection (non-maximum suppression + hysteresis)
     * Returns cleaned edge magnitude array
     */
    cannyEdges(magnitude, direction, width, height) {
        const suppressed = new Float32Array(magnitude.length);

        // Pass 1: Non-maximum suppression
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                const angle = direction[idx];
                const mag = magnitude[idx];

                // Normalize angle to 0-180 degrees
                let angleDeg = (angle * 180 / Math.PI) % 180;
                if (angleDeg < 0) angleDeg += 180;

                // Determine neighbors to compare based on gradient direction
                let n1, n2;
                if (angleDeg < 22.5 || angleDeg >= 157.5) {
                    // Horizontal edge (0°)
                    n1 = magnitude[idx - 1];
                    n2 = magnitude[idx + 1];
                } else if (angleDeg >= 22.5 && angleDeg < 67.5) {
                    // Diagonal edge (45°)
                    n1 = magnitude[(y - 1) * width + (x + 1)];
                    n2 = magnitude[(y + 1) * width + (x - 1)];
                } else if (angleDeg >= 67.5 && angleDeg < 112.5) {
                    // Vertical edge (90°)
                    n1 = magnitude[(y - 1) * width + x];
                    n2 = magnitude[(y + 1) * width + x];
                } else {
                    // Diagonal edge (135°)
                    n1 = magnitude[(y - 1) * width + (x - 1)];
                    n2 = magnitude[(y + 1) * width + (x + 1)];
                }

                // Keep only if local maximum
                if (mag >= n1 && mag >= n2) {
                    suppressed[idx] = mag;
                }
            }
        }

        // Pass 2: Double threshold + hysteresis
        const lowThreshold = 0.1;
        const highThreshold = 0.25;
        const result = new Float32Array(magnitude.length);
        const visited = new Uint8Array(magnitude.length);

        // Mark strong edges
        for (let i = 0; i < suppressed.length; i++) {
            if (suppressed[i] >= highThreshold) {
                result[i] = suppressed[i];
                visited[i] = 2; // Strong edge
            } else if (suppressed[i] >= lowThreshold) {
                visited[i] = 1; // Weak edge
            }
        }

        // Hysteresis: connect weak edges to strong edges
        const queue = [];
        for (let i = 0; i < visited.length; i++) {
            if (visited[i] === 2) queue.push(i);
        }

        while (queue.length > 0) {
            const idx = queue.shift();
            const y = Math.floor(idx / width);
            const x = idx % width;

            // Check 8 neighbors
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const ny = y + dy;
                    const nx = x + dx;
                    if (ny < 0 || ny >= height || nx < 0 || nx >= width) continue;

                    const nidx = ny * width + nx;
                    if (visited[nidx] === 1) {
                        result[nidx] = suppressed[nidx];
                        visited[nidx] = 2;
                        queue.push(nidx);
                    }
                }
            }
        }

        return result;
    },

    /**
     * Get directional edge character for a tile
     * Returns character if edge detected, null otherwise
     */
    getEdgeChar(direction, magnitude, width, imgX, imgY, charWidth, charHeight, isCanny = false) {
        // Compute magnitude-weighted average angle in tile
        let totalMag = 0;
        let maxMag = 0;
        let edgePixelCount = 0;
        let sinSum = 0;
        let cosSum = 0;

        for (let py = 0; py < charHeight; py++) {
            for (let px = 0; px < charWidth; px++) {
                const x = imgX + px;
                const y = imgY + py;
                if (x >= width || y >= magnitude.length / width) continue;

                const idx = y * width + x;
                const mag = magnitude[idx];
                const angle = direction[idx];

                if (mag > 0.01) edgePixelCount++;
                totalMag += mag;
                if (mag > maxMag) maxMag = mag;
                sinSum += Math.sin(angle) * mag;
                cosSum += Math.cos(angle) * mag;
            }
        }

        // Threshold: different for Canny (sparse edges) vs regular Sobel
        const totalPixels = charWidth * charHeight;
        let hasEdge = false;

        if (isCanny) {
            // Canny produces sparse edges - check if we have enough edge pixels
            const edgeRatio = edgePixelCount / totalPixels;
            hasEdge = edgeRatio > 0.02 || maxMag > 0.3;
        } else {
            // Regular Sobel - use average magnitude
            const avgMag = totalMag / totalPixels;
            hasEdge = avgMag > 0.08;
        }

        if (!hasEdge) return null;

        // Compute dominant gradient angle
        const gradientAngle = Math.atan2(sinSum, cosSum);

        // Gradient is perpendicular to edge - rotate 90° to get edge orientation
        const edgeAngle = gradientAngle + Math.PI / 2;

        // Normalize to 0-180 degrees
        let angleDeg = (edgeAngle * 180 / Math.PI) % 180;
        if (angleDeg < 0) angleDeg += 180;

        // Map angle to directional character
        if (angleDeg < 22.5 || angleDeg >= 157.5) {
            return '-'; // Horizontal edge
        } else if (angleDeg >= 22.5 && angleDeg < 67.5) {
            return '\\'; // Diagonal (top-left to bottom-right)
        } else if (angleDeg >= 67.5 && angleDeg < 112.5) {
            return '|'; // Vertical edge
        } else {
            return '/'; // Diagonal (bottom-left to top-right)
        }
    },

    /**
     * Main render - delegates to algorithm
     */
    render(ctx, canvas, img, params) {
        const algorithm = params.mode === 'fullCustom'
            ? (params.fullCustomAlgorithm || 'shadeShape')
            : (params.asciiAlgorithm || 'shadeShape');

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
            fg: stop && stop.color != null ? stop.color : this.fgColor,
            bg: stop && stop.bgColor != null ? stop.bgColor : this.bgColor,
            image: stop ? stop.image : null,
            imageData: stop ? stop.imageData : null,
            preserveOriginalColors: stop ? stop.preserveOriginalColors : false
        };
    },

    /**
     * Find the best stop for a character based on target percentage
     * Used when multiple stops have the same character value
     */
    getStopByCharAndPercentage(char, targetPercentage) {
        const matchingStops = this.stops.filter(s => s.value === char);
        if (matchingStops.length === 0) {
            return this.stops[0]; // Fallback
        }
        if (matchingStops.length === 1) {
            return matchingStops[0];
        }

        // Multiple stops with same char - pick closest by percentage
        let bestStop = matchingStops[0];
        let minDiff = Math.abs(targetPercentage - matchingStops[0].percentage);

        for (const stop of matchingStops) {
            const diff = Math.abs(targetPercentage - stop.percentage);
            if (diff < minDiff) {
                minDiff = diff;
                bestStop = stop;
            }
        }

        return bestStop;
    },

    /**
     * Draw an image stop with FG/BG colors applied
     * Black pixels -> FG color, White pixels -> BG color
     */
    drawImageStop(ctx, stopData, x, y, w, h) {
        // If preserve original colors, just draw the image as-is
        if (stopData.preserveOriginalColors && stopData.image) {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(stopData.image, x, y, w, h);
            ctx.imageSmoothingEnabled = true;
            return;
        }

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
        return Core.hexToRgb(hex);
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
                    this.setStopImageData(stopId, img, imageData);
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
     * Load an image into a stop from URL
     */
    loadStopImageFromURL(stopId, url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                // Get image data
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, img.width, img.height);

                this.setStopImageData(stopId, img, imageData);
                resolve();
            };
            img.onerror = () => reject(new Error(`Failed to load image from ${url}`));
            img.src = url;
        });
    },

    /**
     * Store image data on a stop and invalidate caches
     */
    setStopImageData(stopId, img, imageData) {
        const stop = this.stops.find(s => s.id === stopId);
        if (stop) {
            stop.image = img;
            stop.imageData = imageData;
            this.invalidateCache();
        }
    },

    /**
     * Remove image from a stop
     */
    removeStopImage(stopId) {
        const stop = this.stops.find(s => s.id === stopId);
        if (stop) {
            stop.image = null;
            stop.imageData = null;
            this.invalidateCache();
        }
    },

    /**
     * Setup canvas and precompute if needed
     */
    setupRender(ctx, canvas, img, params) {
        const prepared = Core.prepareImage(img);
        const { width, height, data } = prepared;
        const scale = params.outputScale || 1;

        const isFullCustom = params.mode === 'fullCustom';
        const fontFamily = params.fontFamily || 'monospace';

        let cellSize, charWidth, charHeight;

        if (isFullCustom) {
            // Full Custom: explicit pixel dimensions
            charWidth = params.fullCustomCellWidth || 10;
            charHeight = params.fullCustomCellHeight || 10;
            cellSize = charHeight;  // font-size for text rendering
        } else {
            // ASCII: font-size based (use font metrics)
            cellSize = params.cellSize;
            ctx.font = `${cellSize}px ${fontFamily}`;
            const metrics = ctx.measureText('M');
            charWidth = Math.ceil(metrics.width);
            charHeight = cellSize;
        }

        const cols = Math.floor(width / charWidth);
        const rows = Math.floor(height / charHeight);

        // Scaled dimensions for rendering
        const scaledCharWidth = charWidth * scale;
        const scaledCharHeight = charHeight * scale;
        const scaledCellSize = cellSize * scale;

        canvas.width = cols * scaledCharWidth;
        canvas.height = rows * scaledCharHeight;

        // Recompute character data if needed
        if (!this.charDensities ||
            this._lastCellSize !== cellSize ||
            this._lastFont !== fontFamily) {
            this.precomputeCharData(cellSize, fontFamily);
            this._lastCellSize = cellSize;
            this._lastFont = fontFamily;
        }

        // Fill background
        ctx.fillStyle = params.bgColor || this.bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Setup font (scaled)
        ctx.fillStyle = params.monoColor || this.fgColor;
        ctx.font = `${scaledCellSize}px ${fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Read mode-specific params
        const blackPoint = isFullCustom ? (params.fullCustomBlackPoint || 0) : (params.asciiBlackPoint || 0);
        const whitePoint = isFullCustom
            ? (params.fullCustomWhitePoint !== undefined ? params.fullCustomWhitePoint : 1)
            : (params.asciiWhitePoint !== undefined ? params.asciiWhitePoint : 1);
        const useOriginalColor = isFullCustom
            ? (params.fullCustomUseOriginalColor || false)
            : (params.asciiUseOriginalColor || false);
        const edgeMode = isFullCustom
            ? (params.fullCustomEdgeMode || 'none')
            : (params.asciiEdgeMode || 'none');
        const invert = isFullCustom
            ? (params.fullCustomInvert || false)
            : (params.asciiInvert || false);

        return {
            data, width, height,
            cellSize, charWidth, charHeight,
            cols, rows,
            scaledCharWidth, scaledCharHeight,
            blackPoint, whitePoint,
            useOriginalColor, edgeMode, invert,
            fontFamily, scale
        };
    },

    /**
     * Compute edge data for overlay (shared by brightness and shadeShape algorithms)
     */
    computeEdgeOverlay(edgeMode, data, width, height) {
        if (edgeMode === 'none') return { edgeMagnitude: null, edgeDirection: null };

        const result = this.sobelFullImage(data, width, height);
        let edgeMagnitude = result.magnitude;
        const edgeDirection = result.direction;

        if (edgeMode === 'canny') {
            edgeMagnitude = this.cannyEdges(edgeMagnitude, edgeDirection, width, height);
        }

        return { edgeMagnitude, edgeDirection };
    },

    /**
     * Sample a cell's average brightness and color
     */
    sampleCell(data, width, height, imgX, imgY, charWidth, charHeight) {
        let brightness = 0;
        let rSum = 0, gSum = 0, bSum = 0;
        let count = 0;

        for (let py = 0; py < charHeight && imgY + py < height; py++) {
            for (let px = 0; px < charWidth && imgX + px < width; px++) {
                const idx = ((imgY + py) * width + (imgX + px)) * 4;
                const r = data[idx], g = data[idx + 1], b = data[idx + 2];
                brightness += Core.getLuma(r, g, b);
                rSum += r; gSum += g; bSum += b;
                count++;
            }
        }

        return {
            brightness: count > 0 ? brightness / count : 1,
            rSum, gSum, bSum, count
        };
    },

    /**
     * Draw a character cell with proper colors and background
     */
    drawCell(ctx, char, baseStop, col, row, cellColor, setup) {
        const { scaledCharWidth, scaledCharHeight, useOriginalColor } = setup;

        const drawX = col * scaledCharWidth;
        const drawY = row * scaledCharHeight;

        // Determine colors from the selected stop
        let fgColor = baseStop.color != null ? baseStop.color : this.fgColor;
        const bgColor = baseStop.bgColor != null ? baseStop.bgColor : this.bgColor;
        if (useOriginalColor && cellColor.count > 0) {
            const r = Math.round(cellColor.rSum / cellColor.count);
            const g = Math.round(cellColor.gSum / cellColor.count);
            const b = Math.round(cellColor.bSum / cellColor.count);
            fgColor = `rgb(${r},${g},${b})`;
        }

        // Draw cell background
        ctx.fillStyle = bgColor;
        ctx.fillRect(drawX, drawY, scaledCharWidth, scaledCharHeight);

        if (char && char !== ' ') {
            if (baseStop.image) {
                this.drawImageStop(ctx, baseStop, drawX, drawY, scaledCharWidth, scaledCharHeight);
            } else {
                ctx.fillStyle = fgColor;
                ctx.fillText(char, drawX + scaledCharWidth / 2, drawY + scaledCharHeight / 2);
            }
        }
    },

    /**
     * Apply edge overlay to a base character if edges are detected
     */
    applyEdgeOverlay(baseChar, edgeMagnitude, edgeDirection, width, imgX, imgY, charWidth, charHeight, edgeMode) {
        if (!edgeMagnitude || !edgeDirection) return baseChar;

        const edgeChar = this.getEdgeChar(edgeDirection, edgeMagnitude, width, imgX, imgY, charWidth, charHeight, edgeMode === 'canny');
        return edgeChar || baseChar;
    },

    /**
     * Algorithm 1: Simple brightness mapping
     */
    renderBrightness(ctx, canvas, img, params) {
        const setup = this.setupRender(ctx, canvas, img, params);
        const { data, width, height, charWidth, charHeight, cols, rows, blackPoint, whitePoint, edgeMode, invert } = setup;

        const { edgeMagnitude, edgeDirection } = this.computeEdgeOverlay(edgeMode, data, width, height);

        // Sort stops once outside the loop
        const sortedStops = [...this.stops].sort((a, b) => a.percentage - b.percentage);

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const imgX = col * charWidth;
                const imgY = row * charHeight;

                const cellColor = this.sampleCell(data, width, height, imgX, imgY, charWidth, charHeight);
                const brightness = this.applyLevels(cellColor.brightness, blackPoint, whitePoint);

                // Map brightness to stop percentage (0-100)
                // Normal: Dark areas = high percentage (dense chars)
                // Inverted: Bright areas = high percentage (dense chars)
                const percentage = invert ? brightness * 100 : (1 - brightness) * 100;

                // Find the closest stop by percentage
                let baseStop = sortedStops[0];
                let minDiff = Math.abs(percentage - sortedStops[0].percentage);

                for (const stop of sortedStops) {
                    const diff = Math.abs(percentage - stop.percentage);
                    if (diff < minDiff) {
                        minDiff = diff;
                        baseStop = stop;
                    }
                }

                const char = this.applyEdgeOverlay(baseStop.value, edgeMagnitude, edgeDirection, width, imgX, imgY, charWidth, charHeight, edgeMode);
                this.drawCell(ctx, char, baseStop, col, row, cellColor, setup);
            }
        }
    },

    /**
     * Algorithm 2: Shade + Shape hybrid (asciiart.club style)
     */
    renderShadeShape(ctx, canvas, img, params) {
        const setup = this.setupRender(ctx, canvas, img, params);
        const { data, width, height, charWidth, charHeight, cols, rows, blackPoint, whitePoint, edgeMode, invert } = setup;

        const { edgeMagnitude, edgeDirection } = this.computeEdgeOverlay(edgeMode, data, width, height);

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const imgX = col * charWidth;
                const imgY = row * charHeight;

                const cellColor = this.sampleCell(data, width, height, imgX, imgY, charWidth, charHeight);
                const brightness = this.applyLevels(cellColor.brightness, blackPoint, whitePoint);

                // Target density: dark areas = dense characters, inverted = bright areas dense
                const targetDensity = invert ? brightness : (1 - brightness);

                // Find top 8 candidates by visual density, then pick best shape match
                const candidates = this.getCharsByDensity(targetDensity, 8);
                const imageShape = this.sampleImageShape(
                    data, width, height,
                    imgX, imgY, charWidth, charHeight,
                    blackPoint, whitePoint
                );
                const baseChar = this.findBestShapeMatch(candidates, imageShape);

                // Map brightness to percentage and find the best stop for this character
                const percentage = invert ? brightness * 100 : (1 - brightness) * 100;
                const baseStop = this.getStopByCharAndPercentage(baseChar, percentage);

                const char = this.applyEdgeOverlay(baseChar, edgeMagnitude, edgeDirection, width, imgX, imgY, charWidth, charHeight, edgeMode);
                this.drawCell(ctx, char, baseStop, col, row, cellColor, setup);
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
    sampleImageShape(data, imgWidth, imgHeight, x, y, cellW, cellH, blackPoint, whitePoint) {
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
                        // Dark = ink
                        sum += 1 - luma;
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
        const setup = this.setupRender(ctx, canvas, img, params);
        const { data, width, height, charWidth, charHeight, cols, rows, blackPoint, whitePoint, useOriginalColor } = setup;

        // Step 1: Run Sobel edge detection on full image
        const { magnitude: edges } = this.sobelFullImage(data, width, height);

        // Step 2: Apply levels and threshold to binary
        const threshold = 0.1; // Edge threshold
        const binaryEdges = new Float32Array(edges.length);
        for (let i = 0; i < edges.length; i++) {
            let val = this.applyLevels(edges[i], blackPoint, whitePoint);
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

                // Sample brightness to find appropriate stop for this character
                const cellBrightness = this.sampleCell(data, width, height, imgX, imgY, charWidth, charHeight);
                const brightness = this.applyLevels(cellBrightness.brightness, blackPoint, whitePoint);
                const percentage = (1 - brightness) * 100;
                const baseStop = this.getStopByCharAndPercentage(char, percentage);

                const cellColor = { rSum, gSum, bSum, count: colorCount };
                this.drawCell(ctx, char, baseStop, col, row, cellColor, setup);
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
            this.invalidateCache();
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

    loadFromCharString(str) {
        if (!str || str.length === 0) return;

        this.characters = str;
        this.invalidateCache();

        // Auto-distribute stops evenly
        this.stops = str.split('').map((char, i) => ({
            id: i,
            percentage: str.length > 1 ? Math.round(i / (str.length - 1) * 100) : 0,
            value: char,
            color: this.fgColor,
            bgColor: this.bgColor
        }));
        this.stopIdCounter = this.stops.length;
    },

    // Presets
    loadPreset(preset) {
        const presets = {
            basic: ' .:-=+*#%@',
            blocks: ' ░▒▓█',
            detailed: ' .`\'^",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
            typewriter: ' .,\'":;ilxoX#@M',
            rounds: ' .oO0@',
            dots: ' .·•●',
            braille: '⠀⣀⣄⣤⣦⣶⣷⣿',
        };

        if (presets[preset]) {
            this.characters = presets[preset];
            this.invalidateCache();

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

    /**
     * Load custom preset from JSON or plain string
     * Returns true on success, false on failure
     */
    loadCustomPreset(input) {
        try {
            let stops;

            // Try to parse as JSON first
            try {
                const parsed = JSON.parse(input);
                if (parsed.stops && Array.isArray(parsed.stops)) {
                    // JSON format with stops array
                    stops = parsed.stops.map((s, i) => ({
                        id: i,
                        percentage: s.percentage !== undefined ? s.percentage : 0,
                        value: s.value !== undefined ? s.value : ' ',
                        color: s.color != null ? s.color : this.fgColor,
                        bgColor: s.bgColor != null ? s.bgColor : this.bgColor
                    }));
                } else {
                    throw new Error('Invalid JSON format');
                }
            } catch (jsonError) {
                // Not valid JSON, treat as plain character string
                const chars = input.split('');
                if (chars.length === 0) {
                    return false;
                }

                // Auto-space percentages evenly
                stops = chars.map((char, i) => ({
                    id: i,
                    percentage: chars.length > 1 ? Math.round(i / (chars.length - 1) * 100) : 0,
                    value: char,
                    color: this.fgColor,
                    bgColor: this.bgColor
                }));
            }

            // Apply the stops
            this.stops = stops;
            this.stops.sort((a, b) => a.percentage - b.percentage);
            this.stopIdCounter = stops.length;
            this.syncFromStops();

            return true;
        } catch (error) {
            console.error('Failed to load custom preset:', error);
            return false;
        }
    },

    /**
     * Apply an image preset (e.g., minesweeper tiles)
     */
    async applyImagePreset(presetName) {
        if (presetName === 'minesweeper') {
            const tiles = [
                { percentage: 0, file: 'TileEmpty.png' },
                { percentage: 12.5, file: 'Tile1.png' },
                { percentage: 25, file: 'Tile2.png' },
                { percentage: 37.5, file: 'Tile3.png' },
                { percentage: 50, file: 'Tile5.png' },
                { percentage: 62.5, file: 'Tile7.png' },
                { percentage: 75, file: 'TileUnknown.png' },
                { percentage: 87.5, file: 'TileMine.png' },
                { percentage: 100, file: 'TileExploded.png' }
            ];

            // Clear existing stops
            this.stops = [];
            this.characters = '';

            // Add stops and load images
            for (const tile of tiles) {
                const url = `assets/minesweeper/${tile.file}`;
                const stopId = this.stopIdCounter++;

                this.stops.push({
                    id: stopId,
                    percentage: tile.percentage,
                    value: String.fromCharCode(9600 + stopId), // Use unique placeholder char
                    color: this.fgColor,
                    bgColor: this.bgColor,
                    image: null,
                    imageData: null,
                    preserveOriginalColors: true  // Keep minesweeper tiles colorful
                });

                try {
                    await this.loadStopImageFromURL(stopId, url);
                } catch (error) {
                    console.error(`Failed to load ${tile.file}:`, error);
                }
            }

            // Update characters string and invalidate caches
            this.characters = this.stops.map(s => s.value).join('');
            this.invalidateCache();
        }
    },

};

AsciiMode.init();
