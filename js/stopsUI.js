/**
 * StopsUIManager - Handles UI rendering and interactions for brightness stops
 */
class StopsUIManager {
    /**
     * @param {StopsManager} stopsManager - The stops data manager
     * @param {Function} onUpdate - Callback when stops are updated
     */
    constructor(stopsManager, onUpdate) {
        this.stopsManager = stopsManager;
        this.onUpdate = onUpdate;

        this.elements = {
            stopsList: document.getElementById('stopsList'),
            addStopBtn: document.getElementById('addStop'),
            evenSpacingBtn: document.getElementById('evenSpacingBtn'),
            randomMappingBtn: document.getElementById('randomMappingBtn'),
            randomPositionBtn: document.getElementById('randomPositionBtn'),
            presetBasic: document.getElementById('presetBasic'),
            presetBlocks: document.getElementById('presetBlocks'),
            presetShades: document.getElementById('presetShades'),
            presetBinary: document.getElementById('presetBinary'),
            charCodeInput: document.getElementById('charCodeInput'),
            insertCharCode: document.getElementById('insertCharCode'),
            customFontUpload: document.getElementById('customFontUpload'),
            clearCustomFont: document.getElementById('clearCustomFont'),
            fontFamily: document.getElementById('fontFamily'),
            toggleCharMap: document.getElementById('toggleCharMap'),
            charMapToggleText: document.getElementById('charMapToggleText'),
            charMapPanel: document.getElementById('charMapPanel'),
            charRange: document.getElementById('charRange'),
            charMapGrid: document.getElementById('charMapGrid')
        };

        this.customFontLoaded = false;
        this.charMapVisible = false;
    }

    /**
     * Initialize stops UI and event handlers
     */
    init() {
        // Set up stops manager callback
        this.stopsManager.onChange = () => {
            this.render();
            if (this.onUpdate) {
                this.onUpdate();
            }
        };

        // Add stop button
        this.elements.addStopBtn.addEventListener('click', () => {
            const percentage = 50; // Default percentage
            this.stopsManager.addStop(percentage, 'text', '●');
        });

        // Stop operation buttons
        this.elements.evenSpacingBtn.addEventListener('click', () => {
            this.stopsManager.applyEvenSpacing();
        });

        this.elements.randomMappingBtn.addEventListener('click', () => {
            this.stopsManager.shuffleStopValues();
        });

        this.elements.randomPositionBtn.addEventListener('click', () => {
            this.stopsManager.randomizeStopPositions();
        });

        // Character preset buttons
        this.elements.presetBasic.addEventListener('click', () => {
            this.applyCharacterPreset('basic');
        });

        this.elements.presetBlocks.addEventListener('click', () => {
            this.applyCharacterPreset('blocks');
        });

        this.elements.presetShades.addEventListener('click', () => {
            this.applyCharacterPreset('shades');
        });

        this.elements.presetBinary.addEventListener('click', () => {
            this.applyCharacterPreset('binary');
        });

        // Character code insertion
        this.elements.insertCharCode.addEventListener('click', () => {
            this.insertCharacterByCode();
        });

        this.elements.charCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.insertCharacterByCode();
            }
        });

        // Custom font upload
        this.elements.customFontUpload.addEventListener('change', (e) => {
            this.handleFontUpload(e.target.files[0]);
        });

        this.elements.clearCustomFont.addEventListener('click', () => {
            this.clearCustomFont();
        });

        // Character map toggle
        this.elements.toggleCharMap.addEventListener('click', () => {
            this.toggleCharacterMap();
        });

        // Character range selector
        this.elements.charRange.addEventListener('change', () => {
            this.renderCharacterMap();
        });

        // Font change updates character map
        this.elements.fontFamily.addEventListener('change', () => {
            if (this.charMapVisible) {
                this.renderCharacterMap();
            }
        });

        // Initial render
        this.render();
    }

    /**
     * Render the stops list
     */
    render() {
        this.elements.stopsList.innerHTML = '';

        const stops = this.stopsManager.getStops();

        stops.forEach(stop => {
            const stopItem = this.createStopItem(stop);
            this.elements.stopsList.appendChild(stopItem);
        });
    }

    /**
     * Create a stop item element
     * @param {Object} stop - Stop data object
     * @returns {HTMLElement} Stop item element
     */
    createStopItem(stop) {
        const stopItem = document.createElement('div');
        stopItem.className = 'stop-item';

        // Percentage input
        const percentageDiv = this.createPercentageInput(stop);
        stopItem.appendChild(percentageDiv);

        // Character/Image display
        if (stop.type === 'image' && stop.image) {
            this.appendImageControls(stopItem, stop);
        } else {
            this.appendTextControls(stopItem, stop);
        }

        // Remove button (always last)
        const removeBtn = this.createRemoveButton(stop);
        stopItem.appendChild(removeBtn);

        return stopItem;
    }

    /**
     * Create percentage input control
     * @param {Object} stop - Stop data object
     * @returns {HTMLElement} Percentage control element
     */
    createPercentageInput(stop) {
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

        return percentageDiv;
    }

    /**
     * Append image preview and controls to stop item
     * @param {HTMLElement} stopItem - Container element
     * @param {Object} stop - Stop data object
     */
    appendImageControls(stopItem, stop) {
        // Image preview with option to replace
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

        stopItem.appendChild(imagePreview);
        stopItem.appendChild(clearImgBtn);
    }

    /**
     * Append text input and color controls to stop item
     * @param {HTMLElement} stopItem - Container element
     * @param {Object} stop - Stop data object
     */
    appendTextControls(stopItem, stop) {
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

        const fgPicker = this.createColorPicker(stop.color || '#ffffff', 'Text color', (value) => {
            charInput.style.color = value;
        }, (value) => {
            this.stopsManager.updateStop(stop.id, { color: value });
        });

        const bgPicker = this.createColorPicker(stop.bgColor || '#000000', 'Background color', (value) => {
            charInput.style.backgroundColor = value;
        }, (value) => {
            this.stopsManager.updateStop(stop.id, { bgColor: value });
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

        stopItem.appendChild(charInput);
        stopItem.appendChild(colorPickers);
        stopItem.appendChild(imgBtn);
    }

    /**
     * Create a color picker input
     * @param {string} initialValue - Initial color value
     * @param {string} title - Tooltip title
     * @param {Function} onInput - Input event handler (preview)
     * @param {Function} onChange - Change event handler (commit)
     * @returns {HTMLInputElement} Color picker element
     */
    createColorPicker(initialValue, title, onInput, onChange) {
        const picker = document.createElement('input');
        picker.type = 'color';
        picker.className = 'color-picker color-picker-small';
        picker.value = initialValue;
        picker.title = title;

        // Preview on input (no re-render)
        if (onInput) {
            picker.addEventListener('input', (e) => onInput(e.target.value));
        }

        // Commit on change (when picker closes)
        if (onChange) {
            picker.addEventListener('change', (e) => onChange(e.target.value));
        }

        return picker;
    }

    /**
     * Create remove button for stop
     * @param {Object} stop - Stop data object
     * @returns {HTMLButtonElement} Remove button element
     */
    createRemoveButton(stop) {
        const removeBtn = document.createElement('button');
        removeBtn.className = 'stop-action-btn stop-remove-btn';
        removeBtn.textContent = '×';
        removeBtn.title = 'Remove stop';
        removeBtn.addEventListener('click', () => {
            this.stopsManager.removeStop(stop.id);
        });
        return removeBtn;
    }

    /**
     * Open image picker for a stop
     * @param {number} stopId - ID of the stop to update
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

    /**
     * Apply a character preset to all stops
     * @param {string} presetName - Name of the preset ('basic', 'blocks', 'shades', 'binary')
     */
    applyCharacterPreset(presetName) {
        const presets = {
            basic: [' ', '.', ':', '-', '=', '+', '*', '#', '%', '@'],
            blocks: [' ', '░', '▒', '▓', '█'],
            shades: [' ', '·', '•', '●', '◉', '⬤'],
            binary: ['╚', '╔', '╩', '╦', '╠', '═', '╬'] // Box drawing: codes 200-206
        };

        const characters = presets[presetName];
        if (!characters) {
            console.warn(`Unknown preset: ${presetName}`);
            return;
        }

        // Clear existing stops
        this.stopsManager.clearStops();

        // Add stops with even spacing
        const step = 100 / (characters.length - 1);
        characters.forEach((char, index) => {
            const percentage = index * step;
            this.stopsManager.addStop(percentage, 'text', char);
        });
    }

    /**
     * Insert a character by its character code
     */
    insertCharacterByCode() {
        const code = parseInt(this.elements.charCodeInput.value);

        if (isNaN(code) || code < 0 || code > 65535) {
            alert('Please enter a valid character code (0-65535)');
            return;
        }

        const character = String.fromCharCode(code);

        // Add a new stop with this character
        this.stopsManager.addStop(50, 'text', character);

        // Clear the input
        this.elements.charCodeInput.value = '';
    }

    /**
     * Handle custom font upload
     * @param {File} file - Font file to upload
     */
    async handleFontUpload(file) {
        if (!file) return;

        try {
            // Validate file type
            const validExtensions = ['.ttf', '.otf', '.woff', '.woff2'];
            const fileName = file.name.toLowerCase();
            const isValid = validExtensions.some(ext => fileName.endsWith(ext));

            if (!isValid) {
                alert('Please upload a valid font file (TTF, OTF, WOFF, WOFF2)');
                return;
            }

            // Read file as data URL
            const reader = new FileReader();
            reader.onload = (e) => {
                const fontData = e.target.result;

                // Determine font format
                let format = 'truetype';
                if (fileName.endsWith('.woff')) format = 'woff';
                else if (fileName.endsWith('.woff2')) format = 'woff2';
                else if (fileName.endsWith('.otf')) format = 'opentype';

                // Create @font-face CSS
                const fontName = 'CustomUploadedFont';
                const style = document.createElement('style');
                style.id = 'custom-font-style';
                style.textContent = `
                    @font-face {
                        font-family: '${fontName}';
                        src: url('${fontData}') format('${format}');
                    }
                `;

                // Remove existing custom font style if any
                const existing = document.getElementById('custom-font-style');
                if (existing) {
                    existing.remove();
                }

                // Add new font style
                document.head.appendChild(style);

                // Add to font dropdown if not already there
                let option = Array.from(this.elements.fontFamily.options).find(
                    opt => opt.value === `'${fontName}', monospace`
                );

                if (!option) {
                    option = document.createElement('option');
                    option.value = `'${fontName}', monospace`;
                    option.textContent = `${file.name} (Custom)`;
                    this.elements.fontFamily.insertBefore(option, this.elements.fontFamily.firstChild);
                }

                // Select the custom font
                this.elements.fontFamily.value = `'${fontName}', monospace`;

                // Show clear button
                this.elements.clearCustomFont.style.display = 'block';

                this.customFontLoaded = true;

                // Trigger parameter change to re-render
                if (this.onUpdate) {
                    this.onUpdate();
                }
            };

            reader.onerror = () => {
                alert('Error reading font file');
            };

            reader.readAsDataURL(file);

        } catch (error) {
            console.error('Font upload error:', error);
            alert('Error uploading font file');
        }
    }

    /**
     * Clear the custom font
     */
    clearCustomFont() {
        // Remove custom font style
        const style = document.getElementById('custom-font-style');
        if (style) {
            style.remove();
        }

        // Remove custom font option from dropdown
        const option = Array.from(this.elements.fontFamily.options).find(
            opt => opt.textContent.includes('(Custom)')
        );
        if (option) {
            option.remove();
        }

        // Reset to default font
        this.elements.fontFamily.value = 'monospace';

        // Hide clear button
        this.elements.clearCustomFont.style.display = 'none';

        // Clear file input
        this.elements.customFontUpload.value = '';

        this.customFontLoaded = false;

        // Trigger parameter change to re-render
        if (this.onUpdate) {
            this.onUpdate();
        }
    }

    /**
     * Toggle character map visibility
     */
    toggleCharacterMap() {
        this.charMapVisible = !this.charMapVisible;

        if (this.charMapVisible) {
            this.elements.charMapPanel.style.display = 'block';
            this.elements.charMapToggleText.textContent = '▾ Hide Character Map';
            this.renderCharacterMap();
        } else {
            this.elements.charMapPanel.style.display = 'none';
            this.elements.charMapToggleText.textContent = '▸ Show Character Map';
        }
    }

    /**
     * Render the character map grid
     */
    renderCharacterMap() {
        const range = this.elements.charRange.value;
        const ranges = {
            ascii: { start: 32, end: 126 },
            extended: { start: 161, end: 255 }, // Skip 128-160 (control characters)
            blocks: { start: 9600, end: 9631 },
            box: { start: 9472, end: 9599 },
            symbols: { start: 8704, end: 8767 }, // Reduced from 8959 to 8767 (64 chars instead of 256)
            arrows: { start: 8592, end: 8703 }
        };

        const selectedRange = ranges[range] || ranges.ascii;
        const { start, end } = selectedRange;

        // Get current font
        const currentFont = this.elements.fontFamily.value;

        // Clear grid
        this.elements.charMapGrid.innerHTML = '';

        // Update CSS custom property for font
        document.documentElement.style.setProperty('--ascii-font', currentFont);

        // Check if range is too large and show warning
        const charCount = end - start + 1;
        if (charCount > 200) {
            const warning = document.createElement('div');
            warning.style.cssText = 'color: var(--text-secondary); font-size: 11px; padding: 8px; text-align: center;';
            warning.textContent = `Loading ${charCount} characters...`;
            this.elements.charMapGrid.appendChild(warning);

            // Use setTimeout to allow UI to update
            setTimeout(() => {
                this.elements.charMapGrid.innerHTML = '';
                this.populateCharacterGrid(start, end);
            }, 50);
        } else {
            this.populateCharacterGrid(start, end);
        }
    }

    /**
     * Populate the character grid with characters
     * @param {number} start - Start character code
     * @param {number} end - End character code
     */
    populateCharacterGrid(start, end) {
        // Create document fragment for better performance
        const fragment = document.createDocumentFragment();

        for (let code = start; code <= end; code++) {
            const char = String.fromCharCode(code);

            const cell = document.createElement('div');
            cell.className = 'char-map-cell';
            cell.title = `Code: ${code}, Char: ${char}`;

            const charDiv = document.createElement('div');
            charDiv.className = 'char-map-char';
            charDiv.textContent = char;

            const codeDiv = document.createElement('div');
            codeDiv.className = 'char-map-code';
            codeDiv.textContent = code;

            cell.appendChild(charDiv);
            cell.appendChild(codeDiv);

            // Click to add character
            cell.addEventListener('click', () => {
                this.stopsManager.addStop(50, 'text', char);
            });

            fragment.appendChild(cell);
        }

        this.elements.charMapGrid.appendChild(fragment);
    }
}
