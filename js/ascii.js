/**
 * ASCIIMapper - Maps brightness values to characters/images using gradient stops
 */
class ASCIIMapper {
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
            // For text, anchor affects baseline position
            // Scale font size to ~85% of cell size to prevent overflow
            const fontSize = size * 0.85;
            const textOffset = this.getTextAnchorOffset(params.anchor, size);
            return {
                type: 'text',
                x: sample.x + textOffset.x,
                y: sample.y + textOffset.y,
                text: stop.value || '●',
                fontSize: fontSize,
                fontFamily: params.fontFamily || 'monospace',
                fill: stop.color || '#ffffff',
                bgColor: stop.bgColor || null,
                bgX: sample.x + offset.x,
                bgY: sample.y + offset.y,
                bgSize: size,
                anchor: params.anchor
            };
        }
    }

    /**
     * Calculate text anchor offset (text uses different positioning than shapes)
     * @param {string} anchor - Anchor position
     * @param {number} size - Font size
     * @returns {Object} {x, y} offset values
     */
    static getTextAnchorOffset(anchor, size) {
        // Sample position is at the center of the grid cell
        // SVG's text-anchor and dominant-baseline handle alignment at the given position
        // We just need to offset from center to the desired anchor position
        const halfSize = size / 2;
        const offsets = {
            'top-left': { x: -halfSize, y: -halfSize },
            'top': { x: 0, y: -halfSize },
            'top-right': { x: halfSize, y: -halfSize },
            'left': { x: -halfSize, y: 0 },
            'center': { x: 0, y: 0 },
            'right': { x: halfSize, y: 0 },
            'bottom-left': { x: -halfSize, y: halfSize },
            'bottom': { x: 0, y: halfSize },
            'bottom-right': { x: halfSize, y: halfSize }
        };
        return offsets[anchor] || offsets['center'];
    }
}
