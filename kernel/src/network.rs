// Network Stack - Phase 5 (Basic TCP/IP foundation)
// Full implementation coming in Phase 6

pub struct NetworkInterface {
    pub name: &'static str,
    pub mac_address: [u8; 6],
    pub ip_address: [u8; 4],
    pub subnet_mask: [u8; 4],
    pub gateway: [u8; 4],
    pub mtu: u16,
}

impl NetworkInterface {
    pub fn new(name: &'static str, mac: [u8; 6], ip: [u8; 4]) -> Self {
        NetworkInterface {
            name,
            mac_address: mac,
            ip_address: ip,
            subnet_mask: [255, 255, 255, 0],
            gateway: [ip[0], ip[1], ip[2], 1],
            mtu: 1500,
        }
    }

    pub fn set_ip(&mut self, ip: [u8; 4]) {
        self.ip_address = ip;
    }

    pub fn ip_string(&self) -> &'static str {
        // Placeholder - real implementation would format the IP
        "network ready"
    }
}

pub struct Socket {
    pub id: u32,
    pub port: u16,
    pub state: SocketState,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SocketState {
    Closed,
    Listen,
    Connected,
    Closing,
}

pub struct NetworkStack {
    interfaces: alloc::vec::Vec<NetworkInterface>,
    sockets: alloc::vec::Vec<Socket>,
    socket_counter: u32,
}

impl NetworkStack {
    pub fn new() -> Self {
        NetworkStack {
            interfaces: alloc::vec::Vec::new(),
            sockets: alloc::vec::Vec::new(),
            socket_counter: 0,
        }
    }

    pub fn add_interface(&mut self, iface: NetworkInterface) -> usize {
        self.interfaces.push(iface);
        self.interfaces.len() - 1
    }

    pub fn create_socket(&mut self, port: u16) -> u32 {
        let id = self.socket_counter;
        self.socket_counter += 1;

        self.sockets.push(Socket {
            id,
            port,
            state: SocketState::Closed,
        });

        id
    }

    pub fn listen(&mut self, socket_id: u32) -> Result<(), &'static str> {
        let socket = self
            .sockets
            .iter_mut()
            .find(|s| s.id == socket_id)
            .ok_or("Socket not found")?;

        socket.state = SocketState::Listen;
        Ok(())
    }

    pub fn interface_count(&self) -> usize {
        self.interfaces.len()
    }

    pub fn socket_count(&self) -> usize {
        self.sockets.len()
    }
}
