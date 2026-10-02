// Inter-Process Communication (IPC) - Phase 5
// Pipes, message passing, and process coordination

use alloc::vec::Vec;
use alloc::collections::VecDeque;

pub struct Message {
    pub sender_id: u32,
    pub data: Vec<u8>,
    pub size: usize,
}

pub struct MessageQueue {
    id: u32,
    messages: VecDeque<Message>,
    max_size: usize,
}

impl MessageQueue {
    pub fn new(id: u32, max_size: usize) -> Self {
        MessageQueue {
            id,
            messages: VecDeque::new(),
            max_size,
        }
    }

    pub fn send(&mut self, sender_id: u32, data: Vec<u8>) -> Result<(), &'static str> {
        if self.messages.len() >= self.max_size {
            return Err("Queue full");
        }

        let size = data.len();
        self.messages.push_back(Message {
            sender_id,
            data,
            size,
        });

        Ok(())
    }

    pub fn receive(&mut self) -> Option<Message> {
        self.messages.pop_front()
    }

    pub fn is_empty(&self) -> bool {
        self.messages.is_empty()
    }

    pub fn pending_count(&self) -> usize {
        self.messages.len()
    }
}

pub struct Pipe {
    id: u32,
    buffer: Vec<u8>,
    read_pos: usize,
    write_pos: usize,
    capacity: usize,
}

impl Pipe {
    pub fn new(id: u32, capacity: usize) -> Self {
        Pipe {
            id,
            buffer: alloc::vec![0u8; capacity],
            read_pos: 0,
            write_pos: 0,
            capacity,
        }
    }

    pub fn write(&mut self, data: &[u8]) -> Result<usize, &'static str> {
        let available = self.capacity - (self.write_pos - self.read_pos);
        if available == 0 {
            return Err("Pipe full");
        }

        let to_write = core::cmp::min(data.len(), available);
        let write_end = self.write_pos % self.capacity;

        for i in 0..to_write {
            self.buffer[(write_end + i) % self.capacity] = data[i];
        }

        self.write_pos += to_write;
        Ok(to_write)
    }

    pub fn read(&mut self, buf: &mut [u8]) -> Result<usize, &'static str> {
        let available = self.write_pos - self.read_pos;
        if available == 0 {
            return Err("Pipe empty");
        }

        let to_read = core::cmp::min(buf.len(), available);
        let read_end = self.read_pos % self.capacity;

        for i in 0..to_read {
            buf[i] = self.buffer[(read_end + i) % self.capacity];
        }

        self.read_pos += to_read;
        Ok(to_read)
    }

    pub fn available(&self) -> usize {
        self.write_pos - self.read_pos
    }
}

pub struct IPCManager {
    queues: Vec<MessageQueue>,
    pipes: Vec<Pipe>,
}

impl IPCManager {
    pub fn new() -> Self {
        IPCManager {
            queues: Vec::new(),
            pipes: Vec::new(),
        }
    }

    pub fn create_queue(&mut self, capacity: usize) -> u32 {
        let id = self.queues.len() as u32;
        self.queues.push(MessageQueue::new(id, capacity));
        id
    }

    pub fn create_pipe(&mut self, capacity: usize) -> u32 {
        let id = self.pipes.len() as u32;
        self.pipes.push(Pipe::new(id, capacity));
        id
    }

    pub fn send_message(
        &mut self,
        queue_id: u32,
        sender_id: u32,
        data: Vec<u8>,
    ) -> Result<(), &'static str> {
        let queue = self
            .queues
            .get_mut(queue_id as usize)
            .ok_or("Queue not found")?;
        queue.send(sender_id, data)
    }

    pub fn receive_message(&mut self, queue_id: u32) -> Result<Message, &'static str> {
        let queue = self
            .queues
            .get_mut(queue_id as usize)
            .ok_or("Queue not found")?;
        queue.receive().ok_or("No message available")
    }
}
