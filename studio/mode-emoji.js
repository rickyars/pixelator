/**
 * Emoji Mode - Render images using emojis matched by color
 * Based on algorithm from crocidb.com/post/rendering-doom-with-emojis
 */
const EmojiMode = {
    // Emoji sets with precomputed average RGB values
    emojiSets: {
        default: [
            // Reds
            { emoji: '🍎', r: 196, g: 48, b: 43 },
            { emoji: '🍓', r: 195, g: 60, b: 60 },
            { emoji: '❤️', r: 221, g: 46, b: 68 },
            { emoji: '🔴', r: 221, g: 46, b: 68 },
            { emoji: '🌹', r: 190, g: 50, b: 60 },
            { emoji: '🍒', r: 180, g: 40, b: 50 },
            // Oranges
            { emoji: '🍊', r: 244, g: 144, b: 30 },
            { emoji: '🥕', r: 230, g: 120, b: 50 },
            { emoji: '🔶', r: 244, g: 144, b: 30 },
            { emoji: '🏀', r: 230, g: 120, b: 60 },
            // Yellows
            { emoji: '🍋', r: 250, g: 230, b: 80 },
            { emoji: '⭐', r: 255, g: 212, b: 59 },
            { emoji: '☀️', r: 255, g: 200, b: 50 },
            { emoji: '🌻', r: 250, g: 200, b: 60 },
            { emoji: '🍌', r: 250, g: 220, b: 100 },
            // Greens
            { emoji: '🥒', r: 120, g: 180, b: 90 },
            { emoji: '🥦', r: 80, g: 140, b: 70 },
            { emoji: '🍀', r: 80, g: 160, b: 80 },
            { emoji: '🌲', r: 60, g: 120, b: 60 },
            { emoji: '🐸', r: 120, g: 180, b: 80 },
            { emoji: '🟢', r: 0, g: 180, b: 0 },
            // Blues
            { emoji: '🫐', r: 70, g: 80, b: 140 },
            { emoji: '💎', r: 100, g: 180, b: 220 },
            { emoji: '🐳', r: 100, g: 180, b: 200 },
            { emoji: '💧', r: 100, g: 180, b: 220 },
            { emoji: '🔵', r: 50, g: 100, b: 200 },
            { emoji: '🌊', r: 60, g: 130, b: 180 },
            // Purples
            { emoji: '🍇', r: 130, g: 80, b: 140 },
            { emoji: '🍆', r: 90, g: 60, b: 100 },
            { emoji: '🔮', r: 140, g: 90, b: 160 },
            { emoji: '🟣', r: 160, g: 80, b: 160 },
            // Pinks
            { emoji: '🌸', r: 255, g: 180, b: 200 },
            { emoji: '🐷', r: 255, g: 180, b: 180 },
            { emoji: '🦩', r: 230, g: 130, b: 150 },
            { emoji: '💗', r: 230, g: 100, b: 140 },
            // Browns
            { emoji: '🍪', r: 180, g: 130, b: 80 },
            { emoji: '🥖', r: 200, g: 160, b: 100 },
            { emoji: '🐻', r: 150, g: 100, b: 60 },
            { emoji: '🟤', r: 140, g: 90, b: 60 },
            { emoji: '🍂', r: 180, g: 100, b: 50 },
            // Whites
            { emoji: '☁️', r: 240, g: 240, b: 240 },
            { emoji: '⚪', r: 255, g: 255, b: 255 },
            { emoji: '🥚', r: 250, g: 245, b: 230 },
            { emoji: '👻', r: 245, g: 245, b: 245 },
            { emoji: '❄️', r: 200, g: 220, b: 255 },
            // Blacks
            { emoji: '⚫', r: 30, g: 30, b: 30 },
            { emoji: '🕳️', r: 20, g: 20, b: 20 },
            { emoji: '🦍', r: 60, g: 60, b: 60 },
            { emoji: '🎱', r: 40, g: 40, b: 40 },
            // Grays
            { emoji: '🐘', r: 140, g: 140, b: 140 },
            { emoji: '🌫️', r: 180, g: 180, b: 190 },
            { emoji: '🪨', r: 120, g: 110, b: 100 },
            { emoji: '🌑', r: 50, g: 50, b: 55 },
            { emoji: '🌕', r: 250, g: 240, b: 200 }
        ],
        fruits: [
            { emoji: '🍎', r: 196, g: 48, b: 43 },
            { emoji: '🍏', r: 140, g: 200, b: 80 },
            { emoji: '🍊', r: 244, g: 144, b: 30 },
            { emoji: '🍋', r: 250, g: 230, b: 80 },
            { emoji: '🍌', r: 250, g: 220, b: 100 },
            { emoji: '🍇', r: 130, g: 80, b: 140 },
            { emoji: '🍓', r: 195, g: 60, b: 60 },
            { emoji: '🫐', r: 70, g: 80, b: 140 },
            { emoji: '🍑', r: 255, g: 180, b: 130 },
            { emoji: '🍒', r: 180, g: 40, b: 50 },
            { emoji: '🥝', r: 140, g: 170, b: 90 },
            { emoji: '🍍', r: 240, g: 200, b: 80 },
            { emoji: '🥥', r: 200, g: 180, b: 160 },
            { emoji: '🥑', r: 100, g: 130, b: 60 },
            { emoji: '🍆', r: 90, g: 60, b: 100 },
            { emoji: '🥕', r: 230, g: 120, b: 50 },
            { emoji: '🌽', r: 250, g: 220, b: 90 },
            { emoji: '🥦', r: 80, g: 140, b: 70 },
            { emoji: '🥬', r: 100, g: 160, b: 80 },
            { emoji: '🧅', r: 200, g: 160, b: 100 }
        ],
        nature: [
            { emoji: '🌲', r: 60, g: 120, b: 60 },
            { emoji: '🌳', r: 80, g: 140, b: 70 },
            { emoji: '🌴', r: 100, g: 160, b: 80 },
            { emoji: '🌵', r: 100, g: 150, b: 70 },
            { emoji: '🌸', r: 255, g: 180, b: 200 },
            { emoji: '🌺', r: 230, g: 80, b: 100 },
            { emoji: '🌻', r: 250, g: 200, b: 60 },
            { emoji: '🌼', r: 255, g: 240, b: 180 },
            { emoji: '🌹', r: 190, g: 50, b: 60 },
            { emoji: '🍀', r: 80, g: 160, b: 80 },
            { emoji: '🍁', r: 200, g: 80, b: 40 },
            { emoji: '🍂', r: 180, g: 100, b: 50 },
            { emoji: '🌊', r: 60, g: 130, b: 180 },
            { emoji: '☀️', r: 255, g: 200, b: 50 },
            { emoji: '🌙', r: 250, g: 240, b: 150 },
            { emoji: '⭐', r: 255, g: 212, b: 59 },
            { emoji: '☁️', r: 240, g: 240, b: 240 },
            { emoji: '🌈', r: 200, g: 150, b: 150 },
            { emoji: '❄️', r: 200, g: 220, b: 255 },
            { emoji: '🔥', r: 250, g: 150, b: 50 }
        ],
        all: [] // Will be populated from all other sets
    },

    // Color-to-emoji cache
    cache: new Map(),

    // Current emoji set
    currentSet: 'default',

    /**
     * Initialize - build 'all' set from others
     */
    init() {
        const allEmojis = new Map();
        for (const [setName, emojis] of Object.entries(this.emojiSets)) {
            if (setName === 'all') continue;
            for (const e of emojis) {
                allEmojis.set(e.emoji, e);
            }
        }
        this.emojiSets.all = Array.from(allEmojis.values());
    },

    /**
     * Set the current emoji set
     */
    setEmojiSet(setName) {
        if (this.emojiSets[setName]) {
            this.currentSet = setName;
            this.cache.clear(); // Clear cache when set changes
        }
    },

    /**
     * Pack RGB into a 32-bit integer for cache key
     */
    packColor(r, g, b) {
        // Quantize to reduce cache size (lose some precision for speed)
        const qr = (r >> 3) << 3;
        const qg = (g >> 3) << 3;
        const qb = (b >> 3) << 3;
        return qb + (qg << 8) + (qr << 16);
    },

    /**
     * Find closest emoji by Euclidean distance in RGB space
     */
    findClosestEmoji(r, g, b) {
        const key = this.packColor(r, g, b);

        // Check cache first
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }

        // Find closest match
        const emojis = this.emojiSets[this.currentSet];
        let bestEmoji = emojis[0].emoji;
        let bestDist = Infinity;

        for (const e of emojis) {
            const dr = r - e.r;
            const dg = g - e.g;
            const db = b - e.b;
            const dist = dr * dr + dg * dg + db * db; // Skip sqrt for speed
            if (dist < bestDist) {
                bestDist = dist;
                bestEmoji = e.emoji;
            }
        }

        // Cache result
        this.cache.set(key, bestEmoji);
        return bestEmoji;
    },

    /**
     * Main render function
     */
    render(ctx, canvas, img, params) {
        const cellSize = params.cellSize || 16;
        const bgColor = params.bgColor || '#000000';

        // Prepare source image
        const prepared = Core.prepareImage(img);
        const srcWidth = prepared.width;
        const srcHeight = prepared.height;
        const srcData = prepared.data;

        // Calculate grid dimensions
        const cols = Math.floor(srcWidth / cellSize);
        const rows = Math.floor(srcHeight / cellSize);

        // Set canvas size
        canvas.width = cols * cellSize;
        canvas.height = rows * cellSize;

        // Fill background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Set font for emoji rendering
        ctx.font = `${cellSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Process each cell
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // Calculate average color of this cell
                const { r, g, b } = this.getAverageColor(
                    srcData, srcWidth,
                    col * cellSize, row * cellSize,
                    cellSize, cellSize
                );

                // Find matching emoji
                const emoji = this.findClosestEmoji(r, g, b);

                // Draw emoji centered in cell
                const x = col * cellSize + cellSize / 2;
                const y = row * cellSize + cellSize / 2;
                ctx.fillText(emoji, x, y);
            }
        }
    },

    /**
     * Calculate average RGB color of a rectangular region
     */
    getAverageColor(data, width, startX, startY, cellW, cellH) {
        let r = 0, g = 0, b = 0;
        let count = 0;

        for (let y = startY; y < startY + cellH; y++) {
            for (let x = startX; x < startX + cellW; x++) {
                const idx = (y * width + x) * 4;
                r += data[idx];
                g += data[idx + 1];
                b += data[idx + 2];
                count++;
            }
        }

        return {
            r: Math.round(r / count),
            g: Math.round(g / count),
            b: Math.round(b / count)
        };
    }
};

// Initialize
EmojiMode.init();
