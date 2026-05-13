const Adw = imports.gi.Adw;
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Parse a CSS color string ("rgba(r,g,b,a)" or "#rrggbb") into a Gdk.RGBA.
 * Falls back to opaque white on any error.
 */
function cssToRgba(css) {
    const rgba = new Gdk.RGBA();
    if (!rgba.parse(css)) {
        // Try the "rgba(r,g,b,a)" form ourselves
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

/** Serialize a Gdk.RGBA back to a CSS rgba() string. */
function rgbaToCss(rgba) {
    const r = Math.round(rgba.red   * 255);
    const g = Math.round(rgba.green * 255);
    const b = Math.round(rgba.blue  * 255);
    const a = Math.round(rgba.alpha * 100) / 100;
    return `rgba(${r},${g},${b},${a})`;
}

/** Build a labeled Adw.ActionRow containing a Gtk.ColorButton on the right. */
function makeColorRow(title, subtitle, settings, key) {
    const row = new Adw.ActionRow({ title, subtitle });

    const btn = new Gtk.ColorButton({
        use_alpha: true,
        valign: Gtk.Align.CENTER,
        rgba: cssToRgba(settings.get_string(key)),
    });

    btn.connect('color-set', () => {
        settings.set_string(key, rgbaToCss(btn.get_rgba()));
    });

    settings.connect(`changed::${key}`, () => {
        btn.set_rgba(cssToRgba(settings.get_string(key)));
    });

    row.add_suffix(btn);
    row.set_activatable_widget(btn);
    return row;
}

/** Build an Adw.ActionRow with a horizontal Gtk.Scale on the right. */
function makeSliderRow(title, subtitle, settings, key, min, max, step, digits) {
    const row = new Adw.ActionRow({ title, subtitle });

    const scale = new Gtk.Scale({
        orientation: Gtk.Orientation.HORIZONTAL,
        adjustment: new Gtk.Adjustment({
            lower: min,
            upper: max,
            step_increment: step,
            page_increment: step * 10,
            value: settings.get_double(key),
        }),
        digits,
        width_request: 200,
        valign: Gtk.Align.CENTER,
        draw_value: true,
        value_pos: Gtk.PositionType.RIGHT,
    });

    // Debounce slider writes so GSettings is only updated 300 ms after the
    // user stops dragging (avoids a burst of dconf writes per animation frame).
    let debounceId = null;
    scale.connect('value-changed', () => {
        if (debounceId !== null) {
            GLib.source_remove(debounceId);
            debounceId = null;
        }
        debounceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
            settings.set_double(key, scale.get_value());
            debounceId = null;
            return GLib.SOURCE_REMOVE;
        });
    });

    settings.connect(`changed::${key}`, () => {
        // Avoid feedback loop: only update the slider when the change did not
        // originate from our own debounce write.
        const newVal = settings.get_double(key);
        if (Math.abs(scale.get_value() - newVal) > 0.001)
            scale.set_value(newVal);
    });

    row.add_suffix(scale);
    return row;
}

// ── Preferences window ────────────────────────────────────────────────────

function init() {
    ExtensionUtils.initTranslations();
}

function fillPreferencesWindow(window) {
    const settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.clock-face');

        window.set_default_size(640, 680);
        window.set_title('Clock Face Settings');

        // ── Page 1: Appearance ────────────────────────────────────────────
        const appearancePage = new Adw.PreferencesPage({
            title: 'Appearance',
            icon_name: 'applications-graphics-symbolic',
        });
        window.add(appearancePage);

        // Colors group
        const colorsGroup = new Adw.PreferencesGroup({
            title: 'Colors',
            description: 'Customize the color of each clock element',
        });
        appearancePage.add(colorsGroup);

        colorsGroup.add(makeColorRow(
            'Day label color',
            'Color of the day-of-week text',
            settings, 'day-color'
        ));
        colorsGroup.add(makeColorRow(
            'Date label color',
            'Color of the date line (day number, month, year)',
            settings, 'date-color'
        ));
        colorsGroup.add(makeColorRow(
            'Time label color',
            'Color of the hours / minutes line',
            settings, 'time-color'
        ));

        // Opacity group
        const opacityGroup = new Adw.PreferencesGroup({
            title: 'Opacity',
            description: 'Overall transparency of the clock widget',
        });
        appearancePage.add(opacityGroup);

        opacityGroup.add(makeSliderRow(
            'Clock opacity',
            '0 = fully transparent, 1 = fully opaque',
            settings, 'clock-opacity',
            0.0, 1.0, 0.05, 2
        ));

        // Font group
        const fontGroup = new Adw.PreferencesGroup({
            title: 'Font',
            description: 'Font used for the day-of-week label',
        });
        appearancePage.add(fontGroup);

        const fontRow = new Adw.ActionRow({
            title: 'Day label font',
            subtitle: 'Font family for the large day-of-week display',
        });

        const fontBtn = new Gtk.FontButton({
            valign: Gtk.Align.CENTER,
            // Show only the family – we don't change the size here
            use_size: false,
            use_font: true,
            font: `${settings.get_string('font-family')} 12`,
        });

        fontBtn.connect('font-set', () => {
            const desc = fontBtn.get_font_desc();
            if (desc) {
                settings.set_string('font-family', desc.get_family());
            }
        });

        settings.connect('changed::font-family', () => {
            fontBtn.set_font(`${settings.get_string('font-family')} 12`);
        });

        fontRow.add_suffix(fontBtn);
        fontRow.set_activatable_widget(fontBtn);
        fontGroup.add(fontRow);

        // ── Page 2: Display ───────────────────────────────────────────────
        const displayPage = new Adw.PreferencesPage({
            title: 'Display',
            icon_name: 'preferences-system-time-symbolic',
        });
        window.add(displayPage);

        // Time format group
        const timeGroup = new Adw.PreferencesGroup({
            title: 'Time',
            description: 'Configure how the time is displayed',
        });
        displayPage.add(timeGroup);

        // Time format combo
        const formatRow = new Adw.ComboRow({
            title: 'Time format',
            subtitle: 'Choose between 12-hour and 24-hour display',
            model: Gtk.StringList.new(['12-hour (AM/PM)', '24-hour']),
            selected: settings.get_string('time-format') === '24h' ? 1 : 0,
        });

        formatRow.connect('notify::selected', () => {
            settings.set_string('time-format', formatRow.selected === 1 ? '24h' : '12h');
        });

        settings.connect('changed::time-format', () => {
            formatRow.selected = settings.get_string('time-format') === '24h' ? 1 : 0;
        });

        timeGroup.add(formatRow);

        // Show seconds toggle
        const secondsRow = new Adw.SwitchRow({
            title: 'Show seconds',
            subtitle: 'Display seconds alongside hours and minutes',
            active: settings.get_boolean('show-seconds'),
        });

        secondsRow.connect('notify::active', () => {
            settings.set_boolean('show-seconds', secondsRow.active);
        });

        settings.connect('changed::show-seconds', () => {
            secondsRow.active = settings.get_boolean('show-seconds');
        });

        timeGroup.add(secondsRow);

        // Scale group
        const scaleGroup = new Adw.PreferencesGroup({
            title: 'Size',
            description: 'Scale the entire clock widget (you can also scroll on the clock)',
        });
        displayPage.add(scaleGroup);

        scaleGroup.add(makeSliderRow(
            'Clock scale',
            '1.0 = default size',
            settings, 'clock-scale',
            0.3, 5.0, 0.1, 1
        ));

        // Reset scale button
        const resetRow = new Adw.ActionRow({
            title: 'Reset scale',
            subtitle: 'Restore the clock to its default size (1.0×)',
        });

        const resetBtn = new Gtk.Button({
            label: 'Reset',
            valign: Gtk.Align.CENTER,
            css_classes: ['destructive-action'],
        });

        resetBtn.connect('clicked', () => {
            settings.set_double('clock-scale', 1.0);
        });

        resetRow.add_suffix(resetBtn);
        resetRow.set_activatable_widget(resetBtn);
        scaleGroup.add(resetRow);

        // Position group
        const posGroup = new Adw.PreferencesGroup({
            title: 'Position',
            description: 'You can also drag the clock directly on the desktop',
        });
        displayPage.add(posGroup);

        // X position spin
        const xRow = new Adw.ActionRow({
            title: 'Horizontal position (X)',
            subtitle: 'Pixels from the left edge of the screen',
        });
        const xSpin = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 7680,
                step_increment: 10,
                page_increment: 100,
                value: settings.get_int('clock-x'),
            }),
            valign: Gtk.Align.CENTER,
            digits: 0,
        });
        xSpin.connect('value-changed', () => {
            settings.set_int('clock-x', xSpin.get_value_as_int());
        });
        settings.connect('changed::clock-x', () => {
            xSpin.set_value(settings.get_int('clock-x'));
        });
        xRow.add_suffix(xSpin);
        xRow.set_activatable_widget(xSpin);
        posGroup.add(xRow);

        // Y position spin
        const yRow = new Adw.ActionRow({
            title: 'Vertical position (Y)',
            subtitle: 'Pixels from the top edge of the screen',
        });
        const ySpin = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 4320,
                step_increment: 10,
                page_increment: 100,
                value: settings.get_int('clock-y'),
            }),
            valign: Gtk.Align.CENTER,
            digits: 0,
        });
        ySpin.connect('value-changed', () => {
            settings.set_int('clock-y', ySpin.get_value_as_int());
        });
        settings.connect('changed::clock-y', () => {
            ySpin.set_value(settings.get_int('clock-y'));
        });
        yRow.add_suffix(ySpin);
        yRow.set_activatable_widget(ySpin);
        posGroup.add(yRow);

        // Reset position button
        const resetPosRow = new Adw.ActionRow({
            title: 'Reset position',
            subtitle: 'Move the clock back to (200, 200)',
        });
        const resetPosBtn = new Gtk.Button({
            label: 'Reset',
            valign: Gtk.Align.CENTER,
        });
        resetPosBtn.connect('clicked', () => {
            settings.set_int('clock-x', 200);
            settings.set_int('clock-y', 200);
        });
        resetPosRow.add_suffix(resetPosBtn);
        resetPosRow.set_activatable_widget(resetPosBtn);
        posGroup.add(resetPosRow);
    }
