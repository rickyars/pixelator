/**
 * Algorithm Library - All rendering algorithms
 * Each algorithm modifies transform properties based on pixel luminance
 */
class Algorithms {
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

            case 'random_rot':
                // Random rotation
                rot = Math.random() * Math.PI * 2;
                break;

            // Scale modes
            case 'random_size':
                // Random size chaos
                scX = scY = Math.random() * baseScale;
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

            // Crosshatch
            case 'crosshatch':
                rot = luma > 0.5 ? Math.PI / 4 : -Math.PI / 4;
                scY = baseScale * 1.5;
                scX = baseScale * 0.2;
                break;

            // Position offset modes
            case 'glitch':
                // Horizontal glitch based on luma
                offX = (luma - 0.5) * step * 1.5 * intensity;
                break;

            case 'melt':
                // Vertical drip effect
                offY = luma * step * 2 * intensity;
                scX = scY = luma * baseScale;
                break;

            case 'jitter':
                // Mosaic scatter
                const jit = (Math.random() - 0.5) * step * 2;
                if (luma > 0.5) {
                    offX = jit * intensity;
                    offY = jit * intensity;
                }
                scX = scY = luma * baseScale;
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
                    scX = scY = luma * baseScale * 1.2;
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

            // Checker pattern
            case 'checker':
                const gridX = Math.floor(x / step);
                const gridY = Math.floor(y / step);
                if ((gridX + gridY) % 2 === 0) {
                    scX = scY = luma * baseScale * 1.5;
                } else {
                    scX = scY = (1.0 - luma) * baseScale * 1.5;
                }
                break;

            // Posterize
            case 'posterize':
                let level = 0.2;
                if (luma > 0.3) level = 0.5;
                if (luma > 0.6) level = 0.8;
                if (luma > 0.8) level = 1.0;
                scX = scY = level * baseScale;
                break;

            // Interference pattern
            case 'interference':
                const pattern = Math.sin((x * y) * 0.0001 * intensity);
                scX = scY = (luma + pattern) * 0.5 * baseScale * 1.5;
                break;

            // CRT Scanline
            case 'crt_scan':
                const line = Math.floor(y / step);
                if (line % 2 === 0) {
                    scX = baseScale * 1.2;
                    scY = baseScale * 0.2;
                    offX = 2 * intensity;
                } else {
                    scX = luma * baseScale;
                    scY = baseScale * 0.8;
                }
                break;

            // Bio-Organic
            case 'bio':
                rot = Math.sin(luma * Math.PI * 2) + Math.random() * 0.5;
                scX = scY = (luma + 0.2) * baseScale;
                break;

            // Eraser noise
            case 'eraser':
                if (Math.random() > luma * intensity) {
                    scX = scY = 0;
                }
                break;

            default:
                // Fallback to flat
                break;
        }

        return { scX, scY, rot, offX, offY, alpha };
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
            'Random Rotation': 'random_rot',

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
            'Crosshatch': 'crosshatch',

            // Position
            'Glitch (Luma→Offset)': 'glitch',
            'Pixel Melt (Drip)': 'melt',
            'Mosaic Jitter (Scatter)': 'jitter',

            // Advanced
            'Flow Field (Direction)': 'flow',
            'Edge Detect (Outline)': 'edges',
            'Checkerboard (Alt)': 'checker',
            'Posterize (Levels)': 'posterize',
            'Interference (Moiré)': 'interference',
            'CRT TV (Scanline)': 'crt_scan',
            'Bio-Organic (Cellular)': 'bio',
            'Eraser (Noise)': 'eraser'
        };
    }
}
