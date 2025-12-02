/**
 * Renderer - Handles SVG rendering using D3.js
 */
class Renderer {
    constructor(svgElementId) {
        this.svg = d3.select(`#${svgElementId}`);
        this.currentSamples = [];
    }

    /**
     * Render samples to SVG
     * @param {Array} samples - Array of pixel samples
     * @param {string} mode - Rendering mode: 'shapes' or 'ascii'
     * @param {Object} params - Rendering parameters
     */
    render(samples, mode, params) {
        // Store samples for export
        this.currentSamples = samples;

        // Clear previous render
        this.clear();

        // Set viewBox based on image dimensions
        if (params.imageWidth && params.imageHeight) {
            this.svg.attr('viewBox', `0 0 ${params.imageWidth} ${params.imageHeight}`);
            this.svg.attr('width', params.imageWidth);
            this.svg.attr('height', params.imageHeight);
        }

        // Render based on mode
        if (mode === 'shapes') {
            this.renderShapes(samples, params);
        } else if (mode === 'ascii') {
            this.renderASCII(samples, params);
        }
    }

    /**
     * Render shapes
     * @param {Array} samples - Pixel samples
     * @param {Object} params - Shape parameters
     */
    renderShapes(samples, params) {
        // Create shape elements
        const shapes = this.svg.selectAll('path')
            .data(samples)
            .enter()
            .append('path');

        // Apply shape attributes
        shapes.each(function(d) {
            const shapeData = ShapeGenerator.generate(d, params);
            d3.select(this)
                .attr('d', shapeData.path)
                .attr('transform', shapeData.transform)
                .attr('fill', shapeData.fill)
                .attr('stroke', shapeData.stroke)
                .attr('stroke-width', shapeData.strokeWidth);
        });
    }

    /**
     * Render ASCII characters
     * @param {Array} samples - Pixel samples
     * @param {Object} params - ASCII parameters
     */
    renderASCII(samples, params) {
        // Create text elements
        const texts = this.svg.selectAll('text')
            .data(samples)
            .enter()
            .append('text');

        // Apply text attributes
        texts.each(function(d) {
            const textData = ASCIIMapper.generate(d, params);
            d3.select(this)
                .attr('x', textData.x)
                .attr('y', textData.y)
                .attr('font-size', textData.fontSize)
                .attr('font-family', textData.fontFamily)
                .attr('fill', textData.fill)
                .attr('dominant-baseline', textData.dominantBaseline)
                .attr('text-anchor', textData.textAnchor)
                .style('letter-spacing', `${(textData.letterSpacing - 1) * textData.fontSize}px`)
                .text(textData.text);
        });
    }

    /**
     * Clear the SVG canvas
     */
    clear() {
        this.svg.selectAll('*').remove();
    }

    /**
     * Update viewBox dimensions
     * @param {number} width - Width
     * @param {number} height - Height
     */
    updateViewBox(width, height) {
        this.svg.attr('viewBox', `0 0 ${width} ${height}`);
        this.svg.attr('width', width);
        this.svg.attr('height', height);
    }

    /**
     * Get the SVG element
     * @returns {SVGElement} SVG element
     */
    getSVGElement() {
        return this.svg.node();
    }
}
