# 🍗 ChickNugOs - Minimal Linux Distribution

**Version:** 1.0  
**Built with:** Claude Code + QEMU  
**Base:** Ubuntu 24.04 LTS (Minimal)

## ✨ Features

- **Minimal & Fast** - Built with minimal packages, optimized for speed
- **Full APT Support** - Debian/Ubuntu package manager included
- **Web Games** - Built-in HTML5 games accessible via Nginx
- **2.0 GB ISO** - Compact size for easy distribution
- **Ready to Boot** - Works with QEMU, VirtualBox, or physical hardware

## 📦 What's Included

### Core System
- Linux 6.8.0-31 kernel (x86_64)
- GRUB bootloader
- systemd init system
- Full APT package manager

### Development Tools
- build-essential (gcc, make, etc.)
- git (version control)
- curl, wget (download tools)
- vim, nano (text editors)
- nodejs, npm (JavaScript runtime)

### Web & Games
- Nginx web server
- 4 built-in HTML5 games:
  - **2048** - Tile combination puzzle
  - **Snake** - Classic snake game
  - **Flappy Bird** - Pipe avoidance game
  - **Pong** - Arcade classic

### Utilities
- openssh-server (remote access)
- htop (system monitoring)
- man-db (manual pages)
- bash-completion (shell completion)

## 🚀 Quick Start

### Boot with QEMU

```bash
# Simple boot (live from ISO)
qemu-system-x86_64 -m 512 -cdrom ChickNugOs.iso -enable-kvm

# Boot with persistent disk
qemu-img create -f qcow2 chicknugos.qcow2 4G
qemu-system-x86_64 -m 1024 -smp 2 -cdrom ChickNugOs.iso -hda chicknugos.qcow2 -enable-kvm
```

### Access Web Games

After booting:
1. Wait for system to start
2. Access games at: `http://localhost`
3. Or directly at: `http://<system-ip>`

### SSH Access

```bash
ssh root@<ip-address>
# No password required (root login)
```

### System Management

```bash
# Check system status
htop

# Update packages
apt-get update && apt-get upgrade

# Install new software
apt-get install <package-name>

# Check system info
uname -a
df -h
free -h
```

## 📁 File Structure

```
/var/www/html/              # Web server root
├── index.html              # Games hub
├── 2048/index.html         # 2048 game
├── snake/index.html        # Snake game
├── flappybird/index.html   # Flappy Bird game
└── pong/index.html         # Pong game

/etc/nginx/                 # Nginx configuration
/boot/                      # Kernel & initramfs
/root/                      # Root home directory
```

## 🎮 Games Guide

### 2048
- **Controls:** Arrow keys
- **Goal:** Combine tiles to reach 2048
- **How it works:** Move tiles and combine matching numbers

### Snake
- **Controls:** Arrow keys
- **Goal:** Eat food without hitting walls or yourself
- **Difficulty:** Speeds up as you play

### Flappy Bird
- **Controls:** Space or Click
- **Goal:** Avoid pipes by flying through gaps
- **Challenge:** Perfect timing required

### Pong
- **Controls:** Mouse or keyboard
- **Goal:** Keep the ball in play
- **Players:** 1 vs AI or 2-player mode

## 🛠️ Customization

### Add Custom Games

Place HTML/CSS/JS files in `/var/www/html/` and create links in `index.html`.

### Install Additional Software

```bash
apt-get install nginx-extras      # Enhanced web server
apt-get install python3-full      # Python development
apt-get install gcc g++           # C/C++ compilers
apt-get install postgresql        # Database
apt-get install docker.io         # Docker containers
```

### Modify Nginx Configuration

Edit `/etc/nginx/sites-enabled/default` and restart:
```bash
systemctl restart nginx
```

## 📊 System Specifications

| Spec | Value |
|------|-------|
| **Kernel** | Linux 6.8.0-31 x86_64 |
| **ISO Size** | 2.0 GB |
| **Min RAM** | 256 MB |
| **Recommended RAM** | 512 MB - 1 GB |
| **Disk Space** | 2.0 GB minimum |
| **CPU** | x86_64 compatible |

## 🔧 Troubleshooting

### Games not loading
```bash
# Check Nginx status
systemctl status nginx

# Restart Nginx
systemctl restart nginx

# Check web files
ls -la /var/www/html/
```

### SSH connection refused
```bash
# Start SSH server
systemctl start ssh

# Enable on boot
systemctl enable ssh
```

### APT package errors
```bash
# Update package list
apt-get update

# Fix broken dependencies
apt-get install -f

# Clear cache
apt-get clean
```

## 📝 License

ChickNugOs is built using:
- Ubuntu 24.04 LTS (Licensed under Ubuntu Terms)
- QEMU (Licensed under GPL v2)
- Nginx (Licensed under 2-clause BSD)
- Node.js (Licensed under MIT)

All included games are original HTML5 implementations.

## 🎯 Performance Tips

1. **Boot Time:** Use `-enable-kvm` flag with QEMU for faster boot
2. **Memory:** Allocate 512MB+ RAM for comfortable operation
3. **Storage:** Use SSD for better performance
4. **Network:** Games load fastest on localhost (no network lag)

## 📞 Support

ChickNugOs is a minimal distribution designed for learning and experimentation. For additional packages or features:

```bash
# Search for packages
apt-cache search <keyword>

# Install package
apt-get install <package-name>

# View package details
apt-cache show <package-name>
```

## 🚀 Next Steps

1. Boot the ISO
2. Test the built-in games
3. Install additional software with APT
4. Customize the system for your needs
5. Share and enjoy!

---

**Built with 🔧 Claude Code**  
**October 2026**
