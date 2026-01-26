/**
 * Simple Stops Editor for ASCII and Typewriter modes
 */
class StopsEditor {
    constructor(onUpdate) {
        this.onUpdate = onUpdate;
        this.currentMode = null; // 'ascii' or 'typewriter'

        this.modal = document.getElementById('stopsModal');
        this.title = document.getElementById('stopsEditorTitle');
        this.list = document.getElementById('stopsList');
        this.addBtn = document.getElementById('addStopBtn');
        this.closeBtn = document.getElementById('closeStopsBtn');

        this.init();
    }

    init() {
        // Add stop button
        this.addBtn.addEventListener('click', () => {
            if (this.currentMode === 'ascii') {
                AsciiMode.addStop(50, '.', '#000000', '#ffffff');
            } else if (this.currentMode === 'typewriter') {
                TypewriterMode.stops.push({ percentage: 50, value: '.', color: '#000000' });
                TypewriterMode.stops.sort((a, b) => a.percentage - b.percentage);
            }
            this.render();
            if (this.onUpdate) this.onUpdate();
        });

        // Close button
        this.closeBtn.addEventListener('click', () => {
            this.close();
        });

        // Close on backdrop click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });
    }

    open(mode) {
        this.currentMode = mode;
        this.title.textContent = mode === 'ascii' ? 'Edit ASCII Stops' : 'Edit Typewriter Stops';
        this.modal.classList.add('active');
        this.render();
    }

    close() {
        this.modal.classList.remove('active');
        if (this.onUpdate) this.onUpdate();
    }

    render() {
        this.list.innerHTML = '';

        const stops = this.currentMode === 'ascii'
            ? AsciiMode.stops
            : TypewriterMode.stops;

        if (!stops || !Array.isArray(stops)) {
            return;
        }

        stops.forEach((stop, index) => {
            const item = this.createStopItem(stop, index);
            this.list.appendChild(item);
        });
    }

    /**
     * Create a colorized preview canvas for an image stop
     */
    createColorizedPreview(imageData, fgColor, bgColor) {
        const size = 40;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        canvas.style.cssText = 'border:2px solid #0af; border-radius:4px; cursor:pointer;';
        canvas.title = 'Image preview with current colors';

        const ctx = canvas.getContext('2d');
        const fg = AsciiMode.parseColor(fgColor);
        const bg = AsciiMode.parseColor(bgColor);

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, size, size);

        const srcW = imageData.width;
        const srcH = imageData.height;
        const src = imageData.data;

        const outData = ctx.createImageData(size, size);
        const dst = outData.data;

        for (let dy = 0; dy < size; dy++) {
            for (let dx = 0; dx < size; dx++) {
                const sx = Math.floor(dx * srcW / size);
                const sy = Math.floor(dy * srcH / size);
                const srcIdx = (sy * srcW + sx) * 4;

                const r = src[srcIdx];
                const g = src[srcIdx + 1];
                const b = src[srcIdx + 2];
                const a = src[srcIdx + 3];

                const dstIdx = (dy * size + dx) * 4;

                if (a < 128) {
                    dst[dstIdx] = bg.r;
                    dst[dstIdx + 1] = bg.g;
                    dst[dstIdx + 2] = bg.b;
                    dst[dstIdx + 3] = 255;
                } else {
                    const luma = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
                    dst[dstIdx] = Math.round(fg.r * luma + bg.r * (1 - luma));
                    dst[dstIdx + 1] = Math.round(fg.g * luma + bg.g * (1 - luma));
                    dst[dstIdx + 2] = Math.round(fg.b * luma + bg.b * (1 - luma));
                    dst[dstIdx + 3] = 255;
                }
            }
        }

        ctx.putImageData(outData, 0, 0);
        return canvas;
    }

    createStopItem(stop, index) {
        const item = document.createElement('div');
        item.className = 'stop-item';

        // Percentage input
        const percentDiv = document.createElement('div');
        percentDiv.className = 'stop-percentage';

        const percentInput = document.createElement('input');
        percentInput.type = 'number';
        percentInput.min = 0;
        percentInput.max = 100;
        percentInput.value = stop.percentage;
        percentInput.addEventListener('change', (e) => {
            stop.percentage = parseInt(e.target.value);
            if (this.currentMode === 'ascii') {
                AsciiMode.stops.sort((a, b) => a.percentage - b.percentage);
            } else {
                TypewriterMode.stops.sort((a, b) => a.percentage - b.percentage);
            }
            this.render();
            if (this.onUpdate) this.onUpdate();
        });

        const percentLabel = document.createElement('span');
        percentLabel.textContent = '%';

        percentDiv.appendChild(percentInput);
        percentDiv.appendChild(percentLabel);

        // Character input or image preview
        const charInput = document.createElement('input');
        charInput.type = 'text';
        charInput.className = 'stop-char-input';
        charInput.maxLength = 1;
        charInput.value = stop.value;
        charInput.style.color = stop.color || '#ffffff';
        if (stop.bgColor) {
            charInput.style.backgroundColor = stop.bgColor;
        }
        charInput.addEventListener('input', (e) => {
            stop.value = e.target.value;
            if (this.currentMode === 'ascii') {
                AsciiMode.syncFromStops();
            } else {
                TypewriterMode.syncFromStops();
            }
            if (this.onUpdate) this.onUpdate();
        });

        // Image preview (for ASCII mode with uploaded images)
        let imagePreview = null;
        if (this.currentMode === 'ascii' && stop.imageData) {
            imagePreview = this.createColorizedPreview(stop.imageData, stop.color || '#000000', stop.bgColor || '#ffffff');
        }

        // Color pickers
        const colorPair = document.createElement('div');
        colorPair.className = 'color-pair';

        const fgPicker = document.createElement('input');
        fgPicker.type = 'color';
        fgPicker.className = 'color-picker';
        fgPicker.value = stop.color || '#000000';
        fgPicker.title = 'Font color';
        fgPicker.addEventListener('change', (e) => {
            stop.color = e.target.value;
            charInput.style.color = e.target.value;
            // Re-render to update image preview with new color
            if (stop.imageData) this.render();
            if (this.onUpdate) this.onUpdate();
        });

        colorPair.appendChild(fgPicker);

        // Background color only for ASCII mode
        if (this.currentMode === 'ascii') {
            const bgPicker = document.createElement('input');
            bgPicker.type = 'color';
            bgPicker.className = 'color-picker';
            bgPicker.value = stop.bgColor || '#ffffff';
            bgPicker.title = 'Background color';
            bgPicker.addEventListener('change', (e) => {
                stop.bgColor = e.target.value;
                charInput.style.backgroundColor = e.target.value;
                // Re-render to update image preview with new color
                if (stop.imageData) this.render();
                if (this.onUpdate) this.onUpdate();
            });
            colorPair.appendChild(bgPicker);
        }

        // Image upload button (ASCII mode only)
        let imageBtn = null;
        let clearBtn = null;
        if (this.currentMode === 'ascii') {
            imageBtn = document.createElement('button');
            imageBtn.textContent = 'Upload';
            imageBtn.title = 'Upload image';
            imageBtn.style.cssText = 'padding:6px 10px; background:#333; border:1px solid #444; border-radius:4px; color:#fff; cursor:pointer; font-size:12px;';
            imageBtn.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.addEventListener('change', async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        await AsciiMode.loadStopImage(stop.id, file);
                        this.render();
                        if (this.onUpdate) this.onUpdate();
                    }
                });
                input.click();
            });

            if (stop.image) {
                clearBtn = document.createElement('button');
                clearBtn.textContent = 'Clear';
                clearBtn.title = 'Remove image';
                clearBtn.style.cssText = 'padding:6px 10px; background:#633; border:1px solid #844; border-radius:4px; color:#fff; cursor:pointer; font-size:12px; margin-left:4px;';
                clearBtn.addEventListener('click', () => {
                    AsciiMode.removeStopImage(stop.id);
                    this.render();
                    if (this.onUpdate) this.onUpdate();
                });
            }
        }

        // Remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'stop-remove-btn';
        removeBtn.textContent = '×';
        removeBtn.title = 'Remove stop';
        removeBtn.addEventListener('click', () => {
            if (this.currentMode === 'ascii') {
                AsciiMode.removeStop(stop.id);
            } else {
                TypewriterMode.stops.splice(index, 1);
            }
            this.render();
            if (this.onUpdate) this.onUpdate();
        });

        item.appendChild(percentDiv);
        if (imagePreview) {
            item.appendChild(imagePreview);
            // Don't show charInput when we have an image
        } else {
            item.appendChild(charInput);
        }
        item.appendChild(colorPair);
        if (imageBtn) {
            item.appendChild(imageBtn);
        }
        if (clearBtn) {
            item.appendChild(clearBtn);
        }
        item.appendChild(removeBtn);

        return item;
    }
}
