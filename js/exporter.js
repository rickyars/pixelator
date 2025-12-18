/**
 * Exporter - Minimal & reliable SVG/PNG exporter
 */
class Exporter {
    // Helper: derive width/height from various SVG attributes
    static _getSize(svg) {
        const dataW = svg.getAttribute('data-export-width');
        const dataH = svg.getAttribute('data-export-height');
        if (dataW && dataH) return [parseFloat(dataW), parseFloat(dataH)];

        const wAttr = svg.getAttribute('width');
        const hAttr = svg.getAttribute('height');
        if (wAttr && hAttr) {
            const w = parseFloat(wAttr);
            const h = parseFloat(hAttr);
            if (!Number.isNaN(w) && !Number.isNaN(h)) return [w, h];
        }

        const viewBox = svg.getAttribute('viewBox');
        if (viewBox) {
            const parts = viewBox.trim().split(/\s+|,/).filter(Boolean);
            if (parts.length === 4) {
                return [parseFloat(parts[2]), parseFloat(parts[3])];
            }
        }

        // Fallback to reasonable defaults
        return [Math.max(1, svg.clientWidth || 300), Math.max(1, svg.clientHeight || 150)];
    }

    // Small utility to ensure required xmlns attributes
    static _ensureNamespaces(svg) {
        if (!svg.hasAttribute('xmlns')) svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        if (!svg.hasAttribute('xmlns:xlink')) svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    }

    // Remove top-level wrapper groups that may cause unexpected transforms
    static _unwrapTopLevelTransforms(svg) {
        const groups = Array.from(svg.querySelectorAll('g[transform]'));
        groups.forEach(g => {
            if (g.parentNode === svg) {
                while (g.firstChild) svg.insertBefore(g.firstChild, g);
                g.remove();
            }
        });
    }

    /**
     * Export SVG to a .svg file
     * @param {SVGElement} svgElement
     * @param {string} filename
     */
    static toSVG(svgElement, filename = 'pixel-art') {
        const svgClone = svgElement.cloneNode(true);
        this._unwrapTopLevelTransforms(svgClone);

        const [w, h] = this._getSize(svgClone);
        svgClone.setAttribute('width', w);
        svgClone.setAttribute('height', h);
        svgClone.removeAttribute('data-export-width');
        svgClone.removeAttribute('data-export-height');
        this._ensureNamespaces(svgClone);

        const svgString = new XMLSerializer().serializeToString(svgClone);
        const fullSVG = `<?xml version="1.0" encoding="UTF-8"?>\n${svgString}`;
        const blob = new Blob([fullSVG], { type: 'image/svg+xml;charset=utf-8' });
        this.downloadBlob(blob, `${filename}-${Date.now()}.svg`);
    }

    /**
     * Export SVG to PNG by drawing serialized SVG on a canvas
     * @param {SVGElement} svgElement
     * @param {number} scale - pixel scale multiplier (1 = native SVG units)
     * @param {string} filename
     */
    static async toPNG(svgElement, scale = 2, filename = 'pixel-art') {
        const [width, height] = this._getSize(svgElement);
        if (!width || !height) {
            console.error('Exporter.toPNG: invalid dimensions', width, height);
            return;
        }

        // Prepare SVG clone for export
        const svgClone = svgElement.cloneNode(true);
        this._unwrapTopLevelTransforms(svgClone);
        svgClone.setAttribute('width', width);
        svgClone.setAttribute('height', height);
        svgClone.removeAttribute('data-export-width');
        svgClone.removeAttribute('data-export-height');
        this._ensureNamespaces(svgClone);

        const svgString = new XMLSerializer().serializeToString(svgClone);
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const canvas = document.createElement('canvas');
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        const ctx = canvas.getContext('2d');

        try {
            await new Promise((resolve, reject) => {
                const img = new Image();
                // try to avoid tainting; note this requires resources to allow crossorigin
                img.crossOrigin = 'anonymous';

                const timeout = setTimeout(() => reject(new Error('Image load timeout')), 10000);

                img.onload = () => {
                    clearTimeout(timeout);
                    // draw image stretched to canvas to honor scale
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    canvas.toBlob(blobOut => {
                        if (!blobOut) return reject(new Error('Failed to create PNG blob'));
                        this.downloadBlob(blobOut, `${filename}-${Date.now()}.png`);
                        resolve();
                    }, 'image/png');
                };

                img.onerror = (e) => {
                    clearTimeout(timeout);
                    console.error('Exporter.toPNG - image error', e);
                    reject(e);
                };

                img.src = url;
            });
        } catch (err) {
            console.error('Exporter.toPNG error:', err);
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    /** Download a blob using an <a> element */
    static downloadBlob(blob, filename) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }

    /** Copy SVG markup to clipboard */
    static async toClipboard(svgElement) {
        const svgClone = svgElement.cloneNode(true);
        const [w, h] = this._getSize(svgClone);
        svgClone.setAttribute('width', w);
        svgClone.setAttribute('height', h);
        this._ensureNamespaces(svgClone);
        const svgString = new XMLSerializer().serializeToString(svgClone);

        try {
            await navigator.clipboard.writeText(svgString);
            return true;
        } catch (err) {
            console.error('Exporter.toClipboard failed:', err);
            return false;
        }
    }
}
