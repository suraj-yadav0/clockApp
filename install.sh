#!/bin/bash
# Install script for Clock Face GNOME Extension

EXTENSION_ID="clock-face@suraj.local"
INSTALL_DIR="$HOME/.local/share/gnome-shell/extensions/$EXTENSION_ID"
REPO_URL="https://github.com/suraj-yadav0/clockApp.git"

TEMP_DIR=""
cleanup() {
    if [ -n "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
        rm -rf "$TEMP_DIR"
    fi
}
trap cleanup EXIT

echo "🧩 Installing Clock Face Extension..."

# Determine source directory (handles local run and curl | bash pipe)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd)"

if [ -d "$SCRIPT_DIR/gnome-extension" ]; then
    SOURCE_DIR="$SCRIPT_DIR/gnome-extension"
else
    echo "🌐 Remote execution detected. Fetching latest files..."
    TEMP_DIR=$(mktemp -d)
    if command -v git &>/dev/null; then
        git clone --depth 1 "$REPO_URL" "$TEMP_DIR/clockApp" &>/dev/null || {
            echo "❌ Failed to clone repository."
            exit 1
        }
    else
        curl -sSL "https://github.com/suraj-yadav0/clockApp/archive/refs/heads/main.tar.gz" | tar -xz -C "$TEMP_DIR" || {
            echo "❌ Failed to download source code."
            exit 1
        }
        mv "$TEMP_DIR"/clockApp-main "$TEMP_DIR/clockApp" 2>/dev/null || true
    fi
    SOURCE_DIR="$TEMP_DIR/clockApp/gnome-extension"
fi

# Create destination directory
mkdir -p "$INSTALL_DIR"

# Detect GNOME Shell Version
GNOME_VERSION_FULL=$(gnome-shell --version 2>/dev/null | grep -oP '[0-9]+(\.[0-9]+)?' | head -n1)
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

# Install custom fonts
FONT_DEST="$HOME/.local/share/fonts"
mkdir -p "$FONT_DEST"
if [ -f "$SOURCE_DIR/Anurati-Regular.otf" ]; then
    echo "🅰️  Installing custom font (Anurati)..."
    cp "$SOURCE_DIR/Anurati-Regular.otf" "$FONT_DEST/"
    if command -v fc-cache &>/dev/null; then
        fc-cache -f "$FONT_DEST"
    fi
fi

# Copy and compile GSettings schema
SCHEMA_SRC="$SOURCE_DIR/schemas"
SCHEMA_DEST="$INSTALL_DIR/schemas"
mkdir -p "$SCHEMA_DEST"
cp "$SCHEMA_SRC/"*.gschema.xml "$SCHEMA_DEST/"

if command -v glib-compile-schemas &>/dev/null; then
    glib-compile-schemas "$SCHEMA_DEST"
    echo "✅ GSettings schemas compiled."
else
    echo "⚠️  glib-compile-schemas not found – install glib2 / libglib2.0-dev and rerun."
fi

# Try enabling extension automatically
if command -v gnome-extensions &>/dev/null; then
    gnome-extensions enable "$EXTENSION_ID" &>/dev/null
fi

echo "✅ Extension files successfully installed to $INSTALL_DIR"
echo ""
echo "⚠️  IMPORTANT:"
echo "To activate the extension, you may need to restart GNOME Shell."
echo "  - On Wayland: Log out and log back in (or lock & unlock screen)."
echo "  - On X11: Press Alt+F2, type 'r', and press Enter."
echo ""
echo "Enable manually (if not enabled):"
echo "  gnome-extensions enable $EXTENSION_ID"
echo ""
echo "Open Preferences:"
echo "  gnome-extensions prefs $EXTENSION_ID"
