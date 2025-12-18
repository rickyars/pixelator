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
        // Note: viewBox should NOT be changed - it defines the coordinate system
        // Only width/height should scale to achieve proper output dimensions
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
    static async toPNG(svgElement, scale = 2, filename = 'pixel-art') {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Get SVG dimensions
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

        const renderer = window.app ? window.app.renderer : null;

        try {
            // Disable pan-zoom and wait for DOM to settle
            if (renderer && renderer.panZoomInstance) {
                console.log('PNG Export - Disabling pan-zoom');
                renderer.disablePanZoom();

                // Wait for DOM to update AND check that wrapper is gone
                await new Promise(resolve => {
                    let attempts = 0;
                    const checkInterval = setInterval(() => {
                        attempts++;
                        // Check if there's a suspicious <g> wrapper added by pan-zoom
                        const hasWrapper = Array.from(svgElement.children).some(
                            child => child.tagName === 'g' &&
                            child.hasAttribute('transform') &&
                            child.getAttribute('transform').includes('matrix')
                        );

                        if (!hasWrapper || attempts > 10) {
                            clearInterval(checkInterval);
                            console.log('PNG Export - DOM ready after', attempts * 20, 'ms');
                            resolve();
                        }
                    }, 20);
                });
            }

            // Clone SVG
            const svgClone = svgElement.cloneNode(true);

            // Remove any remaining pan-zoom artifacts
            const wrapperGroups = svgClone.querySelectorAll('g[transform*="matrix"]');
            wrapperGroups.forEach(g => {
                if (g.parentNode === svgClone) {
                    // Unwrap: move children out of wrapper
                    while (g.firstChild) {
                        svgClone.insertBefore(g.firstChild, g);
                    }
                    g.remove();
                }
            });

            // Set explicit dimensions
            svgClone.setAttribute('width', width);
            svgClone.setAttribute('height', height);
            // Note: viewBox is preserved from clone - should NOT be changed
            svgClone.removeAttribute('data-export-width');
            svgClone.removeAttribute('data-export-height');

            // Ensure proper SVG namespaces
            if (!svgClone.hasAttribute('xmlns')) {
                svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            }
            if (!svgClone.hasAttribute('xmlns:xlink')) {
                svgClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
            }

            // Set canvas size
            canvas.width = width * scale;
            canvas.height = height * scale;

            // Serialize
            const serializer = new XMLSerializer();
            const svgString = serializer.serializeToString(svgClone);

            console.log('PNG Export - Canvas size:', canvas.width, 'x', canvas.height);
            console.log('PNG Export - SVG string length:', svgString.length);

            const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            // Load into image
            await new Promise((resolve, reject) => {
                const img = new Image();

                const timeout = setTimeout(() => {
                    reject(new Error('Timeout loading SVG after 10 seconds'));
                }, 10000);

                img.onload = () => {
                    clearTimeout(timeout);
                    console.log('PNG Export - Image loaded successfully');

                    ctx.scale(scale, scale);
                    ctx.drawImage(img, 0, 0);

                    canvas.toBlob((blob) => {
                        if (blob) {
                            console.log('PNG Export - Blob created, size:', blob.size);
                            this.downloadBlob(blob, `${filename}-${Date.now()}.png`);
                            resolve();
                        } else {
                            reject(new Error('Failed to create PNG blob'));
                        }
                    }, 'image/png');
                };

                img.onerror = (e) => {
                    clearTimeout(timeout);
                    console.error('PNG Export - Image load error:', e);
                    console.error('PNG Export - SVG preview:', svgString.substring(0, 500));
                    reject(e);
                };

                img.src = url;
            });

            URL.revokeObjectURL(url);

        } catch (error) {
            console.error('PNG Export - Error:', error);
        } finally {
            // Re-enable pan-zoom
            if (renderer) {
                console.log('PNG Export - Re-enabling pan-zoom');
                renderer.enablePanZoom();
            }
        }
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
