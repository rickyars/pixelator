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

        // Set width, height, and viewBox for export (if available)
        if (exportWidth && exportHeight) {
            svgClone.setAttribute('width', exportWidth);
            svgClone.setAttribute('height', exportHeight);
            // Update viewBox to match export dimensions for proper scaling
            svgClone.setAttribute('viewBox', `0 0 ${exportWidth} ${exportHeight}`);
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

        // Get SVG dimensions BEFORE any modifications
        const exportWidth = parseFloat(svgElement.getAttribute('data-export-width'));
        const exportHeight = parseFloat(svgElement.getAttribute('data-export-height'));
        const viewBox = svgElement.getAttribute('viewBox');

        if (!viewBox) {
            console.error('PNG Export - No viewBox attribute found on SVG');
            return;
        }

        const viewBoxParts = viewBox.split(' ');
        const width = exportWidth || parseFloat(viewBoxParts[2]);
        const height = exportHeight || parseFloat(viewBoxParts[3]);

        if (!width || !height) {
            console.error('PNG Export - Invalid dimensions:', width, height);
            return;
        }

        // Get reference to renderer to disable/re-enable pan-zoom
        const renderer = window.app ? window.app.renderer : null;

        // Temporarily disable pan-zoom to remove wrapper
        if (renderer && renderer.panZoomInstance) {
            console.log('PNG Export - Disabling pan-zoom');
            renderer.disablePanZoom();
        }

        // Small delay to ensure pan-zoom cleanup completes
        setTimeout(() => {
            try {
                // Clone SVG AFTER pan-zoom is disabled
                const svgClone = svgElement.cloneNode(true);

                // Set explicit dimensions
                svgClone.setAttribute('width', width);
                svgClone.setAttribute('height', height);
                svgClone.setAttribute('viewBox', `0 0 ${width} ${height}`);
                svgClone.removeAttribute('data-export-width');
                svgClone.removeAttribute('data-export-height');

                // Ensure proper SVG namespace
                if (!svgClone.hasAttribute('xmlns')) {
                    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                }
                if (!svgClone.hasAttribute('xmlns:xlink')) {
                    svgClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
                }

                // Set canvas size with scale
                canvas.width = width * scale;
                canvas.height = height * scale;

                // Serialize and create blob
                const serializer = new XMLSerializer();
                const svgString = serializer.serializeToString(svgClone);

                console.log('PNG Export - Canvas size:', canvas.width, 'x', canvas.height);
                console.log('PNG Export - SVG dimensions:', width, 'x', height);

                const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(svgBlob);

                // Cleanup function to prevent memory leaks and re-enable pan-zoom
                const cleanup = () => {
                    URL.revokeObjectURL(url);
                    // Re-enable pan-zoom after export
                    if (renderer) {
                        console.log('PNG Export - Re-enabling pan-zoom');
                        renderer.enablePanZoom();
                    }
                };

                // Timeout to prevent memory leaks if image never loads
                const timeout = setTimeout(() => {
                    console.error('PNG Export - Timeout after 10 seconds');
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
            } catch (error) {
                console.error('PNG Export - Error during export:', error);
                if (renderer) {
                    renderer.enablePanZoom();
                }
            }
        }, 50); // 50ms delay for pan-zoom cleanup
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
