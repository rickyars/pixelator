/**
 * ASCIIMapper - Maps brightness values to ASCII characters
 */
class ASCIIMapper {
    static CHARSETS = {
        standard: ' .:-=+*#%@',
        blocks: ' ░▒▓█',
        numeric: ' 123456789',
        binary: ' 01',
        custom: ''
    };

    /**
     * Map brightness value to a character
     * @param {number} brightness - Brightness value (0-1)
     * @param {string} charset - Character set to use
     * @param {boolean} invert - Invert the brightness mapping
     * @returns {string} Character
     */
    static mapBrightness(brightness, charset, invert = false) {
        if (!charset || charset.length === 0) {
            charset = this.CHARSETS.standard;
        }

        const index = Math.floor(brightness * (charset.length - 1));
        const mappedIndex = invert ? charset.length - 1 - index : index;

        return charset[Math.max(0, Math.min(mappedIndex, charset.length - 1))];
    }

    /**
     * Generate ASCII text element data
     * @param {Object} sample - Pixel sample with color and position data
     * @param {Object} params - ASCII parameters
     * @returns {Object} Text element data
     */
    static generate(sample, params) {
        // Get charset
        let charset = params.asciiCharset;
        if (params.asciiCharset === 'custom' && params.customCharset) {
            charset = params.customCharset;
        } else if (this.CHARSETS[params.asciiCharset]) {
            charset = this.CHARSETS[params.asciiCharset];
        } else {
            charset = this.CHARSETS.standard;
        }

        // Map brightness to character
        const char = this.mapBrightness(sample.brightness, charset, params.invertBrightness);

        // Calculate color
        const color = ShapeGenerator.getColor(sample, params);

        return {
            text: char,
            x: sample.x,
            y: sample.y,
            fontSize: params.fontSize,
            fontFamily: params.fontFamily,
            fill: color,
            letterSpacing: params.charSpacing,
            dominantBaseline: 'middle',
            textAnchor: 'middle'
        };
    }
}
