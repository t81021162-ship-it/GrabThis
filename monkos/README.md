# 🐵 MonkOS — Banana Jungle Edition

A bootable `.img` built on **SliTaz Linux**, themed monkey / banana / jungle, with **Bananabot** —
an AI you teach by talking to it. It saves what you teach it and talks back in a sleek chat.

## Build the image

```bash
sudo apt install xorriso cpio xz-utils fdisk e2fsprogs curl   # or your distro's equivalents
./monkos/build.sh                      # downloads SliTaz rolling, writes monkos/out/MonkOS.img
SLITAZ_ISO=~/slitaz.iso ./monkos/build.sh   # …or use an ISO you already have
```

No Linux box handy? Run the **Build MonkOS.img** GitHub Action (Actions tab → Run workflow) and
download the `MonkOS-img` artifact.

## Run it

```bash
qemu-system-x86_64 -m 512 -drive file=monkos/out/MonkOS.img,format=raw
sudo dd if=monkos/out/MonkOS.img of=/dev/sdX bs=4M status=progress   # real USB stick (double-check sdX!)
```
BIOS/legacy boot. Login `root` / `root` (SliTaz default).

## Talking to Bananabot

* **Console:** logging in drops straight into the chat (`banana` to restart it).
* **Desktop flavors:** run **Bananabot** from the menu / `monkos-browser` for the sleek web chat
  (served on `127.0.0.1:8080` by busybox httpd).

Teaching:

| Say | Effect |
|---|---|
| `question => answer` | teach a pair |
| *(anything it doesn't know)* | it asks what to say, your next line is the answer |
| `remember that the sky is blue` | stores a fact, answers "what is the sky" |
| `my name is Ada` | greets you by name (`{name}` works in answers) |
| `forget question` | removes it |

Fuzzy matching (word overlap) lets slightly different wording still hit. Everything is stored in
`brain.tsv` on a **MONKDATA** ext4 partition that the build appends to the image, so it survives
reboots. Without that partition (e.g. booting a plain ISO) the brain is RAM-only and Bananabot warns you.

## How it works

`overlay/` is packed into an extra initramfs layer (`/boot/monkos.gz`) loaded after SliTaz's own
`rootfs*.gz`; the boot menu is re-themed and SliTaz's `local.sh` / openbox autostart are *appended to*,
never replaced. The AI is plain busybox-`sh` + `awk`, so it needs nothing beyond the SliTaz core.

## Testing status

The overlay, AI, CGI/web chat, remaster, and MONKDATA partitioning were boot-tested in QEMU against a
stand-in SliTaz-style ISO. It has **not** yet been run against the real SliTaz ISO (that host was
unreachable from the dev sandbox); if SliTaz's boot config layout differs, `build.sh` warns about it.

## Jungle Hub apps (v1.1)

Served by the same httpd; open with `monkos-browser apps/index.html` or the menu entries.

* **Banana Brigade v0.06 pre-alpha** (`apps/gears.html`) — an original top-down cover shooter, no third-party
  assets or names. WASD move, mouse aim/shoot, `R` reload (press again in the green zone = active reload, jam if you miss),
  `Shift` hunker behind crates, `Space` roll, `E` melee peel, waves + a boss every 5th wave, regenerating health, banana pickups.
* **Dino Index** (`apps/dinos.html`) — 15 dinosaurs with stats, field notes, search/filter/sort, a collection tracker
  (saved in the browser) and a quiz.
* **Jungle Hub** (`apps/index.html`) — launcher; Bananabot's chat links to it.
