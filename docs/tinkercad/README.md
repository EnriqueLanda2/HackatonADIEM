# Simulación en Tinkercad: Sistema de Riego Inteligente

Esta guía describe cómo montar y simular el hardware del Sistema de Riego Inteligente (proyecto Hackathon ADIEM) utilizando Tinkercad y cómo conectar esta simulación con la Aplicación Web Progresiva (PWA).

## 🛠 Lista de Componentes Necesarios

En el espacio de trabajo de Tinkercad, arrastra los siguientes componentes:

- **1x Arduino UNO R3**: El cerebro del sistema.
- **4x Potenciómetros**: 
  - 3 para simular la humedad del suelo (Parcela 1: Caña de Azúcar, Parcela 2: Tomate Rojo, Parcela 3: Arroz).
  - 1 para simular el nivel del tanque de agua.
- **1x Sensor de Temperatura y Humedad DHT11**: (Nota: Tinkercad a veces tiene un sensor de temperatura TMP36, pero usaremos el DHT11 o equivalente para la simulación/código).
- **3x LEDs**: Simulan las electroválvulas (solenoides) de riego.
- **3x Resistencias de 220Ω**: Para proteger los LEDs.
- **1x Placa de Pruebas (Protoboard)**: Para las conexiones.

## 🔌 Instrucciones de Ensamblaje y Conexiones

### 1. Alimentación (GND y 5V)
- Conecta el pin **5V** del Arduino a la línea positiva (+) de la protoboard.
- Conecta el pin **GND** del Arduino a la línea negativa (-) de la protoboard.

### 2. Potenciómetros (Sensores de Humedad y Nivel de Tanque)
Coloca los 4 potenciómetros en la protoboard. Para cada uno:
- Terminal 1: Conectar a GND (-).
- Terminal 2 (Centro): Conectar al pin analógico correspondiente.
- Terminal 3: Conectar a 5V (+).

**Asignación de Pines Analógicos:**
- **A0**: Humedad Caña de Azúcar
- **A1**: Humedad Tomate Rojo
- **A2**: Humedad Arroz
- **A3**: Nivel del Tanque de Agua

### 3. Sensor DHT11
- Pin VCC: Conectar a 5V (+).
- Pin GND: Conectar a GND (-).
- Pin Data (Señal): Conectar al pin digital **7** del Arduino.

### 4. LEDs (Electroválvulas)
- **LED 1 (Caña de Azúcar)**: Conectar ánodo a resistencia 220Ω -> Pin Digital **8**. Cátodo a GND.
- **LED 2 (Tomate Rojo)**: Conectar ánodo a resistencia 220Ω -> Pin Digital **9**. Cátodo a GND.
- **LED 3 (Arroz)**: Conectar ánodo a resistencia 220Ω -> Pin Digital **10**. Cátodo a GND.

## 🖼 Descripción de Capturas de Pantalla (Para la Presentación)
- **Vista General**: Mostrará el Arduino en el centro, la placa de pruebas abajo con los 4 potenciómetros alineados, el sensor DHT a la derecha y los 3 LEDs (recomiendo colores verde, rojo y azul) en la parte superior.
- **Detalle de Riego**: Una captura donde el potenciómetro de "Humedad Caña" esté bajo y el LED correspondiente esté encendido (simulando que está regando).
- **Detalle de Tanque Vacío**: Una captura donde el potenciómetro de nivel de tanque esté al mínimo y ningún LED esté encendido a pesar de que haya cultivos secos, demostrando el mecanismo de seguridad.

## 🌐 Conexión de la Simulación con la PWA

Dado que Tinkercad es un entorno web aislado que no permite conexiones HTTP directas hacia localhost, utilizamos un **puente serie (Serial Bridge)**.

1. **En Tinkercad / Arduino Físico**:
   El código en `arduino_riego.ino` enviará una cadena JSON estructurada a través del Monitor Serie (o por el puerto USB si usas un Arduino real).
   
2. **El Puente (Bridge)**:
   Puedes usar `serial_bridge.py` o `serial_bridge.js`. Estos scripts escuchan el puerto serie de tu computadora.
   - Lee el JSON del Arduino.
   - Lo parsea.
   - Envía un HTTP POST a la API del backend: `http://localhost:3001/sensors/bulk-readings`.

3. **Modo Simulación (Demo/Hackathon)**:
   Si no tienes el Arduino a mano o quieres probar rápido, los scripts tienen una bandera `--simulate`. Al ejecutar `python serial_bridge.py --simulate`, el script generará datos aleatorios realistas y los enviará al backend sin necesitar el puerto serie.
