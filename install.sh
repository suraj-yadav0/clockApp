#!/bin/bash
# Clock Face App - Install Script
# Installs the app to ~/.local/share/clock-face/ and adds a desktop entry.

set -e

APP_DIR="$HOME/.local/share/clock-face"
DESKTOP_DIR="$HOME/.local/share/applications"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🕐 Installing Clock Face..."

# Create app directory
mkdir -p "$APP_DIR"

# Copy the app
cp "$SCRIPT_DIR/clock_app.py" "$APP_DIR/clock_app.py"
chmod +x "$APP_DIR/clock_app.py"

# Install desktop entry
mkdir -p "$DESKTOP_DIR"
cp "$SCRIPT_DIR/clock-face.desktop" "$DESKTOP_DIR/clock-face.desktop"

# Update desktop database (optional, may fail silently)
update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true

echo "✅ Clock Face installed successfully!"
echo ""
echo "You can now:"
echo "  • Find 'Clock Face' in your application launcher"
echo "  • Run it from terminal: python3 $APP_DIR/clock_app.py"
echo ""
echo "Keyboard shortcuts:"
echo "  F11  - Toggle fullscreen"
echo "  B    - Toggle borderless mode"
echo "  T    - Toggle always-on-top"
echo "  Q    - Quit"
echo "  Esc  - Exit fullscreen"
