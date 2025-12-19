/**
 * Renderer - Handles SVG rendering using D3.js
 */
class Renderer {
    constructor(svgElementId) {
        this.svg = d3.select(`#${svgElementId}`);
        this.currentSamples = [];
        this.panZoomInstance = null;
    }

    /**
     * Render samples to SVG
     * @param {Array} samples - Array of pixel samples
     * @param {string} mode - Rendering mode: 'shapes' or 'ascii'
     * @param {Object} params - Rendering parameters
     * @returns {void}
     */
    render(samples, mode, params) {
        // Store samples for export
        this.currentSamples = samples;

        // Clear previous render
        this.clear();

        // Use actual image dimensions for viewBox to prevent blank space
        if (samples.length === 0) {
            this.svg.attr('viewBox', `0 0 100 100`);
            this.svg.attr('width', 100);
            this.svg.attr('height', 100);
            return;
        }

        // Use actual image dimensions for viewBox
        const baseWidth = params.imageWidth || 100;
        const baseHeight = params.imageHeight || 100;

        // Apply output scale for exports only
        const scaleFactor = params.outputScale / 100;
        const scaledWidth = baseWidth * scaleFactor;
        const scaledHeight = baseHeight * scaleFactor;

        // Set viewBox to actual image dimensions
        this.svg.attr('viewBox', `0 0 ${baseWidth} ${baseHeight}`);

        // Set explicit width/height to match image dimensions (no letterboxing)
        // This ensures the SVG renders at its natural aspect ratio
        this.svg.attr('width', baseWidth);
        this.svg.attr('height', baseHeight);

        // Store scaled dimensions as data attributes for export
        this.svg.attr('data-export-width', scaledWidth);
        this.svg.attr('data-export-height', scaledHeight);

        // Use 'meet' to fit entire image without cropping (no letterboxing needed since we removed crop)
        this.svg.attr('preserveAspectRatio', 'xMidYMid meet');

        // Set shape-rendering to auto for smooth edges
        this.svg.attr('shape-rendering', 'auto');

        // Add background rectangle
        if (params.backgroundColor) {
            this.svg.append('rect')
                .attr('width', baseWidth)
                .attr('height', baseHeight)
                .attr('fill', params.backgroundColor);
        }

        // Render based on mode
        if (mode === 'shapes') {
            this.renderShapes(samples, params);
        } else if (mode === 'ascii') {
            this.renderASCII(samples, params);
        }

        // Enable pan/zoom controls
        this.enablePanZoom();
    }

    /**
     * Enable pan and zoom controls on the SVG (only if not already enabled)
     */
    enablePanZoom() {
        // Only initialize if not already created
        if (this.panZoomInstance) {
            // Just reset the view instead of recreating
            try {
                this.panZoomInstance.resize();
                this.panZoomInstance.fit();
                this.panZoomInstance.center();
            } catch (e) {
                console.warn('Failed to reset pan/zoom:', e);
            }
            return;
        }

        // Initialize pan/zoom if library is available
        if (typeof svgPanZoom !== 'undefined') {
            try {
                this.panZoomInstance = svgPanZoom('#svgCanvas', {
                    zoomEnabled: true,
                    controlIconsEnabled: false,
                    fit: true,
                    center: true,
                    minZoom: 0.1,
                    maxZoom: 20,
                    zoomScaleSensitivity: 0.3
                });
            } catch (e) {
                console.warn('Failed to initialize pan/zoom:', e);
            }
        }
    }

    /**
     * Disable pan and zoom
     */
    disablePanZoom() {
        if (this.panZoomInstance) {
            this.panZoomInstance.destroy();
            this.panZoomInstance = null;
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
     * Render ASCII/Image Map elements
     * @param {Array} samples - Pixel samples
     * @param {Object} params - Rendering parameters
     */
    renderASCII(samples, params) {
        // Process samples with stops system
        const elements = ASCIIMapper.processSamples(samples, params, params.stepSize);

        // Separate images and text
        const images = elements.filter(e => e.type === 'image');
        const texts = elements.filter(e => e.type === 'text');

        // Render images
        if (images.length > 0) {
            this.svg.selectAll('image')
                .data(images)
                .enter()
                .append('image')
                .attr('x', d => d.x)
                .attr('y', d => d.y)
                .attr('width', d => d.width)
                .attr('height', d => d.height)
                .attr('href', d => d.image)
                .attr('preserveAspectRatio', 'none');
        }

        // Render text with backgrounds
        if (texts.length > 0) {
            // First render background rectangles for texts that have them
            const textsWithBg = texts.filter(t => t.bgColor);
            if (textsWithBg.length > 0) {
                this.svg.selectAll('rect.text-bg')
                    .data(textsWithBg)
                    .enter()
                    .append('rect')
                    .attr('class', 'text-bg')
                    .attr('x', d => d.bgX)
                    .attr('y', d => d.bgY)
                    .attr('width', d => d.bgSize)
                    .attr('height', d => d.bgSize)
                    .attr('fill', d => d.bgColor);
            }

            // Then render the text on top
            // Center text in cell (font size = cell size for maximum coverage)
            this.svg.selectAll('text')
                .data(texts)
                .enter()
                .append('text')
                .attr('x', d => d.x)
                .attr('y', d => d.y)
                .attr('font-size', d => d.fontSize)
                .attr('font-family', d => d.fontFamily)
                .attr('fill', d => d.fill)
                .attr('dominant-baseline', 'middle')
                .attr('text-anchor', 'middle')
                .text(d => d.text);
        }
    }

    /**
     * Clear the SVG canvas
     */
    clear() {
        this.disablePanZoom();
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
