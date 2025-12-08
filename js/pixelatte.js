/**
 * Pixplode Effect Module - DEPRECATED
 *
 * ⚠️ ARCHITECTURAL CHANGE: This file is now deprecated!
 *
 * The Pixplode (Pixelatte) effect has been moved to ImageProcessor as a full-image
 * preprocessing operation. This is the CORRECT implementation that matches the
 * Python/OpenCV reference implementation.
 *
 * OLD (WRONG) APPROACH:
 * - Sample pixels first
 * - For each sample, calculate noise and displace UV coordinates
 * - Resample color from displaced position
 * - Effect depends on grid resolution
 *
 * NEW (CORRECT) APPROACH:
 * - Generate full-resolution displacement map for ENTIRE image
 * - Remap ALL pixels using cv2.remap equivalent (see ImageProcessor.applyPixplodeRemap)
 * - Sample normally from the remapped canvas
 * - Effect is intrinsic to the image, independent of sampling
 *
 * IMPLEMENTATION DETAILS:
 * The effect now properly implements:
 * 1. Multi-scale noise generation at progressively smaller resolutions
 * 2. NEAREST neighbor upscaling to create blocky regions
 * 3. MAXIMUM compositing of layers
 * 4. Full-image UV remapping with bilinear interpolation
 * 5. Applied BEFORE any sampling occurs
 *
 * See ImageProcessor.applyPixplodeRemap() for the correct implementation.
 *
 * This class is kept for backwards compatibility but is no longer used.
 */
class PixelatteEffect {
    /**
     * Apply pixplode UV displacement by resampling colors from displaced positions
     * @param {Array} samples - Pixel samples from ImageProcessor
     * @param {Object} params - {layers, exponent, strength, seed, imageWidth, imageHeight}
     * @param {ImageProcessor} imageProcessor - Reference to ImageProcessor for color sampling
     * @returns {Array} Samples with colors resampled from displaced UV coordinates
     */
    static applyUVDisplacement(samples, params, imageProcessor) {
        const {
            pixelatteLayers = 5,
            pixelatteExponent = 2.0,
            pixelatteStrength = 20,
            pixelatteSeed = Date.now(),
            imageWidth,
            imageHeight
        } = params;

        if (!imageWidth || !imageHeight || !imageProcessor) {
            console.warn('Missing parameters for UV displacement');
            return samples;
        }

        return samples.map(sample => {
            // Generate multi-scale noise at this sample point
            const noiseValue = this.evaluateMultiScaleNoise(
                sample.x,
                sample.y,
                pixelatteLayers,
                pixelatteExponent,
                pixelatteSeed,
                imageWidth,
                imageHeight
            );

            // Convert noise to UV displacement (-0.5 to +0.5 range)
            const displacement = (noiseValue - 0.5) * pixelatteStrength;

            // Calculate displaced UV coordinates (where to sample color FROM)
            const sampleX = sample.x + displacement;
            const sampleY = sample.y + displacement;

            // Clamp to image bounds with wrapping for seamless effect
            const clampedX = Math.max(0, Math.min(imageWidth - 1, sampleX));
            const clampedY = Math.max(0, Math.min(imageHeight - 1, sampleY));

            // Resample color from displaced position
            const newColor = imageProcessor.getPixelColor(Math.floor(clampedX), Math.floor(clampedY));

            // Return sample with original position but displaced color
            return {
                ...sample,
                r: newColor.r,
                g: newColor.g,
                b: newColor.b,
                brightness: imageProcessor.getBrightness(newColor.r, newColor.g, newColor.b),
                saturation: imageProcessor.getSaturation(newColor.r, newColor.g, newColor.b)
            };
        });
    }

    /**
     * Evaluate multi-scale noise at a specific point
     * Generates noise at progressively smaller resolutions and composites using maximum
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} layers - Number of noise layers
     * @param {number} exponent - Contrast enhancement exponent
     * @param {number} seed - Random seed
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @returns {number} Combined noise value [0, 1]
     */
    static evaluateMultiScaleNoise(x, y, layers, exponent, seed, width, height) {
        let maxNoise = 0;

        // Generate noise at multiple scales
        for (let layer = 0; layer < layers; layer++) {
            // Calculate resolution for this layer (progressively smaller: full, half, quarter, etc.)
            const scale = Math.pow(2, layer);
            const layerWidth = Math.max(1, Math.floor(width / scale));
            const layerHeight = Math.max(1, Math.floor(height / scale));

            // Calculate grid cell coordinates at this scale
            const cellX = Math.floor((x / width) * layerWidth);
            const cellY = Math.floor((y / height) * layerHeight);

            // Generate deterministic noise for this cell
            const noise = this.deterministicNoise(cellX, cellY, seed + layer);

            // Apply power function for contrast enhancement
            // Higher exponent = sparser pattern (only brightest noise survives)
            const powered = Math.pow(noise, exponent);

            // Take maximum (composite operation) - creates layered blocky effect
            maxNoise = Math.max(maxNoise, powered);
        }

        return maxNoise;
    }

    /**
     * Generate deterministic noise based on coordinates
     * Uses a simple hash function for pseudo-random values
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} seed - Random seed
     * @returns {number} Noise value in range [0, 1]
     */
    static deterministicNoise(x, y, seed) {
        // Simple hash function for deterministic pseudo-random values
        let h = seed + x * 374761393 + y * 668265263;
        h = (h ^ (h >> 13)) * 1274126177;
        return ((h ^ (h >> 16)) >>> 0) / 4294967296;
    }

    /**
     * Generate random seed based on current time
     * @returns {number} Random seed
     */
    static generateRandomSeed() {
        return Math.floor(Date.now() * Math.random());
    }
}
