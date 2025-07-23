# reMouse - Remote Mouse Controller

A powerful ESP32-S2 based remote mouse controller with mouse jiggler functionality. Control your computer mouse remotely from any device through a web interface.

## Features

### 🖱️ Mouse Control
- **Touchpad Control**: Use your device's touchscreen as a mouse touchpad
- **Gesture Support**: Double-tap to click, double-tap & hold to drag
- **Scroll Control**: Dedicated scroll area for vertical scrolling
- **Button Controls**: Direct left and right click buttons
- **Sensitivity Adjustment**: Adjustable cursor speed from 0.1× to 3.0×

### 🎯 Mouse Jiggler
- **Automated Movements**: Keep your computer awake with automated mouse movements
- **Multiple Patterns**: Circle, Figure-8, Spiral, Square, and Triangle patterns
- **Customizable Settings**:
  - **Interval**: Time between movement sequences (1-60 seconds)
  - **Speed**: Movement speed (1-10 levels)
  - **Range**: Movement range (10-200 pixels)
  - **Pattern**: Choose from 5 different movement patterns
- **Position Return**: Mouse cursor returns to original position after each movement
- **Smooth Movements**: Natural and smooth mouse movements

### 📱 Modern Web Interface
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Navigation Menu**: Hamburger menu for easy page switching
- **Real-time Preview**: See movement patterns before activating
- **PWA Support**: Install as a web app on your device
- **Offline Capable**: Works even when disconnected from internet

### ⚙️ Advanced Features
- **Persistent Settings**: All settings saved to device storage
- **USB HID Mouse**: Appears as a Logitech optical mouse to your computer
- **WiFi Access Point**: Creates its own WiFi network for easy connection
- **WebSocket Communication**: Real-time bidirectional communication
- **Captive Portal**: Automatic redirect to web interface

## Hardware Requirements

- **ESP32-S2** development board (tested with ESP32-S2-Saola-1)
- **USB-C cable** for power and USB HID communication
- **WiFi capable device** (phone, tablet, computer) for control

## Installation

### 1. Hardware Setup
1. Connect your ESP32-S2 board to your computer via USB-C
2. Ensure the board supports USB HID functionality

### 2. Software Setup
1. Install PlatformIO or Arduino IDE
2. Clone this repository
3. Install required libraries:
   - ESPAsyncWebServer
   - AsyncTCP
   - ArduinoJson

### 3. Configuration
1. Open `platformio.ini` and verify board settings
2. Upload the code to your ESP32-S2
3. The device will create a WiFi network named "reMouse"

### 4. Connection
1. Connect to the "reMouse" WiFi network (password: remouse1)
2. Open your web browser and navigate to `http://192.168.4.1`
3. The web interface will load automatically

## Usage

### Mouse Control Page
1. **Enable/Disable**: Toggle mouse control on/off
2. **Touchpad**: Use the touchpad area to move the cursor
3. **Gestures**:
   - Single tap: No action (prevents accidental clicks)
   - Double tap: Left click
   - Double tap & hold: Drag mode
4. **Scroll**: Use the scroll area for vertical scrolling
5. **Buttons**: Direct left and right click buttons
6. **Sensitivity**: Adjust cursor speed with the slider

### Mouse Jiggler Page
1. **Enable Jiggler**: Toggle the mouse jiggler on/off
2. **Interval**: Set time between movement sequences (1-60 seconds)
3. **Speed**: Adjust movement speed (1-10 levels)
4. **Range**: Set movement range in pixels (10-200)
5. **Pattern**: Choose movement pattern:
   - **Circle**: Circular motion
   - **Figure 8**: Figure-eight pattern
   - **Spiral**: Spiral outward motion
   - **Square**: Square perimeter motion
   - **Triangle**: Triangular motion
6. **Preview**: Watch the preview animation to see the pattern

## Technical Details

### USB Configuration
The device appears as a **Logitech Optical Mouse** to your computer:
- Manufacturer: Logitech
- Product: Optical Mouse
- Serial: M-U0007

### WiFi Configuration
- **SSID**: reMouse
- **Password**: remouse1
- **IP Address**: 192.168.4.1
- **Hostname**: remouse.local

### Settings Storage
All settings are stored in the ESP32's non-volatile memory and persist across reboots:
- Mouse enabled/disabled state
- Sensitivity setting
- Jiggler enabled/disabled state
- Jiggler interval, speed, range, and pattern

### WebSocket Communication
Real-time communication between the web interface and ESP32:
- Mouse movement data
- Button press/release events
- Settings synchronization
- Jiggler control commands

## Troubleshooting

### Connection Issues
1. Ensure you're connected to the "reMouse" WiFi network
2. Try accessing `http://remouse.local` instead of the IP address
3. Check that your device supports the WiFi frequency (2.4GHz)

### Mouse Not Working
1. Verify USB connection is secure
2. Check that your computer recognizes the device as a mouse
3. Ensure mouse control is enabled in the web interface

### Jiggler Not Working
1. Verify jiggler is enabled in the web interface
2. Check that mouse control is also enabled
3. Adjust interval setting if movements are too frequent/infrequent

### Performance Issues
1. Reduce jiggler speed or range for smoother operation
2. Increase interval between movements
3. Try a simpler pattern (circle or square)

## Development

### Project Structure
```
reMouse2/
├── src/
│   └── main.cpp          # Main ESP32 firmware
├── data/
│   ├── index.html        # Web interface HTML
│   ├── style.css         # CSS styles
│   ├── app.js           # JavaScript application
│   ├── manifest.json    # PWA manifest
│   ├── sw.js           # Service worker
│   └── favicon.svg     # App icon
├── platformio.ini       # PlatformIO configuration
└── README.md           # This file
```

### Building and Uploading
```bash
# Build the project
pio run

# Upload to device
pio run --target upload

# Upload filesystem
pio run --target uploadfs

# Monitor serial output
pio device monitor
```

## License

This project is open source and available under the MIT License.

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## Support

If you encounter any issues or have questions, please open an issue on the GitHub repository. 