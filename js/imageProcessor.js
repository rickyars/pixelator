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
    drawToCanvas() {
        if (!this.image) return;

        // Set canvas size to match image
        this.canvas.width = this.image.width;
        this.canvas.height = this.image.height;

        // Draw image
        this.ctx.drawImage(this.image, 0, 0);

        // Get image data
        this.imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Sample pixels from the image
     * @param {number} gridSize - Size of each grid cell in pixels
     * @param {string} method - Sampling method: 'grid' or 'random'
     * @returns {Object} Object with samples array and stepSize
     */
    samplePixels(gridSize, method = 'grid') {
        if (!this.imageData) return { samples: [], stepSize: 0 };

        const samples = [];
        const width = this.imageData.width;
        const height = this.imageData.height;
        const stepSize = gridSize;
        const cols = Math.ceil(width / gridSize);
        const rows = Math.ceil(height / gridSize);

        if (method === 'grid') {
            samples.push(...this.sampleGridBySize(gridSize, width, height));
        } else if (method === 'random') {
            samples.push(...this.sampleRandomBySize(gridSize, width, height, cols * rows));
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
}
