#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <Preferences.h>
#include <ESPmDNS.h>
#include <LittleFS.h>
#include <ArduinoJson.h>
#include "USB.h"
#include "custom_hid_mouse.h"
#include <stdlib.h>

// Fix for Serial not being defined in some configurations
#if !defined(Serial) && defined(Serial0)
#define Serial Serial0
#endif

// WiFi credentials
const char* ssid = "reMouse";
const char* password = "remouse1";
const char* hostname = "remouse";

// Create AsyncWebServer object on port 80
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

// USB HID Mouse
USBHIDMouse Mouse;

// Preferences for persistent storage
Preferences preferences;

// Mouse control variables
bool mouseEnabled = true;
float sensitivity = 1.0;
bool leftButtonPressed = false;
bool rightButtonPressed = false;

// Mouse jiggler variables
bool jigglerEnabled = false;
int jigglerInterval = 5;
int jigglerSpeed = 5;
int jigglerRange = 50;
String jigglerPattern = "circle";
unsigned long lastJigglerTime = 0;
int currentJigglerStep = 0;
std::vector<std::pair<int, int>> currentJigglerMovements;
bool jigglerActive = false;

// JSON buffer size
const size_t JSON_BUFFER_SIZE = 1024;

// Forward declarations for jiggler movement functions
std::vector<std::pair<int, int>> generateCirclePattern(int range, int speed);
std::vector<std::pair<int, int>> generateFigure8Pattern(int range, int speed);
std::vector<std::pair<int, int>> generateSpiralPattern(int range, int speed);
std::vector<std::pair<int, int>> generateSquarePattern(int range, int speed);
std::vector<std::pair<int, int>> generateTrianglePattern(int range, int speed);
std::vector<std::pair<int, int>> generateWanderPattern(int range, int speed);

// Initialize LittleFS
void initFileSystem() {
    if (!LittleFS.begin(true)) {
        LittleFS.format();
        if (!LittleFS.begin()) {
            return;
        }
    }
}

// Load settings from preferences
void loadSettings() {
    mouseEnabled = preferences.getBool("enabled", true);
    sensitivity = preferences.getFloat("sensitivity", 1.0);
    
    // Load jiggler settings
    jigglerEnabled = preferences.getBool("jiggler_enabled", false);
    jigglerInterval = preferences.getInt("jiggler_interval", 5);
    jigglerSpeed = preferences.getInt("jiggler_speed", 5);
    jigglerRange = preferences.getInt("jiggler_range", 50);
    jigglerPattern = preferences.getString("jiggler_pattern", "circle");
}

// Save settings to preferences
void saveSettings() {
    preferences.putBool("enabled", mouseEnabled);
    preferences.putFloat("sensitivity", sensitivity);
    
    // Save jiggler settings
    preferences.putBool("jiggler_enabled", jigglerEnabled);
    preferences.putInt("jiggler_interval", jigglerInterval);
    preferences.putInt("jiggler_speed", jigglerSpeed);
    preferences.putInt("jiggler_range", jigglerRange);
    preferences.putString("jiggler_pattern", jigglerPattern);
}

// Generate jiggler movement patterns (returns relative movements, not absolute positions)
std::vector<std::pair<int, int>> generateCirclePattern(int range, int speed) {
    std::vector<std::pair<int, int>> movements;
    // Calculate steps based on range: more range = more steps for smooth movement
    // Base: 1 step per 2 pixels of range, minimum 30 steps
    int steps = max(30, range / 2);
    // Speed affects step size, not number of steps
    int radius = range / 2;
    
    // Generate absolute positions first
    std::vector<std::pair<int, int>> positions;
    for (int i = 0; i <= steps; i++) { // Include one extra step to close the circle
        float angle = (i * 2 * PI) / steps;
        int x = cos(angle) * radius;
        int y = sin(angle) * radius;
        positions.push_back({x, y});
    }
    
    // Convert to relative movements
    for (int i = 1; i < positions.size(); i++) {
        int deltaX = positions[i].first - positions[i-1].first;
        int deltaY = positions[i].second - positions[i-1].second;
        movements.push_back({deltaX, deltaY});
    }
    
    return movements;
}

std::vector<std::pair<int, int>> generateFigure8Pattern(int range, int speed) {
    std::vector<std::pair<int, int>> movements;
    // Calculate steps based on range: more range = more steps for smooth movement
    // Base: 1 step per 1.5 pixels of range, minimum 40 steps
    int steps = max(40, range * 2 / 3);
    // Speed affects step size, not number of steps
    int radius = range / 3;
    
    // Generate absolute positions first
    std::vector<std::pair<int, int>> positions;
    for (int i = 0; i <= steps; i++) { // Include one extra step to close the pattern
        float t = (i * 2 * PI) / steps;
        int x = radius * sin(t);
        int y = radius * sin(t) * cos(t);
        positions.push_back({x, y});
    }
    
    // Convert to relative movements
    for (int i = 1; i < positions.size(); i++) {
        int deltaX = positions[i].first - positions[i-1].first;
        int deltaY = positions[i].second - positions[i-1].second;
        movements.push_back({deltaX, deltaY});
    }
    
    return movements;
}

std::vector<std::pair<int, int>> generateSpiralPattern(int range, int speed) {
    std::vector<std::pair<int, int>> movements;
    // Calculate steps based on range: more range = more steps for smooth movement
    // Base: 1 step per 1 pixel of range, minimum 50 steps
    int steps = max(50, range);
    // Speed affects step size, not number of steps
    int maxRadius = range / 2;
    
    // Generate absolute positions first
    std::vector<std::pair<int, int>> positions;
    for (int i = 0; i <= steps; i++) { // Include one extra step
        float t = (i * 4 * PI) / steps;
        int radius = (i * maxRadius) / steps;
        int x = cos(t) * radius;
        int y = sin(t) * radius;
        positions.push_back({x, y});
    }
    
    // Convert to relative movements
    for (int i = 1; i < positions.size(); i++) {
        int deltaX = positions[i].first - positions[i-1].first;
        int deltaY = positions[i].second - positions[i-1].second;
        movements.push_back({deltaX, deltaY});
    }
    
    return movements;
}

std::vector<std::pair<int, int>> generateSquarePattern(int range, int speed) {
    std::vector<std::pair<int, int>> movements;
    // Calculate steps based on range: more range = more steps for smooth movement
    // Base: 1 step per 2 pixels of range, minimum 25 steps
    int steps = max(25, range / 2);
    // Speed affects step size, not number of steps
    int size = range / 2;
    int stepsPerSide = steps / 4;
    
    // Generate absolute positions first
    std::vector<std::pair<int, int>> positions;
    
    // Top side
    for (int i = 0; i < stepsPerSide; i++) {
        int x = -size + (i * size * 2) / stepsPerSide;
        int y = -size;
        positions.push_back({x, y});
    }
    
    // Right side
    for (int i = 0; i < stepsPerSide; i++) {
        int x = size;
        int y = -size + (i * size * 2) / stepsPerSide;
        positions.push_back({x, y});
    }
    
    // Bottom side
    for (int i = 0; i < stepsPerSide; i++) {
        int x = size - (i * size * 2) / stepsPerSide;
        int y = size;
        positions.push_back({x, y});
    }
    
    // Left side
    for (int i = 0; i < stepsPerSide; i++) {
        int x = -size;
        int y = size - (i * size * 2) / stepsPerSide;
        positions.push_back({x, y});
    }
    
    // Close the square
    positions.push_back({-size, -size});
    
    // Convert to relative movements
    for (int i = 1; i < positions.size(); i++) {
        int deltaX = positions[i].first - positions[i-1].first;
        int deltaY = positions[i].second - positions[i-1].second;
        movements.push_back({deltaX, deltaY});
    }
    
    return movements;
}

std::vector<std::pair<int, int>> generateTrianglePattern(int range, int speed) {
    std::vector<std::pair<int, int>> movements;
    // Calculate steps based on range: more range = more steps for smooth movement
    // Base: 1 step per 2 pixels of range, minimum 30 steps
    int steps = max(30, range / 2);
    // Speed affects step size, not number of steps
    int size = range / 2;
    int stepsPerSide = steps / 3;
    
    // Triangle vertices
    int vertices[3][2] = {
        {0, -size},
        {(int)(size * cos(PI / 6)), (int)(size * sin(PI / 6))},
        {(int)(-size * cos(PI / 6)), (int)(size * sin(PI / 6))}
    };
    
    // Generate absolute positions first
    std::vector<std::pair<int, int>> positions;
    
    // Generate movements along triangle sides
    for (int side = 0; side < 3; side++) {
        int startX = vertices[side][0];
        int startY = vertices[side][1];
        int endX = vertices[(side + 1) % 3][0];
        int endY = vertices[(side + 1) % 3][1];
        
        for (int i = 0; i < stepsPerSide; i++) {
            float t = (float)i / stepsPerSide;
            int x = startX + (endX - startX) * t;
            int y = startY + (endY - startY) * t;
            positions.push_back({x, y});
        }
    }
    
    // Close the triangle
    positions.push_back({0, -size});
    
    // Convert to relative movements
    for (int i = 1; i < positions.size(); i++) {
        int deltaX = positions[i].first - positions[i-1].first;
        int deltaY = positions[i].second - positions[i-1].second;
        movements.push_back({deltaX, deltaY});
    }
    
    return movements;
}

// Generate Random Wander pattern
std::vector<std::pair<int, int>> generateWanderPattern(int range, int speed) {
    std::vector<std::pair<int, int>> movements;

    // Calculate steps based on range: more range = more steps for smooth movement
    // Base: 1 step per 1 pixel of range, minimum 200 steps
    const int steps = max(200, range);
    const float stepLength = max(1.0f, range / 40.0f) * (speed / 5.0f);
    const float maxRadius = range / 2.0f;

    // Store absolute positions to later convert to relative movements
    std::vector<std::pair<float, float>> positions;
    positions.reserve(steps + 1);

    float x = 0.0f;
    float y = 0.0f;
    float angle = random(0, 6283) / 1000.0f;  // Random initial angle 0-~6.283 rad

    positions.push_back({x, y});

    for (int i = 0; i < steps; ++i) {
        // Smooth random turn up to ±60 degrees
        float deltaAngle = (random(-3141, 3141) / 1000.0f) * (PI / 3.0f); // ±60° in radians scaled by random value [-3.141,3.141]
        angle += deltaAngle;

        // Step in current direction
        x += cos(angle) * stepLength;
        y += sin(angle) * stepLength;

        // If too far, reflect towards origin with slight randomization
        float distance = sqrt(x * x + y * y);
        if (distance > maxRadius) {
            float reflectAngle = atan2(y, x) + PI; // back towards origin
            angle = reflectAngle + (random(-785, 785) / 1000.0f); // ±45° random
            x = cos(angle) * maxRadius;
            y = sin(angle) * maxRadius;
        }

        positions.push_back({x, y});
    }

    // Convert absolute positions to relative movements
    for (size_t i = 1; i < positions.size(); ++i) {
        int deltaX = round(positions[i].first - positions[i - 1].first);
        int deltaY = round(positions[i].second - positions[i - 1].second);
        movements.push_back({deltaX, deltaY});
    }

    return movements;
}

// Perform jiggler movement
void performJigglerMovement() {
    // Jiggler should operate independently of mouse control.
    if (!jigglerEnabled) return;
    
    unsigned long currentTime = millis();
    
    // If not active and enough time has passed, start new movement
    if (!jigglerActive && (currentTime - lastJigglerTime >= (jigglerInterval * 1000))) {
        // Generate new pattern
        if (jigglerPattern == "circle") {
            currentJigglerMovements = generateCirclePattern(jigglerRange, jigglerSpeed);
        } else if (jigglerPattern == "figure8") {
            currentJigglerMovements = generateFigure8Pattern(jigglerRange, jigglerSpeed);
        } else if (jigglerPattern == "spiral") {
            currentJigglerMovements = generateSpiralPattern(jigglerRange, jigglerSpeed);
        } else if (jigglerPattern == "square") {
            currentJigglerMovements = generateSquarePattern(jigglerRange, jigglerSpeed);
        } else if (jigglerPattern == "triangle") {
            currentJigglerMovements = generateTrianglePattern(jigglerRange, jigglerSpeed);
        } else if (jigglerPattern == "wander") {
            currentJigglerMovements = generateWanderPattern(jigglerRange, jigglerSpeed);
        }
        
        currentJigglerStep = 0;
        jigglerActive = true;
        lastJigglerTime = currentTime;
    }
    
    // Execute movement step with timing based on speed
    if (jigglerActive) {
        // Calculate delay between steps for natural human-like movement
        // Speed 1-10 maps to 50ms-5ms delay (faster speed = shorter delay)
        // This creates consistent movement speed regardless of range
        int stepDelay = map(jigglerSpeed, 1, 10, 50, 5);
        static unsigned long lastStepTime = 0;
        
        if (currentTime - lastStepTime >= stepDelay) {
            if (currentJigglerStep < currentJigglerMovements.size()) {
                // Apply relative movement
                auto movement = currentJigglerMovements[currentJigglerStep];
                Mouse.move(movement.first, movement.second);
                
                currentJigglerStep++;
                lastStepTime = currentTime;
            } else {
                // Pattern complete, reset for next cycle
                jigglerActive = false;
                currentJigglerStep = 0;
                lastJigglerTime = currentTime;
            }
        }
    }
}

// Handle WebSocket events
void onWsEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type,
               void *arg, uint8_t *data, size_t len) {
    if (type == WS_EVT_CONNECT) {
        // Client connected
    } else if (type == WS_EVT_DISCONNECT) {
        // Client disconnected
        // Release any pressed buttons on disconnect
        if (leftButtonPressed) {
            Mouse.release(MOUSE_LEFT);
            leftButtonPressed = false;
        }
        if (rightButtonPressed) {
            Mouse.release(MOUSE_RIGHT);
            rightButtonPressed = false;
        }
    } else if (type == WS_EVT_DATA) {
        AwsFrameInfo *info = (AwsFrameInfo*)arg;
        if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT) {
            data[len] = 0;
            
            // Parse JSON using ArduinoJson
            StaticJsonDocument<JSON_BUFFER_SIZE> doc;
            DeserializationError error = deserializeJson(doc, (char*)data);
            
            if (error) {
                return;
            }
            
            const char* type = doc["type"];
            
            if (strcmp(type, "move") == 0) {
                float x = doc["x"];
                float y = doc["y"];
                
                if (mouseEnabled) {
                    Mouse.move(x * sensitivity, y * sensitivity);
                }
            } else if (strcmp(type, "scroll") == 0) {
                float y = doc["y"];
                
                if (mouseEnabled) {
                    Mouse.move(0, 0, -y); // Negative for natural scrolling
                }
            } else if (strcmp(type, "click") == 0) {
                const char* button = doc["button"];
                
                if (mouseEnabled) {
                    if (strcmp(button, "left") == 0) {
                        Mouse.click(MOUSE_LEFT);
                    } else if (strcmp(button, "right") == 0) {
                        Mouse.click(MOUSE_RIGHT);
                    }
                }
            } else if (strcmp(type, "mouseDown") == 0) {
                const char* button = doc["button"];
                
                if (mouseEnabled) {
                    if (strcmp(button, "left") == 0) {
                        Mouse.press(MOUSE_LEFT);
                        leftButtonPressed = true;
                    } else if (strcmp(button, "right") == 0) {
                        Mouse.press(MOUSE_RIGHT);
                        rightButtonPressed = true;
                    }
                }
            } else if (strcmp(type, "mouseUp") == 0) {
                const char* button = doc["button"];
                
                if (mouseEnabled) {
                    if (strcmp(button, "left") == 0) {
                        Mouse.release(MOUSE_LEFT);
                        leftButtonPressed = false;
                    } else if (strcmp(button, "right") == 0) {
                        Mouse.release(MOUSE_RIGHT);
                        rightButtonPressed = false;
                    }
                }
            } else if (strcmp(type, "setEnabled") == 0) {
                mouseEnabled = doc["enabled"];
                saveSettings();
                
                // Release any pressed buttons when disabling
                if (!mouseEnabled) {
                    if (leftButtonPressed) {
                        Mouse.release(MOUSE_LEFT);
                        leftButtonPressed = false;
                    }
                    if (rightButtonPressed) {
                        Mouse.release(MOUSE_RIGHT);
                        rightButtonPressed = false;
                    }
                }
            } else if (strcmp(type, "setSensitivity") == 0) {
                sensitivity = doc["sensitivity"];
                saveSettings();
            } else if (strcmp(type, "getSettings") == 0) {
                // Send current settings
                StaticJsonDocument<JSON_BUFFER_SIZE> response;
                response["type"] = "settings";
                response["enabled"] = mouseEnabled;
                response["sensitivity"] = sensitivity;
                
                String responseStr;
                serializeJson(response, responseStr);
                client->text(responseStr);
            } else if (strcmp(type, "setJigglerEnabled") == 0) {
                jigglerEnabled = doc["enabled"];
                saveSettings();
                
                if (!jigglerEnabled) {
                    jigglerActive = false;
                    currentJigglerStep = 0;
                }
                
                // Send confirmation
                StaticJsonDocument<JSON_BUFFER_SIZE> response;
                response["type"] = "jigglerStatus";
                response["enabled"] = jigglerEnabled;
                
                String responseStr;
                serializeJson(response, responseStr);
                client->text(responseStr);
            } else if (strcmp(type, "setJigglerSettings") == 0) {
                jigglerInterval = doc["interval"];
                jigglerSpeed = doc["speed"];
                jigglerRange = doc["range"];
                jigglerPattern = doc["pattern"].as<String>();
                saveSettings();
                
                // Reset jiggler if active
                if (jigglerEnabled) {
                    jigglerActive = false;
                    currentJigglerStep = 0;
                    lastJigglerTime = 0; // Force immediate restart with new settings
                }
                
                // Send confirmation with updated settings
                StaticJsonDocument<JSON_BUFFER_SIZE> response;
                response["type"] = "jigglerSettingsUpdated";
                JsonObject settings = response.createNestedObject("settings");
                settings["interval"] = jigglerInterval;
                settings["speed"] = jigglerSpeed;
                settings["range"] = jigglerRange;
                settings["pattern"] = jigglerPattern;
                
                String responseStr;
                serializeJson(response, responseStr);
                client->text(responseStr);
            } else if (strcmp(type, "getJigglerSettings") == 0) {
                // Send current jiggler settings
                StaticJsonDocument<JSON_BUFFER_SIZE> response;
                response["type"] = "jigglerSettings";
                response["enabled"] = jigglerEnabled;
                JsonObject settings = response.createNestedObject("settings");
                settings["interval"] = jigglerInterval;
                settings["speed"] = jigglerSpeed;
                settings["range"] = jigglerRange;
                settings["pattern"] = jigglerPattern;
                
                String responseStr;
                serializeJson(response, responseStr);
                client->text(responseStr);
            } else if (strcmp(type, "jigglerMovement") == 0) {
                // Handle custom jiggler movement from client
                if (mouseEnabled && doc.containsKey("movements")) {
                    JsonArray movements = doc["movements"];
                    for (JsonObject movement : movements) {
                        int x = movement["x"];
                        int y = movement["y"];
                        Mouse.move(x, y);
                        delay(10); // Small delay for smooth movement
                    }
                }
            }
        }
    }
}

// Serve static files from LittleFS
void setupStaticFileHandlers() {
    // Serve index.html
    server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
        request->send(LittleFS, "/index.html", "text/html");
    });
    
    // Serve CSS
    server.on("/style.css", HTTP_GET, [](AsyncWebServerRequest *request) {
        request->send(LittleFS, "/style.css", "text/css");
    });
    
    // Serve JavaScript
    server.on("/app.js", HTTP_GET, [](AsyncWebServerRequest *request) {
        request->send(LittleFS, "/app.js", "application/javascript");
    });
    
    // Serve manifest.json
    server.on("/manifest.json", HTTP_GET, [](AsyncWebServerRequest *request) {
        if (LittleFS.exists("/manifest.json")) {
            request->send(LittleFS, "/manifest.json", "application/json");
        } else {
            // Send a default manifest if file doesn't exist
            String manifest = R"({
                "name": "reMouse",
                "short_name": "reMouse",
                "description": "Remote Mouse Controller",
                "start_url": "/",
                "display": "standalone",
                "theme_color": "#667eea",
                "background_color": "#0a0a0a",
                "icons": []
            })";
            request->send(200, "application/json", manifest);
        }
    });
    
    // Serve favicon
    server.on("/favicon.svg", HTTP_GET, [](AsyncWebServerRequest *request) {
        if (LittleFS.exists("/favicon.svg")) {
            request->send(LittleFS, "/favicon.svg", "image/svg+xml");
        } else {
            // Send a default SVG favicon
            String favicon = R"(<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
                <rect width="32" height="32" fill="#667eea" rx="6"/>
                <path d="M16 8C12.686 8 10 10.686 10 14v4c0 3.314 2.686 6 6 6s6-2.686 6-6v-4c0-3.314-2.686-6-6-6z" fill="white"/>
                <path d="M16 8v6" stroke="#667eea" stroke-width="2"/>
                <circle cx="16" cy="13" r="1.5" fill="#667eea"/>
            </svg>)";
            request->send(200, "image/svg+xml", favicon);
        }
    });
    
    // Serve service worker
    server.on("/sw.js", HTTP_GET, [](AsyncWebServerRequest *request) {
        if (LittleFS.exists("/sw.js")) {
            request->send(LittleFS, "/sw.js", "application/javascript");
        } else {
            // Send a minimal service worker
            String sw = R"(
                self.addEventListener('install', e => {
                    self.skipWaiting();
                });
                self.addEventListener('activate', e => {
                    self.clients.claim();
                });
            )";
            request->send(200, "application/javascript", sw);
        }
    });
    
    // Handle 404
    server.onNotFound([](AsyncWebServerRequest *request) {
        request->redirect("/");
    });
}

// Captive portal request handler
class CaptiveRequestHandler : public AsyncWebHandler {
public:
    CaptiveRequestHandler() {}
    virtual ~CaptiveRequestHandler() {}

    bool canHandle(AsyncWebServerRequest *request) {
        // Handle captive portal detection
        return request->host() != hostname && request->host() != WiFi.softAPIP().toString();
    }

    void handleRequest(AsyncWebServerRequest *request) {
        request->redirect("http://" + WiFi.softAPIP().toString());
    }
};

void setup() {
    // Initialize USB
    USB.begin();
    
    // Initialize preferences
    preferences.begin("remouse", false);
    loadSettings();
    
    // Initialize file system
    initFileSystem();
    
    // Initialize USB HID Mouse
    Mouse.begin();
    
    // Small delay to ensure USB is ready
    delay(1000);
    
    // Set up WiFi Access Point
    WiFi.mode(WIFI_AP);
    WiFi.softAP(ssid, password);
    WiFi.setHostname(hostname);
    
    // Set up mDNS
    if (MDNS.begin(hostname)) {
        MDNS.addService("http", "tcp", 80);
    }
    
    // Set up WebSocket
    ws.onEvent(onWsEvent);
    server.addHandler(&ws);
    
    // Set up static file handlers
    setupStaticFileHandlers();
    
    // Add captive portal handler
    CaptiveRequestHandler* captiveHandler = new CaptiveRequestHandler();
    server.addHandler(captiveHandler);
    
    // Start server
    server.begin();
}

void loop() {
    // Handle jiggler functionality
    // Run jiggler regardless of mouse control state
    if (jigglerEnabled) {
        performJigglerMovement();
    }
    
    // Clean up disconnected WebSocket clients
    ws.cleanupClients();
    
    // Small delay to prevent overwhelming the system
    delay(10);
} 