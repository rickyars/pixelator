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
            randomPositionBtn: document.getElementById('randomPositionBtn')
        };
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
}
