/**
 * Main application entry point
 */
class PixelEffectsApp {
    constructor() {
        this.imageProcessor = new ImageProcessor();
        this.renderer = new Renderer('svgCanvas');
        this.ui = new UI();
        this.currentSamples = [];

        this.initEventHandlers();
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
            console.error('Error processing image:', error);
            throw error;
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
        this.ui.showLoading();

        // Use setTimeout to allow UI to update
        setTimeout(() => {
            try {
                // Get current parameters
                const params = this.ui.getParameters();

                // Get image dimensions
                const dimensions = this.imageProcessor.getDimensions();
                params.imageWidth = dimensions.width;
                params.imageHeight = dimensions.height;

                // Sample pixels - returns { samples, stepSize }
                const result = this.imageProcessor.samplePixels(
                    params.resolution,
                    params.samplingMethod
                );

                this.currentSamples = result.samples;
                params.stepSize = result.stepSize;

                // Render to SVG
                this.renderer.render(this.currentSamples, params.mode, params);

                // Update export stats
                this.ui.updateExportStats(this.currentSamples.length);

            } catch (error) {
                console.error('Error rendering:', error);
                alert('An error occurred while rendering. Please try adjusting the parameters.');
            } finally {
                this.ui.hideLoading();
            }
        }, 50);
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
