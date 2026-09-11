#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <WiFi.h>
#include <WiFiManager.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

LiquidCrystal_I2C lcd(0x27, 16, 2);

// ================= FIREBASE (REST, no SDK) =================
// Your Realtime Database host, no https:// prefix, no trailing slash
#define DATABASE_URL "gasguard-89aac-default-rtdb.europe-west1.firebasedatabase.app"
#define DATABASE_SECRET "h4LtxPFRgYbxyusb5aJNjwz6o03flFsxsyvzM2xS"

// We use a timer to upload data every 2 seconds so we don't spam the cloud
unsigned long sendDataPrevMillis = 0;
const long timerDelay = 2000;

// --- NEW: Fetch Timers & State ---
unsigned long fetchPrevMillis = 0;
const long fetchDelay = 10000; // Fetch settings from cloud every 10 seconds

String expoPushToken = "";
int currentThreshold = 2000; // Defaults to 2000, will be overwritten by Firebase
bool alarmTriggered = false; // Prevents spamming push notifications

// --- WiFi Reconnect Timers ---
unsigned long previousWiFiMillis = 0;
const long wifiCheckInterval = 30000; // 30 seconds

// Hardware Pins
const int gasPin = 34;
const int buzzerPin = 26;
const int greenLED = 32;
const int yellowLED = 27;
const int redLED = 33;
const int buttonPin = 18;

bool systemOn = true;
bool lastButtonState = HIGH;

// Thresholds
const int SAFE_MAX = 1500;

// Buzzer
const int BUZZER_FREQ = 4000;
const int BUZZER_RES = 8;
const int BUZZER_DUTY = 128;

// ================= CLOUD FUNCTIONS =================

// Sends an integer value to a given RTDB path using the public REST API.
// Works with "test mode" rules (open read/write). No auth token needed.
bool sendToFirebase(const char* path, int value) {
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClientSecure client;
  client.setInsecure(); // skip cert validation - fine for this use case, keeps things small

  HTTPClient http;
  String url = String("https://") + DATABASE_URL + "/" + path + ".json?auth=" + DATABASE_SECRET;

  if (!http.begin(client, url)) return false;

  http.addHeader("Content-Type", "application/json");
  int httpCode = http.PUT(String(value)); // RTDB REST just wants the raw JSON value as the body

  bool ok = (httpCode == 200);
  if (ok) {
    Serial.print("Cloud updated: ");
    Serial.println(value);
  } else {
    Serial.print("Cloud Error, HTTP code: ");
    Serial.println(httpCode);
  }

  http.end();
  return ok;
}

// --- NEW: Downloads data from Firebase ---
String getFromFirebase(const char* path) {
  if (WiFi.status() != WL_CONNECTED) return "";
  
  WiFiClientSecure client;
  client.setInsecure(); 
  HTTPClient http;
  String url = String("https://") + DATABASE_URL + "/" + path + ".json?auth=" + DATABASE_SECRET;
  
  if (http.begin(client, url)) {
    int httpCode = http.GET();
    if (httpCode == 200) {
      String payload = http.getString();
      // Clean up Firebase's raw JSON quotes
      payload.replace("\"", "");
      http.end();
      return payload;
    }
    http.end();
  }
  return "";
}

// --- NEW: Sends HTTP POST directly to Expo servers ---
void sendExpoPushNotification(String token, int ppm) {
  if (WiFi.status() != WL_CONNECTED || token == "" || token == "null") return;
  
  WiFiClientSecure client;
  client.setInsecure(); 
  HTTPClient http;
  
  http.begin(client, "https://exp.host/--/api/v2/push/send");
  http.addHeader("Content-Type", "application/json");
  
  // --- UPDATED: Construct JSON payload targeting the custom Android channel with alarm.wav ---
  String payload = "{\"to\":\"" + token + "\",\"title\":\"⚠️ GAS LEAK DETECTED!\",\"body\":\"Danger: Gas concentration reached " + String(ppm) + " ppm!\",\"sound\":\"alarm.wav\",\"channelId\":\"gas-alarms\"}";
  
  int httpCode = http.POST(payload);
  if (httpCode == 200) {
    Serial.println("Push notification sent to phone!");
  } else {
    Serial.println("Failed to send push notification.");
  }
  
  http.end();
}

void setup() {
  Serial.begin(115200);

  Wire.begin(21, 22);

  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("SYSTEM START");

  ledcAttach(buzzerPin, BUZZER_FREQ, BUZZER_RES);

  pinMode(greenLED, OUTPUT);
  pinMode(yellowLED, OUTPUT);
  pinMode(redLED, OUTPUT);
  pinMode(buttonPin, INPUT_PULLUP);

  // ================= WIFI =================
  WiFiManager wm;
  
  // Set a 45-second timeout. If no Wi-Fi is found, it stops trying and moves on.
  wm.setConfigPortalTimeout(45); 
  
  bool connected = wm.autoConnect("Gas Detector_Setup");

  lcd.clear();
  lcd.setCursor(0, 0);

  if (!connected) {
    Serial.println("Failed to connect. Starting Offline Mode!");
    lcd.print("Offline Mode");
  } else {
    Serial.println("\nWiFi Connected");
    lcd.print("WiFi Connected!");
  }
  
  delay(1000);
}

void loop() {
  // ================= WIFI RECONNECT =================
  if (WiFi.status() != WL_CONNECTED) {
    if (millis() - previousWiFiMillis >= wifiCheckInterval) {
      Serial.println("Attempting to reconnect to WiFi...");
      WiFi.reconnect(); 
      previousWiFiMillis = millis();
    }
  }

  // ================= BUTTON TOGGLE =================
  bool buttonState = digitalRead(buttonPin);

  if (buttonState == LOW && lastButtonState == HIGH) {
    systemOn = !systemOn;
    delay(200);
  }
  lastButtonState = buttonState;

  if (!systemOn) {
    digitalWrite(greenLED, LOW);
    digitalWrite(yellowLED, LOW);
    digitalWrite(redLED, LOW);
    ledcWrite(buzzerPin, 0);

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("SYSTEM OFF");

    if (millis() - sendDataPrevMillis > timerDelay || sendDataPrevMillis == 0) {
      sendDataPrevMillis = millis();
      sendToFirebase("sensor/currentPpm", 0);
    }

    delay(300);
    return;
  }

  // --- NEW: FETCH SETTINGS EVERY 10 SECONDS ---
  if (millis() - fetchPrevMillis > fetchDelay || fetchPrevMillis == 0) {
    fetchPrevMillis = millis();
    
    String tokenRes = getFromFirebase("sensor/pushToken");
    if (tokenRes != "" && tokenRes != "null") expoPushToken = tokenRes;
    
    String threshRes = getFromFirebase("sensor/settings/threshold");
    if (threshRes != "" && threshRes != "null") currentThreshold = threshRes.toInt();
  }

  // ================= GAS READ =================
  int gasValue = analogRead(gasPin);

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Gas:");
  lcd.print(gasValue);

  // ================= LOGIC =================
  if (gasValue < SAFE_MAX) {
    digitalWrite(greenLED, HIGH);
    digitalWrite(yellowLED, LOW);
    digitalWrite(redLED, LOW);
    ledcWrite(buzzerPin, 0);
    lcd.setCursor(0, 1);
    lcd.print("SAFE");
    alarmTriggered = false; // Reset trigger when air is clean
    
  } else if (gasValue < currentThreshold) { // Uses your live Firebase setting
    digitalWrite(greenLED, LOW);
    digitalWrite(yellowLED, HIGH);
    digitalWrite(redLED, LOW);
    ledcWrite(buzzerPin, 0);
    lcd.setCursor(0, 1);
    lcd.print("WARNING");
    alarmTriggered = false; 
    
  } else {
    // DANGER ZONE (Exceeds custom threshold)
    digitalWrite(greenLED, LOW);
    digitalWrite(yellowLED, LOW);
    digitalWrite(redLED, HIGH);
    ledcWrite(buzzerPin, BUZZER_DUTY);
    lcd.setCursor(0, 1);
    lcd.print("DANGER!");
    
    // Fire push notification exactly once per event
    if (!alarmTriggered) {
      sendExpoPushNotification(expoPushToken, gasValue);
      alarmTriggered = true; 
    }
  }

  // ================= FIREBASE UPLOAD =================
  if (millis() - sendDataPrevMillis > timerDelay || sendDataPrevMillis == 0) {
    sendDataPrevMillis = millis();
    sendToFirebase("sensor/currentPpm", gasValue);
  }

  delay(200); // Small loop delay
}