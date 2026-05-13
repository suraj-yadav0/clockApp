#!/bin/bash
# Install script for Clock Face GNOME Extension

EXTENSION_ID="clock-face@suraj.local"
INSTALL_DIR="$HOME/.local/share/gnome-shell/extensions/$EXTENSION_ID"
SOURCE_DIR="$(cd "$(dirname "$0")/gnome-extension" && pwd)"

echo "🧩 Installing Clock Face Extension..."

# Create destination directory
mkdir -p "$INSTALL_DIR"

# Copy files
GNOME_VERSION_FULL=$(gnome-shell --version | grep -oP '[0-9]+(\.[0-9]+)?' | head -n1)
GNOME_MAJOR=$(echo "$GNOME_VERSION_FULL" | cut -d. -f1)

if [ -z "$GNOME_MAJOR" ]; then
    echo "⚠️  Could not detect GNOME Shell version. Defaulting to ESM (GNOME 45+)."
    GNOME_MAJOR=45
fi

# Copy base files
cp "$SOURCE_DIR/metadata.json" "$INSTALL_DIR/"
cp "$SOURCE_DIR/stylesheet.css" "$INSTALL_DIR/"

if [ "$GNOME_MAJOR" = "3" ]; then
    echo "ℹ️  Detected GNOME 3.x (GTK3). Installing legacy version."
    cp "$SOURCE_DIR/legacy/extension-cjs.js" "$INSTALL_DIR/extension.js"
    cp "$SOURCE_DIR/legacy/prefs-gtk3.js" "$INSTALL_DIR/prefs.js"
elif [ "$GNOME_MAJOR" -lt "42" ]; then
    echo "ℹ️  Detected GNOME 40/41 (GTK3). Installing legacy version."
    cp "$SOURCE_DIR/legacy/extension-cjs.js" "$INSTALL_DIR/extension.js"
    cp "$SOURCE_DIR/legacy/prefs-gtk3.js" "$INSTALL_DIR/prefs.js"
elif [ "$GNOME_MAJOR" -lt "45" ]; then
    echo "ℹ️  Detected GNOME 42-44 (Adwaita, CJS). Installing legacy Adwaita version."
    cp "$SOURCE_DIR/legacy/extension-cjs.js" "$INSTALL_DIR/extension.js"
    cp "$SOURCE_DIR/legacy/prefs-adw.js" "$INSTALL_DIR/prefs.js"
else
    echo "ℹ️  Detected GNOME 45+ (ESM). Installing modern version."
    cp "$SOURCE_DIR/extension.js" "$INSTALL_DIR/extension.js"
    cp "$SOURCE_DIR/prefs.js" "$INSTALL_DIR/prefs.js"
fi

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
