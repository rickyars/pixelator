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
                AsciiMode.addStop(50, '.', '#ffffff', null);
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

        stops.forEach((stop, index) => {
            const item = this.createStopItem(stop, index);
            this.list.appendChild(item);
        });
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

        // Character input
        const charInput = document.createElement('input');
        charInput.type = 'text';
        charInput.className = 'stop-char-input';
        charInput.maxLength = 2;
        charInput.value = stop.value;
        charInput.style.color = stop.color || '#ffffff';
        if (stop.bgColor) {
            charInput.style.backgroundColor = stop.bgColor;
        }
        charInput.addEventListener('input', (e) => {
            stop.value = e.target.value;
            if (this.onUpdate) this.onUpdate();
        });

        // Color pickers
        const colorPair = document.createElement('div');
        colorPair.className = 'color-pair';

        const fgPicker = document.createElement('input');
        fgPicker.type = 'color';
        fgPicker.className = 'color-picker';
        fgPicker.value = stop.color || '#ffffff';
        fgPicker.title = 'Font color';
        fgPicker.addEventListener('change', (e) => {
            stop.color = e.target.value;
            charInput.style.color = e.target.value;
            if (this.onUpdate) this.onUpdate();
        });

        colorPair.appendChild(fgPicker);

        // Background color only for ASCII mode
        if (this.currentMode === 'ascii') {
            const bgPicker = document.createElement('input');
            bgPicker.type = 'color';
            bgPicker.className = 'color-picker';
            bgPicker.value = stop.bgColor || '#000000';
            bgPicker.title = 'Background color';
            bgPicker.addEventListener('change', (e) => {
                stop.bgColor = e.target.value;
                charInput.style.backgroundColor = e.target.value;
                if (this.onUpdate) this.onUpdate();
            });
            colorPair.appendChild(bgPicker);
        }

        // Remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'stop-remove-btn';
        removeBtn.textContent = '×';
        removeBtn.title = 'Remove stop';
        removeBtn.addEventListener('click', () => {
            if (this.currentMode === 'ascii') {
                AsciiMode.stops.splice(index, 1);
            } else {
                TypewriterMode.stops.splice(index, 1);
            }
            this.render();
            if (this.onUpdate) this.onUpdate();
        });

        item.appendChild(percentDiv);
        item.appendChild(charInput);
        item.appendChild(colorPair);
        item.appendChild(removeBtn);

        return item;
    }
}
