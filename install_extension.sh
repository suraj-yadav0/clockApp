#!/bin/bash
# Install script for Clock Face GNOME Extension

EXTENSION_ID="clock-face@suraj.local"
INSTALL_DIR="$HOME/.local/share/gnome-shell/extensions/$EXTENSION_ID"
SOURCE_DIR="$(cd "$(dirname "$0")/gnome-extension" && pwd)"

echo "🧩 Installing Clock Face Extension..."

# Create destination directory
mkdir -p "$INSTALL_DIR"

# Copy files
cp "$SOURCE_DIR/metadata.json" "$INSTALL_DIR/"
cp "$SOURCE_DIR/extension.js" "$INSTALL_DIR/"
cp "$SOURCE_DIR/stylesheet.css" "$INSTALL_DIR/"

echo "✅ Extension files installed to $INSTALL_DIR"
echo ""
echo "⚠️  IMPORTANT:"
echo "To enable the extension, you may need to restart GNOME Shell."
echo "  - On Wayland: Log out and log back in."
echo "  - On X11: Press Alt+F2, type 'r', and press Enter."
echo ""
echo "Then enable it with:"
echo "  gnome-extensions enable $EXTENSION_ID"
