# Board Selection Guide for ESP32-S2

## Current Issue
The board ID from Arduino IDE doesn't directly translate to PlatformIO. Here's how to fix it:

## Solution Options:

### Option 1: Use FeatherS2 (Recommended)
The current `platformio.ini` is configured to use `feathers2` board with overrides:
```ini
board = feathers2
```
This board definition is compatible with generic ESP32-S2 modules.

### Option 2: Try Other ESP32-S2 Boards
If `feathers2` doesn't work, edit `platformio.ini` and try:
```ini
board = esp32-s2-saola-1
```
or
```ini
board = lolin_s2_mini
```

### Option 3: Find Your Exact Board
In PlatformIO IDE (VS Code):
1. Open PlatformIO Home
2. Click "Boards"
3. Search for "S2"
4. Find a board that matches your hardware

## Important Settings
Regardless of which board you choose, these overrides ensure compatibility:
```ini
board_build.mcu = esp32s2
board_build.variant = esp32s2
board_build.psram_type = none
build_flags = 
    -DARDUINO_USB_CDC_ON_BOOT=1
    -DBOARD_HAS_PSRAM=0
```

## Quick Test
After changing the board, try:
1. Build: Click the checkmark ✓ in PlatformIO toolbar
2. Upload: Click the arrow → in PlatformIO toolbar

The current configuration should work with any generic ESP32-S2 Dev Module! 