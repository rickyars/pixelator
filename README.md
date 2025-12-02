# Pixel Effects Tool

A powerful, open-source web-based tool that converts raster images into creative vector graphics by replacing pixels with shapes, ASCII characters, or custom symbols. Inspired by tools like Ruri Pixel, but completely free and browser-based.

![License](https://img.shields.io/badge/license-MIT-green)
![Built with D3.js](https://img.shields.io/badge/built%20with-D3.js-orange)

## Features

### 🎨 Multiple Rendering Modes
- **Shape Mode**: Replace pixels with geometric shapes (circles, squares, triangles, diamonds, stars, crosses)
- **ASCII Mode**: Convert images to ASCII art with customizable character sets

### 🎯 Powerful Controls
- **Flexible Sampling**: Grid or random pixel sampling patterns
- **Resolution Control**: Adjust detail level from 10-200 samples
- **Color Modes**:
  - Original colors from source image
  - Grayscale conversion
  - Duotone with custom color palettes
- **Size Modulation**: Scale shapes based on pixel brightness
- **Rotation Control**: Fixed or random rotation with adjustable ranges

### 📤 Export Options
- Download as **SVG** (vector format - infinitely scalable)
- Download as **PNG** (raster format with 2x resolution)
- Copy SVG code to clipboard

### 🎭 Marshmallow Horror Aesthetic
Dark, minimal interface with neon green accents and smooth animations.

## Demo

[Live Demo](#) _(Deploy to GitHub Pages for live demo link)_

## Screenshots

_Coming soon - upload some example outputs!_

## Getting Started

### Installation

1. Clone this repository:
```bash
git clone https://github.com/rickyars/pixelator.git
cd pixelator
```

2. Open `index.html` in a modern web browser:
```bash
# On macOS
open index.html

# On Linux
xdg-open index.html

# On Windows
start index.html
```

That's it! No build process or dependencies to install. Just open and use.

### Requirements

- Modern web browser with JavaScript enabled
- Internet connection (for D3.js CDN)
- For local D3.js: Download [D3.js v7](https://d3js.org/) and place in `lib/` folder

## Usage Guide

### Basic Workflow

1. **Upload an Image**
   - Drag and drop an image onto the upload zone, or
   - Click "Choose File" to select an image
   - Supported formats: JPG, PNG, GIF, WebP

2. **Choose a Mode**
   - Select "Shapes" to replace pixels with geometric shapes
   - Select "ASCII" to create ASCII art

3. **Adjust Parameters**
   - **Resolution**: Control how many samples to take (higher = more detail)
   - **Sampling Method**: Grid for uniform sampling, Random for scattered effect
   - **Color Mode**: Original, Grayscale, or Duotone

4. **Mode-Specific Settings**

   **Shape Mode:**
   - Choose shape type (circle, square, triangle, etc.)
   - Adjust base size
   - Enable "Scale by brightness" for dynamic sizing
   - Add rotation effects

   **ASCII Mode:**
   - Select character set or create custom
   - Adjust font size and family
   - Control character spacing
   - Invert brightness mapping

5. **Export Your Creation**
   - Click "Download SVG" for vector format
   - Click "Download PNG" for raster format

### Tips for Best Results

- **Start with lower resolution** (30-50) and adjust upward
- **Use grayscale or duotone** for more artistic effects
- **Enable size by brightness** in shape mode for depth
- **Try random sampling** with smaller shapes for stippled effects
- **Use ASCII mode with blocks** (░▒▓█) for retro computer aesthetics

## Project Structure

```
pixelator/
├── index.html              # Main HTML file
├── css/
│   ├── main.css           # Core styles and layout
│   └── controls.css       # UI controls styling
├── js/
│   ├── main.js            # App initialization and orchestration
│   ├── imageProcessor.js  # Image loading and pixel sampling
│   ├── shapes.js          # Shape path generators
│   ├── ascii.js           # ASCII character mapping
│   ├── renderer.js        # D3.js SVG rendering
│   ├── exporter.js        # Export to SVG/PNG
│   └── ui.js              # UI event handlers
└── README.md              # This file
```

## Technical Details

### Technologies Used
- **D3.js v7**: SVG generation and manipulation
- **Canvas API**: Image loading and pixel sampling
- **Vanilla JavaScript**: Core application logic
- **HTML5/CSS3**: User interface

### How It Works

1. **Image Loading**: Uses FileReader API to load image into memory
2. **Pixel Sampling**: Draws image to hidden canvas and samples pixel data
3. **Data Transformation**: Maps pixel RGB values to visual elements
4. **SVG Rendering**: Uses D3.js to create SVG elements bound to pixel data
5. **Export**: Serializes SVG or converts to PNG via canvas

### Performance Considerations

- **Debounced rendering**: Parameter changes are debounced by 300ms
- **Async processing**: Heavy operations use setTimeout to prevent UI blocking
- **Optimized for**: Up to 10,000 elements render smoothly
- **Memory efficient**: Cleans up resources after export

## API Reference

### ImageProcessor

```javascript
class ImageProcessor {
  loadImage(file)           // Load image from File object
  samplePixels(resolution, method)  // Sample pixels from image
  getPixelColor(x, y)       // Get RGB values at coordinates
  getBrightness(r, g, b)    // Calculate perceived brightness
  getDimensions()           // Get image width/height
  clear()                   // Clear loaded image
}
```

### ShapeGenerator

```javascript
class ShapeGenerator {
  static circle(size)       // Generate circle path
  static square(size)       // Generate square path
  static triangle(size)     // Generate triangle path
  static diamond(size)      // Generate diamond path
  static star(size)         // Generate star path
  static cross(size)        // Generate cross path
  static generate(sample, params)  // Generate shape with transforms
  static getColor(sample, params)  // Get color based on mode
}
```

### ASCIIMapper

```javascript
class ASCIIMapper {
  static CHARSETS           // Predefined character sets
  static mapBrightness(brightness, charset, invert)
  static generate(sample, params)  // Generate text element
}
```

### Renderer

```javascript
class Renderer {
  render(samples, mode, params)     // Render samples to SVG
  renderShapes(samples, params)     // Render shapes mode
  renderASCII(samples, params)      // Render ASCII mode
  clear()                           // Clear SVG canvas
  updateViewBox(width, height)      // Update SVG dimensions
  getSVGElement()                   // Get SVG DOM element
}
```

### Exporter

```javascript
class Exporter {
  static toSVG(svgElement, filename)      // Export as SVG file
  static toPNG(svgElement, scale, filename)  // Export as PNG file
  static toClipboard(svgElement)          // Copy SVG to clipboard
}
```

## Development Roadmap

### Phase 1: MVP ✅
- [x] Basic image upload and preview
- [x] Grid pixel sampling
- [x] Circle shape rendering
- [x] Original color mode
- [x] SVG export

### Phase 2: Shape System (In Progress)
- [x] All shape types (square, triangle, diamond, star, cross)
- [x] Size by brightness scaling
- [x] Rotation controls
- [x] All color modes (grayscale, duotone)
- [x] Random sampling mode

### Phase 3: ASCII System (In Progress)
- [x] ASCII character mapping
- [x] Multiple character sets
- [x] Font controls
- [x] Brightness inversion

### Phase 4: Polish & Export
- [ ] PNG export with custom scaling
- [ ] Preset templates
- [ ] Share URLs (encode params in URL hash)
- [ ] Performance optimization for large images

### Phase 5: Advanced Features (Future)
- [ ] Custom shape SVG upload
- [ ] Emoji replacement mode
- [ ] Halftone sampling pattern
- [ ] Animation export
- [ ] Batch processing
- [ ] WebGL acceleration

## Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Test thoroughly**
5. **Commit your changes**: `git commit -m 'Add amazing feature'`
6. **Push to branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Development Guidelines

- Keep code clean and well-commented
- Follow existing code style
- Test with various image types and sizes
- Update README for new features
- Maintain backward compatibility

## Browser Compatibility

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ⚠️ Mobile browsers (limited - use desktop for best experience)

## Known Issues

- Very large images (>4000px) may cause performance issues
- PNG export doesn't work in some older browsers
- Mobile drag-and-drop may be unreliable

## License

This project is licensed under the MIT License - see below for details:

```
MIT License

Copyright (c) 2024 [Your Name]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Inspiration & Credits

- Inspired by [Ruri.design](https://ruri.design) and their excellent Ruri Pixel tool
- Built with ❤️ by the open source community
- Uses [D3.js](https://d3js.org/) for SVG rendering

## Support

- 🐛 **Found a bug?** [Open an issue](https://github.com/rickyars/pixelator/issues)
- 💡 **Have an idea?** [Start a discussion](https://github.com/rickyars/pixelator/discussions)
- 📧 **Need help?** Contact via GitHub issues

## Acknowledgments

Special thanks to:
- The D3.js team for their amazing library
- Ruri.design for the inspiration
- All contributors and users

---

**Made with 🖤 by the marshmallow horror aesthetic**

[⬆ Back to top](#pixel-effects-tool)
