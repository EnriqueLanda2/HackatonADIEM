#!/usr/bin/env python3
"""
Puente Serie para el Sistema de Riego Inteligente (Python)

Instrucciones de instalación:
pip install pyserial requests

Uso:
python serial_bridge.py [--simulate] [--port COM3]
"""

import serial
import json
import requests
import time
import argparse
import random

API_URL = "http://localhost:3001/sensors/bulk-readings"

def generate_simulated_data():
    """Genera datos aleatorios realistas para el modo simulación."""
    tank = random.randint(10, 100)
    hum_c = random.randint(30, 80)
    hum_t = random.randint(20, 70)
    hum_a = random.randint(50, 100)
    
    valvula_c = hum_c < 55 and tank >= 20
    valvula_t = hum_t < 45 and tank >= 20
    valvula_a = hum_a < 80 and tank >= 20
    
    return {
        "humedad_cana": hum_c,
        "humedad_tomate": hum_t,
        "humedad_arroz": hum_a,
        "nivel_tanque": tank,
        "temperatura": round(random.uniform(22.0, 32.0), 1),
        "humedad_ambiental": round(random.uniform(40.0, 80.0), 1),
        "valvula_cana": valvula_c,
        "valvula_tomate": valvula_t,
        "valvula_arroz": valvula_a
    }

def send_to_api(data):
    """Envía los datos al backend via HTTP POST."""
    try:
        response = requests.post(API_URL, json=data, timeout=5)
        if response.status_code in [200, 201]:
            print(f"✅ Datos enviados a API: {data}")
        else:
            print(f"⚠️ Error de API: {response.status_code} - {response.text}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Error de conexión al backend ({API_URL}): {e}")

def run_simulation():
    print("Iniciando modo SIMULACIÓN. Generando datos cada 2 segundos...")
    while True:
        data = generate_simulated_data()
        send_to_api(data)
        time.sleep(2)

def run_serial(port_name, baudrate=9600):
    print(f"Iniciando modo SERIE en {port_name} a {baudrate} baudios...")
    while True:
        try:
            with serial.Serial(port_name, baudrate, timeout=3) as ser:
                print(f"Conectado a {port_name}. Esperando datos...")
                while True:
                    line = ser.readline()
                    if line:
                        line_str = line.decode('utf-8').strip()
                        if line_str.startswith('{') and line_str.endswith('}'):
                            try:
                                data = json.loads(line_str)
                                send_to_api(data)
                            except json.JSONDecodeError:
                                print(f"❌ Error al parsear JSON: {line_str}")
        except serial.SerialException as e:
            print(f"⚠️ Error en puerto serie: {e}. Reintentando en 5 segundos...")
            time.sleep(5)
        except KeyboardInterrupt:
            print("Saliendo...")
            break

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Puente Serie para Riego Inteligente")
    parser.add_argument("--simulate", action="store_true", help="Generar datos aleatorios sin usar Arduino")
    parser.add_argument("--port", type=str, default="/dev/ttyUSB0", help="Puerto serie (ej. COM3 o /dev/ttyUSB0)")
    
    args = parser.parse_args()
    
    if args.simulate:
        try:
            run_simulation()
        except KeyboardInterrupt:
            print("Saliendo...")
    else:
        run_serial(args.port)
