#include <WiFi.h>
#include <PubSubClient.h>

#define LED_PIN 2           // Onboard LED for status indication
#define BUZZER_RELAY_PIN 4  // GPIO4 to RELAY IN1

const char* WIFI_SSID = "poco";
const char* WIFI_PASSWORD = "qwerty12";
const char* MQTT_BROKER = "broker.hivemq.com";
const int MQTT_PORT = 1883;
const char* TOPIC = "status/driver";

WiFiClient espClient;
PubSubClient client(espClient);

String lastState = "";
unsigned long previousMillis = 0;
const long drowsyInterval = 400;
const long yawnInterval = 100;
bool ledState = LOW;
bool yawnToggle = false;

void callback(char* topic, byte* payload, unsigned int length) {
  String msg;
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];
  Serial.print("Msg: "); Serial.println(msg);

  if (msg.indexOf("drowsy") > 0) {
    Serial.println("Drowsy alert! Buzzing...");
    lastState = "drowsy";
  } else if (msg.indexOf("yawn") > 0) {
    Serial.println("Yawn alert! Buzzing briefly...");
    lastState = "yawn";
    yawnToggle = false;
  } else if (msg.indexOf("normal") > 0) {
    Serial.println("Normal state. No buzz.");
    lastState = "normal";
  } else {
    lastState = "";
    digitalWrite(LED_PIN, LOW);
    digitalWrite(BUZZER_RELAY_PIN, HIGH); // Off for active-low relay
  }
}

void setup_wifi() {
  delay(10);
  Serial.begin(115200);
  Serial.println("Connecting to WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void reconnect() {
  while (!client.connected()) {
    Serial.println("Attempting MQTT connection...");
    if (client.connect("ESP32_Buzzer")) {
      Serial.println("MQTT connected");
      client.subscribe(TOPIC);
    } else {
      Serial.print("Failed rc=");
      Serial.print(client.state());
      delay(5000);
    }
  }
}

void setup() {
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_RELAY_PIN, OUTPUT);
  digitalWrite(BUZZER_RELAY_PIN, HIGH); // Relay/buzzer off for active-low relay
  digitalWrite(LED_PIN, LOW);
  setup_wifi();
  client.setServer(MQTT_BROKER, MQTT_PORT);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  unsigned long currentMillis = millis();

  if (lastState == "drowsy") {
    // Keep LED blinking, buzzer ON
    if (currentMillis - previousMillis >= drowsyInterval) {
      previousMillis = currentMillis;
      ledState = !ledState;
      digitalWrite(LED_PIN, ledState ? HIGH : LOW);
    }
    digitalWrite(BUZZER_RELAY_PIN, LOW);  // Active-Low Relay: ON
  } else if (lastState == "yawn") {
    // Blink LED quickly, buzzer toggles ON for every second
    if (currentMillis - previousMillis >= yawnInterval) {
      previousMillis = currentMillis;
      ledState = !ledState;
      yawnToggle = !yawnToggle;
      digitalWrite(LED_PIN, ledState ? HIGH : LOW);
      digitalWrite(BUZZER_RELAY_PIN, yawnToggle ? LOW : HIGH); // Relay toggles ON/OFF every 100ms
    }
  } else if (lastState == "normal") {
    digitalWrite(LED_PIN, LOW);
    digitalWrite(BUZZER_RELAY_PIN, HIGH); // Off for active-low relay
    ledState = LOW;
  } else {
    digitalWrite(LED_PIN, LOW);
    digitalWrite(BUZZER_RELAY_PIN, HIGH); // Off for active-low relay
    ledState = LOW;
  }
}
