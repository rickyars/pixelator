/**
 * ImageProcessor - Handles image loading and pixel sampling
 */
class ImageProcessor {
    constructor() {
        this.image = null;
        this.canvas = document.getElementById('hiddenCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.imageData = null;

        // Performance caching
        this.cache = {
            imageData: null,
            samples: null,
            lastGridSize: null,
            lastMethod: null
        };
    }

    /**
     * Load an image from a File object
     * @param {File} file - Image file to load
     * @returns {Promise<HTMLImageElement>}
     */
    loadImage(file) {
        // Validate file size (10MB limit)
        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
        if (file.size > MAX_FILE_SIZE) {
            return Promise.reject(new Error('File too large. Maximum size is 10MB.'));
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const img = new Image();

                img.onload = () => {
                    // Validate image dimensions (4096px limit)
                    const MAX_DIMENSION = 4096;
                    const imgWidth = img.naturalWidth || img.width;
                    const imgHeight = img.naturalHeight || img.height;

                    if (imgWidth > MAX_DIMENSION || imgHeight > MAX_DIMENSION) {
                        reject(new Error(`Image dimensions too large. Maximum is ${MAX_DIMENSION}px per side.`));
                        return;
                    }

                    this.image = img;
                    this.drawToCanvas();
                    resolve(img);
                };

                img.onerror = () => {
                    reject(new Error('Failed to load image'));
                };

                img.src = e.target.result;
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };

            reader.readAsDataURL(file);
        });
    }

    /**
     * Draw the image to the hidden canvas for pixel sampling
     * Only called once on image load - caches imageData for performance
     */
    drawToCanvas() {
        if (!this.image) return;

        // Use intrinsic image dimensions (naturalWidth/naturalHeight) when available
        const width = this.image.naturalWidth || this.image.width;
        const height = this.image.naturalHeight || this.image.height;

        // Set canvas size to match image and clear it
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw image at intrinsic size (1:1 scale, no smoothing needed)
        this.ctx.drawImage(this.image, 0, 0, width, height);

        // Get image data for sampling and cache it
        this.imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.cache.imageData = this.imageData;
    }

    /**
     * Sample pixels from the image with caching for performance
     * @param {number} gridSize - Size of each grid cell in pixels
     * @param {string} method - Sampling method: 'grid', 'random', 'stratified', or 'jittered'
     * @returns {Object} Object with samples array and stepSize
     */
    samplePixels(gridSize, method = 'grid') {
        if (!this.imageData) return { samples: [], stepSize: 0 };

        // Check cache - only resample if parameters changed
        if (this.cache.samples &&
            this.cache.lastGridSize === gridSize &&
            this.cache.lastMethod === method) {
            return { samples: this.cache.samples, stepSize: gridSize };
        }

        const width = this.imageData.width;
        const height = this.imageData.height;
        const stepSize = gridSize;
        const cols = Math.ceil(width / gridSize);
        const rows = Math.ceil(height / gridSize);

        let samples;
        if (method === 'grid') {
            samples = this.sampleGridBySize(gridSize, width, height);
        } else if (method === 'random') {
            samples = this.sampleRandomBySize(gridSize, width, height, cols * rows);
        } else if (method === 'stratified') {
            samples = this.sampleStratified(gridSize, width, height);
        } else if (method === 'jittered') {
            samples = this.sampleJitteredGrid(gridSize, width, height);
        } else if (method === 'poisson') {
            samples = this.samplePoissonDisk(gridSize, width, height);
        } else {
            samples = [];
        }

        // Cache the results
        this.cache.samples = samples;
        this.cache.lastGridSize = gridSize;
        this.cache.lastMethod = method;

        return { samples, stepSize };
    }

    /**
     * Sample pixels in a uniform grid pattern
     * @param {number} resolution - Number of samples across width
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @returns {Array} Array of samples
     */
    sampleGrid(resolution, width, height) {
        const samples = [];
        const stepX = width / resolution;
        const stepY = stepX; // Maintain aspect ratio
        const rows = Math.ceil(height / stepY);

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < resolution; col++) {
                const x = col * stepX + stepX / 2;
                const y = row * stepY + stepY / 2;

                if (x < width && y < height) {
                    const color = this.getPixelColor(Math.floor(x), Math.floor(y));
                    samples.push({
                        x: x,
                        y: y,
                        ...color,
                        brightness: this.getBrightness(color.r, color.g, color.b)
                    });
                }
            }
        }

        return samples;
    }

    /**
     * Sample pixels randomly
     * @param {number} resolution - Number of samples across width
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @returns {Array} Array of samples
     */
    sampleRandom(resolution, width, height) {
        const samples = [];
        const stepX = width / resolution;
        const stepY = stepX;
        const rows = Math.ceil(height / stepY);
        const totalSamples = resolution * rows;

        for (let i = 0; i < totalSamples; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;

            const color = this.getPixelColor(Math.floor(x), Math.floor(y));
            samples.push({
                x: x,
                y: y,
                ...color,
                brightness: this.getBrightness(color.r, color.g, color.b)
            });
        }

        return samples;
    }

    /**
     * Sample pixels in a uniform grid pattern by size
     * @param {number} gridSize - Size of each grid cell in pixels
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @returns {Array} Array of samples
     */
    sampleGridBySize(gridSize, width, height) {
        const samples = [];
        const cols = Math.ceil(width / gridSize);
        const rows = Math.ceil(height / gridSize);

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = col * gridSize + gridSize / 2;
                const y = row * gridSize + gridSize / 2;

                if (x < width && y < height) {
                    const color = this.getPixelColor(Math.floor(x), Math.floor(y));
                    samples.push({
                        x: x,
                        y: y,
                        col: col,
                        row: row,
                        ...color,
                        brightness: this.getBrightness(color.r, color.g, color.b),
                        saturation: this.getSaturation(color.r, color.g, color.b)
                    });
                }
            }
        }

        return samples;
    }

    /**
     * Sample pixels randomly by grid size
     * @param {number} gridSize - Size of each grid cell
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {number} count - Number of samples
     * @returns {Array} Array of samples
     */
    sampleRandomBySize(gridSize, width, height, count) {
        const samples = [];

        for (let i = 0; i < count; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const col = Math.floor(x / gridSize);
            const row = Math.floor(y / gridSize);

            const color = this.getPixelColor(Math.floor(x), Math.floor(y));
            samples.push({
                x: x,
                y: y,
                col: col,
                row: row,
                ...color,
                brightness: this.getBrightness(color.r, color.g, color.b),
                saturation: this.getSaturation(color.r, color.g, color.b)
            });
        }

        return samples;
    }

    /**
     * Sample pixels using stratified sampling (one random sample per grid cell)
     * @param {number} gridSize - Size of each grid cell in pixels
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @returns {Array} Array of samples
     */
    sampleStratified(gridSize, width, height) {
        const samples = [];
        const cols = Math.ceil(width / gridSize);
        const rows = Math.ceil(height / gridSize);

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // Random point within this grid cell
                const x = col * gridSize + Math.random() * gridSize;
                const y = row * gridSize + Math.random() * gridSize;

                if (x < width && y < height) {
                    const color = this.getPixelColor(Math.floor(x), Math.floor(y));
                    samples.push({
                        x: x,
                        y: y,
                        col: col,
                        row: row,
                        ...color,
                        brightness: this.getBrightness(color.r, color.g, color.b),
                        saturation: this.getSaturation(color.r, color.g, color.b)
                    });
                }
            }
        }

        return samples;
    }

    /**
     * Sample pixels in a jittered grid pattern (grid with random offsets)
     * @param {number} gridSize - Size of each grid cell in pixels
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {number} jitterAmount - Jitter amount (0-1, default 0.4)
     * @returns {Array} Array of samples
     */
    sampleJitteredGrid(gridSize, width, height, jitterAmount = 0.4) {
        const samples = [];
        const cols = Math.ceil(width / gridSize);
        const rows = Math.ceil(height / gridSize);

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // Add random jitter within range
                const jitterX = (Math.random() - 0.5) * gridSize * jitterAmount;
                const jitterY = (Math.random() - 0.5) * gridSize * jitterAmount;

                const x = Math.min(width - 1, Math.max(0, col * gridSize + gridSize / 2 + jitterX));
                const y = Math.min(height - 1, Math.max(0, row * gridSize + gridSize / 2 + jitterY));

                const color = this.getPixelColor(Math.floor(x), Math.floor(y));
                samples.push({
                    x: x,
                    y: y,
                    col: col,
                    row: row,
                    ...color,
                    brightness: this.getBrightness(color.r, color.g, color.b),
                    saturation: this.getSaturation(color.r, color.g, color.b)
                });
            }
        }

        return samples;
    }

    /**
     * Sample pixels using Poisson disk distribution (blue noise pattern)
     * Implements Bridson's algorithm for evenly-spaced organic distribution
     * @param {number} gridSize - Minimum distance between samples
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @returns {Array} Array of samples
     */
    samplePoissonDisk(gridSize, width, height) {
        const radius = gridSize;
        const k = 30; // Number of attempts before rejection
        const cellSize = radius / Math.sqrt(2);
        const gridWidth = Math.ceil(width / cellSize);
        const gridHeight = Math.ceil(height / cellSize);

        // Background grid for O(1) neighbor lookup
        const grid = new Array(gridWidth * gridHeight).fill(-1);
        const samples = [];
        const activeList = [];

        // Helper to get grid index
        const getGridIndex = (x, y) => {
            const gridX = Math.floor(x / cellSize);
            const gridY = Math.floor(y / cellSize);
            return gridY * gridWidth + gridX;
        };

        // Helper to check if point is valid (maintains minimum distance)
        const isValidPoint = (x, y) => {
            if (x < 0 || x >= width || y < 0 || y >= height) return false;

            const gridX = Math.floor(x / cellSize);
            const gridY = Math.floor(y / cellSize);

            // Check neighboring cells (5x5 grid around point)
            const searchRange = 2;
            for (let dy = -searchRange; dy <= searchRange; dy++) {
                for (let dx = -searchRange; dx <= searchRange; dx++) {
                    const checkX = gridX + dx;
                    const checkY = gridY + dy;

                    if (checkX >= 0 && checkX < gridWidth && checkY >= 0 && checkY < gridHeight) {
                        const idx = grid[checkY * gridWidth + checkX];
                        if (idx !== -1) {
                            const sample = samples[idx];
                            const dist = Math.hypot(x - sample.x, y - sample.y);
                            if (dist < radius) return false;
                        }
                    }
                }
            }
            return true;
        };

        // Add a sample point
        const addSample = (x, y) => {
            const color = this.getPixelColor(Math.floor(x), Math.floor(y));
            const idx = samples.length;
            samples.push({
                x: x,
                y: y,
                col: Math.floor(x / gridSize),
                row: Math.floor(y / gridSize),
                ...color,
                brightness: this.getBrightness(color.r, color.g, color.b),
                saturation: this.getSaturation(color.r, color.g, color.b)
            });
            grid[getGridIndex(x, y)] = idx;
            activeList.push(idx);
            return idx;
        };

        // Start with random initial point
        const initialX = Math.random() * width;
        const initialY = Math.random() * height;
        addSample(initialX, initialY);

        // Process active list
        while (activeList.length > 0) {
            // Pick random active point
            const randomIdx = Math.floor(Math.random() * activeList.length);
            const activeIdx = activeList[randomIdx];
            const point = samples[activeIdx];

            let found = false;

            // Try k times to generate valid point around this active point
            for (let i = 0; i < k; i++) {
                // Generate random point in annulus (ring) between radius and 2*radius
                const angle = Math.random() * Math.PI * 2;
                const distance = radius + Math.random() * radius;
                const newX = point.x + Math.cos(angle) * distance;
                const newY = point.y + Math.sin(angle) * distance;

                if (isValidPoint(newX, newY)) {
                    addSample(newX, newY);
                    found = true;
                    break;
                }
            }

            // If no valid point found, remove from active list
            if (!found) {
                activeList.splice(randomIdx, 1);
            }
        }

        return samples;
    }

    /**
     * Get the color of a specific pixel
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Object} Object with r, g, b values
     */
    getPixelColor(x, y) {
        // Bounds checking to prevent out-of-bounds memory access
        if (x < 0 || x >= this.imageData.width || y < 0 || y >= this.imageData.height) {
            return { r: 0, g: 0, b: 0, a: 0 };
        }

        const index = (y * this.imageData.width + x) * 4;
        return {
            r: this.imageData.data[index],
            g: this.imageData.data[index + 1],
            b: this.imageData.data[index + 2],
            a: this.imageData.data[index + 3]
        };
    }

    /**
     * Calculate perceived brightness from RGB values
     * @param {number} r - Red value (0-255)
     * @param {number} g - Green value (0-255)
     * @param {number} b - Blue value (0-255)
     * @returns {number} Brightness value (0-1)
     */
    getBrightness(r, g, b) {
        // Using perceived luminance formula
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    }

    /**
     * Calculate color saturation from RGB values
     * @param {number} r - Red value (0-255)
     * @param {number} g - Green value (0-255)
     * @param {number} b - Blue value (0-255)
     * @returns {number} Saturation value (0-1)
     */
    getSaturation(r, g, b) {
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);

        if (max === 0) return 0;

        return (max - min) / max;
    }


    /**
     * Get image dimensions
     * @returns {Object} Object with width and height
     */
    getDimensions() {
        if (!this.image) return null;
        return {
            width: this.canvas.width,
            height: this.canvas.height
        };
    }

    /**
     * Clear the loaded image and cache
     */
    clear() {
        this.image = null;
        this.imageData = null;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Clear cache
        this.cache.imageData = null;
        this.cache.samples = null;
        this.cache.lastGridSize = null;
        this.cache.lastMethod = null;
    }

    /**
     * Apply posterization effect to reduce color levels
     * @param {number} levels - Number of color levels per channel (2-256)
     */
    applyPosterize(levels) {
        if (!this.imageData || levels < 2) return;

        const data = this.imageData.data;
        const levelsPerChannel = Math.max(2, Math.min(256, levels));

        for (let i = 0; i < data.length; i += 4) {
            // Quantize each color channel using helper method
            data[i] = this.quantizeValue(data[i], levelsPerChannel);         // Red
            data[i + 1] = this.quantizeValue(data[i + 1], levelsPerChannel); // Green
            data[i + 2] = this.quantizeValue(data[i + 2], levelsPerChannel); // Blue
            // Alpha channel (i+3) remains unchanged
        }
    }

    /**
     * Apply Floyd-Steinberg dithering with posterization
     * @param {number} levels - Number of color levels per channel
     */
    applyDitheredPosterize(levels) {
        if (!this.imageData || levels < 2) return;

        const width = this.imageData.width;
        const height = this.imageData.height;
        const data = this.imageData.data;
        const levelsPerChannel = Math.max(2, Math.min(256, levels));
        const scaleFactor = 255 / (levelsPerChannel - 1);

        // Process each pixel from top to bottom, left to right
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;

                // Get current pixel values (may already include error from previous pixels)
                const oldR = data[idx];
                const oldG = data[idx + 1];
                const oldB = data[idx + 2];

                // Quantize to nearest color in the palette using helper method
                const newR = this.quantizeValue(oldR, levelsPerChannel);
                const newG = this.quantizeValue(oldG, levelsPerChannel);
                const newB = this.quantizeValue(oldB, levelsPerChannel);

                // Set new pixel values
                data[idx] = newR;
                data[idx + 1] = newG;
                data[idx + 2] = newB;

                // Calculate quantization errors
                const errR = oldR - newR;
                const errG = oldG - newG;
                const errB = oldB - newB;

                // Distribute error to neighboring pixels (Floyd-Steinberg weights)
                // Right pixel (x+1, y) gets 7/16 of error
                if (x + 1 < width) {
                    const rightIdx = (y * width + (x + 1)) * 4;
                    data[rightIdx] = this.clamp(data[rightIdx] + errR * 7 / 16);
                    data[rightIdx + 1] = this.clamp(data[rightIdx + 1] + errG * 7 / 16);
                    data[rightIdx + 2] = this.clamp(data[rightIdx + 2] + errB * 7 / 16);
                }

                // Bottom-left pixel (x-1, y+1) gets 3/16 of error
                if (x > 0 && y + 1 < height) {
                    const blIdx = ((y + 1) * width + (x - 1)) * 4;
                    data[blIdx] = this.clamp(data[blIdx] + errR * 3 / 16);
                    data[blIdx + 1] = this.clamp(data[blIdx + 1] + errG * 3 / 16);
                    data[blIdx + 2] = this.clamp(data[blIdx + 2] + errB * 3 / 16);
                }

                // Bottom pixel (x, y+1) gets 5/16 of error
                if (y + 1 < height) {
                    const bottomIdx = ((y + 1) * width + x) * 4;
                    data[bottomIdx] = this.clamp(data[bottomIdx] + errR * 5 / 16);
                    data[bottomIdx + 1] = this.clamp(data[bottomIdx + 1] + errG * 5 / 16);
                    data[bottomIdx + 2] = this.clamp(data[bottomIdx + 2] + errB * 5 / 16);
                }

                // Bottom-right pixel (x+1, y+1) gets 1/16 of error
                if (x + 1 < width && y + 1 < height) {
                    const brIdx = ((y + 1) * width + (x + 1)) * 4;
                    data[brIdx] = this.clamp(data[brIdx] + errR * 1 / 16);
                    data[brIdx + 1] = this.clamp(data[brIdx + 1] + errG * 1 / 16);
                    data[brIdx + 2] = this.clamp(data[brIdx + 2] + errB * 1 / 16);
                }
            }
        }
    }

    /**
     * Clamp a value between 0 and 255
     * @param {number} value - Value to clamp
     * @returns {number} Clamped value
     */
    clamp(value) {
        return Math.max(0, Math.min(255, Math.round(value)));
    }

    /**
     * Quantize a color value to a specific number of levels
     * @param {number} value - Color value (0-255)
     * @param {number} levels - Number of color levels (2-256)
     * @returns {number} Quantized value (0-255)
     */
    quantizeValue(value, levels) {
        const level = Math.floor(value * levels / 256);
        const scaleFactor = 255 / (levels - 1);
        return Math.round(level * scaleFactor);
    }

    /**
     * Apply posterization to samples
     * @param {Array} samples - Array of sample objects with r, g, b properties
     * @param {number} levels - Number of color levels per channel (2-256)
     */
    applyPosterizeToSamples(samples, levels) {
        if (!samples || samples.length === 0 || levels < 2) return;

        const levelsPerChannel = Math.max(2, Math.min(256, levels));

        for (const sample of samples) {
            // Quantize each color channel using helper method
            sample.r = this.quantizeValue(sample.r, levelsPerChannel);
            sample.g = this.quantizeValue(sample.g, levelsPerChannel);
            sample.b = this.quantizeValue(sample.b, levelsPerChannel);

            // Update brightness after color changes
            sample.brightness = this.getBrightness(sample.r, sample.g, sample.b);
        }
    }

    /**
     * Apply Floyd-Steinberg dithering to samples
     * @param {Array} samples - Array of sample objects with r, g, b, col, row properties
     * @param {number} cols - Number of columns in the grid
     * @param {number} rows - Number of rows in the grid
     * @param {number} levels - Number of color levels per channel
     */
    applyDitherToSamples(samples, cols, rows, levels) {
        if (!samples || samples.length === 0 || levels < 2) return;

        const levelsPerChannel = Math.max(2, Math.min(256, levels));
        const scaleFactor = 255 / (levelsPerChannel - 1);

        // Create 2D array for O(1) neighbor lookup (more efficient than Map with string keys)
        const grid = Array(rows).fill(null).map(() => Array(cols).fill(null));

        // Populate grid with samples
        for (const sample of samples) {
            if (sample.col !== undefined && sample.row !== undefined &&
                sample.row < rows && sample.col < cols) {
                grid[sample.row][sample.col] = sample;
            }
        }

        // Process samples in raster order (top-to-bottom, left-to-right)
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const sample = grid[row][col];
                if (!sample) continue;

                // Get current color values (may include errors from previous samples)
                const oldR = sample.r;
                const oldG = sample.g;
                const oldB = sample.b;

                // Quantize to nearest color in the palette using helper method
                const newR = this.quantizeValue(oldR, levelsPerChannel);
                const newG = this.quantizeValue(oldG, levelsPerChannel);
                const newB = this.quantizeValue(oldB, levelsPerChannel);

                // Set new color values
                sample.r = newR;
                sample.g = newG;
                sample.b = newB;

                // Calculate quantization errors
                const errR = oldR - newR;
                const errG = oldG - newG;
                const errB = oldB - newB;

                // Distribute error to neighboring samples (Floyd-Steinberg weights)
                // Right (col+1, row) gets 7/16 of error
                if (col + 1 < cols && grid[row][col + 1]) {
                    const rightSample = grid[row][col + 1];
                    rightSample.r = this.clamp(rightSample.r + errR * 7 / 16);
                    rightSample.g = this.clamp(rightSample.g + errG * 7 / 16);
                    rightSample.b = this.clamp(rightSample.b + errB * 7 / 16);
                }

                // Bottom-left (col-1, row+1) gets 3/16 of error
                if (row + 1 < rows && col > 0 && grid[row + 1][col - 1]) {
                    const blSample = grid[row + 1][col - 1];
                    blSample.r = this.clamp(blSample.r + errR * 3 / 16);
                    blSample.g = this.clamp(blSample.g + errG * 3 / 16);
                    blSample.b = this.clamp(blSample.b + errB * 3 / 16);
                }

                // Bottom (col, row+1) gets 5/16 of error
                if (row + 1 < rows && grid[row + 1][col]) {
                    const bottomSample = grid[row + 1][col];
                    bottomSample.r = this.clamp(bottomSample.r + errR * 5 / 16);
                    bottomSample.g = this.clamp(bottomSample.g + errG * 5 / 16);
                    bottomSample.b = this.clamp(bottomSample.b + errB * 5 / 16);
                }

                // Bottom-right (col+1, row+1) gets 1/16 of error
                if (row + 1 < rows && col + 1 < cols && grid[row + 1][col + 1]) {
                    const brSample = grid[row + 1][col + 1];
                    brSample.r = this.clamp(brSample.r + errR * 1 / 16);
                    brSample.g = this.clamp(brSample.g + errG * 1 / 16);
                    brSample.b = this.clamp(brSample.b + errB * 1 / 16);
                }

                // Update brightness after color changes
                sample.brightness = this.getBrightness(sample.r, sample.g, sample.b);
            }
        }
    }

}
