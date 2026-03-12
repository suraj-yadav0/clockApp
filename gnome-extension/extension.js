import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';
import Pango from 'gi://Pango';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

const MONTHS = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
];

const DAYS = [
    'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY',
    'THURSDAY', 'FRIDAY', 'SATURDAY',
];

const DEFAULT_SCALE = 1.0;
const MIN_SCALE = 0.3;
const MAX_SCALE = 5.0;
const SCALE_STEP = 0.1;

const ClockWidget = GObject.registerClass(
    class ClockWidget extends St.BoxLayout {
        _init(settings) {
            super._init({
                vertical: true,
                reactive: true,
                track_hover: true,
                style: 'padding: 40px 140px; background-color: transparent;',
            });

            this._settings = settings;
            this._currentScale = settings.get_double('clock-scale');
            this._isDragging = false;
            this._dragStartX = 0;
            this._dragStartY = 0;
            this._dragActorStartX = 0;
            this._dragActorStartY = 0;

            // ── Build clock UI ──────────────────────────────────────────────

            // Day label
            this._dayLabel = new St.Label({
                text: '',
                x_align: Clutter.ActorAlign.CENTER,
            });
            this._dayLabel.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
            this._dayLabel.clutter_text.line_wrap = false;
            this.add_child(this._dayLabel);

            // Date label
            this._dateLabel = new St.Label({
                text: '',
                x_align: Clutter.ActorAlign.CENTER,
            });
            this._dateLabel.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
            this.add_child(this._dateLabel);

            // Time label
            this._timeLabel = new St.Label({
                text: '',
                x_align: Clutter.ActorAlign.CENTER,
            });
            this._timeLabel.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
            this.add_child(this._timeLabel);

            // ── Manual drag support ─────────────────────────────────────────
            this.connect('button-press-event', (_actor, event) => {
                if (event.get_button() === 1) {
                    this._isDragging = true;
                    const [stageX, stageY] = event.get_coords();
                    this._dragStartX = stageX;
                    this._dragStartY = stageY;
                    this._dragActorStartX = this.x;
                    this._dragActorStartY = this.y;
                    this.set_opacity(200);
                    return Clutter.EVENT_STOP;
                }
                return Clutter.EVENT_PROPAGATE;
            });

            this.connect('motion-event', (_actor, event) => {
                if (this._isDragging) {
                    const [stageX, stageY] = event.get_coords();
                    const dx = stageX - this._dragStartX;
                    const dy = stageY - this._dragStartY;
                    this.set_position(
                        this._dragActorStartX + dx,
                        this._dragActorStartY + dy
                    );
                    return Clutter.EVENT_STOP;
                }
                return Clutter.EVENT_PROPAGATE;
            });

            this.connect('button-release-event', (_actor, event) => {
                if (event.get_button() === 1 && this._isDragging) {
                    this._isDragging = false;
                    this._applyOpacity();
                    this._savePosition();
                    return Clutter.EVENT_STOP;
                }
                return Clutter.EVENT_PROPAGATE;
            });

            // ── Scroll-to-resize ────────────────────────────────────────────
            this._scrollSaveId = null;
            this.connect('scroll-event', (_actor, event) => {
                const dir = event.get_scroll_direction();
                let s = this._currentScale;
                if (dir === Clutter.ScrollDirection.UP)
                    s = Math.min(MAX_SCALE, s + SCALE_STEP);
                else if (dir === Clutter.ScrollDirection.DOWN)
                    s = Math.max(MIN_SCALE, s - SCALE_STEP);
                else
                    return Clutter.EVENT_PROPAGATE;
                this._currentScale = s;
                this.set_scale(s, s);
                // Debounce: only write to GSettings 400 ms after the last scroll tick
                if (this._scrollSaveId !== null) {
                    GLib.source_remove(this._scrollSaveId);
                    this._scrollSaveId = null;
                }
                this._scrollSaveId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 400, () => {
                    this._settings.set_double('clock-scale',
                        Math.round(this._currentScale * 100) / 100);
                    this._scrollSaveId = null;
                    return GLib.SOURCE_REMOVE;
                });
                return Clutter.EVENT_STOP;
            });

            // ── Watch settings changes ──────────────────────────────────────
            this._settingsChangedId = this._settings.connect(
                'changed', (_s, key) => this._onSettingChanged(key)
            );

            // ── Apply initial appearance & position ─────────────────────────
            this._applyAppearance();
            this._applyPosition();

            // ── Clock update ────────────────────────────────────────────────
            this._updateClock();
            this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
                this._updateClock();
                return GLib.SOURCE_CONTINUE;
            });
        }

        // ── Settings helpers ────────────────────────────────────────────────

        _onSettingChanged(key) {
            switch (key) {
            case 'day-color':
            case 'date-color':
            case 'time-color':
            case 'font-family':
                this._applyLabelStyles();
                break;
            case 'clock-opacity':
                this._applyOpacity();
                break;
            case 'clock-scale':
                this._applyScale();
                break;
            case 'clock-x':
            case 'clock-y':
                this._applyPosition();
                break;
            case 'time-format':
            case 'show-seconds':
                this._updateClock();
                break;
            }
        }

        _applyAppearance() {
            this._applyLabelStyles();
            this._applyOpacity();
            this._applyScale();
        }

        _applyLabelStyles() {
            const dayColor  = this._settings.get_string('day-color');
            const dateColor = this._settings.get_string('date-color');
            const timeColor = this._settings.get_string('time-color');
            const font      = this._settings.get_string('font-family');

            this._dayLabel.set_style(
                `font-family: ${font}; font-size: 108px; color: ${dayColor}; ` +
                'padding-bottom: 30px; text-align: center; letter-spacing: 12px; ' +
                'text-shadow: 0px 2px 4px rgba(0,0,0,0.8);'
            );
            this._dateLabel.set_style(
                `font-size: 20px; font-weight: 500; color: ${dateColor}; ` +
                'padding-bottom: 24px; text-align: center; letter-spacing: 8px; ' +
                'text-shadow: 0px 1px 2px rgba(0,0,0,0.8);'
            );
            this._timeLabel.set_style(
                `font-size: 24px; font-weight: 300; color: ${timeColor}; ` +
                'padding-bottom: 16px; text-align: center; letter-spacing: 8px; ' +
                'text-shadow: 0px 1px 2px rgba(0,0,0,0.8);'
            );
        }

        _applyOpacity() {
            const opacity = this._settings.get_double('clock-opacity');
            this.set_opacity(Math.round(Math.max(0, Math.min(1, opacity)) * 255));
        }

        _applyScale() {
            const scale = this._settings.get_double('clock-scale');
            this._currentScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
            this.set_scale(this._currentScale, this._currentScale);
        }

        _applyPosition() {
            const x = this._settings.get_int('clock-x');
            const y = this._settings.get_int('clock-y');
            if (x === 0 && y === 0) {
                // First-time default: place near top-left of primary monitor
                const mon = Main.layoutManager.primaryMonitor;
                if (mon) {
                    this.set_position(mon.x + 200, mon.y + 200);
                    this._savePosition();
                } else {
                    this.set_position(200, 200);
                }
            } else {
                this.set_position(x, y);
            }
        }

        _savePosition() {
            this._settings.set_int('clock-x', Math.round(this.x));
            this._settings.set_int('clock-y', Math.round(this.y));
        }

        // ── Clock display ───────────────────────────────────────────────────

        _updateClock() {
            const now = GLib.DateTime.new_now_local();
            const dow = now.get_day_of_week();
            const dayIndex = dow === 7 ? 0 : dow;

            const dayNum    = now.get_day_of_month();
            const monthName = MONTHS[now.get_month() - 1];
            const year      = now.get_year();

            const use24h   = this._settings.get_string('time-format') === '24h';
            const showSecs = this._settings.get_boolean('show-seconds');

            let hour    = now.get_hour();
            const minute = now.get_minute();
            const second = now.get_second();

            let timeParts;
            if (use24h) {
                const hh = hour   < 10 ? `0${hour}`   : `${hour}`;
                const mm = minute < 10 ? `0${minute}` : `${minute}`;
                if (showSecs) {
                    const ss = second < 10 ? `0${second}` : `${second}`;
                    timeParts = `-   ${hh}:${mm}:${ss}   -`;
                } else {
                    timeParts = `-   ${hh}:${mm}   -`;
                }
            } else {
                const ampm = hour >= 12 ? 'PM' : 'AM';
                hour = hour % 12 || 12;
                const hh = `${hour}`;
                const mm = minute < 10 ? `0${minute}` : `${minute}`;
                if (showSecs) {
                    const ss = second < 10 ? `0${second}` : `${second}`;
                    timeParts = `-   ${hh}:${mm}:${ss}  ${ampm}   -`;
                } else {
                    timeParts = `-   ${hh}:${mm}  ${ampm}   -`;
                }
            }

            this._dayLabel.set_text(DAYS[dayIndex]);
            this._dateLabel.set_text(`${dayNum}   ${monthName},   ${year}.`);
            this._timeLabel.set_text(timeParts);
        }

        destroy() {
            if (this._settingsChangedId) {
                this._settings.disconnect(this._settingsChangedId);
                this._settingsChangedId = null;
            }
            if (this._scrollSaveId !== null) {
                GLib.source_remove(this._scrollSaveId);
                this._scrollSaveId = null;
            }
            if (this._timeoutId) {
                GLib.source_remove(this._timeoutId);
                this._timeoutId = null;
            }
            super.destroy();
        }
    });

export default class ClockFaceExtension extends Extension {
    enable() {
        const settings = this.getSettings();

        this._clockWidget = new ClockWidget(settings);

        // Place the widget behind all windows, on the wallpaper layer
        this._bgGroup = Main.layoutManager._backgroundGroup;

        if (this._bgGroup) {
            this._bgGroup.add_child(this._clockWidget);
            this._clockWidget.raise_top();
            console.log('[ClockFace] Added to _backgroundGroup');
        } else {
            // Fallback
            this._parentContainer = global.window_group;
            if (this._parentContainer.get_n_children() > 0)
                this._parentContainer.insert_child_at_index(this._clockWidget, 1);
            else
                this._parentContainer.add_child(this._clockWidget);
            console.log('[ClockFace] Fallback to window_group');
        }

        this._monitorsChangedId = Main.layoutManager.connect(
            'monitors-changed', () => { }
        );

        console.log('[ClockFace] Extension enabled');
    }

    disable() {
        if (this._monitorsChangedId) {
            Main.layoutManager.disconnect(this._monitorsChangedId);
            this._monitorsChangedId = null;
        }
        if (this._clockWidget) {
            if (this._bgGroup)
                this._bgGroup.remove_child(this._clockWidget);
            else if (this._parentContainer)
                this._parentContainer.remove_child(this._clockWidget);
            this._clockWidget.destroy();
            this._clockWidget = null;
        }
        this._bgGroup = null;
        this._parentContainer = null;
    }
}
