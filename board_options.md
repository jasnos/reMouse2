# ESP32-S2 Board Options for PlatformIO

## Common ESP32-S2 Boards in PlatformIO:

1. **lolin_s2_mini** - LOLIN S2 Mini (what we're currently using)
2. **feathers2** - Unexpected Maker FeatherS2
3. **esp32s2** - Generic ESP32-S2 (if available)
4. **esp32-s2-saola-1** - Espressif ESP32-S2-Saola-1
5. **franzininho_wifi_esp32s2** - Franzininho WiFi Board
6. **espressif_esp32s2_devkitc** - ESP32-S2 DevKitC (might exist)

## To check available boards:
```bash
platformio boards | grep -i s2
```

## Current Configuration:
We're using `lolin_s2_mini` with overrides to make it work like a generic ESP32-S2 Dev Module.

The key settings that match your Arduino IDE configuration are:
- MCU: esp32s2
- Flash: 4MB
- PSRAM: None
- USB CDC on Boot: Enabled
- Flash Mode: QIO

## If the current config doesn't work, try:

1. Use the alternative config file:
   ```bash
   cp platformio_alternative.ini platformio.ini
   platformio run -e esp32s2_feather
   ```

2. Or manually change the board line in platformio.ini to:
   - `board = feathers2`
   - `board = esp32-s2-saola-1`

All configurations include the necessary overrides to match your Arduino IDE settings. 