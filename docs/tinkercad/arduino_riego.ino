#include <DHT.h>

// Definición de pines analógicos para sensores
const int PIN_HUMEDAD_CANA = A0;
const int PIN_HUMEDAD_TOMATE = A1;
const int PIN_HUMEDAD_ARROZ = A2;
const int PIN_NIVEL_TANQUE = A3;

// Definición de pines digitales para DHT11 y Electroválvulas (LEDs)
const int PIN_DHT = 7;
const int PIN_VALVULA_CANA = 8;
const int PIN_VALVULA_TOMATE = 9;
const int PIN_VALVULA_ARROZ = 10;

// Configuración DHT
#define DHTTYPE DHT11
DHT dht(PIN_DHT, DHTTYPE);

// Umbrales de riego
const int UMBRAL_CANA = 55;
const int UMBRAL_TOMATE = 45;
const int UMBRAL_ARROZ = 80;
const int UMBRAL_MIN_TANQUE = 20; // Nivel mínimo de agua para permitir el riego

void setup() {
  Serial.begin(9600);
  dht.begin();
  
  // Configurar pines de válvulas como salida
  pinMode(PIN_VALVULA_CANA, OUTPUT);
  pinMode(PIN_VALVULA_TOMATE, OUTPUT);
  pinMode(PIN_VALVULA_ARROZ, OUTPUT);
  
  // Apagar todas las válvulas inicialmente
  digitalWrite(PIN_VALVULA_CANA, LOW);
  digitalWrite(PIN_VALVULA_TOMATE, LOW);
  digitalWrite(PIN_VALVULA_ARROZ, LOW);
}

void loop() {
  // Leer valores de los potenciómetros (0 a 1023)
  int valCana = analogRead(PIN_HUMEDAD_CANA);
  int valTomate = analogRead(PIN_HUMEDAD_TOMATE);
  int valArroz = analogRead(PIN_HUMEDAD_ARROZ);
  int valTanque = analogRead(PIN_NIVEL_TANQUE);
  
  // Convertir a porcentajes (0 - 100%)
  // Mapeamos de 0 a 1023 a 0 a 100. (Ojo: 1023 significa más húmedo en algunos sensores reales, aquí simularemos que 0 es 0% y 1023 es 100%)
  int humCana = map(valCana, 0, 1023, 0, 100);
  int humTomate = map(valTomate, 0, 1023, 0, 100);
  int humArroz = map(valArroz, 0, 1023, 0, 100);
  int nivelTanque = map(valTanque, 0, 1023, 0, 100);
  
  // Leer DHT11
  float temperatura = dht.readTemperature();
  float humedadAmb = dht.readHumidity();
  
  // Validar si DHT falla
  if (isnan(temperatura) || isnan(humedadAmb)) {
    temperatura = 25.0; // Valores por defecto para la simulación
    humedadAmb = 50.0;
  }
  
  // Lógica de Riego
  bool valvulaCana = false;
  bool valvulaTomate = false;
  bool valvulaArroz = false;
  
  // Solo regar si hay agua en el tanque
  if (nivelTanque >= UMBRAL_MIN_TANQUE) {
    if (humCana < UMBRAL_CANA) valvulaCana = true;
    if (humTomate < UMBRAL_TOMATE) valvulaTomate = true;
    if (humArroz < UMBRAL_ARROZ) valvulaArroz = true;
  }
  
  // Activar/Desactivar salidas (LEDs)
  digitalWrite(PIN_VALVULA_CANA, valvulaCana ? HIGH : LOW);
  digitalWrite(PIN_VALVULA_TOMATE, valvulaTomate ? HIGH : LOW);
  digitalWrite(PIN_VALVULA_ARROZ, valvulaArroz ? HIGH : LOW);
  
  // Formatear salida en JSON
  Serial.print("{\"humedad_cana\":"); Serial.print(humCana);
  Serial.print(",\"humedad_tomate\":"); Serial.print(humTomate);
  Serial.print(",\"humedad_arroz\":"); Serial.print(humArroz);
  Serial.print(",\"nivel_tanque\":"); Serial.print(nivelTanque);
  Serial.print(",\"temperatura\":"); Serial.print(temperatura, 1);
  Serial.print(",\"humedad_ambiental\":"); Serial.print(humedadAmb, 1);
  Serial.print(",\"valvula_cana\":"); Serial.print(valvulaCana ? "true" : "false");
  Serial.print(",\"valvula_tomate\":"); Serial.print(valvulaTomate ? "true" : "false");
  Serial.print(",\"valvula_arroz\":"); Serial.print(valvulaArroz ? "true" : "false");
  Serial.println("}");
  
  // Esperar 2 segundos antes de la siguiente lectura
  delay(2000);
}
