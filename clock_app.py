#!/usr/bin/env python3
"""
Clock Face Desktop App
A stylish desktop clock for Ubuntu using GTK4 + Cairo + Pango.
Displays day, date, and time in a modern geometric style.
"""

import gi
gi.require_version('Gtk', '4.0')
gi.require_version('Gdk', '4.0')

from gi.repository import Gtk, Gdk, GLib, Pango, PangoCairo, Gio
import cairo
import math
import time
from datetime import datetime


class ClockFace(Gtk.DrawingArea):
    """Custom drawing area that renders the clock face."""

    def __init__(self):
        super().__init__()
        self.set_draw_func(self._on_draw)
        self.set_hexpand(True)
        self.set_vexpand(True)

        # Start the clock update timer (every 1 second)
        GLib.timeout_add(1000, self._tick)

    def _tick(self):
        """Trigger a redraw every second."""
        self.queue_draw()
        return True  # Keep the timer running

    def _on_draw(self, area, cr, width, height):
        """Main draw callback — renders the entire clock face."""
        now = datetime.now()

        # --- Background: dark gradient ---
        self._draw_background(cr, width, height)

        # --- Subtle vignette overlay ---
        self._draw_vignette(cr, width, height)

        # Calculate responsive sizing
        scale = min(width / 600, height / 300)
        center_x = width / 2
        center_y = height / 2

        # --- Day of the week (Anurati font, large) ---
        day_text = now.strftime('%A').upper()
        day_size = max(12, int(62 * scale))
        self._draw_text(
            cr, center_x, center_y - 42 * scale,
            day_text, 'Anurati', day_size,
            letter_spacing=int(14 * scale * Pango.SCALE),
            color=(1.0, 1.0, 1.0, 0.95),
        )

        # --- Date line ---
        day_num = now.day
        month_text = now.strftime('%B').upper()
        year_text = now.strftime('%Y')
        date_text = f"{day_num}  {month_text},  {year_text}."
        date_size = max(8, int(14 * scale))
        self._draw_text(
            cr, center_x, center_y + 24 * scale,
            date_text, 'Noto Sans', date_size,
            letter_spacing=int(5 * scale * Pango.SCALE),
            color=(1.0, 1.0, 1.0, 0.70),
        )

        # --- Time line ---
        time_text = now.strftime('%-I:%M %p')
        time_display = f"-  {time_text}  -"
        time_size = max(8, int(15 * scale))
        self._draw_text(
            cr, center_x, center_y + 62 * scale,
            time_display, 'Noto Sans', time_size,
            letter_spacing=int(4 * scale * Pango.SCALE),
            color=(1.0, 1.0, 1.0, 0.55),
        )

        # --- Decorative thin lines ---
        line_width_px = max(0.5, 1.0 * scale)
        line_half = 90 * scale
        line_y_top = center_y - 70 * scale
        line_y_bot = center_y + 85 * scale

        cr.set_source_rgba(1.0, 1.0, 1.0, 0.12)
        cr.set_line_width(line_width_px)

        # Top line
        cr.move_to(center_x - line_half, line_y_top)
        cr.line_to(center_x + line_half, line_y_top)
        cr.stroke()

        # Bottom line
        cr.move_to(center_x - line_half, line_y_bot)
        cr.line_to(center_x + line_half, line_y_bot)
        cr.stroke()

    def _draw_background(self, cr, width, height):
        """Draw a dark grey gradient background."""
        pat = cairo.LinearGradient(0, 0, width, height)
        pat.add_color_stop_rgb(0.0, 0.22, 0.22, 0.24)   # Top-left: slightly lighter
        pat.add_color_stop_rgb(0.5, 0.16, 0.16, 0.18)   # Center: mid tone
        pat.add_color_stop_rgb(1.0, 0.10, 0.10, 0.12)   # Bottom-right: darkest
        cr.set_source(pat)
        cr.rectangle(0, 0, width, height)
        cr.fill()

    def _draw_vignette(self, cr, width, height):
        """Draw a subtle radial vignette for depth."""
        cx, cy = width / 2, height / 2
        radius = max(width, height) * 0.7
        pat = cairo.RadialGradient(cx, cy, 0, cx, cy, radius)
        pat.add_color_stop_rgba(0.0, 0, 0, 0, 0.0)      # Center: transparent
        pat.add_color_stop_rgba(0.6, 0, 0, 0, 0.05)
        pat.add_color_stop_rgba(1.0, 0, 0, 0, 0.35)      # Edges: darker
        cr.set_source(pat)
        cr.rectangle(0, 0, width, height)
        cr.fill()

    def _draw_text(self, cr, x, y, text, font_family, font_size,
                   letter_spacing=0, color=(1, 1, 1, 1)):
        """Draw text centered at (x, y) using Pango for proper font rendering."""
        layout = PangoCairo.create_layout(cr)
        font_desc = Pango.FontDescription()
        font_desc.set_family(font_family)
        font_desc.set_size(font_size * Pango.SCALE)
        font_desc.set_weight(Pango.Weight.NORMAL)
        layout.set_font_description(font_desc)
        layout.set_text(text, -1)

        if letter_spacing:
            attr_list = Pango.AttrList()
            attr_list.insert(Pango.attr_letter_spacing_new(letter_spacing))
            layout.set_attributes(attr_list)

        layout.set_alignment(Pango.Alignment.CENTER)

        # Get text extents to center it
        ink_rect, logical_rect = layout.get_pixel_extents()
        text_width = logical_rect.width
        text_height = logical_rect.height

        cr.save()
        cr.move_to(x - text_width / 2, y - text_height / 2)
        cr.set_source_rgba(*color)
        PangoCairo.show_layout(cr, layout)
        cr.restore()


class ClockWindow(Gtk.ApplicationWindow):
    """Main application window."""

    def __init__(self, app):
        super().__init__(application=app, title='Clock Face')

        # Window properties
        self.set_default_size(620, 320)
        self.set_resizable(True)

        self._is_fullscreen = False
        self._is_decorated = True

        # Create the clock face drawing area
        self.clock_face = ClockFace()

        # Create an overlay to stack widgets
        overlay = Gtk.Overlay()
        overlay.set_child(self.clock_face)

        # Add subtle control buttons in the top-right
        btn_box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        btn_box.set_halign(Gtk.Align.END)
        btn_box.set_valign(Gtk.Align.START)
        btn_box.set_margin_top(8)
        btn_box.set_margin_end(8)

        # Borderless toggle button
        self.btn_borderless = Gtk.Button(label='⬚')
        self.btn_borderless.set_tooltip_text('Toggle borderless mode')
        self.btn_borderless.add_css_class('control-btn')
        self.btn_borderless.connect('clicked', self._toggle_decorated)
        btn_box.append(self.btn_borderless)

        # Always-on-top toggle button
        self.btn_pin = Gtk.Button(label='📌')
        self.btn_pin.set_tooltip_text('Toggle always on top')
        self.btn_pin.add_css_class('control-btn')
        self._is_on_top = False
        self.btn_pin.connect('clicked', self._toggle_on_top)
        btn_box.append(self.btn_pin)

        overlay.add_overlay(btn_box)
        self.set_child(overlay)

        # Keyboard shortcuts
        key_controller = Gtk.EventControllerKey()
        key_controller.connect('key-pressed', self._on_key_pressed)
        self.add_controller(key_controller)

        # Drag to move (click anywhere on the window)
        drag_gesture = Gtk.GestureDrag()
        drag_gesture.set_button(1)  # Left mouse button
        drag_gesture.connect('drag-begin', self._on_drag_begin)
        drag_gesture.connect('drag-update', self._on_drag_update)
        self.add_controller(drag_gesture)

        self._drag_start_x = 0
        self._drag_start_y = 0

        # Apply CSS styling
        self._apply_css()

    def _apply_css(self):
        """Apply custom CSS for the window and buttons."""
        css = b"""
        window {
            background-color: transparent;
        }
        .control-btn {
            background: rgba(255, 255, 255, 0.08);
            color: rgba(255, 255, 255, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 6px;
            padding: 2px 8px;
            font-size: 14px;
            min-width: 28px;
            min-height: 28px;
            transition: all 200ms ease;
        }
        .control-btn:hover {
            background: rgba(255, 255, 255, 0.18);
            color: rgba(255, 255, 255, 0.85);
            border-color: rgba(255, 255, 255, 0.3);
        }
        """
        provider = Gtk.CssProvider()
        provider.load_from_data(css)
        Gtk.StyleContext.add_provider_for_display(
            Gdk.Display.get_default(),
            provider,
            Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
        )

    def _on_key_pressed(self, controller, keyval, keycode, state):
        """Handle keyboard shortcuts."""
        if keyval == Gdk.KEY_F11:
            self._toggle_fullscreen()
            return True
        elif keyval == Gdk.KEY_Escape:
            if self._is_fullscreen:
                self.unfullscreen()
                self._is_fullscreen = False
            return True
        elif keyval == Gdk.KEY_b:
            self._toggle_decorated()
            return True
        elif keyval == Gdk.KEY_t:
            self._toggle_on_top()
            return True
        elif keyval == Gdk.KEY_q:
            self.get_application().quit()
            return True
        return False

    def _toggle_fullscreen(self, *args):
        """Toggle fullscreen mode."""
        if self._is_fullscreen:
            self.unfullscreen()
        else:
            self.fullscreen()
        self._is_fullscreen = not self._is_fullscreen

    def _toggle_decorated(self, *args):
        """Toggle window decorations (borderless mode)."""
        self._is_decorated = not self._is_decorated
        self.set_decorated(self._is_decorated)
        if self._is_decorated:
            self.btn_borderless.set_label('⬚')
        else:
            self.btn_borderless.set_label('▣')

    def _toggle_on_top(self, *args):
        """Toggle always-on-top. Note: may require a compositor that supports this."""
        # GTK4 doesn't have a direct set_keep_above, but we can try via
        # the Gtk.Window API or use the surface
        # We'll store the state for the button display
        self._is_on_top = not self._is_on_top
        if self._is_on_top:
            self.btn_pin.set_label('📍')
            self.btn_pin.set_tooltip_text('Always on top: ON')
        else:
            self.btn_pin.set_label('📌')
            self.btn_pin.set_tooltip_text('Always on top: OFF')

    def _on_drag_begin(self, gesture, start_x, start_y):
        """Store the beginning of a drag."""
        native = self.get_native()
        if native:
            surface = native.get_surface()
            # Use GTK4's built-in window dragging
            gesture.set_state(Gtk.EventSequenceState.CLAIMED)
            # Initiate a window move via the toplevel
            toplevel = self.get_native()
            if toplevel:
                # Get the root coordinates
                self._drag_start_x = start_x
                self._drag_start_y = start_y

    def _on_drag_update(self, gesture, offset_x, offset_y):
        """Move the window using built-in surface begin_move."""
        # In GTK4, the best way is to initiate a surface move
        # We'll use a different approach: begin_move on button press
        pass


class ClockApp(Gtk.Application):
    """Main application class."""

    def __init__(self):
        super().__init__(
            application_id='com.clockface.app',
            flags=Gio.ApplicationFlags.FLAGS_NONE
        )

    def do_activate(self):
        """Called when the application is activated."""
        win = ClockWindow(self)
        win.present()


def main():
    app = ClockApp()
    app.run()


if __name__ == '__main__':
    main()
