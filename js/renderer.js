/**
 * Renderer - Handles SVG rendering using D3.js
 */
class Renderer {
    constructor(svgElementId) {
        this.svg = d3.select(`#${svgElementId}`);
        this.currentSamples = [];
        this.panZoomInstance = null;
        this.lastMode = null;
        this.contentGroup = null;
        this.lastViewBox = '';
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

        // If mode changed, clear and reset
        if (this.lastMode !== mode) {
            this.clear();
            this.lastMode = mode;
        }

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

        // Use 'meet' to fit entire image without cropping
        this.svg.attr('preserveAspectRatio', 'xMidYMid meet');

        // Set shape-rendering to auto for smooth edges
        this.svg.attr('shape-rendering', 'auto');

        // Update or add background rectangle to the main SVG (before content group for correct z-order)
        const bgData = params.backgroundColor ? [params.backgroundColor] : [];
        const bgSelection = this.svg.selectAll('rect.bg-rect').data(bgData);
        bgSelection.exit().remove();
        bgSelection.enter()
            .insert('rect', ':first-child')
            .attr('class', 'bg-rect')
            .merge(bgSelection)
            .attr('width', baseWidth)
            .attr('height', baseHeight)
            .attr('fill', d => d);

        // Create or reuse content group for main elements
        if (!this.contentGroup) {
            this.contentGroup = this.svg.append('g').attr('class', 'content-group');
        }

        console.log('[Render] SVG setup:', {
            viewBox: this.svg.attr('viewBox'),
            width: this.svg.attr('width'),
            height: this.svg.attr('height'),
            contentGroupExists: !!this.contentGroup
        });

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
     * Enable pan and zoom controls on the SVG
     */
    enablePanZoom() {
        // Get current viewBox (this changes when pixel size changes)
        const currentViewBox = this.svg.attr('viewBox');
        const viewBoxChanged = currentViewBox !== this.lastViewBox;

        console.log('[PanZoom Debug]', {
            currentViewBox,
            lastViewBox: this.lastViewBox,
            viewBoxChanged,
            hasInstance: !!this.panZoomInstance,
            svgDimensions: {
                width: this.svg.attr('width'),
                height: this.svg.attr('height')
            }
        });

        // Store current viewBox
        this.lastViewBox = currentViewBox;

        // If viewBox changed and pan/zoom exists, destroy it
        if (viewBoxChanged && this.panZoomInstance) {
            console.log('[PanZoom] ViewBox changed, destroying old instance');
            try {
                this.disablePanZoom();
            } catch (e) {
                console.warn('Failed to disable pan/zoom:', e);
            }
            this.panZoomInstance = null;
        }

        // Initialize pan/zoom if not already done
        if (!this.panZoomInstance && typeof svgPanZoom !== 'undefined') {
            console.log('[PanZoom] Creating new pan/zoom instance');
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
                console.log('[PanZoom] Instance created, scheduling manual fit/center');
                // Manually fit and center based on viewBox and container size
                setTimeout(() => {
                    try {
                        if (this.panZoomInstance) {
                            const svgElement = this.svg.node();
                            const viewBoxStr = this.svg.attr('viewBox');

                            if (viewBoxStr) {
                                const [vx, vy, vw, vh] = viewBoxStr.split(' ').map(Number);
                                const containerWidth = svgElement.clientWidth;
                                const containerHeight = svgElement.clientHeight;

                                console.log('[PanZoom] Viewport dimensions:', {
                                    containerWidth,
                                    containerHeight,
                                    viewBox: { x: vx, y: vy, width: vw, height: vh }
                                });

                                // Calculate zoom to fit entire viewBox in container
                                const zoomX = containerWidth / vw;
                                const zoomY = containerHeight / vh;
                                const zoom = Math.min(zoomX, zoomY);

                                // Calculate pan to center
                                const panX = (containerWidth - vw * zoom) / 2 - vx * zoom;
                                const panY = (containerHeight - vh * zoom) / 2 - vy * zoom;

                                console.log('[PanZoom] Calculated:', {
                                    zoomX, zoomY, zoom, panX, panY
                                });

                                // Apply zoom and pan directly
                                this.panZoomInstance.zoom(zoom);
                                this.panZoomInstance.pan({ x: panX, y: panY });

                                console.log('[PanZoom] Manual fit/center complete');
                            }
                        }
                    } catch (e) {
                        console.warn('Failed to manually fit/center pan/zoom:', e);
                    }
                }, 0);
            } catch (e) {
                console.warn('Failed to initialize pan/zoom:', e);
            }
        } else if (this.panZoomInstance && !viewBoxChanged) {
            // ViewBox unchanged - just update view to preserve user zoom
            console.log('[PanZoom] ViewBox unchanged, calling resize()');
            try {
                this.panZoomInstance.resize();
            } catch (e) {
                console.warn('Failed to resize pan/zoom:', e);
            }
        } else if (this.panZoomInstance && viewBoxChanged) {
            console.log('[PanZoom] ViewBox changed but instance exists - waiting for recreation');
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
        // Clear previous shapes (they may not match the new grid)
        this.contentGroup.selectAll('path').remove();

        // Create shape elements
        const shapes = this.contentGroup.selectAll('path')
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

        // Clear previous ASCII elements
        this.contentGroup.selectAll('image').remove();
        this.contentGroup.selectAll('rect.text-bg').remove();
        this.contentGroup.selectAll('text').remove();

        // Separate images and text
        const images = elements.filter(e => e.type === 'image');
        const texts = elements.filter(e => e.type === 'text');

        // Render images
        if (images.length > 0) {
            this.contentGroup.selectAll('image')
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
            // Render background rectangles for texts that have them
            const textsWithBg = texts.filter(t => t.bgColor);
            if (textsWithBg.length > 0) {
                this.contentGroup.selectAll('rect.text-bg')
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

            // Render the text on top
            this.contentGroup.selectAll('text')
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
        this.contentGroup = null;
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
