// MOoOS GUI Framework - Simple windowing system
// Farm-themed graphical user interface

use crate::graphics::{Graphics, Color, Rect, theme};

pub struct Window {
    pub title: &'static str,
    pub rect: Rect,
    pub bg_color: Color,
    pub fg_color: Color,
}

impl Window {
    pub fn new(title: &'static str, x: u32, y: u32, width: u32, height: u32) -> Self {
        Window {
            title,
            rect: Rect { x, y, width, height },
            bg_color: theme::CREAM,
            fg_color: theme::DARK_GRAY,
        }
    }

    pub fn draw(&self, gfx: &Graphics) {
        // Draw background
        gfx.draw_rect(&self.rect, self.bg_color);

        // Draw border
        gfx.draw_rect_outline(&self.rect, theme::BARN_RED, 2);

        // Draw title bar
        let title_bar = Rect {
            x: self.rect.x,
            y: self.rect.y,
            width: self.rect.width,
            height: 30,
        };
        gfx.draw_rect(&title_bar, theme::BARN_RED);
    }
}

pub struct Button {
    pub label: &'static str,
    pub rect: Rect,
    pub enabled: bool,
}

impl Button {
    pub fn new(label: &'static str, x: u32, y: u32, width: u32, height: u32) -> Self {
        Button {
            label,
            rect: Rect { x, y, width, height },
            enabled: true,
        }
    }

    pub fn draw(&self, gfx: &Graphics) {
        let color = if self.enabled {
            theme::GRASS_GREEN
        } else {
            theme::DARK_GRAY
        };

        gfx.draw_rect(&self.rect, color);
        gfx.draw_rect_outline(&self.rect, theme::COW_BROWN, 1);
    }

    pub fn is_clicked(&self, x: u32, y: u32) -> bool {
        self.enabled
            && x >= self.rect.x
            && x < self.rect.x + self.rect.width
            && y >= self.rect.y
            && y < self.rect.y + self.rect.height
    }
}

pub struct Label {
    pub text: &'static str,
    pub x: u32,
    pub y: u32,
}

impl Label {
    pub fn new(text: &'static str, x: u32, y: u32) -> Self {
        Label { text, x, y }
    }

    pub fn draw(&self, gfx: &Graphics) {
        // Simple text rendering (would need font data in real implementation)
        // For now, just draw a placeholder
        gfx.draw_rect(
            &Rect {
                x: self.x,
                y: self.y,
                width: self.text.len() as u32 * 8,
                height: 16,
            },
            theme::CREAM,
        );
    }
}

pub struct Panel {
    pub title: &'static str,
    pub rect: Rect,
    pub color: Color,
}

impl Panel {
    pub fn new(title: &'static str, x: u32, y: u32, width: u32, height: u32) -> Self {
        Panel {
            title,
            rect: Rect { x, y, width, height },
            color: theme::CREAM,
        }
    }

    pub fn draw(&self, gfx: &Graphics) {
        gfx.draw_rect(&self.rect, self.color);
        gfx.draw_rect_outline(&self.rect, theme::COW_BROWN, 1);
    }
}

pub struct DesktopEnvironment {
    pub background_color: Color,
}

impl DesktopEnvironment {
    pub fn new() -> Self {
        DesktopEnvironment {
            background_color: theme::SKY_BLUE,
        }
    }

    pub fn draw_wallpaper(&self, gfx: &Graphics) {
        gfx.clear(self.background_color);
        // Draw decorative elements
        self.draw_grass(gfx);
        self.draw_farm_scene(gfx);
    }

    fn draw_grass(&self, gfx: &Graphics) {
        // Draw grass at bottom of screen
        gfx.draw_rect(
            &Rect {
                x: 0,
                y: 480 - 100,
                width: 640,
                height: 100,
            },
            theme::GRASS_GREEN,
        );
    }

    fn draw_farm_scene(&self, gfx: &Graphics) {
        // Draw barn
        gfx.draw_rect(
            &Rect {
                x: 50,
                y: 300,
                width: 150,
                height: 150,
            },
            theme::BARN_RED,
        );

        // Draw barn door
        gfx.draw_rect(
            &Rect {
                x: 75,
                y: 320,
                width: 100,
                height: 110,
            },
            theme::DARK_GRAY,
        );

        // Draw roof (triangle using lines)
        gfx.draw_line(50, 300, 125, 250, theme::COW_BROWN);
        gfx.draw_line(125, 250, 200, 300, theme::COW_BROWN);

        // Draw cow (simple circles)
        gfx.draw_circle(450, 350, 30, theme::COW_BROWN);
        gfx.draw_circle(430, 320, 15, theme::COW_BROWN);
        gfx.draw_circle(470, 320, 15, theme::COW_BROWN);
    }

    pub fn draw_taskbar(&self, gfx: &Graphics) {
        // Draw taskbar at bottom
        gfx.draw_rect(
            &Rect {
                x: 0,
                y: 460,
                width: 640,
                height: 20,
            },
            theme::DARK_GRAY,
        );

        // Draw taskbar items (simplified)
        gfx.draw_rect(
            &Rect {
                x: 5,
                y: 463,
                width: 50,
                height: 14,
            },
            theme::BARN_RED,
        );
    }
}

pub struct DialogBox {
    pub title: &'static str,
    pub message: &'static str,
    pub rect: Rect,
}

impl DialogBox {
    pub fn new(title: &'static str, message: &'static str) -> Self {
        DialogBox {
            title,
            message,
            rect: Rect {
                x: 150,
                y: 100,
                width: 340,
                height: 200,
            },
        }
    }

    pub fn draw(&self, gfx: &Graphics) {
        // Draw background
        gfx.draw_rect(&self.rect, theme::CREAM);
        gfx.draw_rect_outline(&self.rect, theme::BARN_RED, 2);

        // Draw title bar
        gfx.draw_rect(
            &Rect {
                x: self.rect.x,
                y: self.rect.y,
                width: self.rect.width,
                height: 30,
            },
            theme::BARN_RED,
        );
    }
}
