/**
 * Pixelatte Effect Module
 *
 * Creates a layered displacement effect using multi-scale noise generation.
 * The effect generates organic, blocky displacement patterns that resemble
 * latte art or geological stratification.
 */
class PixelatteEffect {
    /**
     * Apply pixelatte displacement to sample points
     * @param {Array} samples - Pixel samples from ImageProcessor
     * @param {Object} params - {layers, exponent, strength, seed}
     * @returns {Array} Displaced samples
     */
    static applySparseDisplacement(samples, params) {
        const {
            pixelatteLayers = 5,
            pixelatteExponent = 2.0,
            pixelatteStrength = 20,
            pixelatteSeed = Date.now()
        } = params;

        // Seed the random number generator
        this.rng = this.createSeededRNG(pixelatteSeed);

        return samples.map(sample => {
            let maxNoise = 0;

            // Evaluate noise at this sample point
            for (let layer = 0; layer < pixelatteLayers; layer++) {
                const scale = Math.pow(2, layer);
                const nx = Math.floor(sample.x / scale);
                const ny = Math.floor(sample.y / scale);

                // Generate deterministic noise for this coordinate
                const noise = this.deterministicNoise(nx, ny, pixelatteSeed + layer);
                const powered = Math.pow(noise, pixelatteExponent);
                maxNoise = Math.max(maxNoise, powered);
            }

            // Calculate displacement (centered around 0)
            const disp = (maxNoise - 0.5) * pixelatteStrength;

            return {
                ...sample,
                x: sample.x + disp,
                y: sample.y + disp
            };
        });
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
     * Create a seeded random number generator using Linear Congruential Generator (LCG)
     * @param {number} seed - Initial seed value
     * @returns {Function} RNG function that returns values in range [0, 1]
     */
    static createSeededRNG(seed) {
        let state = seed;
        return function() {
            state = (state * 1664525 + 1013904223) % 4294967296;
            return state / 4294967296;
        };
    }

    /**
     * Generate random seed based on current time
     * @returns {number} Random seed
     */
    static generateRandomSeed() {
        return Math.floor(Date.now() * Math.random());
    }
}
