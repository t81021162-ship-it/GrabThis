// Process scheduler framework - Phase 2
// Full scheduler implementation with multitasking coming in Phase 3

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TaskState {
    Ready,
    Running,
    Blocked,
    Terminated,
}

pub struct Task {
    pub id: u32,
    pub name: &'static str,
    pub state: TaskState,
    pub priority: u8,
}

pub struct Scheduler {
    task_counter: u32,
}

impl Scheduler {
    pub fn new() -> Self {
        Scheduler { task_counter: 0 }
    }

    pub fn create_task(&mut self, _name: &'static str, _priority: u8) -> u32 {
        let id = self.task_counter;
        self.task_counter += 1;
        id
    }
}
