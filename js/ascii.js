/**
 * ASCIIMapper - Maps brightness values to ASCII characters using image maps
 */
class ASCIIMapper {
    // Image maps - characters ordered from darkest to brightest
    static IMAGE_MAPS = {
        standard: [
            ' ', '.', ':', '-', '=', '+', '*', '#', '%', '@'
        ],
        blocks: [
            ' ', '░', '▒', '▓', '█'
        ],
        circles: [
            ' ', '·', '•', '●', '⬤'
        ],
        custom: []
    };

    /**
     * Map brightness value to a character from image map
     * @param {number} brightness - Brightness value (0-1)
     * @param {string} imageMap - Image map to use
     * @param {boolean} invert - Invert the brightness mapping
     * @returns {string} Character
     */
    static mapBrightness(brightness, imageMap, invert = false) {
        const map = this.IMAGE_MAPS[imageMap] || this.IMAGE_MAPS.standard;

        if (map.length === 0) {
            return ' ';
        }

        const index = Math.floor(brightness * (map.length - 1));
        const mappedIndex = invert ? map.length - 1 - index : index;

        return map[Math.max(0, Math.min(mappedIndex, map.length - 1))];
    }

    /**
     * Generate ASCII text element data with pixel merging support
     * @param {Object} sample - Pixel sample with color and position data
     * @param {Object} params - ASCII parameters
     * @param {number} cellWidth - Width of each character cell
     * @param {number} cellHeight - Height of each character cell
     * @returns {Object} Text element data
     */
    static generate(sample, params, cellWidth, cellHeight) {
        // Get image map
        let imageMap = params.asciiImageMap || 'standard';

        // Handle custom image map
        if (imageMap === 'custom' && params.customCharset) {
            this.IMAGE_MAPS.custom = params.customCharset.split('');
        }

        // Map brightness to character
        const char = this.mapBrightness(sample.brightness, imageMap, params.invertBrightness);

        // Calculate color
        const color = ShapeGenerator.getColor(sample, params);

        // If pixel merging is enabled, position characters on a grid
        let x = sample.x;
        let y = sample.y;

        if (params.mergePixels && cellWidth && cellHeight) {
            // Snap to grid
            const col = Math.floor(sample.x / cellWidth);
            const row = Math.floor(sample.y / cellHeight);
            x = col * cellWidth + cellWidth / 2;
            y = row * cellHeight + cellHeight / 2;
        }

        return {
            text: char,
            x: x,
            y: y,
            fontSize: params.fontSize,
            fontFamily: params.fontFamily,
            fill: color,
            dominantBaseline: 'middle',
            textAnchor: 'middle',
            gridKey: params.mergePixels ? `${Math.floor(x)}-${Math.floor(y)}` : null
        };
    }

    /**
     * Process samples for ASCII rendering with optional pixel merging
     * @param {Array} samples - Raw pixel samples
     * @param {Object} params - ASCII parameters
     * @param {number} stepSize - Size of each sampling step
     * @returns {Array} Processed text elements
     */
    static processSamples(samples, params, stepSize) {
        if (!params.mergePixels) {
            // No merging - render each sample
            return samples.map(sample =>
                this.generate(sample, params, stepSize, stepSize)
            );
        }

        // With merging - group samples by grid position and average them
        const cellWidth = stepSize;
        const cellHeight = stepSize;
        const grid = new Map();

        // Group samples by grid cell
        samples.forEach(sample => {
            const col = Math.floor(sample.x / cellWidth);
            const row = Math.floor(sample.y / cellHeight);
            const key = `${col}-${row}`;

            if (!grid.has(key)) {
                grid.set(key, []);
            }
            grid.get(key).push(sample);
        });

        // Average samples in each cell
        const mergedSamples = [];
        grid.forEach((cellSamples, key) => {
            const avgSample = this.averageSamples(cellSamples);
            const textData = this.generate(avgSample, params, cellWidth, cellHeight);
            mergedSamples.push(textData);
        });

        return mergedSamples;
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
            brightness: 0
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
}
