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
            asciiWhitePoint: 0.5,   // Values above become white
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
            fullCustomWhitePoint: 0.5,
            fullCustomUseOriginalColor: false,
            fullCustomEdgeMode: 'none',  // 'none', 'sobel', 'canny'
            fullCustomInvert: false,  // Invert density mapping
            fullCustomPreset: 'minesweeper',

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
            paletteEnabled: false,
            palettePreset: 'gameboy',
            bloomEnabled: false,
            bloomThreshold: 0.6,
            bloomRadius: 8,
            bloomStrength: 0.8,
            scanlinesEnabled: false,
            scanlinesSpacing: 4,
            scanlinesOpacity: 0.3,
            chromaEnabled: false,
            chromaOffset: 2,
            vignetteEnabled: false,
            vignetteStrength: 0.6,
            vignetteRadius: 0.7,
            ditherEnabled: false,
            ditherAlgorithm: 'floydSteinberg',
            ditherStrength: 1.0,

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
                if (this.params.fullCustomPreset === 'minesweeper') {
                    AsciiMode.applyImagePreset('minesweeper').then(() => this.render());
                } else {
                    AsciiMode.loadPreset(this.params.fullCustomPreset);
                }
            }

            this.updateUIVisibility();
            this.render();
        });

        pane.addSeparator();

        // Image actions
        const imgFolder = pane.addFolder({ title: 'Image', expanded: true });
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
                'Basic': 'basic',
                'Blocks': 'blocks',
                'Braille': 'braille',
                'Dots': 'dots',
                'Rounds': 'rounds',
                'Detailed': 'detailed',
                'Typewriter': 'typewriter',
                'Unicode': 'unicode'
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

        this.postProcessingFolder.addSeparator();

        this.postProcessingFolder.addInput(this.params, 'paletteEnabled', {
            label: 'Enable Palette'
        }).on('change', () => this.render());

        this.postProcessingFolder.addInput(this.params, 'palettePreset', {
            label: 'Palette',
            options: {
                'Game Boy': 'gameboy',
                'Synthwave': 'synthwave',
                'Terminal': 'terminal',
                'Ink': 'ink',
                'Gold': 'gold',
                'Cyberpunk': 'cyberpunk',
                'Noir': 'noir',
                'Campfire': 'campfire',
                'Deep Sea': 'deepsea',
            }
        }).on('change', () => this.render());

        this.postProcessingFolder.addInput(this.params, 'ditherEnabled', {
            label: 'Enable Dither'
        }).on('change', () => this.render());

        this.postProcessingFolder.addInput(this.params, 'ditherAlgorithm', {
            label: 'Algorithm',
            options: {
                'Floyd-Steinberg': 'floydSteinberg',
                'Atkinson': 'atkinson',
                'Stucki': 'stucki',
                'Burkes': 'burkes',
                'Sierra Lite': 'sierraLite',
            }
        }).on('change', () => this.render());

        this.postProcessingFolder.addInput(this.params, 'ditherStrength', {
            label: 'Strength',
            min: 0.1,
            max: 1.0,
            step: 0.05
        }).on('change', () => this.render());

        this.postProcessingFolder.addSeparator();

        this.postProcessingFolder.addInput(this.params, 'bloomEnabled', {
            label: 'Enable Bloom'
        }).on('change', () => this.render());

        this.postProcessingFolder.addInput(this.params, 'bloomThreshold', {
            label: 'Threshold',
            min: 0.0,
            max: 1.0,
            step: 0.05
        }).on('change', () => this.render());

        this.postProcessingFolder.addInput(this.params, 'bloomRadius', {
            label: 'Radius',
            min: 2,
            max: 60,
            step: 1
        }).on('change', () => this.render());

        this.postProcessingFolder.addInput(this.params, 'bloomStrength', {
            label: 'Strength',
            min: 0.1,
            max: 1.5,
            step: 0.05
        }).on('change', () => this.render());

        this.postProcessingFolder.addSeparator();

        this.postProcessingFolder.addInput(this.params, 'scanlinesEnabled', {
            label: 'Enable Scanlines'
        }).on('change', () => this.render());

        this.postProcessingFolder.addInput(this.params, 'scanlinesSpacing', {
            label: 'Spacing',
            min: 2,
            max: 12,
            step: 1
        }).on('change', () => this.render());

        this.postProcessingFolder.addInput(this.params, 'scanlinesOpacity', {
            label: 'Opacity',
            min: 0.05,
            max: 0.8,
            step: 0.05
        }).on('change', () => this.render());

        this.postProcessingFolder.addSeparator();

        this.postProcessingFolder.addInput(this.params, 'chromaEnabled', {
            label: 'Enable Chroma'
        }).on('change', () => this.render());

        this.postProcessingFolder.addInput(this.params, 'chromaOffset', {
            label: 'Offset',
            min: 1,
            max: 8,
            step: 1
        }).on('change', () => this.render());

        this.postProcessingFolder.addSeparator();

        this.postProcessingFolder.addInput(this.params, 'vignetteEnabled', {
            label: 'Enable Vignette'
        }).on('change', () => this.render());

        this.postProcessingFolder.addInput(this.params, 'vignetteStrength', {
            label: 'Strength',
            min: 0.1,
            max: 1.0,
            step: 0.05
        }).on('change', () => this.render());

        this.postProcessingFolder.addInput(this.params, 'vignetteRadius', {
            label: 'Radius',
            min: 0.3,
            max: 1.0,
            step: 0.05
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
     * Apply palette mapping post-processing effect
     * Maps each pixel's luminance to a color from the selected palette (dark → light order)
     */
    applyPalette() {
        if (!this.params.paletteEnabled) return;

        const palettes = {
            gameboy:   ['#0f380f', '#306130', '#8bac0f', '#9bbc0f'],
            synthwave: ['#0d0221', '#7b2d8b', '#ff00ff', '#00e5ff'],
            terminal:  ['#0a0a0a', '#003b00', '#00a800', '#00ff41'],
            ink:       ['#1a1a1a', '#f5f5dc'],
            gold:      ['#3b1a00', '#7a3b00', '#c8860a', '#ffd700'],
            cyberpunk: ['#0d0208', '#003b00', '#ff003c', '#f5d300'],
            noir:      ['#1a1a1a', '#4a4a4a', '#9a9a9a', '#f0f0f0'],
            campfire:  ['#1a0500', '#7a1e00', '#c0540a', '#f5c842'],
            deepsea:   ['#000814', '#003566', '#0077b6', '#90e0ef'],
        };

        const palette = palettes[this.params.palettePreset] || palettes.gameboy;

        // Parse hex colors to RGB arrays once
        const colors = palette.map(hex => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return [r, g, b];
        });

        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        const len = colors.length;

        for (let i = 0; i < data.length; i += 4) {
            const luma = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
            const idx = Math.min(Math.floor(luma * len), len - 1);
            data[i]     = colors[idx][0];
            data[i + 1] = colors[idx][1];
            data[i + 2] = colors[idx][2];
        }

        this.ctx.putImageData(imageData, 0, 0);
    }

    /**
     * Apply error diffusion dithering post-processing effect
     * Spreads quantization error to neighboring pixels using classic kernel matrices.
     * Run after palette so it blends between palette colors.
     */
    applyDither() {
        if (!this.params.ditherEnabled) return;

        const KERNELS = {
            floydSteinberg: { kernel: [[1,0,7],[-1,1,3],[0,1,5],[1,1,1]], divisor: 16 },
            atkinson:       { kernel: [[1,0,1],[2,0,1],[-1,1,1],[0,1,1],[1,1,1],[0,2,1]], divisor: 8 },
            stucki:         { kernel: [[1,0,8],[2,0,4],[-2,1,2],[-1,1,4],[0,1,8],[1,1,4],[2,1,2],[-2,2,1],[-1,2,2],[0,2,4],[1,2,2],[2,2,1]], divisor: 42 },
            burkes:         { kernel: [[1,0,8],[2,0,4],[-2,1,2],[-1,1,4],[0,1,8],[1,1,4],[2,1,2]], divisor: 32 },
            sierraLite:     { kernel: [[1,0,2],[-1,1,1],[0,1,1]], divisor: 4 },
        };

        const { kernel, divisor } = KERNELS[this.params.ditherAlgorithm] || KERNELS.floydSteinberg;
        const strength = this.params.ditherStrength;
        const w = this.canvas.width;
        const h = this.canvas.height;

        const imageData = this.ctx.getImageData(0, 0, w, h);
        const data = imageData.data;

        // Float32 buffer to accumulate error without integer clamping
        const buf = new Float32Array(data);

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = (y * w + x) * 4;
                for (let c = 0; c < 3; c++) {
                    const oldVal = buf[i + c];
                    const newVal = oldVal < 128 ? 0 : 255;
                    const err = (oldVal - newVal) * strength;
                    buf[i + c] = newVal;
                    for (const [dx, dy, weight] of kernel) {
                        const nx = x + dx, ny = y + dy;
                        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                            buf[(ny * w + nx) * 4 + c] += err * weight / divisor;
                        }
                    }
                }
            }
        }

        for (let i = 0; i < data.length; i++) data[i] = Math.max(0, Math.min(255, buf[i]));
        this.ctx.putImageData(imageData, 0, 0);
    }

    /**
     * Apply bloom post-processing effect
     * Extracts bright pixels, runs a cascade of blurs at increasing radii (like Unreal bloom),
     * then additively composites back. Multiple passes give a tight core glow + wide soft halo.
     */
    applyBloom() {
        if (!this.params.bloomEnabled) return;

        const w = this.canvas.width;
        const h = this.canvas.height;
        const threshold = this.params.bloomThreshold;
        const radius = this.params.bloomRadius;

        // Step 1: Extract bright pixels at full color intensity
        const src = this.ctx.getImageData(0, 0, w, h);
        const brightCanvas = document.createElement('canvas');
        brightCanvas.width = w;
        brightCanvas.height = h;
        const brightCtx = brightCanvas.getContext('2d');
        const brightData = brightCtx.createImageData(w, h);

        for (let i = 0; i < src.data.length; i += 4) {
            const r = src.data[i], g = src.data[i + 1], b = src.data[i + 2];
            const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
            if (luma >= threshold) {
                brightData.data[i]     = r;
                brightData.data[i + 1] = g;
                brightData.data[i + 2] = b;
                brightData.data[i + 3] = 255;
            }
        }
        brightCtx.putImageData(brightData, 0, 0);

        // Step 2: Cascade blur passes at increasing radii - tight core + wide halo
        // Each pass contributes equally to the final glow
        const passes = [radius * 0.5, radius, radius * 2, radius * 4];
        const passAlpha = this.params.bloomStrength / passes.length;

        for (const blurRadius of passes) {
            const blurCanvas = document.createElement('canvas');
            blurCanvas.width = w;
            blurCanvas.height = h;
            const blurCtx = blurCanvas.getContext('2d');
            blurCtx.filter = `blur(${blurRadius}px)`;
            blurCtx.drawImage(brightCanvas, 0, 0);
            blurCtx.filter = 'none';

            // Step 3: Additively composite each pass onto the main canvas
            this.ctx.globalCompositeOperation = 'lighter';
            this.ctx.globalAlpha = passAlpha;
            this.ctx.drawImage(blurCanvas, 0, 0);
        }

        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.globalAlpha = 1;
    }

    /**
     * Apply scanlines post-processing effect
     * Draws semi-transparent black horizontal bands to simulate CRT phosphor rows
     */
    applyScanlines() {
        if (!this.params.scanlinesEnabled) return;
        const w = this.canvas.width;
        const h = this.canvas.height;
        this.ctx.fillStyle = '#000000';
        this.ctx.globalAlpha = this.params.scanlinesOpacity;
        for (let y = 0; y < h; y += this.params.scanlinesSpacing) {
            this.ctx.fillRect(0, y, w, 1);
        }
        this.ctx.globalAlpha = 1;
    }

    /**
     * Apply chromatic aberration post-processing effect
     * Shifts red channel right and blue channel left, simulating cheap lens optics
     */
    applyChromaAberration() {
        if (!this.params.chromaEnabled) return;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const offset = Math.round(this.params.chromaOffset);
        const src = this.ctx.getImageData(0, 0, w, h);
        const dst = this.ctx.createImageData(w, h);
        const s = src.data;
        const d = dst.data;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i  = (y * w + x) * 4;
                const iR = (y * w + Math.min(x + offset, w - 1)) * 4;
                const iB = (y * w + Math.max(x - offset, 0)) * 4;
                d[i]     = s[iR];
                d[i + 1] = s[i + 1];
                d[i + 2] = s[iB + 2];
                d[i + 3] = s[i + 3];
            }
        }
        this.ctx.putImageData(dst, 0, 0);
    }

    /**
     * Apply vignette post-processing effect
     * Darkens edges with a radial gradient overlay
     */
    applyVignette() {
        if (!this.params.vignetteEnabled) return;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const outerRadius = Math.sqrt(cx * cx + cy * cy);
        const innerRadius = outerRadius * this.params.vignetteRadius;

        const gradient = this.ctx.createRadialGradient(cx, cy, innerRadius, cx, cy, outerRadius);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, `rgba(0,0,0,${this.params.vignetteStrength})`);

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, w, h);
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
                this.applyPalette();
                this.applyDither();
                this.applyBloom();
                this.applyScanlines();
                this.applyChromaAberration();
                this.applyVignette();

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
