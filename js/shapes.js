/**
 * ShapeGenerator - Generates SVG path data for various shapes
 */
class ShapeGenerator {
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
            const scalePercent = params.scaleMin + (sample.brightness * (params.scaleMax - params.scaleMin));
            size = baseSize * (scalePercent / 100);
        }

        // Calculate rotation
        let rotation = params.rotation;

        // Rotation by brightness takes precedence
        if (params.rotationBrightness) {
            rotation = sample.brightness * 360;
        } else if (params.rotationRandom) {
            rotation += (Math.random() - 0.5) * params.rotationRange;
        }

        // Get the appropriate shape path
        const shapeFn = this[params.shapeType] || this.circle;
        const path = shapeFn(size);

        // Calculate color
        const color = this.getColor(sample, params);

        return {
            path: path,
            transform: `translate(${sample.x - size / 2}, ${sample.y - size / 2}) rotate(${rotation}, ${size / 2}, ${size / 2})`,
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
     * Convert hex color to RGB
     * @param {string} hex - Hex color string
     * @returns {Object} RGB object
     */
    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }
}
