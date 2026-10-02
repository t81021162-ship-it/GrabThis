// Simple in-memory filesystem
// Full persistent filesystem (ext2/FAT32) coming in Phase 5

use alloc::vec::Vec;

pub struct File {
    pub name: &'static str,
    pub data: Vec<u8>,
    pub size: usize,
}

pub struct FileSystem {
    files: Vec<File>,
}

impl FileSystem {
    pub fn new() -> Self {
        FileSystem {
            files: Vec::new(),
        }
    }

    pub fn create_file(&mut self, name: &'static str, data: Vec<u8>) -> Result<(), &'static str> {
        if self.files.iter().any(|f| f.name == name) {
            return Err("File already exists");
        }

        let size = data.len();
        self.files.push(File { name, data, size });
        Ok(())
    }

    pub fn read_file(&self, name: &str) -> Option<&Vec<u8>> {
        self.files
            .iter()
            .find(|f| f.name == name)
            .map(|f| &f.data)
    }

    pub fn delete_file(&mut self, name: &str) -> Result<(), &'static str> {
        if let Some(pos) = self.files.iter().position(|f| f.name == name) {
            self.files.remove(pos);
            Ok(())
        } else {
            Err("File not found")
        }
    }

    pub fn list_files(&self) -> Vec<(&'static str, usize)> {
        self.files.iter().map(|f| (f.name, f.size)).collect()
    }

    pub fn file_count(&self) -> usize {
        self.files.len()
    }
}
