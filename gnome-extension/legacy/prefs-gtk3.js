const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

function init() {
    ExtensionUtils.initTranslations();
}

function cssToRgba(css) {
    const rgba = new Gdk.RGBA();
    if (!rgba.parse(css)) {
        const m = css.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/);
        if (m) {
            rgba.red   = parseInt(m[1]) / 255;
            rgba.green = parseInt(m[2]) / 255;
            rgba.blue  = parseInt(m[3]) / 255;
            rgba.alpha = m[4] !== undefined ? parseFloat(m[4]) : 1.0;
        } else {
            rgba.red = rgba.green = rgba.blue = rgba.alpha = 1.0;
        }
    }
    return rgba;
}

function rgbaToCss(rgba) {
    const r = Math.round(rgba.red   * 255);
    const g = Math.round(rgba.green * 255);
    const b = Math.round(rgba.blue  * 255);
    const a = Math.round(rgba.alpha * 100) / 100;
    return `rgba(${r},${g},${b},${a})`;
}

const ClockFacePrefsWidget = GObject.registerClass(
class ClockFacePrefsWidget extends Gtk.Grid {
    _init() {
        super._init({
            margin: 18,
            column_spacing: 12,
            row_spacing: 12,
            visible: true,
            orientation: Gtk.Orientation.VERTICAL
        });
        
        this._settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.clock-face');
        
        let row = 0;
        
        const addRow = (label, widget) => {
            const lbl = new Gtk.Label({ label: label, xalign: 0, visible: true });
            this.attach(lbl, 0, row, 1, 1);
            widget.visible = true;
            widget.valign = Gtk.Align.CENTER;
            widget.hexpand = true;
            widget.halign = Gtk.Align.END;
            this.attach(widget, 1, row, 1, 1);
            row++;
        };
        
        // Colors
        const dayColorBtn = new Gtk.ColorButton({ use_alpha: true, rgba: cssToRgba(this._settings.get_string('day-color')) });
        dayColorBtn.connect('color-set', () => this._settings.set_string('day-color', rgbaToCss(dayColorBtn.get_rgba())));
        addRow("Day label color", dayColorBtn);
        
        const dateColorBtn = new Gtk.ColorButton({ use_alpha: true, rgba: cssToRgba(this._settings.get_string('date-color')) });
        dateColorBtn.connect('color-set', () => this._settings.set_string('date-color', rgbaToCss(dateColorBtn.get_rgba())));
        addRow("Date label color", dateColorBtn);
        
        const timeColorBtn = new Gtk.ColorButton({ use_alpha: true, rgba: cssToRgba(this._settings.get_string('time-color')) });
        timeColorBtn.connect('color-set', () => this._settings.set_string('time-color', rgbaToCss(timeColorBtn.get_rgba())));
        addRow("Time label color", timeColorBtn);
        
        // Font
        const fontBtn = new Gtk.FontButton({ use_size: false, use_font: true, font: `${this._settings.get_string('font-family')} 12` });
        fontBtn.connect('font-set', () => {
            const desc = fontBtn.get_font_desc();
            if (desc) this._settings.set_string('font-family', desc.get_family());
        });
        addRow("Day label font", fontBtn);
        
        // Settings
        const opacityScale = new Gtk.Scale({
            orientation: Gtk.Orientation.HORIZONTAL,
            adjustment: new Gtk.Adjustment({ lower: 0.0, upper: 1.0, step_increment: 0.05, value: this._settings.get_double('clock-opacity') }),
            digits: 2, draw_value: true, value_pos: Gtk.PositionType.RIGHT, width_request: 200
        });
        opacityScale.connect('value-changed', () => this._settings.set_double('clock-opacity', opacityScale.get_value()));
        addRow("Clock opacity", opacityScale);
        
        // Time format
        const formatCombo = new Gtk.ComboBoxText();
        formatCombo.append('12h', '12-hour (AM/PM)');
        formatCombo.append('24h', '24-hour');
        formatCombo.set_active_id(this._settings.get_string('time-format'));
        formatCombo.connect('changed', () => this._settings.set_string('time-format', formatCombo.get_active_id()));
        addRow("Time format", formatCombo);
        
        // Show seconds
        const secSwitch = new Gtk.Switch({ active: this._settings.get_boolean('show-seconds') });
        secSwitch.connect('notify::active', () => this._settings.set_boolean('show-seconds', secSwitch.active));
        addRow("Show seconds", secSwitch);
        
        // Scale
        const scaleScale = new Gtk.Scale({
            orientation: Gtk.Orientation.HORIZONTAL,
            adjustment: new Gtk.Adjustment({ lower: 0.3, upper: 5.0, step_increment: 0.1, value: this._settings.get_double('clock-scale') }),
            digits: 1, draw_value: true, value_pos: Gtk.PositionType.RIGHT, width_request: 200
        });
        scaleScale.connect('value-changed', () => this._settings.set_double('clock-scale', scaleScale.get_value()));
        addRow("Clock scale", scaleScale);
        
        // Position X
        const xSpin = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({ lower: 0, upper: 7680, step_increment: 10, value: this._settings.get_int('clock-x') }),
            digits: 0
        });
        xSpin.connect('value-changed', () => this._settings.set_int('clock-x', xSpin.get_value_as_int()));
        addRow("Horizontal position (X)", xSpin);
        
        // Position Y
        const ySpin = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({ lower: 0, upper: 4320, step_increment: 10, value: this._settings.get_int('clock-y') }),
            digits: 0
        });
        ySpin.connect('value-changed', () => this._settings.set_int('clock-y', ySpin.get_value_as_int()));
        addRow("Vertical position (Y)", ySpin);
    }
});

function buildPrefsWidget() {
    let widget = new ClockFacePrefsWidget();
    widget.show_all();
    return widget;
}
