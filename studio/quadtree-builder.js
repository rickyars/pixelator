/**
 * QuadTree Builder - Greedy subdivision algorithm for image compression
 */

/**
 * Max-heap for efficient extraction of highest-detail nodes
 * O(log n) insert and extract vs O(n) for sorted array
 */
class MaxHeap {
    constructor() {
        this.heap = [];
    }

    get length() {
        return this.heap.length;
    }

    peek() {
        return this.heap[0] || null;
    }

    insert(node) {
        this.heap.push(node);
        this.bubbleUp(this.heap.length - 1);
    }

    extractMax() {
        if (this.heap.length === 0) return null;
        const max = this.heap[0];
        const last = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = last;
            this.bubbleDown(0);
        }
        return max;
    }

    bubbleUp(i) {
        while (i > 0) {
            const parent = Math.floor((i - 1) / 2);
            if (this.heap[parent].detail >= this.heap[i].detail) break;
            [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
            i = parent;
        }
    }

    bubbleDown(i) {
        const n = this.heap.length;
        while (true) {
            let largest = i;
            const left = 2 * i + 1;
            const right = 2 * i + 2;
            if (left < n && this.heap[left].detail > this.heap[largest].detail) {
                largest = left;
            }
            if (right < n && this.heap[right].detail > this.heap[largest].detail) {
                largest = right;
            }
            if (largest === i) break;
            [this.heap[i], this.heap[largest]] = [this.heap[largest], this.heap[i]];
            i = largest;
        }
    }
}

class QuadTreeNode {
    constructor(x, y, width, height, imageData, imgWidth, sizeSensitive = false) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.isLeaf = true;
        this.children = null;
        this.sizeSensitive = sizeSensitive;

        // Calculate average color and detail metric for this region
        this.color = this.calculateAverageColor(imageData, imgWidth);
        this.detail = this.calculateDetail(imageData, imgWidth);
    }

    /**
     * Calculate average RGB color of this node's region
     */
    calculateAverageColor(data, imgWidth) {
        let r = 0, g = 0, b = 0;
        let count = 0;

        for (let dy = 0; dy < this.height; dy++) {
            for (let dx = 0; dx < this.width; dx++) {
                const px = this.x + dx;
                const py = this.y + dy;
                const idx = (py * imgWidth + px) * 4;

                r += data[idx];
                g += data[idx + 1];
                b += data[idx + 2];
                count++;
            }
        }

        return {
            r: Math.round(r / count),
            g: Math.round(g / count),
            b: Math.round(b / count)
        };
    }

    /**
     * Calculate detail metric: sum(std(RGB)) * pixel_count
     * Higher detail = more complex region = higher subdivision priority
     */
    calculateDetail(data, imgWidth) {
        // First pass: calculate mean
        let sumR = 0, sumG = 0, sumB = 0;
        let count = 0;

        for (let dy = 0; dy < this.height; dy++) {
            for (let dx = 0; dx < this.width; dx++) {
                const px = this.x + dx;
                const py = this.y + dy;
                const idx = (py * imgWidth + px) * 4;

                sumR += data[idx];
                sumG += data[idx + 1];
                sumB += data[idx + 2];
                count++;
            }
        }

        const meanR = sumR / count;
        const meanG = sumG / count;
        const meanB = sumB / count;

        // Second pass: calculate variance
        let varR = 0, varG = 0, varB = 0;

        for (let dy = 0; dy < this.height; dy++) {
            for (let dx = 0; dx < this.width; dx++) {
                const px = this.x + dx;
                const py = this.y + dy;
                const idx = (py * imgWidth + px) * 4;

                const dr = data[idx] - meanR;
                const dg = data[idx + 1] - meanG;
                const db = data[idx + 2] - meanB;

                varR += dr * dr;
                varG += dg * dg;
                varB += db * db;
            }
        }

        // Standard deviation for each channel
        const stdR = Math.sqrt(varR / count);
        const stdG = Math.sqrt(varG / count);
        const stdB = Math.sqrt(varB / count);

        // Detail metric: sum of std devs
        // Size-sensitive mode multiplies by pixel count (like Python reference)
        // Size-invariant mode uses raw std dev sum (treats all regions equally)
        const baseDetail = stdR + stdG + stdB;
        return this.sizeSensitive ? baseDetail * count : baseDetail;
    }

    /**
     * Subdivide this node into 4 children
     * Returns children array or null if can't subdivide
     */
    subdivide(imageData, imgWidth) {
        // Can't subdivide if already subdivided or too small
        if (!this.isLeaf || this.width <= 1 || this.height <= 1) {
            return null;
        }

        // Calculate half dimensions
        const hw = Math.floor(this.width / 2);
        const hh = Math.floor(this.height / 2);

        // Create 4 children (inherit sizeSensitive setting)
        this.children = [
            // Top-left
            new QuadTreeNode(this.x, this.y, hw, hh, imageData, imgWidth, this.sizeSensitive),
            // Top-right
            new QuadTreeNode(this.x + hw, this.y, this.width - hw, hh, imageData, imgWidth, this.sizeSensitive),
            // Bottom-left
            new QuadTreeNode(this.x, this.y + hh, hw, this.height - hh, imageData, imgWidth, this.sizeSensitive),
            // Bottom-right
            new QuadTreeNode(this.x + hw, this.y + hh, this.width - hw, this.height - hh, imageData, imgWidth, this.sizeSensitive)
        ];

        this.isLeaf = false;
        return this.children;
    }
}

class QuadTreeBuilder {
    constructor(imageData, width, height, sizeSensitive = false) {
        this.imageData = imageData;
        this.width = width;
        this.height = height;

        // Create root node
        this.root = new QuadTreeNode(0, 0, width, height, imageData, width, sizeSensitive);

        // Max-heap for efficient highest-detail extraction
        this.heap = new MaxHeap();
        this.heap.insert(this.root);
    }

    /**
     * Build quadtree using greedy subdivision
     * @param maxIterations - Maximum number of subdivisions
     */
    build(maxIterations) {
        for (let i = 0; i < maxIterations; i++) {
            // Get node with highest detail
            if (this.heap.length === 0) break;

            const node = this.heap.extractMax();

            // Try to subdivide
            const children = node.subdivide(this.imageData, this.width);

            if (children) {
                // Insert children into heap
                for (const child of children) {
                    this.heap.insert(child);
                }
            }
            // If can't subdivide, node is just removed (not re-inserted)
        }
    }

    /**
     * Get all leaf nodes by traversing the tree
     */
    getLeafNodes() {
        const leaves = [];

        const traverse = (node) => {
            if (node.isLeaf) {
                leaves.push(node);
            } else if (node.children) {
                for (const child of node.children) {
                    traverse(child);
                }
            }
        };

        traverse(this.root);
        return leaves;
    }
}
