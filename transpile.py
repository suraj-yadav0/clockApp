import os
import re

SOURCE_DIR = "gnome-extension"
LEGACY_DIR = os.path.join(SOURCE_DIR, "legacy")

os.makedirs(LEGACY_DIR, exist_ok=True)

# 1. Generate extension-cjs.js
with open(os.path.join(SOURCE_DIR, "extension.js"), "r") as f:
    ext_js = f.read()

ext_js_cjs = re.sub(r"import Clutter from 'gi://Clutter';", "const Clutter = imports.gi.Clutter;", ext_js)
ext_js_cjs = re.sub(r"import GObject from 'gi://GObject';", "const GObject = imports.gi.GObject;", ext_js_cjs)
ext_js_cjs = re.sub(r"import St from 'gi://St';", "const St = imports.gi.St;", ext_js_cjs)
ext_js_cjs = re.sub(r"import Pango from 'gi://Pango';", "const Pango = imports.gi.Pango;", ext_js_cjs)
ext_js_cjs = re.sub(r"import GLib from 'gi://GLib';", "const GLib = imports.gi.GLib;", ext_js_cjs)
ext_js_cjs = re.sub(r"import Gio from 'gi://Gio';", "const Gio = imports.gi.Gio;", ext_js_cjs)
ext_js_cjs = re.sub(r"import \* as Main from 'resource:///org/gnome/shell/ui/main\.js';", "const Main = imports.ui.main;", ext_js_cjs)
ext_js_cjs = re.sub(r"import \{ Extension \} from 'resource:///org/gnome/shell/extensions/extension\.js';", "const ExtensionUtils = imports.misc.extensionUtils;\nconst Me = ExtensionUtils.getCurrentExtension();", ext_js_cjs)

# Replace export default class ClockFaceExtension extends Extension
class_replacement = """class ClockFaceExtension {
    constructor() {
        this._settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.clock-face');
    }

    getSettings() {
        return this._settings;
    }"""
ext_js_cjs = re.sub(r"export default class ClockFaceExtension extends Extension \{", class_replacement, ext_js_cjs)

# Add init function at the end
ext_js_cjs += "\n\nfunction init() {\n    return new ClockFaceExtension();\n}\n"

with open(os.path.join(LEGACY_DIR, "extension-cjs.js"), "w") as f:
    f.write(ext_js_cjs)


# 2. Generate prefs-adw.js (for GNOME 42-44)
with open(os.path.join(SOURCE_DIR, "prefs.js"), "r") as f:
    prefs_js = f.read()

prefs_adw = re.sub(r"import Adw from 'gi://Adw';", "const Adw = imports.gi.Adw;", prefs_js)
prefs_adw = re.sub(r"import Gtk from 'gi://Gtk';", "const Gtk = imports.gi.Gtk;", prefs_adw)
prefs_adw = re.sub(r"import Gdk from 'gi://Gdk';", "const Gdk = imports.gi.Gdk;", prefs_adw)
prefs_adw = re.sub(r"import GLib from 'gi://GLib';", "const GLib = imports.gi.GLib;", prefs_adw)
prefs_adw = re.sub(r"import \{ ExtensionPreferences \} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs\.js';", "const ExtensionUtils = imports.misc.extensionUtils;\nconst Me = ExtensionUtils.getCurrentExtension();", prefs_adw)

adw_class_replacement = """function init() {
    ExtensionUtils.initTranslations();
}

function fillPreferencesWindow(window) {
    const settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.clock-face');
"""
# Replace the export default class fillPreferencesWindow with just a top level function fillPreferencesWindow
prefs_adw = re.sub(r"export default class ClockFacePreferences extends ExtensionPreferences \{\n\s*fillPreferencesWindow\(window\) \{\n\s*const settings = this.getSettings\(\);\n", adw_class_replacement, prefs_adw)

# Remove the trailing } of the class
prefs_adw = prefs_adw.rstrip()
if prefs_adw.endswith("}"):
    prefs_adw = prefs_adw[:-1]

with open(os.path.join(LEGACY_DIR, "prefs-adw.js"), "w") as f:
    f.write(prefs_adw)

print("Generated legacy CJS files for extension and prefs-adw.")
