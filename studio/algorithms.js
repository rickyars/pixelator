/**
 * Algorithm Library - All rendering algorithms
 * Each algorithm modifies transform properties based on pixel luminance
 */
class Algorithms {
    /**
     * Seeded random function based on position
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {number} Pseudo-random value (0-1)
     */
    static seededRandom(x, y) {
        const seed = x * 12.9898 + y * 78.233;
        const val = Math.sin(seed) * 43758.5453;
        return val - Math.floor(val);
    }

    /**
     * Apply algorithm to get transform properties
     * @param {string} mode - Algorithm mode
     * @param {number} luma - Luminance value (0-1)
     * @param {number} x - Grid X position
     * @param {number} y - Grid Y position
     * @param {number} step - Grid step size
     * @param {number} baseScale - Base scale factor
     * @param {number} intensity - Effect intensity/power
     * @param {Uint8ClampedArray} imgData - Image data (for neighbor sampling)
     * @param {number} imgWidth - Image width
     * @param {number} pIdx - Current pixel index
     * @returns {Object} Transform properties {scX, scY, rot, offX, offY, alpha}
     */
    static apply(mode, luma, x, y, step, baseScale, intensity, imgData, imgWidth, pIdx) {
        let scX = baseScale;
        let scY = baseScale;
        let rot = 0;
        let offX = 0;
        let offY = 0;
        let alpha = 1.0;

        switch (mode) {
            // Basic modes
            case 'none':
                // Identity transform - no modifications
                break;

            case 'flat':
                // Static - no modifications
                break;

            case 'halftone':
                // Bright = larger
                scX = scY = luma * baseScale * 1.5;
                break;

            case 'inv_halftone':
                // Dark = larger (traditional halftone)
                scX = scY = (1.0 - luma) * baseScale * 1.5;
                break;

            // Rotation modes
            case 'rotation':
                // Luma-based rotation
                rot = luma * Math.PI;
                break;

            // Scale modes
            case 'random_size':
                // Random size chaos
                scX = scY = this.seededRandom(x, y) * baseScale;
                break;

            // Opacity modes
            case 'opacity':
                // Bright = opaque
                alpha = luma;
                break;

            case 'inv_opacity':
                // Dark = opaque
                alpha = 1.0 - luma;
                break;

            // Threshold
            case 'threshold':
                // Hard cut at 50%
                if (luma < 0.5) scX = scY = 0;
                break;

            // Stretch modes
            case 'stretch_v':
                // Vertical stretch
                scX = baseScale * 0.5;
                scY = luma * baseScale * 3;
                break;

            case 'stretch_h':
                // Horizontal stretch
                scX = luma * baseScale * 3;
                scY = baseScale * 0.5;
                break;

            // Position offset modes
            case 'glitch':
                // Horizontal glitch based on luma
                offX = (luma - 0.5) * step * 1.5 * intensity;
                break;

            case 'melt':
                // Vertical drip effect
                offY = luma * step * 2 * intensity;
                break;

            case 'jitter':
                // Mosaic scatter
                const jit = (this.seededRandom(x, y) - 0.5) * step * 2;
                offX = jit * intensity;
                offY = jit * intensity;
                break;

            // Flow field
            case 'flow':
                // Direction based on gradient
                const iR = pIdx + step * 4;
                const iB = pIdx + (imgWidth * step) * 4;

                if (iR < imgData.length && iB < imgData.length) {
                    const rR = imgData[iR] || 0;
                    const gR = imgData[iR + 1] || 0;
                    const bR = imgData[iR + 2] || 0;
                    const rB = imgData[iB] || 0;
                    const gB = imgData[iB + 1] || 0;
                    const bB = imgData[iB + 2] || 0;

                    const lR = (0.299 * rR + 0.587 * gR + 0.114 * bR) / 255;
                    const lB = (0.299 * rB + 0.587 * gB + 0.114 * bB) / 255;

                    const dx = lR - luma;
                    const dy = lB - luma;

                    rot = Math.atan2(dy, dx) * intensity;
                }
                break;

            // Edge detection
            case 'edges':
                const idxNext = pIdx + step * 4;
                if (idxNext < imgData.length) {
                    const rN = imgData[idxNext] || 0;
                    const gN = imgData[idxNext + 1] || 0;
                    const bN = imgData[idxNext + 2] || 0;
                    const lumaN = (0.299 * rN + 0.587 * gN + 0.114 * bN) / 255;

                    const diff = Math.abs(luma - lumaN);
                    scX = scY = diff * 5 * baseScale * intensity;
                }
                break;

            default:
                // Fallback to flat
                break;
        }

        return { scX, scY, rot, offX, offY, alpha };
    }

    /**
     * Check if algorithm uses intensity parameter
     * @param {string} mode - Algorithm mode
     * @returns {boolean} True if algorithm uses intensity
     */
    static usesIntensity(mode) {
        const intensityModes = [
            'glitch', 'melt', 'jitter', 'flow', 'edges'
        ];
        return intensityModes.includes(mode);
    }

    /**
     * Get color algorithms (affect visibility/alpha)
     */
    static getColorAlgorithmList() {
        return {
            'Flat (All Visible)': 'flat',
            'Opacity (Bright→Visible)': 'opacity',
            'Inv. Opacity (Dark→Visible)': 'inv_opacity',
            'Threshold (Hard Cut)': 'threshold'
        };
    }

    /**
     * Get placement algorithms (affect position/rotation/scale)
     */
    static getPlacementAlgorithmList() {
        return {
            'None': 'none',
            'Rotation (Luma→Angle)': 'rotation',
            'Random Size (Chaos)': 'random_size',
            'Stretch Vertical': 'stretch_v',
            'Stretch Horizontal': 'stretch_h',
            'Glitch (Luma→Offset)': 'glitch',
            'Pixel Melt (Drip)': 'melt',
            'Mosaic Jitter (Scatter)': 'jitter',
            'Flow Field (Direction)': 'flow',
            'Edge Detect (Outline)': 'edges'
        };
    }

    /**
     * Get halftone algorithms (brightness→size only)
     */
    static getHalftoneAlgorithmList() {
        return {
            'Halftone (Bright→Size)': 'halftone',
            'Inverse (Dark→Size)': 'inv_halftone'
        };
    }

    /**
     * Get all available algorithms
     */
    static getAlgorithmList() {
        return {
            // Basic
            'Static (Flat)': 'flat',
            'Halftone (Bright→Size)': 'halftone',
            'Inverse (Dark→Size)': 'inv_halftone',

            // Rotation
            'Rotation (Luma→Angle)': 'rotation',

            // Scale
            'Random Size (Chaos)': 'random_size',

            // Opacity
            'Opacity (Luma→Alpha)': 'opacity',
            'Inv. Opacity (Dark→Alpha)': 'inv_opacity',

            // Threshold
            'Threshold (Hard Cut)': 'threshold',

            // Stretch
            'Stretch Vertical': 'stretch_v',
            'Stretch Horizontal': 'stretch_h',

            // Position
            'Glitch (Luma→Offset)': 'glitch',
            'Pixel Melt (Drip)': 'melt',
            'Mosaic Jitter (Scatter)': 'jitter',

            // Advanced
            'Flow Field (Direction)': 'flow',
            'Edge Detect (Outline)': 'edges'
        };
    }
}
