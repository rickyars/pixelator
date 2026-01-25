/**
 * Shape Mode - Algorithmic shape effects
 * Based on dither-ascii-effect algorithms
 */
const ShapeMode = {
    // Custom SVG state
    customSVGPath: null,
    customSVGViewBox: { x: 0, y: 0, w: 100, h: 100 },

    /**
     * Render shape mode
     */
    render(ctx, canvas, img, params) {
        const prepared = Core.prepareImage(img);
        const { width, height, data } = prepared;

        // Set canvas size
        canvas.width = width;
        canvas.height = height;

        // Background
        ctx.fillStyle = params.bgColor;
        ctx.fillRect(0, 0, width, height);

        // Sample grid
        const samples = Core.sampleGrid(data, width, height, params.cellSize);
        const monoColor = Core.hexToRgb(params.monoColor);

        // Render each sample
        for (const sample of samples) {
            const { x, y, idx } = sample;

            // Get pixel color
            let r = data[idx];
            let g = data[idx + 1];
            let b = data[idx + 2];
            const a = data[idx + 3];

            if (a < 20) continue;

            // Apply contrast
            r = Core.applyContrast(r, params.contrast);
            g = Core.applyContrast(g, params.contrast);
            b = Core.applyContrast(b, params.contrast);

            // Calculate luminance
            const luma = Core.getLuma(r, g, b);

            // Apply algorithm
            const transform = Algorithms.apply(
                params.algorithm,
                luma,
                x, y,
                params.cellSize,
                params.baseScale,
                params.intensity,
                data,
                width,
                idx
            );

            // Skip if scale is zero
            if (transform.scX === 0 || transform.scY === 0) continue;

            // Apply transforms
            ctx.save();
            const cx = x + transform.offX;
            const cy = y + transform.offY;
            const size = Math.max(0, params.cellSize - params.gap);

            ctx.translate(cx, cy);
            ctx.rotate(transform.rot);
            ctx.scale(transform.scX, transform.scY);

            // Set color
            if (params.useOriginalColor) {
                ctx.fillStyle = `rgba(${r},${g},${b},${transform.alpha})`;
                ctx.strokeStyle = `rgba(${r},${g},${b},${transform.alpha})`;
            } else {
                ctx.fillStyle = `rgba(${monoColor.r},${monoColor.g},${monoColor.b},${transform.alpha})`;
                ctx.strokeStyle = `rgba(${monoColor.r},${monoColor.g},${monoColor.b},${transform.alpha})`;
            }

            // Draw shape
            Shapes.draw(ctx, 0, 0, size, params.shape, this.customSVGPath, this.customSVGViewBox);

            ctx.restore();
        }
    },

    /**
     * Load custom SVG
     */
    loadSVG(svgContent) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgContent, 'image/svg+xml');
        const pathElem = doc.querySelector('path');
        const svgElem = doc.querySelector('svg');

        if (!pathElem) {
            alert('SVG must contain a <path> element');
            return false;
        }

        const d = pathElem.getAttribute('d');
        this.customSVGPath = new Path2D(d);

        if (svgElem) {
            const viewBox = svgElem.getAttribute('viewBox');
            if (viewBox) {
                const parts = viewBox.split(/\s+|,/).map(parseFloat);
                this.customSVGViewBox = { x: parts[0], y: parts[1], w: parts[2], h: parts[3] };
            } else {
                const w = parseFloat(svgElem.getAttribute('width')) || 100;
                const h = parseFloat(svgElem.getAttribute('height')) || 100;
                this.customSVGViewBox = { x: 0, y: 0, w, h };
            }
        }

        return true;
    }
};
