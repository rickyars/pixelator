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
        this.addStop(0, 'text', ' ');
        this.addStop(25, 'text', '·');
        this.addStop(50, 'text', '•');
        this.addStop(75, 'text', '●');
        this.addStop(100, 'text', '⬤');
    }

    /**
     * Add a new stop
     * @param {number} percentage - Brightness percentage (0-100)
     * @param {string} type - Type: 'text', 'image', 'shape'
     * @param {*} value - The value (character, image data, or shape type)
     * @returns {Object} The created stop
     */
    addStop(percentage, type = 'text', value = ' ') {
        const stop = {
            id: this.stopIdCounter++,
            percentage: percentage,
            type: type,
            value: value,
            image: null
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
     * Shuffle the stops' values (for random mapping)
     * Redistributes characters/images to different brightness levels
     */
    shuffleStopValues() {
        if (this.stops.length < 2) return;

        // Extract all values
        const values = this.stops.map(s => ({ type: s.type, value: s.value, image: s.image }));

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
        });

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
