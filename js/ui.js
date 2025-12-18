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
            exportSVG: document.getElementById('exportSVG'),
            exportPNG: document.getElementById('exportPNG'),
            zoomControls: document.getElementById('zoomControls'),
            zoomInBtn: document.getElementById('zoomInBtn'),
            zoomOutBtn: document.getElementById('zoomOutBtn'),
            resetViewBtn: document.getElementById('resetViewBtn')
        };

        this.onImageUpload = null;
        this.onImageClear = null;
        this.onParameterChange = null;

        this.initUploadHandlers();
        this.initControlHandlers();
        this.initExportHandlers();
        this.initZoomHandlers();
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
        this.addSliderWithInputHandler('gridSize', 'gridSizeInput');
        this.addSliderWithInputHandler('outputScale', 'outputScaleInput');
        this.addCheckboxHandler('jitterEnabled');
        this.addSelectHandler('colorMode');
        this.addColorHandler('duotoneDark');
        this.addColorHandler('duotoneLight');
        this.addColorHandler('backgroundColor');

        // Anchor grid handler
        this.initAnchorGrid();

        // Color mode change handler
        document.getElementById('colorMode').addEventListener('change', (e) => {
            const duotoneControls = document.getElementById('duotoneControls');
            duotoneControls.style.display = e.target.value === 'duotone' ? 'block' : 'none';
            this.triggerParameterChange();
        });

        // Shape controls
        this.addSelectHandler('shape');
        this.addCheckboxHandler('scaleEnabled');
        this.addSliderWithInputHandler('scaleMin', 'scaleMinInput');
        this.addSliderWithInputHandler('scaleMax', 'scaleMaxInput');

        // Scale toggle
        document.getElementById('scaleEnabled').addEventListener('change', (e) => {
            const scaleControls = document.getElementById('scaleControls');
            scaleControls.style.display = e.target.checked ? 'flex' : 'none';
            this.triggerParameterChange();
        });

        // Shape rotation
        this.addSliderHandler('rotation', 'rotationValue');

        // Random erasure
        this.addCheckboxHandler('randomErase');
        this.addSliderWithInputHandler('eraseAmount', 'eraseAmountInput');

        // Random erasure toggle
        document.getElementById('randomErase').addEventListener('change', (e) => {
            const randomEraseControls = document.getElementById('randomEraseControls');
            randomEraseControls.style.display = e.target.checked ? 'flex' : 'none';
            this.triggerParameterChange();
        });

        // ASCII/Image Map controls
        this.addSelectHandler('fontFamily');
        this.addCheckboxHandler('mergePixels');
        this.addSliderWithInputHandler('mergeMin', 'mergeMinInput');
        this.addSliderWithInputHandler('mergeMax', 'mergeMaxInput');

        // Merge pixels toggle
        document.getElementById('mergePixels').addEventListener('change', (e) => {
            const mergeControls = document.getElementById('mergeControls');
            mergeControls.style.display = e.target.checked ? 'flex' : 'none';
            this.triggerParameterChange();
        });
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
     * Initialize zoom control handlers
     */
    initZoomHandlers() {
        // Zoom in button
        this.elements.zoomInBtn.addEventListener('click', () => {
            this.handleZoomIn();
        });

        // Zoom out button
        this.elements.zoomOutBtn.addEventListener('click', () => {
            this.handleZoomOut();
        });

        // Reset view button
        this.elements.resetViewBtn.addEventListener('click', () => {
            this.handleResetView();
        });
    }

    /**
     * Handle zoom in
     */
    handleZoomIn() {
        if (window.app && window.app.renderer && window.app.renderer.panZoomInstance) {
            window.app.renderer.panZoomInstance.zoomIn();
        }
    }

    /**
     * Handle zoom out
     */
    handleZoomOut() {
        if (window.app && window.app.renderer && window.app.renderer.panZoomInstance) {
            window.app.renderer.panZoomInstance.zoomOut();
        }
    }

    /**
     * Handle reset view
     */
    handleResetView() {
        if (window.app && window.app.renderer && window.app.renderer.panZoomInstance) {
            const panZoom = window.app.renderer.panZoomInstance;
            panZoom.reset();
            panZoom.fit();
            panZoom.center();
        }
    }

    /**
     * Show zoom controls
     */
    showZoomControls() {
        if (this.elements.zoomControls) {
            this.elements.zoomControls.style.display = 'flex';
        }
    }

    /**
     * Hide zoom controls
     */
    hideZoomControls() {
        if (this.elements.zoomControls) {
            this.elements.zoomControls.style.display = 'none';
        }
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
     * Add slider with number input event handler (syncs slider and input)
     */
    addSliderWithInputHandler(sliderId, inputId) {
        const slider = document.getElementById(sliderId);
        const input = document.getElementById(inputId);

        slider.addEventListener('input', (e) => {
            input.value = e.target.value;
            this.triggerParameterChange();
        });

        input.addEventListener('input', (e) => {
            slider.value = e.target.value;
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
        const colorModeControl = document.getElementById('colorModeControl');

        if (mode === 'shapes') {
            shapeControls.style.display = 'block';
            asciiControls.style.display = 'none';
            colorModeControl.style.display = 'block';
        } else {
            shapeControls.style.display = 'none';
            asciiControls.style.display = 'block';
            colorModeControl.style.display = 'none';
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
        this.hideZoomControls();
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
     * Enable export buttons
     */
    enableExportButtons() {
        this.elements.exportSVG.disabled = false;
        this.elements.exportPNG.disabled = false;
        this.showZoomControls();
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
            outputScale: this.getNumberValue('outputScale', 100, 10, 500),
            anchor: this.selectedAnchor || 'center',
            jitterEnabled: this.getBooleanValue('jitterEnabled', false),
            colorMode: this.getStringValue('colorMode', 'original'),
            duotoneDark: this.getStringValue('duotoneDark', '#000000'),
            duotoneLight: this.getStringValue('duotoneLight', '#ffffff'),
            backgroundColor: this.getStringValue('backgroundColor', '#000000')
        };

        if (mode === 'shapes') {
            Object.assign(params, {
                shape: this.getStringValue('shape', 'square'),
                scaleEnabled: this.getBooleanValue('scaleEnabled', false),
                scaleMin: this.getNumberValue('scaleMin', 50, 0, 500),
                scaleMax: this.getNumberValue('scaleMax', 150, 0, 500),
                rotation: this.getNumberValue('rotation', 0, -180, 180),
                randomErase: this.getBooleanValue('randomErase', false),
                eraseAmount: this.getNumberValue('eraseAmount', 30, 0, 100)
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
                mergeMax: this.getNumberValue('mergeMax', 10, 1, 100)
            });

            // Validate merge range
            if (params.mergeMin > params.mergeMax) {
                console.warn('Merge min > max, swapping values');
                [params.mergeMin, params.mergeMax] = [params.mergeMax, params.mergeMin];
            }
        }

        return params;
    }

}
