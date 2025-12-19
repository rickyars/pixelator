/**
 * Main application entry point
 */
class PixelEffectsApp {
    // Constants for configuration
    static DEFAULT_DITHER_LEVELS = 8; // RGB color levels for default dithering (8³ = 512 colors)
    static RENDER_DELAY_MS = 50;      // Delay to allow UI update before heavy processing

    // Parameters that require resampling (expensive)
    static SAMPLING_PARAMS = ['gridSize', 'jitterEnabled'];

    // Parameters that only need re-rendering (cheap)
    static VISUAL_PARAMS = ['shape', 'rotation', 'scaleMin', 'scaleMax', 'scaleEnabled',
                            'colorMode', 'backgroundColor', 'randomErase', 'eraseAmount',
                            'anchor', 'duotoneDark', 'duotoneLight', 'outputScale'];

    constructor() {
        this.imageProcessor = new ImageProcessor();
        this.renderer = new Renderer('svgCanvas');
        this.ui = new UI();
        this.stopsManager = new StopsManager();
        this.currentSamples = [];
        this.renderTimeout = null;
        this.lastParams = null; // Track last parameters for smart updates

        // Initialize stops UI with callback
        this.stopsUI = new StopsUIManager(this.stopsManager, () => {
            if (this.imageProcessor.image) {
                this.processAndRender();
            }
        });

        this.initEventHandlers();
        this.stopsUI.init();
    }

    /**
     * Initialize event handlers
     */
    initEventHandlers() {
        // Image upload
        this.ui.onImageUpload = async (file) => {
            await this.handleImageUpload(file);
        };

        // Image clear
        this.ui.onImageClear = () => {
            this.handleImageClear();
        };

        // Parameter change
        this.ui.onParameterChange = () => {
            this.handleParameterChange();
        };

        // Export handlers
        this.ui.onExportSVG = () => {
            this.exportSVG();
        };

        this.ui.onExportPNG = () => {
            this.exportPNG();
        };
    }

    /**
     * Handle image upload
     */
    async handleImageUpload(file) {
        try {
            // Load image
            const image = await this.imageProcessor.loadImage(file);

            // Display image info
            this.ui.displayImageInfo(image);

            // Process and render
            await this.processAndRender();

        } catch (error) {
            ErrorHandler.handle(error, 'Image upload', true, false);
        }
    }

    /**
     * Handle image clear
     */
    handleImageClear() {
        this.imageProcessor.clear();
        this.renderer.clear();
        this.ui.clearImageInfo();
        this.currentSamples = [];
        this.lastParams = null; // Reset parameter tracking for next image
    }

    /**
     * Handle parameter change
     */
    handleParameterChange() {
        if (this.imageProcessor.image) {
            this.processAndRender();
        }
    }

    /**
     * Process image and render to SVG with smart caching
     */
    async processAndRender() {
        // Cancel any pending render to prevent race conditions
        if (this.renderTimeout) {
            clearTimeout(this.renderTimeout);
        }

        this.ui.showLoading();

        // Use setTimeout to allow UI to update
        this.renderTimeout = setTimeout(() => {
            try {
                // Get current parameters
                const params = this.ui.getParameters();

                // Get image dimensions (from cached imageData)
                const dimensions = this.imageProcessor.getDimensions();
                params.imageWidth = dimensions.width;
                params.imageHeight = dimensions.height;

                // Determine if we need to resample based on parameter changes
                const needsResampling = this.needsResampling(params);

                // Only resample if sampling parameters changed
                if (needsResampling) {
                    const samplingMethod = params.jitterEnabled ? 'jittered' : 'grid';
                    const result = this.imageProcessor.samplePixels(
                        params.gridSize,
                        samplingMethod
                    );

                    this.currentSamples = result.samples;
                    params.stepSize = result.stepSize;
                } else {
                    // Reuse cached samples
                    params.stepSize = params.gridSize;
                }

                params.stopsManager = this.stopsManager;

                // Apply random erasure effect (only for shapes mode)
                // Note: This modifies samples, so we create a copy for rendering if needed
                let renderSamples = this.currentSamples;
                if (this.currentSamples.length > 0 && params.mode === 'shapes' && params.randomErase && params.eraseAmount > 0) {
                    // Create shallow copy to avoid modifying cached samples
                    renderSamples = this.currentSamples.map(s => ({...s}));
                    this.applyRandomErasure(renderSamples, params);
                }

                // Render to SVG (always fast since we're just updating visuals)
                this.renderer.render(renderSamples, params.mode, params);

                // Store current params for next comparison
                this.lastParams = params;

                // Enable export buttons
                this.ui.enableExportButtons();

            } catch (error) {
                ErrorHandler.handle(error, 'Rendering', true, false);
            } finally {
                this.ui.hideLoading();
            }
        }, PixelEffectsApp.RENDER_DELAY_MS);
    }

    /**
     * Determine if resampling is needed based on parameter changes
     * @param {Object} newParams - New parameters
     * @returns {boolean} True if resampling needed
     */
    needsResampling(newParams) {
        if (!this.lastParams) return true; // First render

        // Check if any sampling parameters changed
        for (const param of PixelEffectsApp.SAMPLING_PARAMS) {
            if (this.lastParams[param] !== newParams[param]) {
                return true;
            }
        }

        return false;
    }

    /**
     * Apply random erasure effect to samples
     * Randomly sets some pixels to the background color
     * @param {Array} samples - Array of pixel samples to modify
     * @param {Object} params - Parameters including eraseAmount and backgroundColor
     */
    applyRandomErasure(samples, params) {
        const eraseProbability = params.eraseAmount / 100;

        // Parse background color to RGB
        const bgColor = this.hexToRgb(params.backgroundColor);

        // Randomly erase pixels by setting them to background color
        for (const sample of samples) {
            if (Math.random() < eraseProbability) {
                sample.r = bgColor.r;
                sample.g = bgColor.g;
                sample.b = bgColor.b;
                sample.brightness = this.imageProcessor.getBrightness(bgColor.r, bgColor.g, bgColor.b);
                sample.saturation = this.imageProcessor.getSaturation(bgColor.r, bgColor.g, bgColor.b);
            }
        }
    }

    /**
     * Convert hex color to RGB
     * @param {string} hex - Hex color string (e.g., '#ff0000')
     * @returns {Object} Object with r, g, b values
     */
    hexToRgb(hex) {
        // Remove # if present
        hex = hex.replace('#', '');

        // Parse hex values
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        return { r, g, b };
    }

    /**
     * Export as SVG
     */
    exportSVG() {
        const svgElement = this.renderer.getSVGElement();
        Exporter.toSVG(svgElement, 'pixel-effects');
    }

    /**
     * Export as PNG
     */
    exportPNG() {
        const svgElement = this.renderer.getSVGElement();
        // Get current mode to determine scale
        const params = this.ui.getParameters();
        // Use 4x scale for ASCII mode to make characters readable, 2x for shapes
        const scale = params.mode === 'ascii' ? 4 : 2;
        Exporter.toPNG(svgElement, scale, 'pixel-effects');
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new PixelEffectsApp();
});
