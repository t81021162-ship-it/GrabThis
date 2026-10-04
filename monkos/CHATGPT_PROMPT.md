# Prompt to give ChatGPT (paste this, and attach monkos.zip)

You are a senior Linux/embedded + web engineer. I'm attaching `monkos.zip`, a project called **MonkOS** - a
monkey/banana/jungle-themed remaster of **SliTaz Linux** that produces a bootable `.img`. Please review, fix and
finish it, then return the complete corrected project as a zip (and list every change you made).

## What the project is
* `monkos/build.sh` - downloads the SliTaz rolling ISO, packs `monkos/overlay/` into an extra initramfs layer
  (`/boot/monkos.gz`) appended to every `initrd=` in isolinux.cfg, re-titles the boot menu, remasters with
  `xorriso -boot_image any replay`, then appends a `MONKDATA` ext4 partition (brain persistence) and writes `monkos/out/MonkOS.img`.
* `overlay/usr/bin/banana` - "Bananabot", a teachable chat AI in busybox-ash + awk (`question => answer`,
  `remember that X is Y`, `my name is`, fuzzy word-overlap matching, saves to `/var/lib/monkos/brain.tsv`).
* `overlay/usr/share/monkos/www/` - busybox-httpd web UI: sleek chat (`index.html` + `cgi-bin/chat.sh`) and the
  **Jungle Hub** in `apps/`: `gears.html` (original cover-shooter "Banana Brigade v0.06"), `dinos.html` (Dino Index, 15 dinos), `index.html` (launcher).
* `overlay/etc`, `overlay/usr/bin/monkos-start|monkos-browser` - theming, services start, profile hook.

## Known status
* Tested in QEMU only against a **stand-in** ISO (own kernel + busybox). Never run against the real SliTaz ISO
  (my sandbox couldn't reach the SliTaz mirrors) - so please assume the real ISO layout may differ.
* Web apps were tested in headless Chromium: no JS errors; the game was only exercised with random input.

## Please do
1. Run `./monkos/build.sh` with internet access and fix whatever breaks against the **real** SliTaz rolling ISO
   (initrd paths, `rootfs*.gz` compression, isolinux.cfg variants, SliTaz `local.sh` / openbox autostart locations,
   whether SliTaz init honours a second initramfs). Boot the result in QEMU (`-drive file=out/MonkOS.img,format=raw`).
2. Confirm busybox httpd on SliTaz serves `cgi-bin/chat.sh` (CGI exec bit, `httpd -h` root) and that `banana`
   works with SliTaz's busybox applets (`blkid`, `mountpoint`, `awk delete`, `printf %b`).
3. Confirm the MONKDATA partition auto-mounts and Bananabot's brain survives a reboot.
4. Game (`gears.html`): play-test it, tune difficulty/balance, fix bugs, and make it more fun (more enemy types,
   weapons, sound, polish). Keep it **original** - no copyrighted names, art, characters or code. Keep it a single file, no dependencies.
5. Dino Index: double-check the 15 dinosaurs' facts, add real illustrations (original inline SVG, or leave emoji), keep it offline-only.
6. Keep everything offline-capable, monkey/banana/jungle themed, and don't introduce non-free assets.

## Output
The full fixed project as a zip, plus a short changelog and the exact commands to build and test.
