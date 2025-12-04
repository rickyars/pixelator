/**
 * Main application entry point
 */
class PixelEffectsApp {
    constructor() {
        this.imageProcessor = new ImageProcessor();
        this.renderer = new Renderer('svgCanvas');
        this.ui = new UI();
        this.stopsManager = new StopsManager();
        this.currentSamples = [];

        this.initEventHandlers();
        this.initStopsUI();
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

        // Character stop handler
        this.ui.onAddCharacterStop = (char, color) => {
            this.addCharacterStop(char, color);
        };
    }

    /**
     * Add a character stop with color
     */
    addCharacterStop(char, color) {
        // Find a reasonable percentage position
        const stops = this.stopsManager.getStops();
        let percentage = 50;

        if (stops.length > 0) {
            // Find the largest gap between stops
            const sorted = [...stops].sort((a, b) => a.percentage - b.percentage);
            let maxGap = sorted[0].percentage; // Gap from 0
            let gapStart = 0;

            for (let i = 0; i < sorted.length - 1; i++) {
                const gap = sorted[i + 1].percentage - sorted[i].percentage;
                if (gap > maxGap) {
                    maxGap = gap;
                    gapStart = sorted[i].percentage;
                }
            }

            // Check gap to 100
            const endGap = 100 - sorted[sorted.length - 1].percentage;
            if (endGap > maxGap) {
                percentage = sorted[sorted.length - 1].percentage + endGap / 2;
            } else {
                percentage = gapStart + maxGap / 2;
            }
        }

        this.stopsManager.addStop(Math.round(percentage), 'text', char, color);
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
                    params.gridSize,
                    params.samplingMethod
                );

                this.currentSamples = result.samples;
                params.stepSize = result.stepSize;
                params.stopsManager = this.stopsManager;

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

    /**
     * Initialize stops UI
     */
    initStopsUI() {
        const stopsList = document.getElementById('stopsList');
        const addStopBtn = document.getElementById('addStop');

        // Render stops
        this.stopsManager.onChange = () => {
            this.renderStops();
            if (this.imageProcessor.image) {
                this.processAndRender();
            }
        };

        // Add stop button
        addStopBtn.addEventListener('click', () => {
            const percentage = 50; // Default percentage
            this.stopsManager.addStop(percentage, 'text', '●');
        });

        // Stop operation buttons
        document.getElementById('evenSpacingBtn').addEventListener('click', () => {
            this.stopsManager.applyEvenSpacing();
        });

        document.getElementById('randomMappingBtn').addEventListener('click', () => {
            this.stopsManager.shuffleStopValues();
        });

        document.getElementById('randomPositionBtn').addEventListener('click', () => {
            this.stopsManager.randomizeStopPositions();
        });

        // Initial render
        this.renderStops();
    }

    /**
     * Render stops list
     */
    renderStops() {
        const stopsList = document.getElementById('stopsList');
        stopsList.innerHTML = '';

        const stops = this.stopsManager.getStops();

        stops.forEach(stop => {
            const stopItem = document.createElement('div');
            stopItem.className = 'stop-item';

            // Percentage input
            const percentageDiv = document.createElement('div');
            percentageDiv.className = 'stop-percentage';

            const percentageInput = document.createElement('input');
            percentageInput.type = 'number';
            percentageInput.min = 0;
            percentageInput.max = 100;
            percentageInput.value = stop.percentage;
            percentageInput.addEventListener('change', (e) => {
                this.stopsManager.updateStop(stop.id, { percentage: parseInt(e.target.value) });
            });

            const percentLabel = document.createElement('span');
            percentLabel.textContent = '%';

            percentageDiv.appendChild(percentageInput);
            percentageDiv.appendChild(percentLabel);

            // Preview
            const preview = document.createElement('div');
            preview.className = 'stop-preview';

            if (stop.type === 'image' && stop.image) {
                const img = document.createElement('img');
                img.src = stop.value;
                preview.appendChild(img);
            } else {
                const text = document.createElement('span');
                text.className = 'stop-preview-text';
                text.textContent = stop.value || '●';
                text.style.color = stop.color || '#ffffff';
                preview.appendChild(text);
            }

            // Click to upload image
            preview.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        await this.stopsManager.loadImage(stop.id, file);
                    }
                };
                input.click();
            });

            // Color picker for text stops
            let colorPicker = null;
            if (stop.type !== 'image') {
                colorPicker = document.createElement('input');
                colorPicker.type = 'color';
                colorPicker.className = 'color-picker color-picker-small';
                colorPicker.value = stop.color || '#ffffff';
                colorPicker.title = 'Stop color';
                colorPicker.addEventListener('input', (e) => {
                    this.stopsManager.updateStop(stop.id, { color: e.target.value });
                });
            }

            // Actions
            const actions = document.createElement('div');
            actions.className = 'stop-actions';

            const removeBtn = document.createElement('button');
            removeBtn.className = 'stop-action-btn';
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', () => {
                this.stopsManager.removeStop(stop.id);
            });

            actions.appendChild(removeBtn);

            stopItem.appendChild(percentageDiv);
            stopItem.appendChild(preview);
            if (colorPicker) {
                stopItem.appendChild(colorPicker);
            }
            stopItem.appendChild(actions);

            stopsList.appendChild(stopItem);
        });
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new PixelEffectsApp();
});
