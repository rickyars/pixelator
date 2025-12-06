/**
 * ShapeGenerator - Generates SVG path data for various shapes
 */
class ShapeGenerator {
    // Cache for color conversions to avoid redundant regex parsing
    static _colorCache = new Map();

    /**
     * Generate a circle path
     * @param {number} size - Size of the shape
     * @returns {string} SVG path data
     */
    static circle(size) {
        const r = size / 2;
        return `M ${r},0 A ${r},${r} 0 1,1 ${r},${size} A ${r},${r} 0 1,1 ${r},0`;
    }

    /**
     * Generate a square path
     * @param {number} size - Size of the shape
     * @returns {string} SVG path data
     */
    static square(size) {
        return `M 0,0 L ${size},0 L ${size},${size} L 0,${size} Z`;
    }

    /**
     * Generate a rounded square path
     * @param {number} size - Size of the shape
     * @param {number} radius - Corner radius (defaults to 20% of size)
     * @returns {string} SVG path data
     */
    static roundedSquare(size, radius = null) {
        const r = radius !== null ? radius : size * 0.2;
        const clampedR = Math.min(r, size / 2);
        return `M ${clampedR},0
                L ${size - clampedR},0
                Q ${size},0 ${size},${clampedR}
                L ${size},${size - clampedR}
                Q ${size},${size} ${size - clampedR},${size}
                L ${clampedR},${size}
                Q 0,${size} 0,${size - clampedR}
                L 0,${clampedR}
                Q 0,0 ${clampedR},0 Z`;
    }

    /**
     * Generate a triangle path
     * @param {number} size - Size of the shape
     * @returns {string} SVG path data
     */
    static triangle(size) {
        return `M ${size / 2},0 L ${size},${size} L 0,${size} Z`;
    }

    /**
     * Generate a diamond path
     * @param {number} size - Size of the shape
     * @returns {string} SVG path data
     */
    static diamond(size) {
        const half = size / 2;
        return `M ${half},0 L ${size},${half} L ${half},${size} L 0,${half} Z`;
    }

    /**
     * Generate a star path
     * @param {number} size - Size of the shape
     * @returns {string} SVG path data
     */
    static star(size) {
        const centerX = size / 2;
        const centerY = size / 2;
        const outerRadius = size / 2;
        const innerRadius = size / 4;
        const points = 5;

        let path = '';
        for (let i = 0; i < points * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (Math.PI / points) * i - Math.PI / 2;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            path += `${i === 0 ? 'M' : 'L'} ${x},${y} `;
        }
        path += 'Z';

        return path;
    }

    /**
     * Generate a cross/plus path
     * @param {number} size - Size of the shape
     * @returns {string} SVG path data
     */
    static cross(size) {
        const third = size / 3;
        return `M ${third},0 L ${third * 2},0 L ${third * 2},${third} L ${size},${third} L ${size},${third * 2} L ${third * 2},${third * 2} L ${third * 2},${size} L ${third},${size} L ${third},${third * 2} L 0,${third * 2} L 0,${third} L ${third},${third} Z`;
    }

    /**
     * Calculate anchor offset based on anchor type
     * @param {string} anchor - Anchor position (center, top-left, etc.)
     * @param {number} size - Size of the shape
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
     * Generate a shape element with all transformations applied
     * @param {Object} sample - Pixel sample with color and position data
     * @param {Object} params - Shape parameters
     * @returns {Object} Shape data for rendering
     */
    static generate(sample, params) {
        // Calculate base size from resolution - use the step size from sampling
        const baseSize = params.stepSize || 10;

        // Calculate size based on scale if enabled
        let size = baseSize;
        if (params.scaleEnabled) {
            // Get the scaling value based on selected metric
            let scaleValue;
            switch (params.scaleMetric) {
                case 'brightness':
                    scaleValue = sample.brightness;
                    break;
                case 'saturation':
                    scaleValue = sample.saturation || 0;
                    break;
                case 'red':
                    scaleValue = sample.r / 255;
                    break;
                case 'green':
                    scaleValue = sample.g / 255;
                    break;
                case 'blue':
                    scaleValue = sample.b / 255;
                    break;
                case 'darkness':
                    scaleValue = 1 - sample.brightness;
                    break;
                default:
                    scaleValue = sample.brightness;
            }

            const scalePercent = params.scaleMin + (scaleValue * (params.scaleMax - params.scaleMin));
            size = baseSize * (scalePercent / 100);
        }

        // Get the appropriate shape path (square or rounded square)
        const path = params.roundedCorners
            ? this.roundedSquare(size)
            : this.square(size);

        // Calculate color
        const color = this.getColor(sample, params);

        // Get anchor-based offset
        const offset = this.getAnchorOffset(params.anchor, size);

        // Build transform string
        let transform = `translate(${sample.x + offset.x}, ${sample.y + offset.y})`;

        // Add rotation if specified
        if (params.rotation && params.rotation !== 0) {
            const centerX = size / 2;
            const centerY = size / 2;
            transform += ` rotate(${params.rotation}, ${centerX}, ${centerY})`;
        }

        return {
            path: path,
            transform: transform,
            fill: color,
            stroke: params.stroke || 'none',
            strokeWidth: params.strokeWidth || 0
        };
    }

    /**
     * Get the color for a sample based on color mode
     * @param {Object} sample - Pixel sample
     * @param {Object} params - Color parameters
     * @returns {string} Color string
     */
    static getColor(sample, params) {
        switch (params.colorMode) {
            case 'original':
                return `rgb(${sample.r}, ${sample.g}, ${sample.b})`;

            case 'grayscale':
                const gray = Math.round(sample.brightness * 255);
                return `rgb(${gray}, ${gray}, ${gray})`;

            case 'duotone':
                return this.interpolateColor(
                    params.duotoneDark,
                    params.duotoneLight,
                    sample.brightness
                );

            default:
                return `rgb(${sample.r}, ${sample.g}, ${sample.b})`;
        }
    }

    /**
     * Interpolate between two colors based on a factor
     * @param {string} color1 - Start color (hex)
     * @param {string} color2 - End color (hex)
     * @param {number} factor - Interpolation factor (0-1)
     * @returns {string} Interpolated color
     */
    static interpolateColor(color1, color2, factor) {
        const c1 = this.hexToRgb(color1);
        const c2 = this.hexToRgb(color2);

        const r = Math.round(c1.r + (c2.r - c1.r) * factor);
        const g = Math.round(c1.g + (c2.g - c1.g) * factor);
        const b = Math.round(c1.b + (c2.b - c1.b) * factor);

        return `rgb(${r}, ${g}, ${b})`;
    }

    /**
     * Convert hex color to RGB (with caching for performance)
     * @param {string} hex - Hex color string
     * @returns {Object} RGB object
     */
    static hexToRgb(hex) {
        // Check cache first
        if (this._colorCache.has(hex)) {
            return this._colorCache.get(hex);
        }

        // Parse color
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        const rgb = result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };

        // Cache result
        this._colorCache.set(hex, rgb);
        return rgb;
    }
}
