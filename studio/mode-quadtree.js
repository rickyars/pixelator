/**
 * Quadtree Compression Mode - Render images using quadtree subdivision
 * Supports two rendering modes:
 * 1. Color Mode: Colored rectangles using node's average color
 * 2. ASCII Mode: Fixed character per node with node's average color
 */
const QuadTreeMode = {
    // Cache for built quadtree
    cachedTree: null,
    cachedLeaves: null,
    cacheKey: null,

    /**
     * Main render function
     */
    render(ctx, canvas, img, params) {
        // Prepare source image
        const prepared = Core.prepareImage(img);
        const width = prepared.width;
        const height = prepared.height;
        const data = prepared.data;

        // Build cache key from parameters that affect tree structure
        const maxIterations = params.quadtreeIterations || 5000;
        const sizeSensitive = params.quadtreeSizeSensitive || false;
        const currentKey = `${img.src}_${width}_${height}_${maxIterations}_${sizeSensitive}`;

        // Only rebuild tree if cache is invalid
        if (this.cacheKey !== currentKey) {
            const builder = new QuadTreeBuilder(data, width, height, sizeSensitive);
            builder.build(maxIterations);

            this.cachedTree = builder;
            this.cachedLeaves = builder.getLeafNodes();
            this.cacheKey = currentKey;
        }

        // Setup canvas
        canvas.width = width;
        canvas.height = height;

        // Fill background
        ctx.fillStyle = params.bgColor || '#000000';
        ctx.fillRect(0, 0, width, height);

        // Render based on mode (using cached leaves)
        const renderMode = params.quadtreeRenderMode || 'color';
        if (renderMode === 'color') {
            this.renderColor(ctx, this.cachedLeaves, params);
        } else {
            this.renderAscii(ctx, this.cachedLeaves, params);
        }
    },

    /**
     * Render colored rectangles for each leaf node
     */
    renderColor(ctx, leaves, params) {
        const useOriginalColor = params.useOriginalColor !== undefined
            ? params.useOriginalColor
            : true;

        for (const node of leaves) {
            const { r, g, b } = node.color;

            // Apply color mode
            const rgb = this.applyColorMode({ r, g, b }, params, useOriginalColor);

            // Draw rectangle
            ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
            ctx.fillRect(node.x, node.y, node.width, node.height);
        }
    },

    /**
     * Render ASCII characters for each leaf node
     * Uses fixed font size - density creates detail (more small nodes = more characters)
     */
    renderAscii(ctx, leaves, params) {
        const char = params.quadtreeChar || '#';
        const fontFamily = params.quadtreeFontFamily || 'monospace';
        const fontSize = params.quadtreeFontSize || 12;
        const useOriginalColor = params.useOriginalColor !== undefined
            ? params.useOriginalColor
            : true;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${fontSize}px ${fontFamily}`;

        for (const node of leaves) {
            const { r, g, b } = node.color;

            // Apply color mode
            const rgb = this.applyColorMode({ r, g, b }, params, useOriginalColor);
            ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;

            // Draw character at node center (fixed size, density creates detail)
            const x = node.x + node.width / 2;
            const y = node.y + node.height / 2;
            ctx.fillText(char, x, y);
        }
    },

    /**
     * Apply color mode (original color or mono color with luminance)
     */
    applyColorMode(rgb, params, useOriginalColor) {
        if (useOriginalColor) {
            return rgb;
        }

        // Calculate luminance
        const lum = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
        const normalized = lum / 255;

        // Parse mono color
        const monoColor = params.monoColor || '#ffffff';
        const hex = monoColor.replace('#', '');
        const monoR = parseInt(hex.substring(0, 2), 16);
        const monoG = parseInt(hex.substring(2, 4), 16);
        const monoB = parseInt(hex.substring(4, 6), 16);

        // Apply luminance to mono color
        return {
            r: Math.round(monoR * normalized),
            g: Math.round(monoG * normalized),
            b: Math.round(monoB * normalized)
        };
    }
};
