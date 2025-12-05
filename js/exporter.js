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
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgElement);

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

        // Get SVG dimensions
        const bbox = svgElement.getBBox();
        const width = bbox.width || svgElement.width.baseVal.value;
        const height = bbox.height || svgElement.height.baseVal.value;

        // Set canvas size
        canvas.width = width * scale;
        canvas.height = height * scale;

        // Create SVG blob
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgElement);
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
            ctx.scale(scale, scale);
            ctx.drawImage(img, 0, 0);

            // Convert to PNG blob
            canvas.toBlob((blob) => {
                this.downloadBlob(blob, `${filename}-${Date.now()}.png`);
                cleanup();
            }, 'image/png');
        };

        img.onerror = () => {
            clearTimeout(timeout);
            console.error('Failed to load SVG for PNG export');
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
