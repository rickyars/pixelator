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

        // Output scale factor for higher resolution rendering
        const scale = params.outputScale || 1;

        // Setup canvas at scaled resolution
        canvas.width = width * scale;
        canvas.height = height * scale;

        // Fill background
        ctx.fillStyle = params.bgColor || '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Render leaves as colored rectangles
        this.renderColor(ctx, this.cachedLeaves, params, scale);
    },

    /**
     * Render colored rectangles for each leaf node
     */
    renderColor(ctx, leaves, params, scale) {
        const useOriginalColor = params.quadtreeUseOriginalColor !== undefined
            ? params.quadtreeUseOriginalColor
            : true;

        for (const node of leaves) {
            const { r, g, b } = node.color;

            // Apply color mode
            const rgb = this.applyColorMode({ r, g, b }, params, useOriginalColor);

            // Draw rectangle at scaled coordinates
            ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
            ctx.fillRect(node.x * scale, node.y * scale, node.width * scale, node.height * scale);
        }
    },

    /**
     * Apply color mode (original color or mono color with luminance)
     */
    applyColorMode(rgb, params, useOriginalColor) {
        if (useOriginalColor) {
            return rgb;
        }

        const luma = Core.getLuma(rgb.r, rgb.g, rgb.b);
        const mono = Core.hexToRgb(params.quadtreeMonoColor || '#ffffff');

        return {
            r: Math.round(mono.r * luma),
            g: Math.round(mono.g * luma),
            b: Math.round(mono.b * luma)
        };
    }
};
