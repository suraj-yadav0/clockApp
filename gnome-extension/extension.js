import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';
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
const MIN_SCALE = 0.4;
const MAX_SCALE = 3.0;
const SCALE_STEP = 0.1;

const ClockWidget = GObject.registerClass(
    class ClockWidget extends St.BoxLayout {
        _init(configPath) {
            super._init({
                vertical: true,
                reactive: true,
                track_hover: true,
                style: 'padding: 40px 60px;'
                    + 'border-radius: 16px;'
                    + 'background-color: rgba(30, 30, 35, 0.75);'
                    + 'border: 1px solid rgba(255, 255, 255, 0.08);',
            });

            this._configPath = configPath;
            this._currentScale = DEFAULT_SCALE;
            this._isDragging = false;
            this._dragStartX = 0;
            this._dragStartY = 0;
            this._dragActorStartX = 0;
            this._dragActorStartY = 0;

            // ---- Build clock UI ----

            // Top separator
            this.add_child(new St.Widget({
                style: 'width: 220px; height: 1px;'
                    + 'background-color: rgba(255,255,255,0.15);'
                    + 'margin-bottom: 16px;',
                x_align: Clutter.ActorAlign.CENTER,
            }));

            // Day label
            this._dayLabel = new St.Label({
                text: '',
                x_align: Clutter.ActorAlign.CENTER,
                style: 'font-family: Anurati;'
                    + 'font-size: 72px;'
                    + 'color: rgba(255,255,255,0.95);'
                    + 'padding-bottom: 24px;'
                    + 'text-align: center;'
                    + 'text-shadow: 0px 2px 6px rgba(0,0,0,0.5);',
            });
            this.add_child(this._dayLabel);

            // Date label
            this._dateLabel = new St.Label({
                text: '',
                x_align: Clutter.ActorAlign.CENTER,
                style: 'font-size: 16px;'
                    + 'font-weight: 400;'
                    + 'color: rgba(255,255,255,0.70);'
                    + 'padding-bottom: 20px;'
                    + 'text-align: center;'
                    + 'letter-spacing: 5px;',
            });
            this.add_child(this._dateLabel);

            // Time label
            this._timeLabel = new St.Label({
                text: '',
                x_align: Clutter.ActorAlign.CENTER,
                style: 'font-size: 18px;'
                    + 'font-weight: 300;'
                    + 'color: rgba(255,255,255,0.55);'
                    + 'padding-bottom: 12px;'
                    + 'text-align: center;'
                    + 'letter-spacing: 6px;',
            });
            this.add_child(this._timeLabel);

            // Bottom separator
            this.add_child(new St.Widget({
                style: 'width: 220px; height: 1px;'
                    + 'background-color: rgba(255,255,255,0.15);'
                    + 'margin-top: 8px;',
                x_align: Clutter.ActorAlign.CENTER,
            }));

            // ---- Manual drag support ----
            this.connect('button-press-event', (_actor, event) => {
                if (event.get_button() === 1) {
                    this._isDragging = true;
                    const [stageX, stageY] = event.get_coords();
                    this._dragStartX = stageX;
                    this._dragStartY = stageY;
                    this._dragActorStartX = this.x;
                    this._dragActorStartY = this.y;
                    this.set_style(
                        'padding: 40px 60px;'
                        + 'border-radius: 16px;'
                        + 'background-color: rgba(40, 40, 50, 0.9);'
                        + 'border: 1px solid rgba(255,255,255,0.25);'
                        + 'box-shadow: 0 8px 32px rgba(0,0,0,0.5);'
                    );
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
                    this.set_style(
                        'padding: 40px 60px;'
                        + 'border-radius: 16px;'
                        + 'background-color: rgba(30, 30, 35, 0.75);'
                        + 'border: 1px solid rgba(255,255,255,0.08);'
                    );
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

            // ---- Load saved config ----
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
            const dow = now.get_day_of_week(); // 1=Mon .. 7=Sun
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
            // Defaults: center of primary monitor
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

        // Add to _backgroundGroup — this is the DESKTOP LAYER.
        // It renders ON the wallpaper, behind ALL windows.
        // Visible only when you show the desktop (minimize/move windows).
        this._bgGroup = Main.layoutManager._backgroundGroup;
        this._bgGroup.add_child(this._clockWidget);
        // Raise above wallpaper textures within the group
        this._clockWidget.raise_top();

        this._monitorsChangedId = Main.layoutManager.connect(
            'monitors-changed', () => {
                console.log('[ClockFace] Monitors changed');
            }
        );

        console.log('[ClockFace] Added to _backgroundGroup (desktop layer)');
    }

    disable() {
        if (this._monitorsChangedId) {
            Main.layoutManager.disconnect(this._monitorsChangedId);
            this._monitorsChangedId = null;
        }
        if (this._clockWidget) {
            if (this._bgGroup)
                this._bgGroup.remove_child(this._clockWidget);
            this._clockWidget.destroy();
            this._clockWidget = null;
        }
        this._bgGroup = null;
    }
}
