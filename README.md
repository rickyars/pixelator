# Pixel Effects Tool

A web-based tool that converts raster images into creative vector graphics by replacing pixels with shapes, ASCII characters, or custom symbols.

## Features

- **Multiple Rendering Modes**: Shape mode (circles, squares, diamonds, etc.) and ASCII mode with customizable character sets
- **Flexible Sampling**: Grid or random pixel sampling patterns
- **Color Modes**: Original, grayscale, or duotone
- **Dynamic Sizing**: Scale shapes based on pixel brightness
- **Rotation & Effects**: Control rotation and random pixel erasure
- **Export**: Download as SVG (vector) or PNG (raster)

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
   - Enable "Random pixel erasure" to randomly remove pixels for artistic effects

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
- **Use random erasure** (20-40%) for a distressed, glitch art aesthetic
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

Built with D3.js v7 for SVG generation, Canvas API for image sampling, and vanilla JavaScript.

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

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (limited - use desktop for best experience)

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

## License

This project is licensed under the MIT License.
