/**
 * UI - Handles user interface interactions and events
 */
class UI {
    constructor() {
        this.elements = {
            uploadZone: document.getElementById('uploadZone'),
            fileInput: document.getElementById('fileInput'),
            clearImageBtn: document.getElementById('clearImageBtn'),
            imageInfo: document.getElementById('imageInfo'),
            imageThumbnail: document.getElementById('imageThumbnail'),
            imageDimensions: document.getElementById('imageDimensions'),
            loadingIndicator: document.getElementById('loadingIndicator'),
            exportStats: document.getElementById('exportStats'),
            exportSVG: document.getElementById('exportSVG'),
            exportPNG: document.getElementById('exportPNG')
        };

        this.onImageUpload = null;
        this.onImageClear = null;
        this.onParameterChange = null;

        this.initUploadHandlers();
        this.initControlHandlers();
        this.initExportHandlers();
    }

    /**
     * Initialize upload event handlers
     */
    initUploadHandlers() {
        // Upload zone click to open file picker
        this.elements.uploadZone.addEventListener('click', () => {
            this.elements.fileInput.click();
        });

        // File input change
        this.elements.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleImageUpload(file);
            }
        });

        // Drag and drop
        this.elements.uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.elements.uploadZone.classList.add('drag-over');
        });

        this.elements.uploadZone.addEventListener('dragleave', () => {
            this.elements.uploadZone.classList.remove('drag-over');
        });

        this.elements.uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.elements.uploadZone.classList.remove('drag-over');

            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.handleImageUpload(file);
            }
        });

        // Clear button
        this.elements.clearImageBtn.addEventListener('click', () => {
            this.handleImageClear();
        });
    }

    /**
     * Initialize control event handlers
     */
    initControlHandlers() {
        // Mode selection
        document.querySelectorAll('input[name="mode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.handleModeChange(e.target.value);
            });
        });

        // Common controls
        this.addSliderHandler('gridSize', 'gridSizeValue');
        this.addSelectHandler('samplingMethod');
        this.addSelectHandler('colorMode');
        this.addColorHandler('duotoneDark');
        this.addColorHandler('duotoneLight');
        this.addColorHandler('backgroundColor');

        // Effects controls
        this.addCheckboxHandler('dither');
        this.addCheckboxHandler('posterize');
        this.addSliderHandler('posterizeLevels', 'posterizeLevelsValue');

        // Anchor grid handler
        this.initAnchorGrid();

        // Posterize toggle
        document.getElementById('posterize').addEventListener('change', (e) => {
            const posterizeControls = document.getElementById('posterizeControls');
            posterizeControls.style.display = e.target.checked ? 'block' : 'none';
            this.triggerParameterChange();
        });

        // Color mode change handler
        document.getElementById('colorMode').addEventListener('change', (e) => {
            const duotoneControls = document.getElementById('duotoneControls');
            duotoneControls.style.display = e.target.value === 'duotone' ? 'block' : 'none';
            this.triggerParameterChange();
        });

        // Shape controls
        this.addSelectHandler('shape');
        this.addCheckboxHandler('scaleEnabled');
        this.addSliderHandler('scaleMin', 'scaleMinValue');
        this.addSliderHandler('scaleMax', 'scaleMaxValue');

        // Scale toggle
        document.getElementById('scaleEnabled').addEventListener('change', (e) => {
            const scaleControls = document.getElementById('scaleControls');
            scaleControls.style.display = e.target.checked ? 'block' : 'none';
            this.triggerParameterChange();
        });

        // Shape scaling metric
        this.addSelectHandler('scaleMetric');

        // Sampling method validation for dithering
        document.getElementById('samplingMethod').addEventListener('change', (e) => {
            this.validateDitheringAvailability(e.target.value);
        });

        // Shape rotation
        this.addSliderHandler('rotation', 'rotationValue');

        // ASCII/Image Map controls
        this.addSelectHandler('fontFamily');
        this.addCheckboxHandler('mergePixels');
        this.addSliderHandler('mergeMin', 'mergeMinValue');
        this.addSliderHandler('mergeMax', 'mergeMaxValue');
        this.addSliderHandler('imageSize', 'imageSizeValue');

        // Merge pixels toggle
        document.getElementById('mergePixels').addEventListener('change', (e) => {
            const mergeControls = document.getElementById('mergeControls');
            mergeControls.style.display = e.target.checked ? 'block' : 'none';
            this.triggerParameterChange();
        });

        // Pixelatte controls
        this.addSliderHandler('pixelatteLayers', 'pixelatteLayersValue');
        this.addSliderHandler('pixelatteExponent', 'pixelatteExponentValue');
        this.addSliderHandler('pixelatteStrength', 'pixelatteStrengthValue');

        // Pixelatte seed input
        const seedInput = document.getElementById('pixelatteSeed');
        if (seedInput) {
            seedInput.addEventListener('input', () => {
                this.triggerParameterChange();
            });
        }

        // Randomize seed button
        const randomizeSeedBtn = document.getElementById('randomizeSeed');
        if (randomizeSeedBtn) {
            randomizeSeedBtn.addEventListener('click', () => {
                const seedInput = document.getElementById('pixelatteSeed');
                seedInput.value = Math.floor(Math.random() * 1000000);
                this.triggerParameterChange();
            });
        }
    }

    /**
     * Initialize export handlers
     */
    initExportHandlers() {
        this.elements.exportSVG.addEventListener('click', () => {
            if (this.onExportSVG) {
                this.onExportSVG();
            }
        });

        this.elements.exportPNG.addEventListener('click', () => {
            if (this.onExportPNG) {
                this.onExportPNG();
            }
        });
    }

    /**
     * Initialize anchor grid handlers
     */
    initAnchorGrid() {
        const anchorGrid = document.getElementById('anchorGrid');
        if (!anchorGrid) return;

        this.selectedAnchor = 'center';

        anchorGrid.addEventListener('click', (e) => {
            const btn = e.target.closest('.anchor-btn');
            if (!btn) return;

            // Update active state
            anchorGrid.querySelectorAll('.anchor-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            this.selectedAnchor = btn.dataset.anchor;
            this.triggerParameterChange();
        });
    }

    /**
     * Add slider event handler
     */
    addSliderHandler(sliderId, valueId) {
        const slider = document.getElementById(sliderId);
        const valueDisplay = document.getElementById(valueId);

        slider.addEventListener('input', (e) => {
            valueDisplay.textContent = e.target.value;
            this.triggerParameterChange();
        });
    }

    /**
     * Add select event handler
     */
    addSelectHandler(selectId) {
        const select = document.getElementById(selectId);
        select.addEventListener('change', () => {
            this.triggerParameterChange();
        });
    }

    /**
     * Add checkbox event handler
     */
    addCheckboxHandler(checkboxId) {
        const checkbox = document.getElementById(checkboxId);
        checkbox.addEventListener('change', () => {
            this.triggerParameterChange();
        });
    }

    /**
     * Add color picker event handler
     */
    addColorHandler(colorId) {
        const colorPicker = document.getElementById(colorId);
        colorPicker.addEventListener('input', () => {
            this.triggerParameterChange();
        });
    }

    /**
     * Handle image upload
     */
    async handleImageUpload(file) {
        if (this.onImageUpload) {
            this.showLoading();
            try {
                await this.onImageUpload(file);
            } catch (error) {
                ErrorHandler.handle(error, 'Image file handling', true, false);
            } finally {
                this.hideLoading();
            }
        }
    }

    /**
     * Handle image clear
     */
    handleImageClear() {
        if (this.onImageClear) {
            this.onImageClear();
        }
        this.elements.fileInput.value = '';
    }

    /**
     * Handle mode change
     */
    handleModeChange(mode) {
        const shapeControls = document.getElementById('shapeControls');
        const asciiControls = document.getElementById('asciiControls');
        const pixelatteControls = document.getElementById('pixelatteControls');
        const colorModeControl = document.getElementById('colorModeControl');
        const samplingSection = document.getElementById('samplingSection');

        if (mode === 'shapes') {
            samplingSection.style.display = 'block';
            shapeControls.style.display = 'block';
            asciiControls.style.display = 'none';
            pixelatteControls.style.display = 'none';
            colorModeControl.style.display = 'block';
        } else if (mode === 'ascii') {
            samplingSection.style.display = 'block';
            shapeControls.style.display = 'none';
            asciiControls.style.display = 'block';
            pixelatteControls.style.display = 'none';
            colorModeControl.style.display = 'none';
        } else if (mode === 'pixelatte') {
            // Pixplode is an image transformation mode - no sampling needed
            samplingSection.style.display = 'none';
            shapeControls.style.display = 'none';
            asciiControls.style.display = 'none';
            pixelatteControls.style.display = 'block';
            colorModeControl.style.display = 'block';
        }

        this.triggerParameterChange();
    }

    /**
     * Trigger parameter change callback with debouncing
     */
    triggerParameterChange() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(() => {
            if (this.onParameterChange) {
                this.onParameterChange();
            }
        }, 300);
    }

    /**
     * Display image info
     */
    displayImageInfo(image) {
        this.elements.uploadZone.style.display = 'none';
        this.elements.imageInfo.style.display = 'block';
        this.elements.imageThumbnail.src = image.src;
        this.elements.imageDimensions.textContent = `${image.width} × ${image.height}px`;
    }

    /**
     * Clear image info
     */
    clearImageInfo() {
        this.elements.uploadZone.style.display = 'block';
        this.elements.imageInfo.style.display = 'none';
        this.elements.imageThumbnail.src = '';
        this.elements.imageDimensions.textContent = '';
    }

    /**
     * Show loading indicator
     */
    showLoading() {
        this.elements.loadingIndicator.style.display = 'block';
    }

    /**
     * Hide loading indicator
     */
    hideLoading() {
        this.elements.loadingIndicator.style.display = 'none';
    }

    /**
     * Update export stats
     */
    updateExportStats(elementCount, fileSize = null) {
        let statsText = `Elements: ${elementCount.toLocaleString()}`;
        if (fileSize) {
            statsText += ` | Size: ${this.formatFileSize(fileSize)}`;
        }
        this.elements.exportStats.innerHTML = `<p>${statsText}</p>`;

        // Enable export buttons
        this.elements.exportSVG.disabled = false;
        this.elements.exportPNG.disabled = false;
    }

    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    /**
     * Safely get element by ID with validation
     * @param {string} id - Element ID
     * @param {*} defaultValue - Default value if element not found
     * @returns {HTMLElement|*} Element or default value
     */
    getElement(id, defaultValue = null) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element '${id}' not found, using default value`);
            return defaultValue;
        }
        return element;
    }

    /**
     * Get number value with validation and clamping
     * @param {string} id - Element ID
     * @param {number} defaultValue - Default value
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Validated number
     */
    getNumberValue(id, defaultValue, min = -Infinity, max = Infinity) {
        const element = this.getElement(id);
        if (!element) return defaultValue;

        const value = parseFloat(element.value);
        if (isNaN(value)) {
            console.warn(`Invalid number for '${id}', using default: ${defaultValue}`);
            return defaultValue;
        }

        return Math.max(min, Math.min(max, value));
    }

    /**
     * Get string value with validation
     * @param {string} id - Element ID
     * @param {string} defaultValue - Default value
     * @returns {string} String value
     */
    getStringValue(id, defaultValue) {
        const element = this.getElement(id);
        return element ? element.value : defaultValue;
    }

    /**
     * Get boolean value (checkbox state)
     * @param {string} id - Element ID
     * @param {boolean} defaultValue - Default value
     * @returns {boolean} Boolean value
     */
    getBooleanValue(id, defaultValue = false) {
        const element = this.getElement(id);
        return element ? element.checked : defaultValue;
    }

    /**
     * Get current parameters from UI with validation
     * @returns {Object} Validated parameters object
     */
    getParameters() {
        const modeElement = document.querySelector('input[name="mode"]:checked');
        const mode = modeElement ? modeElement.value : 'shapes';

        const params = {
            mode: mode,
            gridSize: this.getNumberValue('gridSize', 10, 1, 1000),
            anchor: this.selectedAnchor || 'center',
            samplingMethod: this.getStringValue('samplingMethod', 'grid'),
            colorMode: this.getStringValue('colorMode', 'original'),
            duotoneDark: this.getStringValue('duotoneDark', '#000000'),
            duotoneLight: this.getStringValue('duotoneLight', '#ffffff'),
            backgroundColor: this.getStringValue('backgroundColor', '#000000'),
            dither: this.getBooleanValue('dither', false),
            posterize: this.getBooleanValue('posterize', false),
            posterizeLevels: this.getNumberValue('posterizeLevels', 8, 2, 256)
        };

        if (mode === 'shapes') {
            Object.assign(params, {
                shape: this.getStringValue('shape', 'square'),
                scaleEnabled: this.getBooleanValue('scaleEnabled', false),
                scaleMetric: this.getStringValue('scaleMetric', 'brightness'),
                scaleMin: this.getNumberValue('scaleMin', 50, 0, 200),
                scaleMax: this.getNumberValue('scaleMax', 150, 0, 200),
                rotation: this.getNumberValue('rotation', 0, -180, 180)
            });

            // Validate scale range
            if (params.scaleMin > params.scaleMax) {
                console.warn('Scale min > max, swapping values');
                [params.scaleMin, params.scaleMax] = [params.scaleMax, params.scaleMin];
            }
        } else if (mode === 'ascii') {
            Object.assign(params, {
                fontFamily: this.getStringValue('fontFamily', 'monospace'),
                mergePixels: this.getBooleanValue('mergePixels', false),
                mergeMin: this.getNumberValue('mergeMin', 2, 1, 100),
                mergeMax: this.getNumberValue('mergeMax', 10, 1, 100),
                imageSize: this.getNumberValue('imageSize', 100, 10, 200)
            });

            // Validate merge range
            if (params.mergeMin > params.mergeMax) {
                console.warn('Merge min > max, swapping values');
                [params.mergeMin, params.mergeMax] = [params.mergeMax, params.mergeMin];
            }
        } else if (mode === 'pixelatte') {
            // Get seed value (allow empty for auto-seed)
            const seedInput = document.getElementById('pixelatteSeed');
            const seedValue = seedInput && seedInput.value ? parseInt(seedInput.value, 10) : Date.now();

            Object.assign(params, {
                pixelatteLayers: this.getNumberValue('pixelatteLayers', 10, 1, 12),
                pixelatteExponent: this.getNumberValue('pixelatteExponent', 5.0, 0.5, 10.0),
                pixelatteStrength: this.getNumberValue('pixelatteStrength', 50, 0, 200),
                pixelatteSeed: seedValue
            });
        }

        return params;
    }

    /**
     * Validate if dithering is available based on sampling method
     * Dithering only works properly with grid sampling
     * @param {string} samplingMethod - Current sampling method
     */
    validateDitheringAvailability(samplingMethod) {
        const ditherCheckbox = document.getElementById('dither');
        const ditherHint = document.getElementById('ditherHint');

        if (samplingMethod !== 'grid') {
            // Disable dithering for non-grid sampling methods
            if (ditherCheckbox.checked) {
                ditherCheckbox.checked = false;
                this.triggerParameterChange();
            }
            ditherCheckbox.disabled = true;
            if (ditherHint) {
                ditherHint.style.display = 'block';
            }
        } else {
            // Enable dithering for grid sampling
            ditherCheckbox.disabled = false;
            if (ditherHint) {
                ditherHint.style.display = 'none';
            }
        }
    }
}
