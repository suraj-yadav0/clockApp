# Clock Face Background GNOME Extension

A stylish, minimalist clock face rendered directly on your GNOME desktop background using the beautiful Anurati font. 

<img width="1650" height="677" alt="image" src="https://github.com/user-attachments/assets/57de0d47-2a57-4adb-95b6-224238c087b8" />

## Features
- Blends beautifully with standard desktop backgrounds.
- Customizable position, scale, and color through extension preferences.
- 12h/24h toggle support.
- Fully compatible with modern GNOME Shell versions (42+).

## Installation

You can install this extension easily using the provided installation script. The script compiles any necessary schemas and moves the extension to your local extensions folder.

1. Clone or download this repository:
   ```bash
   git clone https://github.com/suraj-yadav0/clockApp.git
   cd clockApp
   ```

2. Run the installer:
   ```bash
   ./install.sh
   ```

3. Restart GNOME Shell (if on X11/Xorg, press `Alt+F2`, type `r`, and press `Enter`. If on Wayland, you may need to log out and log back in).

4. Enable the extension using the [**Extensions** app](https://flathub.org/apps/details/org.gnome.Extensions) or via command line:
   ```bash
   gnome-extensions enable clock-face@suraj.local
   ```

## Configuration

You can configure the appearance of the clock through the GNOME Extensions app or Extension Manager:
- Change clock color.
- Adjust font size and scaling.
- Control the horizontal and vertical margins.
- Toggle between 12-hour and 24-hour formats.

## Development & Manual Build

If you are developing or want to transpile the code for legacy GNOME versions (such as older CJS environments):
```bash
python3 transpile.py
```
This builds legacy definitions into `gnome-extension/legacy/`.
