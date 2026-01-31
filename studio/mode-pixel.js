/**
 * Pixel Mode - Square pixel rendering with placement algorithms
 * Always shows all pixels (no opacity effects)
 */
const PixelMode = {
    /**
     * Render pixel mode
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

            // Apply placement algorithm
            const transform = Algorithms.apply(
                params.pixelPlacementAlgo,
                luma,
                x, y,
                params.cellSize,
                params.baseScale,
                params.intensity,
                data,
                width,
                idx
            );

            // Apply optional halftone sizing (brightness→size)
            if (params.applyHalftone) {
                const halftoneScale = luma * params.halftoneIntensity * 1.5;
                transform.scX *= halftoneScale;
                transform.scY *= halftoneScale;
            }

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

            // Set color (always full alpha)
            if (params.useOriginalColor) {
                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.strokeStyle = `rgb(${r},${g},${b})`;
            } else {
                // Grayscale using foreground color and luminance
                const grayR = Math.round(monoColor.r * luma);
                const grayG = Math.round(monoColor.g * luma);
                const grayB = Math.round(monoColor.b * luma);
                ctx.fillStyle = `rgb(${grayR},${grayG},${grayB})`;
                ctx.strokeStyle = `rgb(${grayR},${grayG},${grayB})`;
            }

            // Always draw square pixels
            Shapes.draw(ctx, 0, 0, size, 'square', null, null);

            ctx.restore();
        }
    }
};
