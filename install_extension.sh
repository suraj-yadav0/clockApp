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
cp "$SOURCE_DIR/prefs.js" "$INSTALL_DIR/"
cp "$SOURCE_DIR/stylesheet.css" "$INSTALL_DIR/"

# Copy and compile GSettings schema
SCHEMA_SRC="$SOURCE_DIR/schemas"
SCHEMA_DEST="$INSTALL_DIR/schemas"
mkdir -p "$SCHEMA_DEST"
cp "$SCHEMA_SRC/"*.gschema.xml "$SCHEMA_DEST/"

if command -v glib-compile-schemas &>/dev/null; then
    glib-compile-schemas "$SCHEMA_DEST"
    echo "✅ GSettings schemas compiled"
else
    echo "⚠️  glib-compile-schemas not found – install glib2 / libglib2.0-dev and rerun."
fi

echo "✅ Extension files installed to $INSTALL_DIR"
echo ""
echo "⚠️  IMPORTANT:"
echo "To enable the extension, you may need to restart GNOME Shell."
echo "  - On Wayland: Log out and log back in."
echo "  - On X11: Press Alt+F2, type 'r', and press Enter."
echo ""
echo "Then enable it with:"
echo "  gnome-extensions enable $EXTENSION_ID"
echo ""
echo "Open the settings panel with:"
echo "  gnome-extensions prefs $EXTENSION_ID"
