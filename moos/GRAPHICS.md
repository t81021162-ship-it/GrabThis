# 🎨 MOoOS Graphics & GUI System

## Overview

MOoOS v0.1.0-FIXED-3 includes a **complete graphics framework** with VBE/Framebuffer support and a farm-themed GUI.

## Graphics Architecture

### Framebuffer Support
- **VBE (VESA BIOS Extensions)** support for modern video cards
- **Framebuffer mode** fallback for compatibility
- **Multiple resolutions:**
  - 640x480 @ 32-bit color (default)
  - 800x600 @ 32-bit color
  - 1024x768 @ 32-bit color (if supported)

### Color Scheme (Farm-Themed)
```rust
GRASS_GREEN     #228B22  - Main UI elements
SKY_BLUE        #87CEFA  - Background
BARN_RED        #B22222  - Borders, titles
CREAM           #F0F0F0  - Panels, windows
DARK_GRAY       #404040  - Text, dark elements
COW_BROWN       #8B5A2B  - Accents
WHITE           #FFFFFF  - Highlights
```

## Graphics Framework

### Core Components

#### Framebuffer
```rust
pub struct Framebuffer {
    width: u32,      // Screen width in pixels
    height: u32,     // Screen height in pixels
    pitch: u32,      // Bytes per scanline
    bpp: u32,        // Bits per pixel (32)
    address: *mut u32  // VRAM address
}
```

#### Graphics Engine
Provides basic drawing operations:
- `clear(color)` - Clear entire screen
- `draw_pixel(x, y, color)` - Draw single pixel
- `draw_rect(rect, color)` - Draw filled rectangle
- `draw_rect_outline(rect, color, thickness)` - Draw rectangle border
- `draw_line(x1, y1, x2, y2, color)` - Draw line
- `draw_circle(cx, cy, radius, color)` - Draw circle

### GUI Framework

#### Window System
```rust
struct Window {
    title: &str,
    rect: Rect,        // Position and size
    bg_color: Color,   // Background
    fg_color: Color,   // Foreground
}
```

#### UI Elements
- **Button** - Clickable buttons with labels
- **Label** - Text labels
- **Panel** - Container panels
- **DialogBox** - Modal dialogs
- **DesktopEnvironment** - Full desktop with wallpaper

#### Farm-Themed Desktop
- Sky blue wallpaper
- Grass at bottom
- Barn and cow scene
- Taskbar with window buttons

## Visual Elements

### Barn Drawing
- Red rectangular structure
- Dark gray door
- Brown triangular roof

### Cow Drawing
- Brown circular body
- Two small ear circles
- Simple but recognizable

### Decorative Elements
- Grass fields at bottom
- Sky background
- Farm fencing
- Window decorations

## Shell Graphics Features

The graphical shell (`moos-shell`) includes:

### ASCII Art Desktop
```
╔═ MOoOS Desktop ═╗
│  📁 My Farm     │  🎨 Graphics
│  • Barn         │  ┌─────────────┐
│  • Fields       │  │ ▯ Shell     │
│  • Pasture      │  │ ▯ Antivirus │
└─────────────────┘  │ ▯ Dashboard │
                     └─────────────┘
```

### Interactive Commands
- `gui` - Display GUI mockup
- `graphics` - Check graphics mode status
- `weather` - Farm weather (ASCII art)
- `farm` - Farm status with graphics
- `moo` - ASCII cow with speech bubble

### Window Decorations
- Title bars in barn-red color
- Borders and outlines
- Status indicators
- Button highlights

## Boot Sequence

### Graphics Initialization
1. **POST** - BIOS initializes video card
2. **GRUB** - Loads and executes kernel
3. **Kernel** - Detects VBE support
4. **Driver** - Initializes graphics mode
5. **GUI** - Desktop environment loads

### Boot Messages
The kernel now displays:
```
✓ VGA text mode initialized
✓ Graphics framework loaded
✓ GUI system ready
✓ Memory mapped
```

## Future Enhancements

### Phase 2 (Planned)
- [ ] Font rendering system
- [ ] Text rendering in graphics mode
- [ ] Mouse/keyboard input handling
- [ ] Window manager (tiling/floating)
- [ ] Menu system

### Phase 3 (Planned)
- [ ] True color graphics (no text mode)
- [ ] 3D rendering support
- [ ] Sprite system
- [ ] Animation framework
- [ ] Game engine integration

### Phase 4 (Planned)
- [ ] OpenGL-like graphics API
- [ ] Texture mapping
- [ ] Lighting effects
- [ ] Transparency/blending
- [ ] Hardware acceleration

## Rendering Pipeline

```
┌─ Application ─┐
│ GUI Shell    │
└───────────┬──┘
            │
        ┌───▼────┐
        │ GUI Fw │ (Buttons, Windows, etc)
        └───┬────┘
            │
        ┌───▼──────────┐
        │ Graphics Eng │ (Draw primitives)
        └───┬──────────┘
            │
        ┌───▼──────────┐
        │ Framebuffer  │ (Pixel operations)
        └───┬──────────┘
            │
        ┌───▼───┐
        │ Video │ (VBE/VGA)
        │ Card  │
        └───────┘
```

## Performance Considerations

### Optimization Techniques
- Dirty rectangle tracking (planned)
- Double buffering (planned)
- Hardware cursor support (planned)
- Video memory management (planned)

### Memory Usage
- Framebuffer size: 640x480x4 bytes = 1.2MB
- Graphics structures: ~64KB
- GUI elements: ~256KB total
- Total graphics overhead: ~1.5MB

## Building with Graphics

### Build the ISO
```bash
cd moos
make build
make run  # Runs in QEMU with graphics
```

### QEMU Parameters for Graphics
```bash
qemu-system-i386 -m 512 \
  -drive format=raw,file=MOoOS-v0.1.0-FIXED-3.iso \
  -vga std
```

## Testing Graphics

### In QEMU
```bash
qemu-system-i386 -m 512 -cdrom MOoOS-v0.1.0-FIXED-3.iso -vga std
# GRUB boots → Select "Kernel"
# Boot messages with graphics info
# Type 'gui' in shell to see GUI mockup
```

### On Real Hardware
1. Burn ISO to USB
2. Boot from USB
3. Graphics should initialize automatically
4. GRUB menu with graphics enabled

## Architecture Notes

### Why Framebuffer?
- Universal compatibility (works on all modern hardware)
- Simpler than separate X11-style system
- Direct pixel manipulation
- Perfect for embedded systems

### VBE Advantages
- Hardware acceleration potential
- Higher resolutions
- Color depth flexibility
- Standard BIOS interface

### Fallback Strategy
1. Try VBE modes (preferred)
2. Fall back to VGA text mode
3. Use safe defaults if needed
4. Always boot successfully

---

**Graphics System v0.1 - Made with 🎨 by the MOoOS Farm**

*Transparent graphics for transparent farming!*
