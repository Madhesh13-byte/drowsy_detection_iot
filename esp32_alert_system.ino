#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "Maddy";
const char* password = "maddy123";

// MQTT Broker
const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;
const char* mqtt_topic = "maddy/drowsy_detection/alerts";

// LED pins
const int RED_LED = 2;
const int BLUE_LED = 4;

WiFiClient espClient;
PubSubClient client(espClient);

bool isBlinking = false;
String currentState = "normal";
unsigned long lastBlink = 0;
bool ledState = false;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("ESP32 Drowsiness Alert System Starting...");
  Serial.print("MQTT Server: ");
  Serial.println(mqtt_server);
  Serial.print("MQTT Port: ");
  Serial.println(mqtt_port);
  
  // Initialize LED pins
  pinMode(RED_LED, OUTPUT);
  pinMode(BLUE_LED, OUTPUT);
  digitalWrite(RED_LED, LOW);
  digitalWrite(BLUE_LED, LOW);
  
  // Connect to WiFi
  setup_wifi();
  
  // Setup MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("");
    Serial.println("✅ WiFi connected successfully!");
    Serial.print("ESP32 IP address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Gateway IP: ");
    Serial.println(WiFi.gatewayIP());
  } else {
    Serial.println("");
    Serial.println("❌ WiFi connection failed!");
  }
}

void callback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  Serial.print("Message received: ");
  Serial.println(message);
  
  // Parse JSON
  DynamicJsonDocument doc(1024);
  deserializeJson(doc, message);
  
  String state = doc["state"];
  handleStateChange(state);
}

void handleStateChange(String state) {
  currentState = state;
  
  if (state == "drowsy") {
    Serial.println("🚨 DROWSY ALERT - Red LED blinking");
    isBlinking = true;
  } 
  else if (state == "no_face") {
    Serial.println("👤 NO FACE DETECTED - Blue LED blinking");
    isBlinking = true;
  } 
  else if (state == "normal") {
    Serial.println("✅ NORMAL STATE - Stop blinking");
    isBlinking = false;
    digitalWrite(RED_LED, LOW);
    digitalWrite(BLUE_LED, LOW);
  }
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection to ");
    Serial.print(mqtt_server);
    Serial.print(":");
    Serial.print(mqtt_port);
    Serial.print("...");
    
    if (client.connect("ESP32_DrowsyDetection")) {
      Serial.println("✅ MQTT connected!");
      client.subscribe(mqtt_topic);
      Serial.print("📡 Subscribed to topic: ");
      Serial.println(mqtt_topic);
    } else {
      Serial.print("❌ MQTT failed, rc=");
      Serial.print(client.state());
      
      // Error code meanings
      switch(client.state()) {
        case -4: Serial.println(" - Connection timeout"); break;
        case -3: Serial.println(" - Connection lost"); break;
        case -2: Serial.println(" - Connect failed"); break;
        case -1: Serial.println(" - Disconnected"); break;
        case 1: Serial.println(" - Bad protocol version"); break;
        case 2: Serial.println(" - Bad client ID"); break;
        case 3: Serial.println(" - Unavailable"); break;
        case 4: Serial.println(" - Bad credentials"); break;
        case 5: Serial.println(" - Unauthorized"); break;
        default: Serial.println(" - Unknown error"); break;
      }
      
      Serial.println("🔄 Retrying in 5 seconds...");
      delay(5000);
    }
  }
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();
  
  // Handle LED blinking
  if (isBlinking && millis() - lastBlink > 500) {
    lastBlink = millis();
    ledState = !ledState;
    
    if (currentState == "drowsy") {
      digitalWrite(RED_LED, ledState);
      digitalWrite(BLUE_LED, LOW);
    } 
    else if (currentState == "no_face") {
      digitalWrite(BLUE_LED, ledState);
      digitalWrite(RED_LED, LOW);
    }
  }
}