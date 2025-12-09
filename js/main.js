/**
 * Main application entry point
 */
class PixelEffectsApp {
    // Constants for configuration
    static DEFAULT_DITHER_LEVELS = 8; // RGB color levels for default dithering (8³ = 512 colors)
    static RENDER_DELAY_MS = 50;      // Delay to allow UI update before heavy processing

    constructor() {
        this.imageProcessor = new ImageProcessor();
        this.renderer = new Renderer('svgCanvas');
        this.ui = new UI();
        this.stopsManager = new StopsManager();
        this.currentSamples = [];
        this.renderTimeout = null;

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
     * Process image and render to SVG
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

                // Draw image to canvas without effects
                this.imageProcessor.drawToCanvas({});

                // Get image dimensions
                const dimensions = this.imageProcessor.getDimensions();
                params.imageWidth = dimensions.width;
                params.imageHeight = dimensions.height;

                // Sample pixels - returns { samples, stepSize }
                const result = this.imageProcessor.samplePixels(
                    params.gridSize,
                    params.samplingMethod
                );

                this.currentSamples = result.samples;
                params.stepSize = result.stepSize;
                params.stopsManager = this.stopsManager;

                // Apply color processing effects to samples
                if (this.currentSamples.length > 0) {
                    // Dithering only works with grid sampling (requires regular grid structure)
                    if (params.samplingMethod === 'grid' && params.dither) {
                        // Calculate grid dimensions
                        const cols = Math.ceil(dimensions.width / params.gridSize);
                        const rows = Math.ceil(dimensions.height / params.gridSize);

                        // Apply dithering with posterization levels
                        const levels = params.posterize && params.posterizeLevels
                            ? params.posterizeLevels
                            : PixelEffectsApp.DEFAULT_DITHER_LEVELS;

                        this.imageProcessor.applyDitherToSamples(
                            this.currentSamples,
                            cols,
                            rows,
                            levels
                        );
                    } else if (params.posterize && params.posterizeLevels) {
                        // Posterization without dithering (works with any sampling method)
                        this.imageProcessor.applyPosterizeToSamples(
                            this.currentSamples,
                            params.posterizeLevels
                        );
                    }

                    // Apply random erasure effect (only for shapes mode)
                    if (params.mode === 'shapes' && params.randomErase && params.eraseAmount > 0) {
                        this.applyRandomErasure(this.currentSamples, params);
                    }
                }

                // Render to SVG
                this.renderer.render(this.currentSamples, params.mode, params);

                // Update export stats
                this.ui.updateExportStats(this.currentSamples.length);

            } catch (error) {
                ErrorHandler.handle(error, 'Rendering', true, false);
            } finally {
                this.ui.hideLoading();
            }
        }, PixelEffectsApp.RENDER_DELAY_MS);
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
        Exporter.toPNG(svgElement, 2, 'pixel-effects');
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new PixelEffectsApp();
});
