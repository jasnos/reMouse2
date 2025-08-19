#ifndef CUSTOM_HID_MOUSE_H
#define CUSTOM_HID_MOUSE_H

#include <stdint.h>
#include <string.h>
#include <Arduino.h>
#include "tusb.h"

// Button bit masks (matching standard HID mouse buttons)
#define MOUSE_LEFT  0x01
#define MOUSE_RIGHT 0x02
#define MOUSE_MIDDLE 0x04

// Keyboard modifier codes (HID usage codes)
#define KEY_MOD_NONE  0x00
#define KEY_MOD_LCTRL  0x01
#define KEY_MOD_LSHIFT 0x02
#define KEY_MOD_LALT   0x04
#define KEY_MOD_LMETA  0x08
#define KEY_MOD_RCTRL  0x10
#define KEY_MOD_RSHIFT 0x20
#define KEY_MOD_RALT   0x40
#define KEY_MOD_RMETA  0x80

// Keyboard key codes (HID usage codes)
#define KEY_NONE 0x00
#define KEY_A 0x04
#define KEY_B 0x05
#define KEY_C 0x06
#define KEY_D 0x07
#define KEY_E 0x08
#define KEY_F 0x09
#define KEY_G 0x0A
#define KEY_H 0x0B
#define KEY_I 0x0C
#define KEY_J 0x0D
#define KEY_K 0x0E
#define KEY_L 0x0F
#define KEY_M 0x10
#define KEY_N 0x11
#define KEY_O 0x12
#define KEY_P 0x13
#define KEY_Q 0x14
#define KEY_R 0x15
#define KEY_S 0x16
#define KEY_T 0x17
#define KEY_U 0x18
#define KEY_V 0x19
#define KEY_W 0x1A
#define KEY_X 0x1B
#define KEY_Y 0x1C
#define KEY_Z 0x1D
#define KEY_1 0x1E
#define KEY_2 0x1F
#define KEY_3 0x20
#define KEY_4 0x21
#define KEY_5 0x22
#define KEY_6 0x23
#define KEY_7 0x24
#define KEY_8 0x25
#define KEY_9 0x26
#define KEY_0 0x27
#define KEY_ENTER 0x28
#define KEY_ESC 0x29
#define KEY_BACKSPACE 0x2A
#define KEY_TAB 0x2B
#define KEY_SPACE 0x2C
#define KEY_F1 0x3A
#define KEY_F2 0x3B
#define KEY_F3 0x3C
#define KEY_F4 0x3D
#define KEY_F5 0x3E
#define KEY_F6 0x3F
#define KEY_F7 0x40
#define KEY_F8 0x41
#define KEY_F9 0x42
#define KEY_F10 0x43
#define KEY_F11 0x44
#define KEY_F12 0x45

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

class USBHIDKeyboard {
public:
    void begin() {
        memset(_keyReport, 0, sizeof(_keyReport));
    }

    void pressKey(uint8_t keycode, uint8_t modifier = KEY_MOD_NONE) {
        _keyReport[0] = modifier;
        _keyReport[2] = keycode;
        sendKeyReport();
    }

    void releaseKey() {
        memset(_keyReport, 0, sizeof(_keyReport));
        sendKeyReport();
    }

    void typeKey(uint8_t keycode, uint8_t modifier = KEY_MOD_NONE) {
        pressKey(keycode, modifier);
        ::delay(10);  // Small delay between press and release
        releaseKey();
    }

    // Helper function to convert key string to HID code
    static uint8_t getKeyCode(const char* key) {
        if (strcmp(key, "F1") == 0) return KEY_F1;
        if (strcmp(key, "F2") == 0) return KEY_F2;
        if (strcmp(key, "F3") == 0) return KEY_F3;
        if (strcmp(key, "F4") == 0) return KEY_F4;
        if (strcmp(key, "F5") == 0) return KEY_F5;
        if (strcmp(key, "F6") == 0) return KEY_F6;
        if (strcmp(key, "F7") == 0) return KEY_F7;
        if (strcmp(key, "F8") == 0) return KEY_F8;
        if (strcmp(key, "F9") == 0) return KEY_F9;
        if (strcmp(key, "F10") == 0) return KEY_F10;
        if (strcmp(key, "F11") == 0) return KEY_F11;
        if (strcmp(key, "F12") == 0) return KEY_F12;
        if (strcmp(key, "Enter") == 0) return KEY_ENTER;
        if (strcmp(key, "Space") == 0 || strcmp(key, " ") == 0) return KEY_SPACE;
        if (strcmp(key, "Tab") == 0) return KEY_TAB;
        if (strcmp(key, "Escape") == 0 || strcmp(key, "Esc") == 0) return KEY_ESC;
        if (strcmp(key, "Backspace") == 0) return KEY_BACKSPACE;
        
        // Numbers
        if (strcmp(key, "1") == 0) return KEY_1;
        if (strcmp(key, "2") == 0) return KEY_2;
        if (strcmp(key, "3") == 0) return KEY_3;
        if (strcmp(key, "4") == 0) return KEY_4;
        if (strcmp(key, "5") == 0) return KEY_5;
        if (strcmp(key, "6") == 0) return KEY_6;
        if (strcmp(key, "7") == 0) return KEY_7;
        if (strcmp(key, "8") == 0) return KEY_8;
        if (strcmp(key, "9") == 0) return KEY_9;
        if (strcmp(key, "0") == 0) return KEY_0;
        
        // Single letter keys (handle both upper and lower case)
        if (strlen(key) == 1) {
            char c = key[0];
            if (c >= 'A' && c <= 'Z') {
                return KEY_A + (c - 'A');
            } else if (c >= 'a' && c <= 'z') {
                return KEY_A + (c - 'a');
            }
        }
        
        return KEY_NONE;
    }
    
    // Helper function to create modifier byte from strings
    static uint8_t getModifierByte(const char* modifierList[], int modifierCount) {
        uint8_t modifiers = 0;
        
        for (int i = 0; i < modifierCount; i++) {
            const char* mod = modifierList[i];
            if (strcmp(mod, "ctrl") == 0) {
                modifiers |= KEY_MOD_LCTRL;
            } else if (strcmp(mod, "shift") == 0) {
                modifiers |= KEY_MOD_LSHIFT;
            } else if (strcmp(mod, "alt") == 0) {
                modifiers |= KEY_MOD_LALT;
            } else if (strcmp(mod, "meta") == 0 || strcmp(mod, "cmd") == 0 || strcmp(mod, "win") == 0) {
                modifiers |= KEY_MOD_LMETA;
            }
        }
        
        return modifiers;
    }

private:
    uint8_t _keyReport[8];  // Standard keyboard report

    void sendKeyReport() {
        // Send keyboard report with report ID 1 (standard keyboard)
        tud_hid_report(1 /* report ID */, _keyReport, sizeof(_keyReport));
    }


};

#endif // CUSTOM_HID_MOUSE_H 