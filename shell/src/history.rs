use std::collections::VecDeque;

pub struct History {
    entries: VecDeque<String>,
    max_size: usize,
}

impl History {
    pub fn new() -> Self {
        History {
            entries: VecDeque::new(),
            max_size: 100,
        }
    }

    pub fn add(&mut self, entry: String) {
        self.entries.push_back(entry);
        if self.entries.len() > self.max_size {
            self.entries.pop_front();
        }
    }

    pub fn get_all(&self) -> Vec<String> {
        self.entries.iter().cloned().collect()
    }
}
