/**
 * Exporter - Handles exporting SVG to various formats
 */
class Exporter {
    /**
     * Export SVG to file
     * @param {SVGElement} svgElement - SVG element to export
     * @param {string} filename - Filename (without extension)
     */
    static toSVG(svgElement, filename = 'pixel-art') {
        // Clone the SVG to avoid modifying the original
        const svgClone = svgElement.cloneNode(true);

        // Get export dimensions from data attributes
        const exportWidth = svgClone.getAttribute('data-export-width');
        const exportHeight = svgClone.getAttribute('data-export-height');

        // Set width and height for export (if available)
        if (exportWidth && exportHeight) {
            svgClone.setAttribute('width', exportWidth);
            svgClone.setAttribute('height', exportHeight);
        }

        // Remove data attributes and pan-zoom elements from export
        svgClone.removeAttribute('data-export-width');
        svgClone.removeAttribute('data-export-height');

        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgClone);

        // Add XML declaration and proper SVG namespace
        const fullSVG = `<?xml version="1.0" encoding="UTF-8"?>
${svgString}`;

        const blob = new Blob([fullSVG], { type: 'image/svg+xml;charset=utf-8' });
        this.downloadBlob(blob, `${filename}-${Date.now()}.svg`);
    }

    /**
     * Export SVG to PNG
     * @param {SVGElement} svgElement - SVG element to export
     * @param {number} scale - Scale factor for output resolution
     * @param {string} filename - Filename (without extension)
     */
    static toPNG(svgElement, scale = 2, filename = 'pixel-art') {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Clone SVG for export
        const svgClone = svgElement.cloneNode(true);

        // Get SVG dimensions from data attributes (for scaled export) or viewBox
        const exportWidth = parseFloat(svgClone.getAttribute('data-export-width'));
        const exportHeight = parseFloat(svgClone.getAttribute('data-export-height'));
        const viewBox = svgClone.getAttribute('viewBox');

        if (!viewBox) {
            console.error('No viewBox attribute found on SVG');
            return;
        }

        const viewBoxParts = viewBox.split(' ');
        const width = exportWidth || parseFloat(viewBoxParts[2]);
        const height = exportHeight || parseFloat(viewBoxParts[3]);

        if (!width || !height) {
            console.error('Invalid dimensions:', width, height);
            return;
        }

        // Set explicit dimensions on clone for rendering
        svgClone.setAttribute('width', width);
        svgClone.setAttribute('height', height);
        svgClone.removeAttribute('data-export-width');
        svgClone.removeAttribute('data-export-height');

        // Remove pan-zoom artifacts (svg-pan-zoom adds g wrapper with transform)
        // Reset the viewBox to ensure clean export
        svgClone.setAttribute('viewBox', `0 0 ${width} ${height}`);

        // Remove any transform attributes from svg-pan-zoom wrapper
        const wrapperG = svgClone.querySelector('g[transform]');
        if (wrapperG && wrapperG.parentNode === svgClone) {
            // This is the svg-pan-zoom wrapper, remove its transform
            wrapperG.removeAttribute('transform');
        }

        // Set canvas size with scale
        canvas.width = width * scale;
        canvas.height = height * scale;

        // Create SVG blob from clone
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgClone);

        console.log('PNG Export - Canvas size:', canvas.width, 'x', canvas.height);
        console.log('PNG Export - SVG dimensions:', width, 'x', height);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        // Cleanup function to prevent memory leaks
        const cleanup = () => URL.revokeObjectURL(url);

        // Timeout to prevent memory leaks if image never loads
        const timeout = setTimeout(() => {
            console.error('PNG export timeout after 10 seconds');
            cleanup();
        }, 10000);

        // Load SVG into image
        const img = new Image();
        img.onload = () => {
            clearTimeout(timeout);
            console.log('PNG Export - Image loaded successfully');
            ctx.scale(scale, scale);
            ctx.drawImage(img, 0, 0);

            // Convert to PNG blob
            canvas.toBlob((blob) => {
                if (blob) {
                    console.log('PNG Export - Blob created, size:', blob.size);
                    this.downloadBlob(blob, `${filename}-${Date.now()}.png`);
                } else {
                    console.error('PNG Export - Failed to create blob');
                }
                cleanup();
            }, 'image/png');
        };

        img.onerror = (e) => {
            clearTimeout(timeout);
            console.error('PNG Export - Failed to load SVG image:', e);
            console.error('PNG Export - SVG string preview:', svgString.substring(0, 500));
            cleanup();
        };

        img.src = url;
    }

    /**
     * Download a blob as a file
     * @param {Blob} blob - Blob to download
     * @param {string} filename - Filename
     */
    static downloadBlob(blob, filename) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }

    /**
     * Copy SVG to clipboard
     * @param {SVGElement} svgElement - SVG element to copy
     */
    static async toClipboard(svgElement) {
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgElement);

        try {
            await navigator.clipboard.writeText(svgString);
            return true;
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
            return false;
        }
    }
}
