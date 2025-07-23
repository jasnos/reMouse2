#ifndef CUSTOM_HID_MOUSE_H
#define CUSTOM_HID_MOUSE_H

#include <stdint.h>
#include "tusb.h"

// Button bit masks (matching standard HID mouse buttons)
#define MOUSE_LEFT  0x01
#define MOUSE_RIGHT 0x02
#define MOUSE_MIDDLE 0x04

class USBHIDMouse {
public:
    void begin() {
        _buttons = 0;
    }

    // Relative move with optional wheel
    void move(int8_t x, int8_t y, int8_t wheel = 0) {
        sendReport(_buttons, x, y, wheel);
    }

    void press(uint8_t buttonMask) {
        _buttons |= buttonMask;
        sendReport(_buttons, 0, 0, 0);
    }

    void release(uint8_t buttonMask) {
        _buttons &= ~buttonMask;
        sendReport(_buttons, 0, 0, 0);
    }

    void click(uint8_t buttonMask) {
        press(buttonMask);
        release(buttonMask);
    }

private:
    uint8_t _buttons;

    static inline void sendReport(uint8_t buttons, int8_t x, int8_t y, int8_t wheel) {
        // Report format: ID(3) + buttons + x + y + wheel = 5 bytes
        uint8_t report[4];
        report[0] = buttons;
        report[1] = static_cast<uint8_t>(x);
        report[2] = static_cast<uint8_t>(y);
        report[3] = static_cast<uint8_t>(wheel);
        tud_hid_report(3 /* report ID */, report, sizeof(report));
    }
};

#endif // CUSTOM_HID_MOUSE_H 