/**
 * Halftone Mode - Shape-based halftone rendering
 * Always applies brightness→size scaling
 */
const HalftoneMode = {
    // Custom SVG state
    customSVGPath: null,
    customSVGViewBox: { x: 0, y: 0, w: 100, h: 100 },

    /**
     * Render halftone mode
     */
    render(ctx, canvas, img, params) {
        const prepared = Core.prepareImage(img);
        const { width, height, data } = prepared;
        const scale = params.outputScale || 1;

        // Set canvas size (scaled)
        canvas.width = width * scale;
        canvas.height = height * scale;

        // Background
        ctx.fillStyle = params.bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

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

            // Apply random erase
            if (params.randomErase) {
                if (Algorithms.seededRandom(x, y) < params.erasePercent / 100) {
                    continue;
                }
            }

            // Apply halftone algorithm (already applies brightness→size)
            const transform = Algorithms.apply(
                params.halftoneAlgorithm,
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

            // Apply transforms (scaled coordinates)
            ctx.save();
            const cx = (x + transform.offX) * scale;
            const cy = (y + transform.offY) * scale;
            const size = params.cellSize * scale;

            ctx.translate(cx, cy);
            ctx.rotate(transform.rot);
            ctx.scale(transform.scX, transform.scY);

            // Set color
            if (params.useOriginalColor) {
                ctx.fillStyle = `rgba(${r},${g},${b},${transform.alpha})`;
                ctx.strokeStyle = `rgba(${r},${g},${b},${transform.alpha})`;
            } else {
                // Grayscale using foreground color and luminance
                const grayR = Math.round(monoColor.r * luma);
                const grayG = Math.round(monoColor.g * luma);
                const grayB = Math.round(monoColor.b * luma);
                ctx.fillStyle = `rgba(${grayR},${grayG},${grayB},${transform.alpha})`;
                ctx.strokeStyle = `rgba(${grayR},${grayG},${grayB},${transform.alpha})`;
            }

            // Draw shape
            Shapes.draw(ctx, 0, 0, size, params.halftoneShape, this.customSVGPath, this.customSVGViewBox);

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
