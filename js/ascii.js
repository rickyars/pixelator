/**
 * ASCIIMapper - Maps brightness values to characters/images using gradient stops
 */
class ASCIIMapper {
    // Cache for measured character dimensions
    static measurementCanvas = null;
    static measurementContext = null;
    static dimensionCache = new Map();

    /**
     * Get or create the measurement canvas context
     * @returns {CanvasRenderingContext2D}
     */
    static getMeasurementContext() {
        if (!this.measurementCanvas) {
            this.measurementCanvas = document.createElement('canvas');
            this.measurementContext = this.measurementCanvas.getContext('2d');
        }
        return this.measurementContext;
    }

    /**
     * Measure the actual bounding box of a character
     * @param {string} char - Character to measure
     * @param {string} fontFamily - Font family
     * @param {number} baseFontSize - Base font size to measure at
     * @returns {Object} {width, height} in pixels
     */
    static measureCharacter(char, fontFamily, baseFontSize = 100) {
        const cacheKey = `${char}-${fontFamily}`;

        if (this.dimensionCache.has(cacheKey)) {
            return this.dimensionCache.get(cacheKey);
        }

        const ctx = this.getMeasurementContext();
        ctx.font = `${baseFontSize}px ${fontFamily}`;

        // Measure text metrics
        const metrics = ctx.measureText(char);

        // Width: use the actual text width
        const width = metrics.width;

        // Height: use fontBoundingBox which represents the em box height
        // This matches how SVG positions text with dominant-baseline
        // Fallback to actualBoundingBox if fontBoundingBox not available
        let height;
        if (metrics.fontBoundingBoxAscent !== undefined && metrics.fontBoundingBoxDescent !== undefined) {
            height = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
        } else {
            // Fallback: assume font height is approximately the font size
            height = baseFontSize * 1.2;
        }

        // Normalize to base font size
        const dimensions = {
            width: width / baseFontSize,
            height: height / baseFontSize
        };

        this.dimensionCache.set(cacheKey, dimensions);
        return dimensions;
    }

    /**
     * Calculate optimal font size for a font family to fit in square cells
     * Uses a reference set of characters to find worst-case dimensions
     * @param {string} fontFamily - Font family
     * @param {number} cellSize - Target cell size (square)
     * @returns {number} Optimal font size
     */
    static calculateFontSize(fontFamily, cellSize) {
        const cacheKey = `fontsize-${fontFamily}-${cellSize}`;

        if (this.dimensionCache.has(cacheKey)) {
            return this.dimensionCache.get(cacheKey);
        }

        // Measure reference characters to find worst-case dimensions
        // Use characters that are typically widest/tallest
        const referenceChars = ['M', 'W', '@', '#', 'm', 'g', 'j', 'Q', 'É', '█'];

        let maxWidth = 0;
        let maxHeight = 0;

        for (const char of referenceChars) {
            const dim = this.measureCharacter(char, fontFamily);
            maxWidth = Math.max(maxWidth, dim.width);
            maxHeight = Math.max(maxHeight, dim.height);
        }

        // Find the longest edge (width or height)
        const maxDimension = Math.max(maxWidth, maxHeight);

        // Calculate font size so the longest edge fits in the cell
        // Use 98% for a small margin to prevent rounding/rendering edge cases
        const fontSize = (cellSize / maxDimension) * 0.98;

        this.dimensionCache.set(cacheKey, fontSize);
        return fontSize;
    }

    /**
     * Process samples for image map rendering with stops
     * @param {Array} samples - Raw pixel samples
     * @param {Object} params - Rendering parameters
     * @param {number} stepSize - Size of each grid cell
     * @returns {Array} Processed elements to render
     */
    static processSamples(samples, params, stepSize) {
        if (!params.stopsManager) {
            return [];
        }

        // Merge pixels if enabled
        if (params.mergePixels) {
            samples = this.mergeAdjacentPixels(samples, params, stepSize);
        }

        // Map each sample to a stop based on brightness
        const elements = samples.map(sample => {
            const stop = params.stopsManager.getStopForBrightness(sample.brightness, false);

            if (!stop) {
                return null;
            }

            return this.createElementFromStop(sample, stop, params, stepSize);
        }).filter(el => el !== null);

        return elements;
    }

    /**
     * Merge adjacent pixels with the same stop
     * @param {Array} samples - Pixel samples
     * @param {Object} params - Parameters
     * @param {number} stepSize - Grid size
     * @returns {Array} Merged samples
     */
    static mergeAdjacentPixels(samples, params, stepSize) {
        const grid = new Map();
        const stopsManager = params.stopsManager;

        // Group samples by grid position and stop
        samples.forEach(sample => {
            const col = Math.floor(sample.x / stepSize);
            const row = Math.floor(sample.y / stepSize);
            const stop = stopsManager.getStopForBrightness(sample.brightness, false);
            const key = `${col}-${row}-${stop ? stop.id : 'none'}`;

            if (!grid.has(key)) {
                grid.set(key, {
                    samples: [],
                    col: col,
                    row: row,
                    stop: stop
                });
            }

            grid.get(key).samples.push(sample);
        });

        // Try to merge cells
        const merged = [];
        const processed = new Set();

        grid.forEach((cell, key) => {
            if (processed.has(key)) return;

            const mergeSize = this.findMergeSize(cell, grid, params.mergeMin, params.mergeMax, stepSize, processed);

            if (mergeSize > 1) {
                // Create a merged cell
                const avgSample = this.averageSamples(cell.samples);
                avgSample.mergeWidth = mergeSize;
                avgSample.mergeHeight = mergeSize;
                merged.push(avgSample);

                // Mark cells as processed
                for (let r = 0; r < mergeSize; r++) {
                    for (let c = 0; c < mergeSize; c++) {
                        const cellKey = `${cell.col + c}-${cell.row + r}-${cell.stop ? cell.stop.id : 'none'}`;
                        processed.add(cellKey);
                    }
                }
            } else {
                // Use original sample
                const avgSample = this.averageSamples(cell.samples);
                avgSample.mergeWidth = 1;
                avgSample.mergeHeight = 1;
                merged.push(avgSample);
                processed.add(key);
            }
        });

        return merged;
    }

    /**
     * Find the maximum square merge size for a cell
     * @param {Object} cell - Cell to merge
     * @param {Map} grid - Grid map
     * @param {number} min - Minimum merge size
     * @param {number} max - Maximum merge size
     * @param {number} stepSize - Grid size
     * @param {Set} processed - Set of processed cells
     * @returns {number} Merge size
     */
    static findMergeSize(cell, grid, min, max, stepSize, processed) {
        if (!cell.stop) return 1;

        let size = 1;

        // Try to expand the square
        for (let s = min; s <= max; s++) {
            let canMerge = true;

            // Check if all cells in the square have the same stop
            for (let r = 0; r < s && canMerge; r++) {
                for (let c = 0; c < s && canMerge; c++) {
                    const checkKey = `${cell.col + c}-${cell.row + r}-${cell.stop.id}`;

                    if (!grid.has(checkKey) || processed.has(checkKey)) {
                        canMerge = false;
                    }
                }
            }

            if (canMerge) {
                size = s;
            } else {
                break;
            }
        }

        return size;
    }

    /**
     * Average multiple samples together
     * @param {Array} samples - Samples to average
     * @returns {Object} Averaged sample
     */
    static averageSamples(samples) {
        const count = samples.length;
        const avg = {
            x: 0,
            y: 0,
            r: 0,
            g: 0,
            b: 0,
            brightness: 0,
            col: samples[0].col,
            row: samples[0].row
        };

        samples.forEach(sample => {
            avg.x += sample.x;
            avg.y += sample.y;
            avg.r += sample.r;
            avg.g += sample.g;
            avg.b += sample.b;
            avg.brightness += sample.brightness;
        });

        avg.x /= count;
        avg.y /= count;
        avg.r = Math.round(avg.r / count);
        avg.g = Math.round(avg.g / count);
        avg.b = Math.round(avg.b / count);
        avg.brightness /= count;

        return avg;
    }

    /**
     * Calculate anchor offset based on anchor type
     * @param {string} anchor - Anchor position (center, top-left, etc.)
     * @param {number} size - Size of the element
     * @returns {Object} {x, y} offset values
     */
    static getAnchorOffset(anchor, size) {
        const offsets = {
            'top-left': { x: 0, y: 0 },
            'top': { x: -size / 2, y: 0 },
            'top-right': { x: -size, y: 0 },
            'left': { x: 0, y: -size / 2 },
            'center': { x: -size / 2, y: -size / 2 },
            'right': { x: -size, y: -size / 2 },
            'bottom-left': { x: 0, y: -size },
            'bottom': { x: -size / 2, y: -size },
            'bottom-right': { x: -size, y: -size }
        };
        return offsets[anchor] || offsets['center'];
    }

    /**
     * Create a renderable element from a stop
     * @param {Object} sample - Pixel sample
     * @param {Object} stop - Stop object
     * @param {Object} params - Parameters
     * @param {number} stepSize - Grid size
     * @returns {Object} Element data for rendering
     */
    static createElementFromStop(sample, stop, params, stepSize) {
        const size = (sample.mergeWidth || 1) * stepSize * (params.imageSize / 100);
        const offset = this.getAnchorOffset(params.anchor, size);

        if (stop.type === 'image' && stop.image) {
            return {
                type: 'image',
                x: sample.x + offset.x,
                y: sample.y + offset.y,
                width: size,
                height: size,
                image: stop.value // Data URL
            };
        } else {
            // Text/character - use color from the stop
            // Always center text in the grid cell for simplicity
            // Calculate optimal font size for this font family to fit in square cells
            const char = stop.value || '●';
            const fontFamily = params.fontFamily || 'monospace';
            const fontSize = this.calculateFontSize(fontFamily, size);

            return {
                type: 'text',
                x: sample.x,
                y: sample.y,
                text: char,
                fontSize: fontSize,
                fontFamily: fontFamily,
                fill: stop.color || '#ffffff',
                bgColor: stop.bgColor || null,
                bgX: sample.x + offset.x,
                bgY: sample.y + offset.y,
                bgSize: size,
                anchor: params.anchor  // Used for background positioning only
            };
        }
    }

}
