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
            mode: 'pixel',

            // Common
            cellSize: 10,
            contrast: 0,
            bgColor: '#000000',
            useOriginalColor: true,
            monoColor: '#ffffff',
            outputScale: 1,

            // Pixel mode
            pixelPlacementAlgo: 'none',
            applyHalftone: false,

            // Halftone mode
            halftoneAlgorithm: 'halftone',
            halftoneShape: 'circle',

            // Shape rendering
            baseScale: 1.0,
            intensity: 1.0,
            halftoneIntensity: 1.0,
            randomErase: false,
            erasePercent: 20,

            // ASCII mode
            fontFamily: 'monospace',
            asciiAlgorithm: 'shadeShape',  // 'brightness', 'shadeShape', 'edge'
            asciiPreset: 'detailed',
            asciiCharacters: ' .`\'^",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
            asciiBlackPoint: 0,   // Values below become black
            asciiWhitePoint: 1,   // Values above become white
            asciiUseOriginalColor: false,  // Use image colors for characters
            asciiEdgeMode: 'none',  // 'none', 'sobel', 'canny'
            asciiInvert: false,  // Invert density mapping
            asciiUseBackground: false,  // Layer ASCII over original image
            asciiBackgroundBlur: 0,  // Blur amount for background (0-20)
            asciiTextOffsetX: 0,  // Horizontal offset for text in pixels
            asciiTextOffsetY: 0,  // Vertical offset for text in pixels

            // Full Custom mode
            fullCustomAlgorithm: 'shadeShape',
            fullCustomCellWidth: 10,
            fullCustomCellHeight: 10,
            fullCustomBlackPoint: 0,
            fullCustomWhitePoint: 1,
            fullCustomUseOriginalColor: false,
            fullCustomEdgeMode: 'none',  // 'none', 'sobel', 'canny'
            fullCustomInvert: false,  // Invert density mapping
            fullCustomPreset: 'custom',

            // Typewriter mode (Jules Kuehn algorithm)
            typewriterPreset: 'typewriter',
            typewriterCharacters: ' .,\'":;ilxoX#@M',
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

            // Post-processing
            posterizeEnabled: false,
            posterizeLevels: 8,

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
                'Pixel': 'pixel',
                'Halftone': 'halftone',
                'ASCII': 'ascii',
                'Full Custom': 'fullCustom',
                'Typewriter': 'typewriter',
                'Emoji': 'emoji',
                'Quadtree': 'quadtree'
            }
        }).on('change', () => {
            if (this.params.mode === 'typewriter' || this.params.mode === 'quadtree') {
                this.params.bgColor = '#ffffff';
                this.bgColorControl.refresh();
            }

            // Reload character sets when switching to ASCII or Full Custom
            if (this.params.mode === 'ascii') {
                AsciiMode.loadPreset(this.params.asciiPreset);
                this.params.asciiCharacters = AsciiMode.characters;
            } else if (this.params.mode === 'fullCustom') {
                AsciiMode.loadPreset(this.params.fullCustomPreset);
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

        this.bgColorControl = commonFolder.addInput(this.params, 'bgColor', {
            label: 'Background'
        }).on('change', () => this.render());

        this.outputScaleControl = commonFolder.addInput(this.params, 'outputScale', {
            label: 'Output Scale',
            min: 1,
            max: 4,
            step: 0.5
        }).on('change', () => this.render());

        // Pixel mode folder
        this.pixelFolder = pane.addFolder({ title: 'Pixel Settings', expanded: true });

        this.pixelFolder.addInput(this.params, 'contrast', {
            label: 'Contrast',
            min: -100,
            max: 100,
            step: 1
        }).on('change', () => this.render());

        this.pixelFolder.addInput(this.params, 'monoColor', {
            label: 'Foreground'
        }).on('change', () => this.render());

        this.pixelFolder.addInput(this.params, 'useOriginalColor', {
            label: 'Original Color'
        }).on('change', () => this.render());

        this.pixelFolder.addSeparator();

        this.pixelFolder.addInput(this.params, 'pixelPlacementAlgo', {
            label: 'Algorithm',
            options: Algorithms.getPlacementAlgorithmList()
        }).on('change', () => {
            this.updateIntensityVisibility();
            this.render();
        });

        this.pixelFolder.addInput(this.params, 'baseScale', {
            label: 'Scale',
            min: 0.1,
            max: 3.0,
            step: 0.025
        }).on('change', () => this.render());

        this.pixelIntensityControl = this.pixelFolder.addInput(this.params, 'intensity', {
            label: 'Intensity',
            min: 0,
            max: 5.0,
            step: 0.05
        }).on('change', () => this.render());

        this.pixelFolder.addSeparator();

        this.pixelFolder.addInput(this.params, 'applyHalftone', {
            label: 'Brightness → Size'
        }).on('change', () => this.render());

        this.pixelFolder.addInput(this.params, 'halftoneIntensity', {
            label: 'Size Intensity',
            min: 0,
            max: 2.0,
            step: 0.05
        }).on('change', () => this.render());

        this.pixelFolder.addSeparator();

        this.pixelFolder.addInput(this.params, 'randomErase', {
            label: 'Random Erase'
        }).on('change', () => this.render());

        this.pixelFolder.addInput(this.params, 'erasePercent', {
            label: 'Erase %',
            min: 0,
            max: 100,
            step: 1
        }).on('change', () => this.render());

        // Halftone mode folder
        this.halftoneFolder = pane.addFolder({ title: 'Halftone Settings', expanded: true, hidden: true });

        this.halftoneFolder.addInput(this.params, 'contrast', {
            label: 'Contrast',
            min: -100,
            max: 100,
            step: 1
        }).on('change', () => this.render());

        this.halftoneFolder.addInput(this.params, 'monoColor', {
            label: 'Foreground'
        }).on('change', () => this.render());

        this.halftoneFolder.addInput(this.params, 'useOriginalColor', {
            label: 'Original Color'
        }).on('change', () => this.render());

        this.halftoneFolder.addSeparator();

        this.halftoneFolder.addInput(this.params, 'halftoneAlgorithm', {
            label: 'Algorithm',
            options: Algorithms.getHalftoneAlgorithmList()
        }).on('change', () => this.render());

        this.halftoneFolder.addInput(this.params, 'halftoneShape', {
            label: 'Shape',
            options: Shapes.getShapeList()
        }).on('change', () => {
            this.halftoneSvgButton.hidden = this.params.halftoneShape !== 'custom';
            this.render();
        });

        this.halftoneFolder.addInput(this.params, 'baseScale', {
            label: 'Scale',
            min: 0.1,
            max: 3.0,
            step: 0.025
        }).on('change', () => this.render());

        this.halftoneFolder.addSeparator();

        this.halftoneFolder.addInput(this.params, 'randomErase', {
            label: 'Random Erase'
        }).on('change', () => this.render());

        this.halftoneFolder.addInput(this.params, 'erasePercent', {
            label: 'Erase %',
            min: 0,
            max: 100,
            step: 1
        }).on('change', () => this.render());

        this.halftoneFolder.addSeparator();

        this.halftoneSvgButton = this.halftoneFolder.addButton({
            title: 'Load SVG...',
            hidden: true
        });
        this.halftoneSvgButton.on('click', () => this.loadHalftoneSVG());

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

        this.asciiFolder.addInput(this.params, 'asciiPreset', {
            label: 'Preset',
            options: {
                'Detailed': 'detailed',
                'Typewriter': 'typewriter',
                'Basic': 'basic',
                'Blocks': 'blocks',
                'Braille': 'braille',
                'Rounds': 'rounds',
                'Dots': 'dots'
            }
        }).on('change', (e) => {
            AsciiMode.loadPreset(e.value);
            this.params.asciiCharacters = AsciiMode.characters;
            this.asciiCharsControl.refresh();
            this.render();
        });

        this.asciiCharsControl = this.asciiFolder.addInput(this.params, 'asciiCharacters', {
            label: 'Characters'
        }).on('change', (e) => {
            AsciiMode.loadFromCharString(e.value);
            this.render();
        });

        this.asciiFolder.addInput(this.params, 'monoColor', {
            label: 'Foreground'
        }).on('change', () => {
            AsciiMode.fgColor = this.params.monoColor;
            // Update all stops to use new foreground color
            for (const stop of AsciiMode.stops) {
                stop.color = this.params.monoColor;
            }
            this.render();
        });

        this.asciiFolder.addInput(this.params, 'bgColor', {
            label: 'Background'
        }).on('change', () => {
            AsciiMode.bgColor = this.params.bgColor;
            // Update all stops to use new background color
            for (const stop of AsciiMode.stops) {
                stop.bgColor = this.params.bgColor;
            }
            this.render();
        });

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

        this.asciiFolder.addInput(this.params, 'asciiUseOriginalColor', {
            label: 'Original Color'
        }).on('change', () => this.render());

        this.asciiFolder.addInput(this.params, 'asciiInvert', {
            label: 'Invert (Highlights)'
        }).on('change', () => this.render());

        this.asciiFolder.addSeparator();

        this.asciiFolder.addInput(this.params, 'asciiEdgeMode', {
            label: 'Edge Overlay',
            options: {
                'None': 'none',
                'Sobel': 'sobel',
                'Canny': 'canny'
            }
        }).on('change', () => this.render());

        this.asciiFolder.addSeparator();

        this.asciiFolder.addInput(this.params, 'asciiUseBackground', {
            label: 'Show Background'
        }).on('change', () => this.render());

        this.asciiBackgroundBlurControl = this.asciiFolder.addInput(this.params, 'asciiBackgroundBlur', {
            label: 'Background Blur',
            min: 0,
            max: 20,
            step: 0.5
        }).on('change', () => this.render());

        this.asciiTextOffsetXControl = this.asciiFolder.addInput(this.params, 'asciiTextOffsetX', {
            label: 'Text Offset X',
            min: -100,
            max: 100,
            step: 1
        }).on('change', () => this.render());

        this.asciiTextOffsetYControl = this.asciiFolder.addInput(this.params, 'asciiTextOffsetY', {
            label: 'Text Offset Y',
            min: -100,
            max: 100,
            step: 1
        }).on('change', () => this.render());

        // Full Custom mode folder
        this.fullCustomFolder = pane.addFolder({ title: 'Full Custom Settings', expanded: true, hidden: true });

        this.fullCustomFolder.addInput(this.params, 'fullCustomAlgorithm', {
            label: 'Algorithm',
            options: {
                'Brightness': 'brightness',
                'Shade + Shape': 'shadeShape'
            }
        }).on('change', () => this.render());

        this.fullCustomFolder.addInput(this.params, 'fontFamily', {
            label: 'Font',
            options: {
                'Monospace': 'monospace',
                'Courier New': "'Courier New', monospace",
                'Consolas': 'Consolas, monospace',
                'Custom': 'custom'
            }
        }).on('change', (e) => {
            this.fullCustomFontButton.hidden = e.value !== 'custom';
            this.render();
        });

        this.fullCustomFontButton = this.fullCustomFolder.addButton({
            title: 'Load Font...',
            hidden: true
        });
        this.fullCustomFontButton.on('click', this.params.loadFont);

        this.fullCustomFolder.addInput(this.params, 'fullCustomPreset', {
            label: 'Preset',
            options: {
                'Minesweeper': 'minesweeper',
                'Custom': 'custom'
            }
        }).on('change', async (e) => {
            if (e.value === 'minesweeper') {
                await AsciiMode.applyImagePreset('minesweeper');
                this.render();
            }
        });

        this.fullCustomFolder.addInput(this.params, 'fullCustomCellWidth', {
            label: 'Cell Width',
            min: 4,
            max: 64,
            step: 1
        }).on('change', () => this.render());

        this.fullCustomFolder.addInput(this.params, 'fullCustomCellHeight', {
            label: 'Cell Height',
            min: 4,
            max: 64,
            step: 1
        }).on('change', () => this.render());

        this.fullCustomFolder.addInput(this.params, 'fullCustomBlackPoint', {
            label: 'Black Point',
            min: 0,
            max: 1,
            step: 0.01
        }).on('change', () => this.render());

        this.fullCustomFolder.addInput(this.params, 'fullCustomWhitePoint', {
            label: 'White Point',
            min: 0,
            max: 1,
            step: 0.01
        }).on('change', () => this.render());

        this.fullCustomFolder.addInput(this.params, 'fullCustomInvert', {
            label: 'Invert (Highlights)'
        }).on('change', () => this.render());

        this.fullCustomFolder.addInput(this.params, 'fullCustomUseOriginalColor', {
            label: 'Original Color'
        }).on('change', () => this.render());

        this.fullCustomFolder.addInput(this.params, 'fullCustomEdgeMode', {
            label: 'Edge Mode',
            options: {
                'None': 'none',
                'Sobel': 'sobel',
                'Canny': 'canny'
            }
        }).on('change', () => this.render());

        this.fullCustomFolder.addSeparator();

        this.fullCustomFolder.addButton({ title: 'Edit Stops...' }).on('click', () => {
            this.stopsEditor.open('fullCustom');
        });

        this.fullCustomFolder.addButton({ title: 'Import Preset...' }).on('click', () => {
            const input = prompt('Paste JSON preset or plain character string:');
            if (input) {
                if (AsciiMode.loadCustomPreset(input)) {
                    this.render();
                } else {
                    alert('Failed to load preset. Check format.');
                }
            }
        });

        this.fullCustomFolder.addButton({ title: 'Export Preset' }).on('click', () => {
            const preset = {
                stops: AsciiMode.stops.map(s => ({
                    percentage: s.percentage,
                    value: s.value,
                    color: s.color,
                    bgColor: s.bgColor
                }))
            };
            const json = JSON.stringify(preset, null, 2);
            navigator.clipboard.writeText(json).then(() => {
                alert('Preset copied to clipboard!');
            }).catch(() => {
                alert('Failed to copy to clipboard:\n\n' + json);
            });
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

        this.typewriterFolder.addInput(this.params, 'typewriterPreset', {
            label: 'Preset',
            options: {
                'Detailed': 'detailed',
                'Typewriter': 'typewriter',
                'Dense': 'dense',
                'Basic': 'basic',
                'Blocks': 'blocks',
                'Braille': 'braille',
                'Rounds': 'rounds',
                'Dots': 'dots'
            }
        }).on('change', (e) => {
            TypewriterMode.loadPreset(e.value);
            this.params.typewriterCharacters = TypewriterMode.getCharacterString();
            this.typewriterCharsControl.refresh();
            this.render();
        });

        this.typewriterCharsControl = this.typewriterFolder.addInput(this.params, 'typewriterCharacters', {
            label: 'Characters'
        }).on('change', (e) => {
            TypewriterMode.loadFromCharString(e.value);
            this.render();
        });

        // Character set controls
        this.typewriterFolder.addButton({ title: 'Edit Characters...' }).on('click', () => {
            this.stopsEditor.open('typewriter');
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

        // Post-processing folder
        this.postProcessingFolder = pane.addFolder({ title: 'Post-Processing', expanded: false });

        this.postProcessingFolder.addInput(this.params, 'posterizeEnabled', {
            label: 'Enable Posterize'
        }).on('change', () => this.render());

        this.posterizeLevelsControl = this.postProcessingFolder.addInput(this.params, 'posterizeLevels', {
            label: 'Levels',
            min: 2,
            max: 32,
            step: 1
        }).on('change', () => this.render());

        this.pane = pane;

        // Initialize stops editor
        this.stopsEditor = new StopsEditor(() => this.render());

        this.updateUIVisibility();
        this.updateIntensityVisibility();
    }

    /**
     * Update intensity control visibility based on algorithm
     */
    updateIntensityVisibility() {
        if (this.pixelIntensityControl) {
            this.pixelIntensityControl.hidden = !Algorithms.usesIntensity(this.params.pixelPlacementAlgo);
        }
    }

    /**
     * Update UI visibility based on mode
     */
    updateUIVisibility() {
        const mode = this.params.mode;

        // Cell size not used by quadtree or fullCustom
        this.cellSizeControl.hidden = mode === 'quadtree' || mode === 'fullCustom';

        // Background color hidden in ASCII mode (uses per-character BG in mode settings)
        this.bgColorControl.hidden = mode === 'ascii';

        // Mode folders
        this.pixelFolder.hidden = mode !== 'pixel';
        this.halftoneFolder.hidden = mode !== 'halftone';
        this.asciiFolder.hidden = mode !== 'ascii';
        this.fullCustomFolder.hidden = mode !== 'fullCustom';
        this.typewriterFolder.hidden = mode !== 'typewriter';
        this.emojiFolder.hidden = mode !== 'emoji';
        this.quadtreeFolder.hidden = mode !== 'quadtree';

        // Halftone custom SVG button visibility
        if (this.halftoneSvgButton) {
            this.halftoneSvgButton.hidden = this.params.halftoneShape !== 'custom';
        }
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

        // SVG upload (for halftone mode)
        this.svgInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (ev) => {
                if (HalftoneMode.loadSVG(ev.target.result)) {
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
     * Apply posterization post-processing effect
     */
    applyPosterization() {
        if (!this.params.posterizeEnabled) return;

        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        const levels = Math.max(2, this.params.posterizeLevels);
        const step = 256 / levels;

        for (let i = 0; i < data.length; i += 4) {
            // Posterize red channel
            data[i] = Math.floor(data[i] / step) * step;
            // Posterize green channel
            data[i + 1] = Math.floor(data[i + 1] / step) * step;
            // Posterize blue channel
            data[i + 2] = Math.floor(data[i + 2] / step) * step;
            // Alpha channel (i + 3) remains unchanged
        }

        this.ctx.putImageData(imageData, 0, 0);
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
                const renderers = {
                    pixel: PixelMode,
                    halftone: HalftoneMode,
                    ascii: AsciiMode,
                    fullCustom: AsciiMode,
                    typewriter: TypewriterMode,
                    emoji: EmojiMode,
                    quadtree: QuadTreeMode
                };

                const renderer = renderers[this.params.mode];
                if (renderer) {
                    renderer.render(this.ctx, this.canvas, this.image, this.params);
                }

                // Apply post-processing effects
                this.applyPosterization();

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
     * Load halftone SVG
     */
    loadHalftoneSVG() {
        this.svgInput.click();
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
