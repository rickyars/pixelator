/**
 * Core utilities - shared across all modes
 */
const Core = {
    /**
     * Calculate luminance from RGB
     */
    getLuma(r, g, b) {
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    },

    /**
     * Apply contrast adjustment
     */
    applyContrast(value, contrast) {
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        return Math.max(0, Math.min(255, factor * (value - 128) + 128));
    },

    /**
     * Parse hex to RGB
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    },

    /**
     * Load and prepare image data
     */
    prepareImage(img, maxSize = 1600) {
        const aspect = img.width / img.height;
        let w = img.width;
        let h = img.height;

        if (w > maxSize) {
            w = maxSize;
            h = w / aspect;
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        return {
            width: w,
            height: h,
            data: ctx.getImageData(0, 0, w, h).data
        };
    },

    /**
     * Sample pixels in grid
     */
    sampleGrid(imgData, width, height, cellSize) {
        const samples = [];

        for (let y = 0; y < height; y += cellSize) {
            for (let x = 0; x < width; x += cellSize) {
                const pIdx = ((y + Math.floor(cellSize / 2)) * width + (x + Math.floor(cellSize / 2))) * 4;

                if (pIdx < imgData.length) {
                    samples.push({
                        x: x + cellSize / 2,
                        y: y + cellSize / 2,
                        idx: pIdx
                    });
                }
            }
        }

        return samples;
    }
};
