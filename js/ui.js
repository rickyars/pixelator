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
        this.addCheckboxHandler('roundedCorners');
        this.addCheckboxHandler('scaleEnabled');
        this.addSliderHandler('scaleMin', 'scaleMinValue');
        this.addSliderHandler('scaleMax', 'scaleMaxValue');

        // Scale toggle
        document.getElementById('scaleEnabled').addEventListener('change', (e) => {
            const scaleControls = document.getElementById('scaleControls');
            scaleControls.style.display = e.target.checked ? 'block' : 'none';
            this.triggerParameterChange();
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
                console.error('Error uploading image:', error);
                alert('Failed to load image. Please try another file.');
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
     * Get current parameters from UI
     */
    getParameters() {
        const mode = document.querySelector('input[name="mode"]:checked').value;

        const params = {
            mode: mode,
            gridSize: parseInt(document.getElementById('gridSize').value),
            anchor: this.selectedAnchor || 'center',
            samplingMethod: document.getElementById('samplingMethod').value,
            colorMode: document.getElementById('colorMode').value,
            duotoneDark: document.getElementById('duotoneDark').value,
            duotoneLight: document.getElementById('duotoneLight').value,
            backgroundColor: document.getElementById('backgroundColor').value,
            dither: document.getElementById('dither').checked,
            posterize: document.getElementById('posterize').checked,
            posterizeLevels: parseInt(document.getElementById('posterizeLevels').value)
        };

        if (mode === 'shapes') {
            Object.assign(params, {
                roundedCorners: document.getElementById('roundedCorners').checked,
                scaleEnabled: document.getElementById('scaleEnabled').checked,
                scaleMin: parseFloat(document.getElementById('scaleMin').value),
                scaleMax: parseFloat(document.getElementById('scaleMax').value),
                rotation: parseFloat(document.getElementById('rotation').value)
            });
        } else if (mode === 'ascii') {
            Object.assign(params, {
                fontFamily: document.getElementById('fontFamily').value,
                mergePixels: document.getElementById('mergePixels').checked,
                mergeMin: parseInt(document.getElementById('mergeMin').value),
                mergeMax: parseInt(document.getElementById('mergeMax').value),
                imageSize: parseFloat(document.getElementById('imageSize').value)
            });
        }

        return params;
    }
}
