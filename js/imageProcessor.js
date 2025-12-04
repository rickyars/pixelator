/**
 * ImageProcessor - Handles image loading and pixel sampling
 */
class ImageProcessor {
    constructor() {
        this.image = null;
        this.canvas = document.getElementById('hiddenCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.imageData = null;
    }

    /**
     * Load an image from a File object
     * @param {File} file - Image file to load
     * @returns {Promise<HTMLImageElement>}
     */
    loadImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const img = new Image();

                img.onload = () => {
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
     */
    drawToCanvas(effects = {}) {
        if (!this.image) return;

        // Set canvas size to match image
        this.canvas.width = this.image.width;
        this.canvas.height = this.image.height;

        // Draw image
        this.ctx.drawImage(this.image, 0, 0);

        // Get image data
        this.imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

        // Apply effects
        if (effects.posterize && effects.posterizeLevels) {
            this.applyPosterize(effects.posterizeLevels);
        }

        if (effects.dither) {
            this.applyDither();
        }

        // Put the processed image data back
        this.ctx.putImageData(this.imageData, 0, 0);
    }

    /**
     * Sample pixels from the image
     * @param {number} gridSize - Size of each grid cell in pixels
     * @param {string} method - Sampling method: 'grid' or 'random'
     * @returns {Object} Object with samples array and stepSize
     */
    samplePixels(gridSize, method = 'grid') {
        if (!this.imageData) return { samples: [], stepSize: 0 };

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
        } else {
            samples = [];
        }

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
                        brightness: this.getBrightness(color.r, color.g, color.b)
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
                brightness: this.getBrightness(color.r, color.g, color.b)
            });
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
     * Get image dimensions
     * @returns {Object} Object with width and height
     */
    getDimensions() {
        if (!this.image) return null;
        return {
            width: this.image.width,
            height: this.image.height
        };
    }

    /**
     * Clear the loaded image
     */
    clear() {
        this.image = null;
        this.imageData = null;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Apply posterization effect to reduce color levels
     * @param {number} levels - Number of color levels (2-256)
     */
    applyPosterize(levels) {
        if (!this.imageData || levels < 2) return;

        const data = this.imageData.data;
        const step = 255 / (levels - 1);

        for (let i = 0; i < data.length; i += 4) {
            // Posterize each color channel
            data[i] = Math.round(data[i] / step) * step;     // R
            data[i + 1] = Math.round(data[i + 1] / step) * step; // G
            data[i + 2] = Math.round(data[i + 2] / step) * step; // B
            // Alpha channel (i+3) remains unchanged
        }
    }

    /**
     * Apply Floyd-Steinberg dithering
     */
    applyDither() {
        if (!this.imageData) return;

        const width = this.imageData.width;
        const height = this.imageData.height;
        const data = this.imageData.data;

        // Process each pixel
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;

                // Get old pixel values
                const oldR = data[idx];
                const oldG = data[idx + 1];
                const oldB = data[idx + 2];

                // Quantize to nearest color (simple threshold)
                const newR = oldR < 128 ? 0 : 255;
                const newG = oldG < 128 ? 0 : 255;
                const newB = oldB < 128 ? 0 : 255;

                // Set new pixel values
                data[idx] = newR;
                data[idx + 1] = newG;
                data[idx + 2] = newB;

                // Calculate quantization errors
                const errR = oldR - newR;
                const errG = oldG - newG;
                const errB = oldB - newB;

                // Distribute error to neighboring pixels (Floyd-Steinberg)
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
     * Update canvas with effects
     * @param {Object} effects - Effects to apply
     */
    updateEffects(effects) {
        this.drawToCanvas(effects);
    }
}
