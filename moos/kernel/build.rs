// Build script to create multiboot-compliant kernel
fn main() {
    // Tell cargo to link using the custom linker script
    println!("cargo:rustc-link-arg=-Tkernel/src/linker.ld");

    // Build as bare metal
    println!("cargo:rustc-env=CARGO_CFG_TARGET_FAMILY=bare_metal");
}
