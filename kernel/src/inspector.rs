// System Inspector - Claude's Custom Phase 6 Feature
// Real-time visual system monitor with graphics

pub struct SystemInspector {
    pub uptime_seconds: u64,
    pub memory_used: u64,
    pub memory_total: u64,
    pub process_count: u32,
    pub cpu_load: u8,
}

impl SystemInspector {
    pub fn new() -> Self {
        SystemInspector {
            uptime_seconds: 0,
            memory_used: 0,
            memory_total: 100 * 1024, // 100 KB heap
            process_count: 0,
            cpu_load: 0,
        }
    }

    pub fn update(&mut self, ticks: u64) {
        // Update based on timer ticks
        self.uptime_seconds = ticks / 100; // 100 ticks per second
    }

    pub fn add_process(&mut self) {
        self.process_count += 1;
    }

    pub fn remove_process(&mut self) {
        if self.process_count > 0 {
            self.process_count -= 1;
        }
    }

    pub fn update_memory(&mut self, used: u64) {
        self.memory_used = used;
    }

    pub fn get_memory_percent(&self) -> u8 {
        ((self.memory_used * 100) / self.memory_total) as u8
    }

    pub fn get_uptime_string(&self) -> &'static str {
        // Placeholder - real implementation would format time
        "system online"
    }

    pub fn render_text_status(&self) -> &'static str {
        "System Inspector Online"
    }
}

pub struct Widget {
    pub x: usize,
    pub y: usize,
    pub width: usize,
    pub height: usize,
    pub title: &'static str,
}

impl Widget {
    pub fn new(x: usize, y: usize, width: usize, height: usize, title: &'static str) -> Self {
        Widget {
            x,
            y,
            width,
            height,
            title,
        }
    }

    pub fn contains_point(&self, px: usize, py: usize) -> bool {
        px >= self.x && px < self.x + self.width && py >= self.y && py < self.y + self.height
    }
}

pub struct Dashboard {
    pub inspector: SystemInspector,
    pub widgets: alloc::vec::Vec<Widget>,
}

impl Dashboard {
    pub fn new() -> Self {
        let mut widgets = alloc::vec::Vec::new();

        // Create dashboard widgets
        widgets.push(Widget::new(10, 10, 300, 80, "System Status"));
        widgets.push(Widget::new(10, 100, 300, 80, "Memory Usage"));
        widgets.push(Widget::new(10, 190, 300, 80, "Process List"));

        Dashboard {
            inspector: SystemInspector::new(),
            widgets,
        }
    }

    pub fn update(&mut self, ticks: u64) {
        self.inspector.update(ticks);
    }

    pub fn get_widget_count(&self) -> usize {
        self.widgets.len()
    }
}
