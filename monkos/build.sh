#!/usr/bin/env bash
# Build MonkOS.img: download SliTaz, add the MonkOS overlay (as an extra initramfs layer),
# re-theme the boot menu, and append a MONKDATA partition so Bananabot's brain survives reboots.
#
#   ./build.sh                       download SliTaz rolling-core and build out/MonkOS.img
#   SLITAZ_ISO=/path/slitaz.iso ./build.sh     use an ISO you already have
#   DATA_MB=128 OUT=out/MonkOS.img ./build.sh
# Needs: curl xorriso cpio gzip xz sfdisk mke2fs   (apt install xorriso cpio xz-utils fdisk e2fsprogs curl)
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
OUT=${OUT:-$HERE/out/MonkOS.img}
DATA_MB=${DATA_MB:-64}
ISO=${SLITAZ_ISO:-$HERE/cache/slitaz.iso}
URLS=(${SLITAZ_URL:-}
  https://mirror.slitaz.org/iso/rolling/slitaz-rolling-core.iso
  https://download.tuxfamily.org/slitaz/iso/rolling/slitaz-rolling-core.iso
  https://mirror.slitaz.org/iso/rolling/slitaz-rolling.iso)
for t in xorriso cpio gzip sfdisk mke2fs; do command -v $t >/dev/null || { echo "missing tool: $t" >&2; exit 1; }; done
W=$(mktemp -d); trap 'rm -rf "$W"' EXIT
mkdir -p "$(dirname "$OUT")" "$(dirname "$ISO")"

# 1. SliTaz base
if [ ! -s "$ISO" ]; then
  for u in "${URLS[@]}"; do [ -n "$u" ] || continue
    echo ">> downloading $u"; curl -fL --retry 3 -o "$ISO.part" "$u" && mv "$ISO.part" "$ISO" && break || true
  done
fi
[ -s "$ISO" ] || { echo "Could not get a SliTaz ISO. Download one and re-run with SLITAZ_ISO=/path/to.iso" >&2; exit 1; }

# 2. pull what we need out of the ISO
echo ">> reading $ISO"
xorriso -osirrox on -indev "$ISO" -extract /boot "$W/boot" >/dev/null 2>&1 || xorriso -osirrox on -indev "$ISO" -extract / "$W/boot-all" >/dev/null
[ -d "$W/boot" ] || { mkdir -p "$W/boot"; cp -r "$W/boot-all/boot/." "$W/boot/"; }
CFGS=$(cd "$W/boot" && find . -iname 'isolinux.cfg' -o -iname 'syslinux.cfg' | sed 's#^\.#/boot#')
[ -n "$CFGS" ] || { echo "no isolinux.cfg found in ISO" >&2; exit 1; }

decomp() { # decompress an initramfs part, whatever it is
  case "$(head -c2 "$1" | od -An -tx1 | tr -d ' ')" in
    1f8b) gzip -dc "$1";; fd37) xz -dc "$1";; 5d00) xz -dc --format=lzma "$1";; *) cat "$1";; esac; }

# 3. overlay = our files + patched copies of SliTaz files we must append to (never clobber)
STAGE=$W/stage; mkdir -p "$STAGE" "$W/orig"
cp -a "$HERE/overlay/." "$STAGE/"
for part in $(ls "$W"/boot/rootfs*.gz 2>/dev/null | sort); do
  (cd "$W/orig" && decomp "$part" | cpio -idm --quiet etc/init.d/local.sh root/.config/openbox/autostart home/tux/.config/openbox/autostart 2>/dev/null) || true
done
patch_append() { # file, line
  mkdir -p "$STAGE/$(dirname "$1")"
  [ -f "$W/orig/$1" ] && cp -p "$W/orig/$1" "$STAGE/$1" || printf '#!/bin/sh\n' > "$STAGE/$1"
  printf '\n# --- MonkOS ---\n%s\n' "$2" >> "$STAGE/$1"; }
patch_append etc/init.d/local.sh 'monkos-start &'
chmod +x "$STAGE/etc/init.d/local.sh"
for ob in root/.config/openbox/autostart home/tux/.config/openbox/autostart; do
  [ -f "$W/orig/$ob" ] && patch_append "$ob" '(sleep 3; monkos-browser) &' || true; done
(cd "$STAGE" && find . | cpio -o -H newc -R 0:0 --quiet | gzip -9) > "$W/monkos.gz"

# 4. re-theme boot menu + load our layer after SliTaz's own initramfs
mkdir -p "$W/cfg"
MAP=()
for c in $CFGS; do
  f="$W/cfg/$(echo "$c" | tr / _)"; xorriso -osirrox on -indev "$ISO" -extract "$c" "$f" >/dev/null 2>&1
  sed -i -E \
    -e 's#(initrd=)([^ ,]+(,[^ ,]+)*)#\1\2,/boot/monkos.gz#' \
    -e 's#^([ \t]*[Ii][Nn][Ii][Tt][Rr][Dd][ \t]+)([^ \t]+)[ \t]*$#\1\2,/boot/monkos.gz#' \
    -e 's#^([ \t]*[Mm][Ee][Nn][Uu][ \t]+[Tt][Ii][Tt][Ll][Ee]).*#\1 MonkOS - Banana Jungle Edition#' \
    -e '/^[ \t]*[Mm][Ee][Nn][Uu][ \t]+[Ll][Aa][Bb][Ee][Ll]/ s/SliTaz/MonkOS/g' "$f"
  grep -qi 'monkos.gz' "$f" || echo "warning: no initrd line patched in $c - check it by hand" >&2
  MAP+=(-map "$f" "$c")
done

# 5. remaster, keeping SliTaz's own boot records
echo ">> remastering"
rm -f "$OUT"
xorriso -indev "$ISO" -outdev "$OUT" -boot_image any replay \
  -volid MONKOS -map "$W/monkos.gz" /boot/monkos.gz "${MAP[@]}" -commit >/dev/null 2>&1

# 6. MONKDATA partition after the ISO, so the banana brain persists
BYTES=$(stat -c%s "$OUT"); START=$(( (BYTES/512 + 2047) / 2048 * 2048 ))
truncate -s $(( START*512 + DATA_MB*1024*1024 )) "$OUT"
echo "start=$START, type=83" | sfdisk --append --quiet "$OUT"
mkdir -p "$W/data"; echo "Bananabot's brain lives here (brain.tsv)." > "$W/data/README.txt"
mke2fs -q -t ext4 -L MONKDATA -d "$W/data" -E offset=$((START*512)) "$OUT" $((DATA_MB*1024))k
echo ">> done: $OUT ($(du -h "$OUT" | cut -f1))"
echo "   try it:  qemu-system-x86_64 -m 512 -drive file=$OUT,format=raw -vga std"
