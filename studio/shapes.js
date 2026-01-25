/**
 * Shape Library - All shape drawing functions
 */
class Shapes {
    /**
     * Draw a shape on canvas context
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} size - Size of shape
     * @param {string} type - Shape type
     * @param {Path2D} customPath - Custom SVG path (optional)
     * @param {Object} customViewBox - Custom SVG viewBox (optional)
     */
    static draw(ctx, x, y, size, type, customPath = null, customViewBox = null) {
        const r = size / 2;

        // Handle custom SVG
        if (type === 'custom' && customPath) {
            ctx.save();
            const maxDim = Math.max(customViewBox.w, customViewBox.h);
            const scale = size / maxDim;
            ctx.scale(scale, scale);
            ctx.translate(-customViewBox.w / 2, -customViewBox.h / 2);
            ctx.translate(-customViewBox.x, -customViewBox.y);
            ctx.fill(customPath);
            ctx.restore();
            return;
        }

        ctx.beginPath();
        switch (type) {
            // Basic shapes
            case 'circle':
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'square':
                ctx.rect(x - r, y - r, size, size);
                ctx.fill();
                break;

            case 'triangle':
                ctx.moveTo(x, y - r);
                ctx.lineTo(x + r, y + r);
                ctx.lineTo(x - r, y + r);
                ctx.closePath();
                ctx.fill();
                break;

            case 'diamond':
                ctx.moveTo(x, y - r);
                ctx.lineTo(x + r, y);
                ctx.lineTo(x, y + r);
                ctx.lineTo(x - r, y);
                ctx.closePath();
                ctx.fill();
                break;

            case 'hexagon':
                this.drawPoly(ctx, x, y, r, 6, Math.PI / 6);
                ctx.fill();
                break;

            case 'octagon':
                this.drawPoly(ctx, x, y, r, 8, Math.PI / 8);
                ctx.fill();
                break;

            case 'star':
                this.drawStar(ctx, x, y, 5, r, r * 0.4);
                ctx.fill();
                break;

            case 'cross':
                const w = r / 3;
                ctx.rect(x - w, y - r, w * 2, size);
                ctx.rect(x - r, y - w, size, w * 2);
                ctx.fill();
                break;

            // Directional rectangles
            case 'rect_v':
                ctx.rect(x - r * 0.3, y - r, size * 0.3, size);
                ctx.fill();
                break;

            case 'rect_h':
                ctx.rect(x - r, y - r * 0.3, size, size * 0.3);
                ctx.fill();
                break;

            // Diagonals
            case 'line_diag_r':
                ctx.moveTo(x - r, y + r);
                ctx.lineTo(x - r + size * 0.2, y + r);
                ctx.lineTo(x + r, y - r);
                ctx.lineTo(x + r - size * 0.2, y - r);
                ctx.closePath();
                ctx.fill();
                break;

            case 'line_diag_l':
                ctx.moveTo(x - r, y - r);
                ctx.lineTo(x - r + size * 0.2, y - r);
                ctx.lineTo(x + r, y + r);
                ctx.lineTo(x + r - size * 0.2, y + r);
                ctx.closePath();
                ctx.fill();
                break;

            // Complex shapes
            case 'chevron':
                const chW = r * 0.4;
                ctx.moveTo(x - r, y + r * 0.5);
                ctx.lineTo(x, y - r * 0.5);
                ctx.lineTo(x + r, y + r * 0.5);
                ctx.lineTo(x + r, y + r * 0.5 - chW);
                ctx.lineTo(x, y - r * 0.5 - chW);
                ctx.lineTo(x - r, y + r * 0.5 - chW);
                ctx.closePath();
                ctx.fill();
                break;

            case 'trapezoid':
                ctx.moveTo(x - r * 0.6, y - r);
                ctx.lineTo(x + r * 0.6, y - r);
                ctx.lineTo(x + r, y + r);
                ctx.lineTo(x - r, y + r);
                ctx.closePath();
                ctx.fill();
                break;

            case 'semi_top':
                ctx.arc(x, y + r * 0.1, r, Math.PI, 0);
                ctx.closePath();
                ctx.fill();
                break;

            case 'semi_bottom':
                ctx.arc(x, y - r * 0.1, r, 0, Math.PI);
                ctx.closePath();
                ctx.fill();
                break;

            case 'square_hollow':
                ctx.rect(x - r, y - r, size, size);
                ctx.rect(x + r * 0.5, y - r * 0.5, -size * 0.5, size * 0.5);
                ctx.fill();
                break;

            // Advanced shapes
            case 'spiral':
                ctx.lineWidth = size * 0.15;
                ctx.lineCap = 'round';
                const loops = 2;
                const increment = r / (loops * 10);
                ctx.moveTo(x, y);
                for (let i = 0; i < loops * 20; i++) {
                    const angle = 0.5 * i;
                    const dist = increment * i;
                    ctx.lineTo(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist);
                }
                ctx.stroke();
                break;

            case 'concentric':
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.arc(x, y, r * 0.7, 0, Math.PI * 2, true);
                ctx.arc(x, y, r * 0.4, 0, Math.PI * 2);
                ctx.arc(x, y, r * 0.15, 0, Math.PI * 2, true);
                ctx.fill();
                break;

            case 'gear':
                const teeth = 8;
                const outerR = r;
                const innerR = r * 0.7;
                const holeR = r * 0.3;
                for (let i = 0; i < teeth * 2; i++) {
                    const a = (Math.PI * 2 * i) / (teeth * 2);
                    const rad = i % 2 === 0 ? outerR : innerR;
                    const px = x + Math.cos(a) * rad;
                    const py = y + Math.sin(a) * rad;
                    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.moveTo(x + holeR, y);
                ctx.arc(x, y, holeR, 0, Math.PI * 2, true);
                ctx.fill();
                break;

            case 'flower':
                for (let i = 0; i < 5; i++) {
                    const a = (Math.PI * 2 * i) / 5;
                    const px = x + Math.cos(a) * (r * 0.6);
                    const py = y + Math.sin(a) * (r * 0.6);
                    ctx.moveTo(x, y);
                    ctx.arc(px, py, r * 0.4, 0, Math.PI * 2);
                }
                ctx.fill();
                break;

            case 'shuriken':
                const spikes = 4;
                const outer = r;
                const inner = r * 0.2;
                ctx.moveTo(x, y - outer);
                for (let i = 0; i < spikes; i++) {
                    let rot = (Math.PI / 2) * i;
                    ctx.quadraticCurveTo(
                        x + Math.cos(rot + Math.PI / 4) * r * 0.5,
                        y + Math.sin(rot + Math.PI / 4) * r * 0.5,
                        x + Math.cos(rot + Math.PI / 2) * outer,
                        y + Math.sin(rot + Math.PI / 2) * outer
                    );
                    ctx.lineTo(
                        x + Math.cos(rot + Math.PI / 2 + Math.PI / 4) * inner,
                        y + Math.sin(rot + Math.PI / 2 + Math.PI / 4) * inner
                    );
                }
                ctx.fill();
                break;

            case 'lightning':
                const w2 = r * 0.6;
                ctx.moveTo(x + w2, y - r);
                ctx.lineTo(x - w2 * 0.2, y - r * 0.1);
                ctx.lineTo(x + w2, y - r * 0.1);
                ctx.lineTo(x - w2, y + r);
                ctx.lineTo(x + w2 * 0.2, y + r * 0.1);
                ctx.lineTo(x - w2, y + r * 0.1);
                ctx.closePath();
                ctx.fill();
                break;

            case 'diamond_hollow':
                ctx.moveTo(x, y - r);
                ctx.lineTo(x + r, y);
                ctx.lineTo(x, y + r);
                ctx.lineTo(x - r, y);
                ctx.closePath();
                const hr = r * 0.5;
                ctx.moveTo(x - hr, y);
                ctx.lineTo(x, y + hr);
                ctx.lineTo(x + hr, y);
                ctx.lineTo(x, y - hr);
                ctx.closePath();
                ctx.fill();
                break;

            case 'windmill':
                for (let i = 0; i < 4; i++) {
                    const ang = (Math.PI / 2) * i;
                    ctx.moveTo(x, y);
                    ctx.lineTo(
                        x + Math.cos(ang) * r * 0.2,
                        y + Math.sin(ang) * r * 0.2
                    );
                    ctx.lineTo(x + Math.cos(ang) * r, y + Math.sin(ang) * r);
                    ctx.lineTo(
                        x + Math.cos(ang + 0.5) * r,
                        y + Math.sin(ang + 0.5) * r
                    );
                    ctx.closePath();
                }
                ctx.fill();
                break;

            case 'leaf':
                ctx.moveTo(x, y - r);
                ctx.quadraticCurveTo(x + r, y - r * 0.5, x + r, y);
                ctx.quadraticCurveTo(x + r, y + r * 0.5, x, y + r);
                ctx.quadraticCurveTo(x - r, y + r * 0.5, x - r, y);
                ctx.quadraticCurveTo(x - r, y - r * 0.5, x, y - r);
                ctx.rect(x - size * 0.05, y - r, size * 0.1, size * 1.8);
                ctx.fill();
                break;

            case 'ghost':
                ctx.arc(x, y - r * 0.2, r * 0.8, Math.PI, 0);
                ctx.lineTo(x + r * 0.8, y + r);
                ctx.lineTo(x + r * 0.4, y + r * 0.7);
                ctx.lineTo(x, y + r);
                ctx.lineTo(x - r * 0.4, y + r * 0.7);
                ctx.lineTo(x - r * 0.8, y + r);
                ctx.closePath();
                ctx.moveTo(x - r * 0.3, y - r * 0.2);
                ctx.arc(x - r * 0.3, y - r * 0.2, r * 0.2, 0, Math.PI * 2);
                ctx.moveTo(x + r * 0.3, y - r * 0.2);
                ctx.arc(x + r * 0.3, y - r * 0.2, r * 0.2, 0, Math.PI * 2);
                ctx.fill();
                break;

            default:
                // Fallback to circle
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();
        }
    }

    /**
     * Draw a regular polygon
     */
    static drawPoly(ctx, x, y, rad, sides, offset) {
        const step = (Math.PI * 2) / sides;
        for (let i = 0; i < sides; i++) {
            const ang = i * step + offset;
            i === 0
                ? ctx.moveTo(x + Math.cos(ang) * rad, y + Math.sin(ang) * rad)
                : ctx.lineTo(x + Math.cos(ang) * rad, y + Math.sin(ang) * rad);
        }
        ctx.closePath();
    }

    /**
     * Draw a star shape
     */
    static drawStar(ctx, cx, cy, spikes, outer, inner) {
        let rot = (Math.PI / 2) * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;
        ctx.moveTo(cx, cy - outer);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outer;
            y = cy + Math.sin(rot) * outer;
            ctx.lineTo(x, y);
            rot += step;
            x = cx + Math.cos(rot) * inner;
            y = cy + Math.sin(rot) * inner;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.lineTo(cx, cy - outer);
        ctx.closePath();
    }

    /**
     * Get all available shape names
     */
    static getShapeList() {
        return {
            'Custom SVG': 'custom',
            'Circle': 'circle',
            'Square': 'square',
            'Triangle': 'triangle',
            'Diamond': 'diamond',
            'Hexagon': 'hexagon',
            'Octagon': 'octagon',
            'Star': 'star',
            'Cross': 'cross',
            'Rect Vertical': 'rect_v',
            'Rect Horizontal': 'rect_h',
            'Diagonal /': 'line_diag_r',
            'Diagonal \\': 'line_diag_l',
            'Chevron': 'chevron',
            'Trapezoid': 'trapezoid',
            'Semi-Circle Top': 'semi_top',
            'Semi-Circle Bottom': 'semi_bottom',
            'Square Hollow': 'square_hollow',
            'Spiral': 'spiral',
            'Concentric Circles': 'concentric',
            'Gear (Cog)': 'gear',
            'Flower (5 Petals)': 'flower',
            'Shuriken': 'shuriken',
            'Lightning': 'lightning',
            'Diamond Hollow': 'diamond_hollow',
            'Windmill': 'windmill',
            'Leaf': 'leaf',
            'Ghost': 'ghost'
        };
    }
}
