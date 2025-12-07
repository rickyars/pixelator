/**
 * StopsManager - Manages gradient stops for image mapping
 */
class StopsManager {
    constructor() {
        this.stops = [];
        this.stopIdCounter = 0;
        this.onChange = null;

        // Default stops
        this.initializeDefaultStops();
    }

    /**
     * Initialize with default stops
     */
    initializeDefaultStops() {
        // Classic ASCII density gradient with white-on-black styling
        this.addStop(0, 'text', ' ', '#ffffff', '#000000');
        this.addStop(20, 'text', '.', '#888888', '#000000');
        this.addStop(40, 'text', ':', '#aaaaaa', '#000000');
        this.addStop(60, 'text', '+', '#cccccc', '#000000');
        this.addStop(80, 'text', '#', '#eeeeee', '#000000');
        this.addStop(100, 'text', '@', '#ffffff', '#000000');
    }

    /**
     * Add a new stop
     * @param {number} percentage - Brightness percentage (0-100)
     * @param {string} type - Type: 'text', 'image', 'shape'
     * @param {*} value - The value (character, image data, or shape type)
     * @param {string} color - Color for text stops
     * @param {string} bgColor - Background color for text stops (null = transparent)
     * @returns {Object} The created stop
     */
    addStop(percentage, type = 'text', value = ' ', color = '#ffffff', bgColor = null) {
        const stop = {
            id: this.stopIdCounter++,
            percentage: percentage,
            type: type,
            value: value,
            image: null,
            color: color,
            bgColor: bgColor
        };

        this.stops.push(stop);
        this.sortStops();

        if (this.onChange) {
            this.onChange();
        }

        return stop;
    }

    /**
     * Update a stop
     * @param {number} id - Stop ID
     * @param {Object} updates - Updates to apply
     */
    updateStop(id, updates) {
        const stop = this.stops.find(s => s.id === id);
        if (stop) {
            Object.assign(stop, updates);
            this.sortStops();

            if (this.onChange) {
                this.onChange();
            }
        }
    }

    /**
     * Remove a stop
     * @param {number} id - Stop ID
     */
    removeStop(id) {
        this.stops = this.stops.filter(s => s.id !== id);

        if (this.onChange) {
            this.onChange();
        }
    }

    /**
     * Clear all stops
     */
    clearStops() {
        this.stops = [];

        if (this.onChange) {
            this.onChange();
        }
    }

    /**
     * Sort stops by percentage
     */
    sortStops() {
        this.stops.sort((a, b) => a.percentage - b.percentage);
    }

    /**
     * Get the stop for a given brightness value
     * @param {number} brightness - Brightness value (0-1)
     * @param {boolean} randomPosition - Whether to randomly assign stops (ignore brightness)
     * @returns {Object} The appropriate stop
     */
    getStopForBrightness(brightness, randomPosition = false) {
        if (this.stops.length === 0) {
            return null;
        }

        // Random position = randomly pick a stop, ignoring brightness
        if (randomPosition) {
            return this.stops[Math.floor(Math.random() * this.stops.length)];
        }

        const percentage = brightness * 100;

        // Find the two stops this brightness falls between
        for (let i = 0; i < this.stops.length - 1; i++) {
            if (percentage >= this.stops[i].percentage && percentage <= this.stops[i + 1].percentage) {
                // Return the closer stop
                const dist1 = Math.abs(percentage - this.stops[i].percentage);
                const dist2 = Math.abs(percentage - this.stops[i + 1].percentage);
                return dist1 < dist2 ? this.stops[i] : this.stops[i + 1];
            }
        }

        // If we're below the first stop, return it
        if (percentage < this.stops[0].percentage) {
            return this.stops[0];
        }

        // If we're above the last stop, return it
        return this.stops[this.stops.length - 1];
    }

    /**
     * Apply even spacing to stops
     * Redistributes stop percentages evenly from 0 to 100
     */
    applyEvenSpacing() {
        if (this.stops.length === 0) return;

        if (this.stops.length === 1) {
            this.stops[0].percentage = 50;
        } else {
            const step = 100 / (this.stops.length - 1);
            this.stops.forEach((stop, index) => {
                stop.percentage = Math.round(index * step);
            });
        }

        this.sortStops();

        if (this.onChange) {
            this.onChange();
        }
    }

    /**
     * Shuffle the stops' values (random mapping)
     * Redistributes characters/images to different stops
     */
    shuffleStopValues() {
        if (this.stops.length < 2) return;

        // Extract all values including color and bgColor
        const values = this.stops.map(s => ({
            type: s.type,
            value: s.value,
            image: s.image,
            color: s.color,
            bgColor: s.bgColor
        }));

        // Shuffle values using Fisher-Yates
        for (let i = values.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [values[i], values[j]] = [values[j], values[i]];
        }

        // Reassign shuffled values to stops
        this.stops.forEach((stop, index) => {
            stop.type = values[index].type;
            stop.value = values[index].value;
            stop.image = values[index].image;
            stop.color = values[index].color;
            stop.bgColor = values[index].bgColor;
        });

        if (this.onChange) {
            this.onChange();
        }
    }

    /**
     * Randomize stop positions (random position)
     * Assigns random percentage values to stops
     */
    randomizeStopPositions() {
        if (this.stops.length === 0) return;

        // Generate random percentages
        const randomPercentages = [];
        for (let i = 0; i < this.stops.length; i++) {
            randomPercentages.push(Math.floor(Math.random() * 101));
        }

        // Sort to avoid overlaps
        randomPercentages.sort((a, b) => a - b);

        // Assign to stops
        this.stops.forEach((stop, index) => {
            stop.percentage = randomPercentages[index];
        });

        this.sortStops();

        if (this.onChange) {
            this.onChange();
        }
    }

    /**
     * Load an image for a stop
     * @param {number} id - Stop ID
     * @param {File} file - Image file
     * @returns {Promise} Promise that resolves when image is loaded
     */
    loadImage(id, file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const img = new Image();

                img.onload = () => {
                    const stop = this.stops.find(s => s.id === id);
                    if (stop) {
                        stop.type = 'image';
                        stop.image = img;
                        stop.value = e.target.result; // Store the data URL

                        // Extract color from image
                        stop.color = this.extractColorFromImage(img);

                        if (this.onChange) {
                            this.onChange();
                        }
                    }
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
     * Extract a representative color from an image
     * @param {Image} img - Image element
     * @returns {string} Hex color string
     */
    extractColorFromImage(img) {
        // Create a temporary canvas to sample the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Use a small canvas to get average color
        const sampleSize = 10;
        canvas.width = sampleSize;
        canvas.height = sampleSize;

        // Draw the image scaled down
        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

        // Get image data
        const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
        const data = imageData.data;

        // Calculate average color
        let r = 0, g = 0, b = 0;
        const pixelCount = sampleSize * sampleSize;

        for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
        }

        r = Math.round(r / pixelCount);
        g = Math.round(g / pixelCount);
        b = Math.round(b / pixelCount);

        // Convert to hex
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }

    /**
     * Get all stops
     * @returns {Array} Array of stops
     */
    getStops() {
        return this.stops;
    }

    /**
     * Clear all stops
     */
    clear() {
        this.stops = [];
        this.stopIdCounter = 0;

        if (this.onChange) {
            this.onChange();
        }
    }
}
