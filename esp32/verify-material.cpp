#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include "base64.h"

// configuration

const char* serverUrl = "http://192.168.100.5:3000/api/gemini-classify";

const char* binId = "BIN_001";
const char* targetMaterial = "plastic"; 

// pin definitions
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22
#define LED_FLASH_GPIO     4

void setup() {
  Serial.begin(115200);
  Serial.println("\n--- ESP32-CAM STARTUP ---");
  
  pinMode(LED_FLASH_GPIO, OUTPUT);

  // 1. Initialize Camera
  Serial.println("[INFO] Configuring camera hardware...");
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  if(psramFound()){
    Serial.println("[SUCCESS] PSRAM detected! Using higher quality settings.");
    config.frame_size = FRAMESIZE_QVGA; 
    config.jpeg_quality = 10; // 0-63
    config.fb_count = 2;
  } else {
    Serial.println("[WARNING] No PSRAM found. Using fallback settings.");
    config.frame_size = FRAMESIZE_QVGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("[ERROR] Camera init failed with error 0x%x\n", err);
    return;
  }
  Serial.println("[SUCCESS] Camera initialized.");

  // connect to wifi
  Serial.printf("[INFO] Connecting to WiFi: %s\n", ssid);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[SUCCESS] WiFi connected!");
    Serial.print("[INFO] IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[ERROR] WiFi connection timed out.");
    return;
  }

  // take photo with flash
  Serial.println("[INFO] Firing flash and capturing image...");
  digitalWrite(LED_FLASH_GPIO, HIGH); 
  delay(500);
  
  camera_fb_t * fb = esp_camera_fb_get();
  digitalWrite(LED_FLASH_GPIO, LOW); 
  
  if (!fb) {
    Serial.println("[ERROR] Failed to acquire camera frame.");
    return;
  }
  Serial.printf("[SUCCESS] Image captured! Size: %zu bytes\n", fb->len);

  Serial.println("[INFO] Encoding image to Base64...");
  String base64Image = base64::encode(fb->buf, fb->len);
  Serial.printf("[INFO] Base64 string length: %d characters\n", base64Image.length());
  esp_camera_fb_return(fb); 

  Serial.println("[INFO] Preparing POST request...");
  HTTPClient http;
  
  if (String(serverUrl).indexOf("localhost") != -1) {
    Serial.println("[CRITICAL] Error: 'localhost' won't work on ESP32. Use your PC's IP address.");
  }

  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);

  String jsonBody = "{\"image\":\"" + base64Image + "\",\"binId\":\"" + binId + "\",\"target\":\"" + targetMaterial + "\"}";

  Serial.println("[INFO] Sending data...");
  int httpResponseCode = http.POST(jsonBody);

  if (httpResponseCode > 0) {
    Serial.printf("[SUCCESS] HTTP Response code: %d\n", httpResponseCode);
    String response = http.getString();
    Serial.println("--- SERVER DATA ---");
    Serial.println(response);
    Serial.println("-------------------");
  } else {
    Serial.printf("[ERROR] HTTP Request failed. Error: %s\n", http.errorToString(httpResponseCode).c_str());
  }
  
  http.end();
  Serial.println("\n[FINISHED] Process complete. Standing by...");
}

void loop() {
  // empty
}