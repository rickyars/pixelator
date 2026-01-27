/**
 * Pixelator Studio - Main App
 */
class PixelatorStudio {
    constructor() {
        // Canvas
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

        // Elements
        this.imageInput = document.getElementById('imageInput');
        this.svgInput = document.getElementById('svgInput');
        this.fontInput = document.getElementById('fontInput');
        this.loading = document.getElementById('loading');

        // State
        this.image = null;
        this.processing = false;
        this.customFont = null;

        // Pan/Zoom state
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.renderedCanvas = null;

        // Parameters
        this.params = {
            // Mode
            mode: 'shape',

            // Common
            cellSize: 10,
            gap: 1,
            contrast: 0,
            bgColor: '#000000',
            useOriginalColor: true,
            monoColor: '#ffffff',
            outputScale: 1,

            // Shape mode
            algorithm: 'halftone',
            baseScale: 0.9,
            intensity: 1.0,
            shape: 'circle',

            // ASCII mode
            fontFamily: 'monospace',
            asciiAlgorithm: 'shadeShape',  // 'brightness', 'shadeShape', 'edge'
            asciiBlackPoint: 0,   // Values below become black
            asciiWhitePoint: 1,   // Values above become white
            asciiInvert: false,   // Draw bright areas with dense characters
            asciiUseOriginalColor: false,  // Use image colors for characters
            asciiForceSquareCells: false,  // Force square cells instead of font metrics

            // Typewriter mode (Jules Kuehn algorithm)
            layers: '4x1',  // Layer configuration
            rowLength: 0,   // 0 = auto (match input width)
            numLoops: 5,    // Optimization loops
            asymmetry: 0.1, // Error asymmetry (penalize too-light more)
            searchMode: 'simAnneal', // 'simAnneal' or 'greedy'
            initTemp: 0.001, // Initial temperature for simulated annealing

            // Emoji mode
            emojiSet: 'default',

            // Quadtree mode
            quadtreeIterations: 5000,
            quadtreeSizeSensitive: false,
            quadtreeMonoColor: '#000000',
            quadtreeUseOriginalColor: true,

            // Actions
            uploadImage: () => this.imageInput.click(),
            loadSVG: () => this.svgInput.click(),
            loadFont: () => this.fontInput.click(),
            save: () => this.save()
        };

        this.initUI();
        this.initEvents();
        this.initPanZoom();
        this.loadDefaultImage();
    }

    /**
     * Initialize Tweakpane UI
     */
    initUI() {
        const pane = new Tweakpane.Pane({
            container: document.getElementById('controls'),
            title: 'Pixelator Studio'
        });

        // Mode selector
        pane.addInput(this.params, 'mode', {
            label: 'Mode',
            options: {
                'Shape': 'shape',
                'ASCII': 'ascii',
                'Typewriter': 'typewriter',
                'Emoji': 'emoji',
                'Quadtree': 'quadtree'
            }
        }).on('change', () => {
            if (this.params.mode === 'typewriter' || this.params.mode === 'quadtree') {
                this.params.bgColor = '#ffffff';
                this.bgColorControl.refresh();
            }
            this.updateUIVisibility();
            this.render();
        });

        pane.addSeparator();

        // Image actions
        const imgFolder = pane.addFolder({ title: 'Image', expanded: false });
        imgFolder.addButton({ title: 'Upload Image' }).on('click', this.params.uploadImage);
        imgFolder.addButton({ title: 'Save PNG' }).on('click', this.params.save);

        // Common settings
        const commonFolder = pane.addFolder({ title: 'Common', expanded: true });
        this.cellSizeControl = commonFolder.addInput(this.params, 'cellSize', {
            label: 'Cell Size',
            min: 4,
            max: 40,
            step: 1
        }).on('change', () => this.render());

        this.gapControl = commonFolder.addInput(this.params, 'gap', {
            label: 'Gap',
            min: 0,
            max: 20,
            step: 0.25
        }).on('change', () => this.render());

        this.bgColorControl = commonFolder.addInput(this.params, 'bgColor', {
            label: 'Background'
        }).on('change', () => this.render());

        this.outputScaleControl = commonFolder.addInput(this.params, 'outputScale', {
            label: 'Output Scale',
            min: 1,
            max: 4,
            step: 0.5
        }).on('change', () => this.render());

        // Shape mode folder
        this.shapeFolder = pane.addFolder({ title: 'Shape Settings', expanded: true });

        this.shapeFolder.addInput(this.params, 'contrast', {
            label: 'Contrast',
            min: -100,
            max: 100,
            step: 1
        }).on('change', () => this.render());

        this.shapeFolder.addInput(this.params, 'monoColor', {
            label: 'Foreground'
        }).on('change', () => this.render());

        this.shapeFolder.addInput(this.params, 'useOriginalColor', {
            label: 'Original Color'
        }).on('change', () => this.render());

        this.shapeFolder.addSeparator();

        this.shapeFolder.addInput(this.params, 'algorithm', {
            label: 'Algorithm',
            options: Algorithms.getAlgorithmList()
        }).on('change', () => this.render());

        this.shapeFolder.addInput(this.params, 'baseScale', {
            label: 'Scale',
            min: 0.1,
            max: 3.0,
            step: 0.025
        }).on('change', () => this.render());

        this.shapeFolder.addInput(this.params, 'intensity', {
            label: 'Intensity',
            min: 0,
            max: 5.0,
            step: 0.05
        }).on('change', () => this.render());

        this.shapeFolder.addInput(this.params, 'shape', {
            label: 'Shape',
            options: Shapes.getShapeList()
        }).on('change', () => {
            this.svgButton.hidden = this.params.shape !== 'custom';
            this.render();
        });

        this.svgButton = this.shapeFolder.addButton({
            title: 'Load SVG...',
            hidden: true
        });
        this.svgButton.on('click', this.params.loadSVG);

        // ASCII mode folder
        this.asciiFolder = pane.addFolder({ title: 'ASCII Settings', expanded: true, hidden: true });
        this.asciiFolder.addInput(this.params, 'asciiAlgorithm', {
            label: 'Algorithm',
            options: {
                'Brightness': 'brightness',
                'Shade + Shape': 'shadeShape',
                'Edge Detection': 'edge'
            }
        }).on('change', () => this.render());

        this.asciiFolder.addInput(this.params, 'fontFamily', {
            label: 'Font',
            options: {
                'Monospace': 'monospace',
                'Courier New': "'Courier New', monospace",
                'Consolas': 'Consolas, monospace',
                'Custom': 'custom'
            }
        }).on('change', (e) => {
            this.asciiFontButton.hidden = e.value !== 'custom';
            this.render();
        });

        this.asciiFontButton = this.asciiFolder.addButton({
            title: 'Load Font...',
            hidden: true
        });
        this.asciiFontButton.on('click', this.params.loadFont);

        // Black point / White point (levels adjustment)
        this.asciiFolder.addInput(this.params, 'asciiBlackPoint', {
            label: 'Black Point',
            min: 0,
            max: 1,
            step: 0.01
        }).on('change', () => this.render());

        this.asciiFolder.addInput(this.params, 'asciiWhitePoint', {
            label: 'White Point',
            min: 0,
            max: 1,
            step: 0.01
        }).on('change', () => this.render());

        this.asciiFolder.addInput(this.params, 'asciiInvert', {
            label: 'Invert'
        }).on('change', () => this.render());

        this.asciiFolder.addInput(this.params, 'asciiUseOriginalColor', {
            label: 'Original Color'
        }).on('change', () => this.render());

        this.asciiFolder.addInput(this.params, 'asciiForceSquareCells', {
            label: 'Square Cells'
        }).on('change', () => this.render());

        this.asciiFolder.addButton({ title: 'Swap Black/White' }).on('click', () => {
            // Swap colors for each stop individually
            for (const stop of AsciiMode.stops) {
                const tmpColor = stop.color;
                stop.color = stop.bgColor || '#000000';
                stop.bgColor = tmpColor || '#ffffff';
            }
            this.render();
        });

        this.asciiFolder.addSeparator();

        // Presets
        this.asciiFolder.addButton({ title: 'Preset: Detailed' }).on('click', () => {
            AsciiMode.loadPreset('detailed');
            this.render();
        });
        this.asciiFolder.addButton({ title: 'Preset: Basic' }).on('click', () => {
            AsciiMode.loadPreset('basic');
            this.render();
        });
        this.asciiFolder.addButton({ title: 'Preset: Minimal' }).on('click', () => {
            AsciiMode.loadPreset('minimal');
            this.render();
        });
        this.asciiFolder.addButton({ title: 'Preset: Blocks' }).on('click', () => {
            AsciiMode.loadPreset('blocks');
            this.render();
        });

        this.asciiFolder.addSeparator();

        // Image presets
        this.asciiFolder.addButton({ title: 'Preset: Minesweeper' }).on('click', async () => {
            await AsciiMode.applyImagePreset('minesweeper');
            this.render();
        });

        this.asciiFolder.addSeparator();

        // Edit characters button
        this.asciiFolder.addButton({ title: 'Edit Characters...' }).on('click', () => {
            this.stopsEditor.open('ascii');
        });

        // Typewriter mode folder (Jules Kuehn algorithm)
        this.typewriterFolder = pane.addFolder({ title: 'Typewriter Settings', expanded: true, hidden: true });

        this.typewriterFolder.addInput(this.params, 'fontFamily', {
            label: 'Font',
            options: {
                'Courier New': "'Courier New', monospace",
                'Monospace': 'monospace',
                'Consolas': 'Consolas, monospace',
                'Custom': 'custom'
            }
        }).on('change', (e) => {
            this.typewriterFontButton.hidden = e.value !== 'custom';
            this.render();
        });

        this.typewriterFontButton = this.typewriterFolder.addButton({
            title: 'Load Font...',
            hidden: true
        });
        this.typewriterFontButton.on('click', this.params.loadFont);

        this.typewriterFolder.addSeparator();

        this.typewriterFolder.addInput(this.params, 'layers', {
            label: 'Layers',
            options: {
                'Single (1x1)': '1x1',
                'Horizontal 2': '2H',
                'Vertical 2': '2V',
                '4-Layer (Recommended)': '4x1',
                '8-Layer': '4x2',
                '16-Layer (Slow)': '16x1'
            }
        }).on('change', () => this.render());

        this.typewriterFolder.addInput(this.params, 'rowLength', {
            label: 'Chars/Row',
            min: 0,
            max: 200,
            step: 5
        }).on('change', () => this.render());
        // Note: 0 = auto (matches input image width)

        this.typewriterFolder.addInput(this.params, 'numLoops', {
            label: 'Quality',
            min: 1,
            max: 15,
            step: 1
        }).on('change', () => this.render());

        this.typewriterFolder.addSeparator();

        this.typewriterFolder.addInput(this.params, 'searchMode', {
            label: 'Search',
            options: {
                'Simulated Annealing': 'simAnneal',
                'Greedy': 'greedy'
            }
        }).on('change', () => this.render());

        this.typewriterFolder.addInput(this.params, 'asymmetry', {
            label: 'Asymmetry',
            min: 0,
            max: 1.0,
            step: 0.05
        }).on('change', () => this.render());

        this.typewriterFolder.addSeparator();

        // Character set controls
        this.typewriterFolder.addButton({ title: 'Edit Characters...' }).on('click', () => {
            this.stopsEditor.open('typewriter');
        });

        this.typewriterFolder.addButton({ title: 'Preset: Typewriter' }).on('click', () => {
            TypewriterMode.loadPreset('typewriter');
            this.render();
        });

        this.typewriterFolder.addButton({ title: 'Preset: Dense' }).on('click', () => {
            TypewriterMode.loadPreset('dense');
            this.render();
        });

        // Emoji mode folder
        this.emojiFolder = pane.addFolder({ title: 'Emoji Settings', expanded: true, hidden: true });
        this.emojiFolder.addInput(this.params, 'emojiSet', {
            label: 'Emoji Set',
            options: {
                'Default': 'default',
                'Fruits & Food': 'fruits',
                'Nature': 'nature',
                'All': 'all'
            }
        }).on('change', (e) => {
            EmojiMode.setEmojiSet(e.value);
            this.render();
        });

        // Quadtree mode folder
        this.quadtreeFolder = pane.addFolder({
            title: 'Quadtree Settings',
            expanded: true,
            hidden: true
        });

        this.quadtreeFolder.addInput(this.params, 'quadtreeMonoColor', {
            label: 'Foreground'
        }).on('change', () => this.render());

        this.quadtreeFolder.addInput(this.params, 'quadtreeUseOriginalColor', {
            label: 'Original Color'
        }).on('change', () => this.render());

        this.quadtreeFolder.addSeparator();

        this.quadtreeFolder.addInput(this.params, 'quadtreeIterations', {
            label: 'Max Iterations',
            min: 100,
            max: 50000,
            step: 100
        }).on('change', () => this.render());

        this.quadtreeFolder.addInput(this.params, 'quadtreeSizeSensitive', {
            label: 'Prioritize Large'
        }).on('change', () => this.render());


        this.pane = pane;

        // Initialize stops editor
        this.stopsEditor = new StopsEditor(() => this.render());

        this.updateUIVisibility();
    }

    /**
     * Update UI visibility based on mode
     */
    updateUIVisibility() {
        const mode = this.params.mode;

        // Cell size not used by quadtree
        this.cellSizeControl.hidden = mode === 'quadtree';

        // Gap not used by quadtree (uses its own subdivision)
        this.gapControl.hidden = mode === 'quadtree';

        // Mode folders
        this.shapeFolder.hidden = mode !== 'shape';
        this.asciiFolder.hidden = mode !== 'ascii';
        this.typewriterFolder.hidden = mode !== 'typewriter';
        this.emojiFolder.hidden = mode !== 'emoji';
        this.quadtreeFolder.hidden = mode !== 'quadtree';

    }

    /**
     * Initialize event listeners
     */
    initEvents() {
        // Image upload
        this.imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    this.image = img;
                    this.render();
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        });

        // SVG upload
        this.svgInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ShapeMode.loadSVG(ev.target.result)) {
                    this.render();
                }
            };
            reader.readAsText(file);
        });

        // Font upload
        this.fontInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (ev) => {
                const fontFace = new FontFace('CustomFont', ev.target.result);
                fontFace.load().then((loaded) => {
                    document.fonts.add(loaded);
                    this.params.fontFamily = 'CustomFont, monospace';
                    this.render();
                }).catch((err) => {
                    alert('Failed to load font: ' + err.message);
                });
            };
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Initialize pan/zoom controls
     */
    initPanZoom() {
        const container = this.canvas.parentElement;

        // Mouse wheel for zoom
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = Math.max(0.1, Math.min(20, this.zoom * delta));

            // Zoom toward mouse position
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const scale = newZoom / this.zoom;
            this.panX = mouseX - (mouseX - this.panX) * scale;
            this.panY = mouseY - (mouseY - this.panY) * scale;
            this.zoom = newZoom;

            this.applyTransform();
        }, { passive: false });

        // Mouse drag for pan
        container.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.isDragging = true;
                this.dragStartX = e.clientX - this.panX;
                this.dragStartY = e.clientY - this.panY;
                container.style.cursor = 'grabbing';
            }
        });

        container.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.panX = e.clientX - this.dragStartX;
                this.panY = e.clientY - this.dragStartY;
                this.applyTransform();
            }
        });

        container.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                container.style.cursor = 'grab';
            }
        });

        container.addEventListener('mouseleave', () => {
            if (this.isDragging) {
                this.isDragging = false;
                container.style.cursor = 'grab';
            }
        });

        // Double-click to reset zoom
        container.addEventListener('dblclick', () => {
            this.resetZoom();
        });

        container.style.cursor = 'grab';
    }

    /**
     * Apply current pan/zoom transform to canvas
     */
    applyTransform() {
        if (this.renderedCanvas) {
            this.canvas.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
            this.canvas.style.transformOrigin = '0 0';
            this.canvas.style.imageRendering = 'pixelated';
        }
    }

    /**
     * Reset pan/zoom to default
     */
    resetZoom() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.applyTransform();
    }

    /**
     * Load default image
     */
    loadDefaultImage() {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            this.image = img;
            this.render();
        };
        img.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&h=600&fit=crop';
    }

    /**
     * Render current mode
     */
    render() {
        if (!this.image) return;

        if (this.processing) {
            setTimeout(() => this.render(), 100);
            return;
        }

        this.processing = true;
        this.loading.classList.add('active');

        setTimeout(() => {
            try {
                const mode = this.params.mode;

                if (mode === 'shape') {
                    ShapeMode.render(this.ctx, this.canvas, this.image, this.params);
                } else if (mode === 'ascii') {
                    AsciiMode.render(this.ctx, this.canvas, this.image, this.params);
                } else if (mode === 'typewriter') {
                    TypewriterMode.render(this.ctx, this.canvas, this.image, this.params);
                } else if (mode === 'emoji') {
                    EmojiMode.render(this.ctx, this.canvas, this.image, this.params);
                } else if (mode === 'quadtree') {
                    QuadTreeMode.render(this.ctx, this.canvas, this.image, this.params);
                }

                this.renderedCanvas = true;
                this.applyTransform();
            } catch (error) {
                console.error('Render error:', error);
                alert('Render error: ' + error.message);
            } finally {
                this.loading.classList.remove('active');
                this.processing = false;
            }
        }, 50);
    }

    /**
     * Save image
     */
    save() {
        const link = document.createElement('a');
        link.download = `pixelator-${this.params.mode}-${Date.now()}.png`;
        link.href = this.canvas.toDataURL('image/png');
        link.click();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.app = new PixelatorStudio();
});
