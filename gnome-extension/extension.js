import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';
import GLib from 'gi://GLib';
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

const ClockWidget = GObject.registerClass(
    class ClockWidget extends St.BoxLayout {
        _init() {
            super._init({
                style_class: 'clock-face-container',
                vertical: true,
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
                x_expand: true,
                y_expand: true,
                reactive: false,
            });

            // Top separator
            this._topSep = new St.Widget({ style_class: 'clock-separator', x_align: Clutter.ActorAlign.CENTER });
            this.add_child(this._topSep);

            // Day label (Anurati font)
            this._dayLabel = new St.Label({
                text: '',
                style_class: 'clock-day-label',
                x_align: Clutter.ActorAlign.CENTER,
            });
            this.add_child(this._dayLabel);

            // Date label
            this._dateLabel = new St.Label({
                text: '',
                style_class: 'clock-date-label',
                x_align: Clutter.ActorAlign.CENTER,
            });
            this.add_child(this._dateLabel);

            // Time label
            this._timeLabel = new St.Label({
                text: '',
                style_class: 'clock-time-label',
                x_align: Clutter.ActorAlign.CENTER,
            });
            this.add_child(this._timeLabel);

            // Bottom separator
            this._botSep = new St.Widget({ style_class: 'clock-separator', x_align: Clutter.ActorAlign.CENTER });
            this.add_child(this._botSep);

            // Initial update
            this._updateClock();

            // Timer — update every second
            this._timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {
                this._updateClock();
                return GLib.SOURCE_CONTINUE;
            });
        }

        _updateClock() {
            const now = GLib.DateTime.new_now_local();

            const dayOfWeek = now.get_day_of_week(); // 1=Monday .. 7=Sunday
            const dayIndex = dayOfWeek === 7 ? 0 : dayOfWeek; // Convert to 0=Sunday
            const dayName = DAYS[dayIndex];

            const dayNum = now.get_day_of_month();
            const monthName = MONTHS[now.get_month() - 1];
            const year = now.get_year();
            const dateStr = `${dayNum}  ${monthName},  ${year}.`;

            let hour = now.get_hour();
            const minute = now.get_minute();
            const ampm = hour >= 12 ? 'PM' : 'AM';
            hour = hour % 12;
            if (hour === 0) hour = 12;
            const minuteStr = minute < 10 ? `0${minute}` : `${minute}`;
            const timeStr = `-  ${hour}:${minuteStr} ${ampm}  -`;

            this._dayLabel.set_text(dayName);
            this._dateLabel.set_text(dateStr);
            this._timeLabel.set_text(timeStr);
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
        this._clockWidget = new ClockWidget();

        // Add to the uiGroup at the very bottom (behind everything).
        // Insert at index 0 so it's drawn first (behind all other actors).
        Main.uiGroup.insert_child_at_index(this._clockWidget, 0);

        // Position to fill the primary monitor
        this._repositionClock();

        // Re-position when monitors change
        this._monitorsChangedId = Main.layoutManager.connect(
            'monitors-changed', () => this._repositionClock()
        );
    }

    _repositionClock() {
        const monitor = Main.layoutManager.primaryMonitor;
        if (!monitor) return;

        this._clockWidget.set_position(monitor.x, monitor.y);
        this._clockWidget.set_size(monitor.width, monitor.height);
    }

    disable() {
        if (this._monitorsChangedId) {
            Main.layoutManager.disconnect(this._monitorsChangedId);
            this._monitorsChangedId = null;
        }
        if (this._clockWidget) {
            this._clockWidget.destroy();
            this._clockWidget = null;
        }
    }
}
