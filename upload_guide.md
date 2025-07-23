# reMouse Upload Guide

## Prerequisites
- PlatformIO installed (CLI or VS Code extension)
- ESP32-S2 board connected via USB

## Step 1: Build the Firmware
```bash
platformio run -e esp32s2dev
```

## Step 2: Upload the Firmware
```bash
platformio run -e esp32s2dev --target upload
```

## Step 3: Build the Filesystem Image
```bash
platformio run -e esp32s2dev --target buildfs
```

## Step 4: Upload the Filesystem
```bash
platformio run -e esp32s2dev --target uploadfs
```

## Alternative: All-in-One Command
```bash
platformio run -e esp32s2dev --target upload && platformio run -e esp32s2dev --target uploadfs
```

## Troubleshooting

### If filesystem upload fails:
1. Make sure the board is in the correct mode
2. Try pressing the BOOT button while uploading
3. Use a slower upload speed:
   ```bash
   platformio run -e esp32s2dev --target uploadfs --upload-port /dev/cu.usbmodem02
   ```

### Monitor Serial Output:
```bash
platformio device monitor -b 115200
```

## After Upload
1. The ESP32-S2 will create a WiFi network: **reMouse** (password: **remouse1**)
2. Connect your device to this WiFi
3. Open browser and go to: **http://192.168.4.1/**
4. Enjoy your wireless mouse controller!

## Features
- 🖱️ Full mouse control (move, click, scroll)
- 🎯 Gesture support (double-tap to click, double-tap & hold to drag)
- 🎨 Beautiful dark theme UI
- 📱 Mobile-optimized interface
- 💾 Settings persistence
- 📶 Captive portal support 