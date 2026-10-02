/**
 * Puente Serie para el Sistema de Riego Inteligente (Node.js)
 * 
 * Instalación:
 * npm init -y
 * npm install serialport axios
 * 
 * Uso:
 * node serial_bridge.js [--simulate] [--port COM3]
 */

const fs = require('fs');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const http = require('http'); // Usando http nativo para no forzar la instalación de axios si no es necesario.

const API_URL = 'http://localhost:3001/sensors/bulk-readings';

const args = process.argv.slice(2);
const isSimulate = args.includes('--simulate');
let portName = '/dev/ttyUSB0'; // Default port

// Parse simple de args para encontrar el puerto
const portIndex = args.indexOf('--port');
if (portIndex > -1 && args[portIndex + 1]) {
    portName = args[portIndex + 1];
}

function sendToAPI(data) {
    const postData = JSON.stringify(data);
    const url = new URL(API_URL);

    const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = http.request(options, (res) => {
        let responseBody = '';
        res.on('data', (chunk) => { responseBody += chunk; });
        res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                console.log(`✅ Datos enviados a API:`, data);
            } else {
                console.log(`⚠️ Error de API: ${res.statusCode} - ${responseBody}`);
            }
        });
    });

    req.on('error', (e) => {
        console.log(`❌ Error de conexión al backend: ${e.message}`);
    });

    req.write(postData);
    req.end();
}

function generateSimulatedData() {
    const tank = Math.floor(Math.random() * 91) + 10; // 10 a 100
    const humC = Math.floor(Math.random() * 51) + 30; // 30 a 80
    const humT = Math.floor(Math.random() * 51) + 20; // 20 a 70
    const humA = Math.floor(Math.random() * 51) + 50; // 50 a 100
    
    const valvulaC = humC < 55 && tank >= 20;
    const valvulaT = humT < 45 && tank >= 20;
    const valvulaA = humA < 80 && tank >= 20;

    return {
        humedad_cana: humC,
        humedad_tomate: humT,
        humedad_arroz: humA,
        nivel_tanque: tank,
        temperatura: parseFloat((Math.random() * 10 + 22).toFixed(1)),
        humedad_ambiental: parseFloat((Math.random() * 40 + 40).toFixed(1)),
        valvula_cana: valvulaC,
        valvula_tomate: valvulaT,
        valvula_arroz: valvulaA
    };
}

if (isSimulate) {
    console.log("Iniciando modo SIMULACIÓN. Generando datos cada 2 segundos...");
    setInterval(() => {
        sendToAPI(generateSimulatedData());
    }, 2000);
} else {
    console.log(`Iniciando modo SERIE en ${portName} a 9600 baudios...`);
    
    function connectSerial() {
        const port = new SerialPort({
            path: portName,
            baudRate: 9600,
            autoOpen: true
        });

        const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

        port.on('open', () => {
            console.log(`Conectado a ${portName}. Esperando datos...`);
        });

        parser.on('data', (line) => {
            const dataStr = line.trim();
            if (dataStr.startsWith('{') && dataStr.endsWith('}')) {
                try {
                    const data = JSON.parse(dataStr);
                    sendToAPI(data);
                } catch (e) {
                    console.log(`❌ Error al parsear JSON: ${dataStr}`);
                }
            }
        });

        port.on('error', (err) => {
            console.log(`⚠️ Error en puerto serie: ${err.message}. Reintentando en 5 segundos...`);
            setTimeout(connectSerial, 5000);
        });

        port.on('close', () => {
            console.log(`⚠️ Puerto serie cerrado. Reintentando en 5 segundos...`);
            setTimeout(connectSerial, 5000);
        });
    }

    connectSerial();
}
