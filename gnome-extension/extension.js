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
        _init(configPath) {
            super._init({
                vertical: true,
                reactive: true,
                track_hover: true,
                // Clean look: Transparent background, no border, wide padding
                style: 'padding: 40px 140px; background-color: transparent;',
            });

            this._configPath = configPath;
            this._currentScale = DEFAULT_SCALE;
            this._isDragging = false;
            this._dragStartX = 0;
            this._dragStartY = 0;
            this._dragActorStartX = 0;
            this._dragActorStartY = 0;

            // ---- Build clock UI ----
            // Removed top/bottom separators as requested for a cleaner look.

            // Day label
            this._dayLabel = new St.Label({
                text: '',
                x_align: Clutter.ActorAlign.CENTER,
                style: 'font-family: Anurati; font-size: 108px; color: rgba(255,255,255,0.95); padding-bottom: 30px; text-align: center; letter-spacing: 12px; text-shadow: 0px 2px 4px rgba(0,0,0,0.8);',
            });
            // Important: Disable ellipsize to prevent truncation
            this._dayLabel.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
            this._dayLabel.clutter_text.line_wrap = false;
            this.add_child(this._dayLabel);

            // Date label
            this._dateLabel = new St.Label({
                text: '',
                x_align: Clutter.ActorAlign.CENTER,
                style: 'font-size: 20px; font-weight: 500; color: rgba(255,255,255,0.85); padding-bottom: 24px; text-align: center; letter-spacing: 8px; text-shadow: 0px 1px 2px rgba(0,0,0,0.8);',
            });
            this._dateLabel.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
            this.add_child(this._dateLabel);

            // Time label
            this._timeLabel = new St.Label({
                text: '',
                x_align: Clutter.ActorAlign.CENTER,
                style: 'font-size: 24px; font-weight: 300; color: rgba(255,255,255,0.75); padding-bottom: 16px; text-align: center; letter-spacing: 8px; text-shadow: 0px 1px 2px rgba(0,0,0,0.8);',
            });
            this._timeLabel.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
            this.add_child(this._timeLabel);

            // ---- Manual drag support ----
            this.connect('button-press-event', (_actor, event) => {
                if (event.get_button() === 1) {
                    this._isDragging = true;
                    const [stageX, stageY] = event.get_coords();
                    this._dragStartX = stageX;
                    this._dragStartY = stageY;
                    this._dragActorStartX = this.x;
                    this._dragActorStartY = this.y;
                    // Visual feedback: Subtle opacity change
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
                    this.set_opacity(255);
                    this._saveConfig();
                    return Clutter.EVENT_STOP;
                }
                return Clutter.EVENT_PROPAGATE;
            });

            // ---- Scroll-to-resize ----
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
                this._saveConfig();
                return Clutter.EVENT_STOP;
            });

            // ---- Load config ----
            this._loadConfig();

            // ---- Clock update ----
            this._updateClock();
            this._timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {
                this._updateClock();
                return GLib.SOURCE_CONTINUE;
            });
        }

        _updateClock() {
            const now = GLib.DateTime.new_now_local();
            const dow = now.get_day_of_week();
            const dayIndex = dow === 7 ? 0 : dow;

            const dayNum = now.get_day_of_month();
            const monthName = MONTHS[now.get_month() - 1];
            const year = now.get_year();

            let hour = now.get_hour();
            const minute = now.get_minute();
            const ampm = hour >= 12 ? 'PM' : 'AM';
            hour = hour % 12 || 12;
            const mm = minute < 10 ? `0${minute}` : `${minute}`;

            this._dayLabel.set_text(DAYS[dayIndex]);
            this._dateLabel.set_text(`${dayNum}   ${monthName},   ${year}.`);
            this._timeLabel.set_text(`-   ${hour}:${mm}  ${ampm}   -`);
        }

        _loadConfig() {
            try {
                const file = Gio.File.new_for_path(this._configPath);
                if (file.query_exists(null)) {
                    const [ok, bytes] = file.load_contents(null);
                    if (ok) {
                        const cfg = JSON.parse(new TextDecoder().decode(bytes));
                        this.set_position(cfg.x ?? 200, cfg.y ?? 200);
                        this._currentScale = cfg.scale ?? DEFAULT_SCALE;
                        this.set_scale(this._currentScale, this._currentScale);
                        return;
                    }
                }
            } catch (e) {
                console.log(`[ClockFace] config load error: ${e.message}`);
            }
            const mon = Main.layoutManager.primaryMonitor;
            if (mon)
                this.set_position(mon.x + 200, mon.y + 200);
            else
                this.set_position(200, 200);
        }

        _saveConfig() {
            try {
                const cfg = {
                    x: Math.round(this.x),
                    y: Math.round(this.y),
                    scale: Math.round(this._currentScale * 100) / 100,
                };
                const file = Gio.File.new_for_path(this._configPath);
                const parent = file.get_parent();
                if (!parent.query_exists(null))
                    parent.make_directory_with_parents(null);
                file.replace_contents(
                    JSON.stringify(cfg, null, 2),
                    null, false,
                    Gio.FileCreateFlags.REPLACE_DESTINATION,
                    null
                );
            } catch (e) {
                console.log(`[ClockFace] config save error: ${e.message}`);
            }
        }

        destroy() {
            if (this._timeoutId) {
                GLib.source_remove(this._timeoutId);
                this._timeoutId = null;
            }
            super.destroy();
        }
    });

export default class ClockFaceExtension extends Extension {
    enable() {
        const configDir = GLib.build_filenamev([
            GLib.get_user_config_dir(), 'clock-face',
        ]);
        const configPath = GLib.build_filenamev([configDir, 'position.json']);

        this._clockWidget = new ClockWidget(configPath);

        // Use _backgroundGroup for correct Desktop Layering
        // This puts it BEHIND all windows, on the wallpaper
        this._bgGroup = Main.layoutManager._backgroundGroup;

        if (this._bgGroup) {
            this._bgGroup.add_child(this._clockWidget);
            this._clockWidget.raise_top(); // Top of BACKGROUND, still below windows
            console.log('[ClockFace] Added to _backgroundGroup');
        } else {
            // Fallback (shouldn't happen on standard GNOME 46)
            this._parentContainer = global.window_group;
            if (this._parentContainer.get_n_children() > 0) {
                this._parentContainer.insert_child_at_index(this._clockWidget, 1);
            } else {
                this._parentContainer.add_child(this._clockWidget);
            }
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
            if (this._bgGroup) {
                this._bgGroup.remove_child(this._clockWidget);
            } else if (this._parentContainer) {
                this._parentContainer.remove_child(this._clockWidget);
            }
            this._clockWidget.destroy();
            this._clockWidget = null;
        }
        this._bgGroup = null;
        this._parentContainer = null;
    }
}
