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

                // Apply grid-based effects to samples
                if (this.currentSamples.length > 0) {
                    // Calculate grid dimensions from image dimensions and gridSize
                    const cols = Math.ceil(dimensions.width / params.gridSize);
                    const rows = Math.ceil(dimensions.height / params.gridSize);

                    // Apply effects: when both posterize and dither are enabled,
                    // only apply dithering to avoid double quantization
                    if (params.posterize && params.posterizeLevels && params.dither) {
                        // Both enabled: only dither (includes quantization WITH error diffusion)
                        this.imageProcessor.applyDitherToSamples(
                            this.currentSamples,
                            cols,
                            rows,
                            params.posterizeLevels
                        );
                    } else if (params.posterize && params.posterizeLevels) {
                        // Only posterize (no dithering)
                        this.imageProcessor.applyPosterizeToSamples(
                            this.currentSamples,
                            params.posterizeLevels
                        );
                    } else if (params.dither) {
                        // Only dither with default palette
                        this.imageProcessor.applyDitherToSamples(
                            this.currentSamples,
                            cols,
                            rows,
                            PixelEffectsApp.DEFAULT_DITHER_LEVELS
                        );
                    }
                }

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
        }, PixelEffectsApp.RENDER_DELAY_MS);
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

            // Character/Image display
            if (stop.type === 'image' && stop.image) {
                // Image preview with option to clear
                const imagePreview = document.createElement('div');
                imagePreview.className = 'stop-preview stop-preview-image';
                const img = document.createElement('img');
                img.src = stop.value;
                imagePreview.appendChild(img);

                // Click to replace image
                imagePreview.title = 'Click to replace image';
                imagePreview.addEventListener('click', () => {
                    this.openImagePicker(stop.id);
                });

                // Clear button to go back to text
                const clearImgBtn = document.createElement('button');
                clearImgBtn.className = 'stop-action-btn';
                clearImgBtn.textContent = '↩';
                clearImgBtn.title = 'Use character instead';
                clearImgBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.stopsManager.updateStop(stop.id, {
                        type: 'text',
                        value: '●',
                        image: null
                    });
                });

                stopItem.appendChild(percentageDiv);
                stopItem.appendChild(imagePreview);
                stopItem.appendChild(clearImgBtn);
            } else {
                // Character input
                const charInput = document.createElement('input');
                charInput.type = 'text';
                charInput.className = 'stop-char-input';
                charInput.maxLength = 2;
                charInput.value = stop.value || '●';
                charInput.style.color = stop.color || '#ffffff';
                charInput.style.backgroundColor = stop.bgColor || '#000000';
                charInput.addEventListener('input', (e) => {
                    if (e.target.value) {
                        this.stopsManager.updateStop(stop.id, { value: e.target.value });
                    }
                });

                // Color pickers
                const colorPickers = document.createElement('div');
                colorPickers.className = 'color-pair';

                const fgPicker = document.createElement('input');
                fgPicker.type = 'color';
                fgPicker.className = 'color-picker color-picker-small';
                fgPicker.value = stop.color || '#ffffff';
                fgPicker.title = 'Text color';
                // Preview on input (no re-render)
                fgPicker.addEventListener('input', (e) => {
                    charInput.style.color = e.target.value;
                });
                // Commit on change (when picker closes)
                fgPicker.addEventListener('change', (e) => {
                    this.stopsManager.updateStop(stop.id, { color: e.target.value });
                });

                const bgPicker = document.createElement('input');
                bgPicker.type = 'color';
                bgPicker.className = 'color-picker color-picker-small';
                bgPicker.value = stop.bgColor || '#000000';
                bgPicker.title = 'Background color';
                // Preview on input (no re-render)
                bgPicker.addEventListener('input', (e) => {
                    charInput.style.backgroundColor = e.target.value;
                });
                // Commit on change (when picker closes)
                bgPicker.addEventListener('change', (e) => {
                    this.stopsManager.updateStop(stop.id, { bgColor: e.target.value });
                });

                colorPickers.appendChild(fgPicker);
                colorPickers.appendChild(bgPicker);

                // Image upload button
                const imgBtn = document.createElement('button');
                imgBtn.className = 'stop-action-btn';
                imgBtn.textContent = '+';
                imgBtn.title = 'Upload image';
                imgBtn.addEventListener('click', () => {
                    this.openImagePicker(stop.id);
                });

                stopItem.appendChild(percentageDiv);
                stopItem.appendChild(charInput);
                stopItem.appendChild(colorPickers);
                stopItem.appendChild(imgBtn);
            }

            // Remove button (always last)
            const removeBtn = document.createElement('button');
            removeBtn.className = 'stop-action-btn stop-remove-btn';
            removeBtn.textContent = '×';
            removeBtn.title = 'Remove stop';
            removeBtn.addEventListener('click', () => {
                this.stopsManager.removeStop(stop.id);
            });

            stopItem.appendChild(removeBtn);
            stopsList.appendChild(stopItem);
        });
    }

    /**
     * Open image picker for a stop
     */
    openImagePicker(stopId) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                await this.stopsManager.loadImage(stopId, file);
            }
        };
        input.click();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new PixelEffectsApp();
});
