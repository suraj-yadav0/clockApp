# Clock Face

A stylish desktop clock implementation for GNOME, consisting of both a standalone application and a GNOME Shell extension. The project focuses on a modern, geometric aesthetic using specific typography and visual effects.

## What It Does

This project provides two ways to display a custom clock on your desktop:

1.  **Standalone Application**: A floating window clock that can be toggled to be borderless, fullscreen, or always-on-top. It renders a high-quality clock face with Day, Date, and Time.
2.  **GNOME Shell Extension**: Integrates the clock directly into the desktop background (wallpaper layer). It allows for interactive positioning and resizing directly on the desktop.

Both implementations share a consistent visual style featuring the Anurati font for the day of the week and Noto Sans for the date/time, set against a dark or transparent background.

<img width="1650" height="677" alt="image" src="https://github.com/user-attachments/assets/57de0d47-2a57-4adb-95b6-224238c087b8" />



## Technology Stack

The project utilizes the following technologies:

### Core
*   **Linux/GNOME**: The target environment.
*   **Cairo**: Used for 2D graphics rendering (gradients, shapes, transparency).
*   **Pango**: Used for advanced text rendering and font handling.

### Standalone Application
*   **Python 3**: The primary programming language.
*   **GTK4**: The GUI toolkit used for the window and application structure.
*   **PyGObject**: Python bindings for GObject-based libraries (GTK, GDK, Gio).

### GNOME Extension
*   **JavaScript (GJS)**: The scripting language for GNOME Shell extensions.
*   **Clutter**: A scene graph library used by GNOME Shell for composing the user interface.
*   **St**: The Shell Toolkit, providing widgets and styling support.
*   **GObject**: The base object system.

## Architecture

The project is divided into two distinct components that operate independently but share design principles.

### 1. Standalone Python App (`clock_app.py`)
This application follows a standard GTK4 architecture:
*   **ClockWindow**: Extends `Gtk.ApplicationWindow`. It manages the window state (fullscreen, decorated, keep-above) and input handling (mouse drag, keyboard shortcuts).
*   **ClockFace**: A custom `Gtk.DrawingArea`. It overrides the `_on_draw` method to perform manual rendering using a Cairo context.
    *   **Rendering Pipeline**: Draws a gradient background -> Applies a vignette -> Calculates responsive scaling -> Renders text using Pango layouts -> Draws decorative lines.
*   **Event Handling**: Uses `Gtk.EventControllerKey` for shortcuts and `Gtk.GestureDrag` for window movement.

### 2. GNOME Shell Extension (`gnome-extension/`)
This component hooks directly into the GNOME Shell environment:
*   **Extension Class**: Manages the lifecycle (enable/disable) of the extension. It attempts to inject the widget into `Main.layoutManager._backgroundGroup` to ensure it stays behind application windows (on the desktop layer).
*   **ClockWidget**: A custom class extending `St.BoxLayout`.
    *   **UI Construction**: Composes standard labels (`St.Label`) for Day, Date, and Time.
    *   **Interactivity**: Implements Clutter event listeners for `button-press` (drag start), `motion` (dragging), and `scroll` (scaling).
    *   **Persistence**: Saves user preferences (position and scale) to a JSON file in `~/.config/clock-face/`.

## How to Use It

### Installation

**For the Standalone App:**
Run the installation script to copy files to `~/.local/share/clock-face` and create a desktop entry.
```bash
./install.sh
```

**For the GNOME Extension:**
Run the extension installer.
```bash
./install_extension.sh
```
After installation, you must restart the GNOME Shell (Log out/in on Wayland, or Alt+F2 > r on X11) and enable the extension:
```bash
gnome-extensions enable clock-face@suraj.local
```

### Usage Controls

**Standalone App:**
*   **Launch**: Open "Clock Face" from your applications menu or run `python3 ~/.local/share/clock-face/clock_app.py`.
*   **Drag**: Click and hold anywhere on the window to move it.
*   **Shortcuts**:
    *   `F11`: Toggle Fullscreen.
    *   `B`: Toggle Borderless mode (removes window decorations).
    *   `T`: Toggle Always-on-Top.
    *   `Q`: Quit the application.
    *   `Esc`: Exit Fullscreen.

**GNOME Extension:**
*   **Positioning**: Click and drag the clock text on your desktop to move it.
*   **Resizing**: Scroll up/down while hovering over the clock to increase or decrease its size.
*   **Persistence**: The position and size are automatically saved and restored on reboot.
