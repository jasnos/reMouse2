#include "tusb.h"

// Runtime HID mode selection
// 0 = Mouse-only (compat), 1 = Boot Keyboard-only, 2 = Combined Keyboard+Mouse
static int g_hid_mode = 0;
extern "C" void set_hid_mode(int mode) { g_hid_mode = mode; }
extern "C" int get_hid_mode() { return g_hid_mode; }

// -----------------------------------------------------------------------------
//  Device Descriptor (matches UGREEN USB Mouse & HID)
// -----------------------------------------------------------------------------
static const tusb_desc_device_t desc_device = {
    .bLength            = sizeof(tusb_desc_device_t),
    .bDescriptorType    = TUSB_DESC_DEVICE,
    .bcdUSB             = 0x0110, // USB 1.1
    .bDeviceClass       = 0x00,   // Defined per Interface
    .bDeviceSubClass    = 0x00,
    .bDeviceProtocol    = 0x00,
    .bMaxPacketSize0    = CFG_TUD_ENDPOINT0_SIZE,
    .idVendor           = 0x10D6, // Actions Semi (same as UGREEN)
    .idProduct          = 0xB021,
    .bcdDevice          = 0x0000,
    .iManufacturer      = 0x01,
    .iProduct           = 0x02,
    .iSerialNumber      = 0x03,
    .bNumConfigurations = 0x01
};

extern "C" const uint8_t * tud_descriptor_device_cb(void) {
    return reinterpret_cast<const uint8_t *>(&desc_device);
}

// -----------------------------------------------------------------------------
//  HID Report Descriptor - Combined Mouse and Keyboard (Report IDs: 1=kbd, 3=mouse)
// -----------------------------------------------------------------------------
static const uint8_t hid_report_desc_combo[] = {
    // Keyboard Report Descriptor (Report ID = 1)
    0x05, 0x01,        // Usage Page (Generic Desktop)
    0x09, 0x06,        // Usage (Keyboard)
    0xA1, 0x01,        // Collection (Application)
    0x85, 0x01,        //   Report ID (1)
    0x05, 0x07,        //   Usage Page (Keyboard)
    0x19, 0xE0,        //   Usage Minimum (Keyboard Left Control)
    0x29, 0xE7,        //   Usage Maximum (Keyboard Right GUI)
    0x15, 0x00,        //   Logical Minimum (0)
    0x25, 0x01,        //   Logical Maximum (1)
    0x75, 0x01,        //   Report Size (1)
    0x95, 0x08,        //   Report Count (8)
    0x81, 0x02,        //   Input (Data,Var,Abs,No Wrap,Linear,Preferred State,No Null Position)
    0x95, 0x01,        //   Report Count (1)
    0x75, 0x08,        //   Report Size (8)
    0x81, 0x01,        //   Input (Const,Array,Abs,No Wrap,Linear,Preferred State,No Null Position)
    0x95, 0x06,        //   Report Count (6)
    0x75, 0x08,        //   Report Size (8)
    0x15, 0x00,        //   Logical Minimum (0)
    0x25, 0x65,        //   Logical Maximum (101)
    0x05, 0x07,        //   Usage Page (Keyboard)
    0x19, 0x00,        //   Usage Minimum (0)
    0x29, 0x65,        //   Usage Maximum (101)
    0x81, 0x00,        //   Input (Data,Array,Abs,No Wrap,Linear,Preferred State,No Null Position)
    0xC0,              // End Collection
    
    // Original Mouse Report Descriptor (Report ID = 3)
    0x05, 0x01, 0x09, 0x02, 0xA1, 0x01, 0x85, 0x03, 0x09, 0x01, 0xA1, 0x00, 0x05, 0x09, 0x19, 0x01,
    0x29, 0x08, 0x15, 0x00, 0x25, 0x01, 0x95, 0x08, 0x75, 0x01, 0x81, 0x02, 0x05, 0x01, 0x09, 0x30,
    0x09, 0x31, 0x15, 0x81, 0x25, 0x7F, 0x75, 0x08, 0x95, 0x02, 0x81, 0x06, 0x09, 0x38, 0x15, 0x81,
    0x25, 0x7F, 0x75, 0x08, 0x95, 0x01, 0x81, 0x06, 0xC0, 0xC0,
    
    // Original Vendor Report (Report ID = 0x55)
    0x06, 0x90, 0xFF, 0x09, 0x01, 0xA1,
    0x01, 0x09, 0x03, 0x85, 0x55, 0x15, 0x00, 0x26, 0xFF, 0x00, 0x75, 0x08, 0x95, 0x3F, 0x82, 0x02,
    0x01, 0x09, 0x04, 0x15, 0x00, 0x25, 0x01, 0x75, 0x08, 0x95, 0x3F, 0x91, 0x01, 0xC0
};

// -----------------------------------------------------------------------------
//  HID Report Descriptor - Original Mouse-only (with vendor report) [length 94]
//  This matches the earlier working UGREEN-like device seen by strict hosts.
// -----------------------------------------------------------------------------
static const uint8_t hid_report_desc_mouse[] = {
    0x05, 0x01, 0x09, 0x02, 0xA1, 0x01, 0x85, 0x03, 0x09, 0x01, 0xA1, 0x00, 0x05, 0x09, 0x19, 0x01,
    0x29, 0x08, 0x15, 0x00, 0x25, 0x01, 0x95, 0x08, 0x75, 0x01, 0x81, 0x02, 0x05, 0x01, 0x09, 0x30,
    0x09, 0x31, 0x15, 0x81, 0x25, 0x7F, 0x75, 0x08, 0x95, 0x02, 0x81, 0x06, 0x09, 0x38, 0x15, 0x81,
    0x25, 0x7F, 0x75, 0x08, 0x95, 0x01, 0x81, 0x06, 0xC0, 0xC0, 0x06, 0x90, 0xFF, 0x09, 0x01, 0xA1,
    0x01, 0x09, 0x03, 0x85, 0x55, 0x15, 0x00, 0x26, 0xFF, 0x00, 0x75, 0x08, 0x95, 0x3F, 0x82, 0x02,
    0x01, 0x09, 0x04, 0x15, 0x00, 0x25, 0x01, 0x75, 0x08, 0x95, 0x3F, 0x91, 0x01, 0xC0
};

//  HID Report Descriptor - Boot Keyboard (no Report ID, 8-byte input report)
static const uint8_t hid_report_desc_boot_kbd[] = {
    0x05, 0x01,       // Usage Page (Generic Desktop)
    0x09, 0x06,       // Usage (Keyboard)
    0xA1, 0x01,       // Collection (Application)
    0x05, 0x07,       //   Usage Page (Keyboard)
    0x19, 0xE0,       //   Usage Minimum (LeftControl)
    0x29, 0xE7,       //   Usage Maximum (Right GUI)
    0x15, 0x00,       //   Logical Minimum (0)
    0x25, 0x01,       //   Logical Maximum (1)
    0x75, 0x01,       //   Report Size (1)
    0x95, 0x08,       //   Report Count (8)
    0x81, 0x02,       //   Input (Data,Var,Abs)
    0x95, 0x01,       //   Report Count (1)
    0x75, 0x08,       //   Report Size (8)
    0x81, 0x01,       //   Input (Const,Array,Abs) - reserved
    0x95, 0x06,       //   Report Count (6)
    0x75, 0x08,       //   Report Size (8)
    0x15, 0x00,       //   Logical Minimum (0)
    0x25, 0x65,       //   Logical Maximum (101)
    0x05, 0x07,       //   Usage Page (Keyboard)
    0x19, 0x00,       //   Usage Minimum (0)
    0x29, 0x65,       //   Usage Maximum (101)
    0x81, 0x00,       //   Input (Data,Array)
    // Optional LEDs output (5 bits)
    0x95, 0x05,       //   Report Count (5)
    0x75, 0x01,       //   Report Size (1)
    0x05, 0x08,       //   Usage Page (LEDs)
    0x19, 0x01,       //   Usage Minimum (Num Lock)
    0x29, 0x05,       //   Usage Maximum (Kana)
    0x91, 0x02,       //   Output (Data,Var,Abs)
    0x95, 0x01,       //   Report Count (1)
    0x75, 0x03,       //   Report Size (3)
    0x91, 0x01,       //   Output (Const,Array,Abs)
    0xC0              // End Collection
};

extern "C" const uint8_t * tud_hid_descriptor_report_cb(uint8_t /*instance*/) {
    if (g_hid_mode == 2) return hid_report_desc_combo;
    if (g_hid_mode == 1) return hid_report_desc_boot_kbd;
    return hid_report_desc_mouse; // default mouse-only
}

// -----------------------------------------------------------------------------
//  Configuration Descriptor
// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
//  Configuration Descriptors (switch by g_keyboard_hid_enabled)
// -----------------------------------------------------------------------------
static const uint8_t config_descriptor_combo[] = {
    // Configuration descriptor
    0x09, 0x02, 0x29, 0x00, 0x01, 0x01, 0x00, 0x80, 0x32,
    // Interface descriptor
    0x09, 0x04, 0x00, 0x00, 0x02, 0x03, 0x00, 0x00, 0x00,
    // HID descriptor (updated length for new report descriptor)
    0x09, 0x21, 0x10, 0x01, 0x00, 0x01, 0x22, 0x92, 0x00,  // 0x92 = 146 bytes
    // Endpoint IN interrupt
    0x07, 0x05, 0x81, 0x03, 0x40, 0x00, 0x01,
    // Endpoint OUT interrupt
    0x07, 0x05, 0x01, 0x03, 0x40, 0x00, 0x01
};

extern "C" const uint8_t * tud_descriptor_configuration_cb(uint8_t /*index*/) {
    // Mouse-only uses report length 0x5E
    static const uint8_t config_descriptor_mouse[] = {
        // Configuration descriptor
        0x09, 0x02, 0x29, 0x00, 0x01, 0x01, 0x00, 0x80, 0x32,
        // Interface descriptor
        0x09, 0x04, 0x00, 0x00, 0x02, 0x03, 0x00, 0x00, 0x00,
        // HID descriptor (original report descriptor length 0x5E = 94 bytes)
        0x09, 0x21, 0x10, 0x01, 0x00, 0x01, 0x22, 0x5E, 0x00,
        // Endpoint IN interrupt
        0x07, 0x05, 0x81, 0x03, 0x40, 0x00, 0x01,
        // Endpoint OUT interrupt
        0x07, 0x05, 0x01, 0x03, 0x40, 0x00, 0x01
    };

    // Boot keyboard-only: subclass 0x01 (Boot), protocol 0x01 (Keyboard), report length computed below
    // Our boot keyboard report descriptor length is 63 (0x3F) bytes (count from array). We'll set accordingly.
    static const uint8_t config_descriptor_boot_kbd[] = {
        // Configuration descriptor
        0x09, 0x02, 0x22, 0x00, 0x01, 0x01, 0x00, 0x80, 0x32,
        // Interface descriptor
        0x09, 0x04, 0x00, 0x00, 0x01, 0x03, 0x01, 0x01, 0x00,
        // HID descriptor (report length 0x3F = 63)
        0x09, 0x21, 0x10, 0x01, 0x00, 0x01, 0x22, 0x3F, 0x00,
        // Endpoint IN interrupt (8 bytes, 10ms)
        0x07, 0x05, 0x81, 0x03, 0x08, 0x00, 0x0A
    };

    if (g_hid_mode == 2) return config_descriptor_combo;
    if (g_hid_mode == 1) return config_descriptor_boot_kbd;
    return config_descriptor_mouse;
}

// -----------------------------------------------------------------------------
//  String Descriptors
// -----------------------------------------------------------------------------
static const char * const string_desc_arr[] = {
    (const char *) u"\u0409",             // 0: supported language (English - US)
    "Actions",                             // 1: Manufacturer
    "USB MOUSE & KEYBOARD HID",           // 2: Product (overridden dynamically if needed)
    "0123456789AB"                        // 3: Serial
};

// Convert ASCII string into UTF-16LE and return pointer within static buffer
extern "C" const uint16_t * tud_descriptor_string_cb(uint8_t index, uint16_t langid) {
    static uint16_t desc_str[32];
    (void) langid;

    if (index == 0) {
        desc_str[1] = 0x0409; // English
        desc_str[0] = (TUSB_DESC_STRING << 8) | (4); // bLength = 4 bytes
        return desc_str;
    }

    if (index >= sizeof(string_desc_arr) / sizeof(string_desc_arr[0])) {
        return NULL;
    }

    const char *str = string_desc_arr[index];
    // For strict hosts, match original product string in mouse-only mode
    if (index == 2) {
        if (g_hid_mode == 0) str = "USB MOUSE & HID";
        else if (g_hid_mode == 1) str = "USB BOOT KEYBOARD";
        else str = "USB MOUSE & KEYBOARD HID";
    }
    uint8_t len = 0;
    while (str[len] && len < 31) {
        desc_str[1 + len] = str[len];
        len++;
    }
    // first byte is length (including header), second is descriptor type
    desc_str[0] = (TUSB_DESC_STRING << 8) | (2 * len + 2);
    return desc_str;
} 