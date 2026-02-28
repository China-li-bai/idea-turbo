import { default as makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import qrcode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONFIG = {
    MIN_DELAY: 8000,
    MAX_DELAY: 20000,
    BATCH_SIZE: 15,
    AUTH_DIR: path.join(__dirname, 'auth'),
    QR_SERVER_PORT: 3001
};

let currentQR = null;
let server = null;

function startQRServer() {
    server = http.createServer((req, res) => {
        if (req.url === '/') {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>WhatsApp Checker - Scan QR</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .container { max-width: 600px; margin: 0 auto; }
        .qr-code { margin: 30px 0; }
        .status { font-size: 18px; margin: 20px 0; }
        .connected { color: #22c55e; font-weight: bold; }
        .waiting { color: #f59e0b; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📱 WhatsApp Checker</h1>
        <div id="status" class="status waiting">Waiting for QR code...</div>
        <div id="qr-container" class="qr-code"></div>
        <p>Scan this QR code with WhatsApp to login</p>
    </div>
    <script>
        async function checkStatus() {
            try {
                const res = await fetch('/status');
                const data = await res.json();
                const statusEl = document.getElementById('status');
                const qrContainer = document.getElementById('qr-container');
                
                if (data.connected) {
                    statusEl.textContent = '✅ Connected to WhatsApp!';
                    statusEl.className = 'status connected';
                    qrContainer.innerHTML = '';
                } else if (data.qr) {
                    statusEl.textContent = '📱 Scan QR code below:';
                    statusEl.className = 'status waiting';
                    qrContainer.innerHTML = '<img src="data:image/png;base64,' + data.qr + '" alt="QR Code">';
                }
            } catch (e) {
                console.error(e);
            }
            setTimeout(checkStatus, 1000);
        }
        checkStatus();
    </script>
</body>
</html>
            `);
        } else if (req.url === '/status') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                qr: currentQR,
                connected: !currentQR
            }));
        } else {
            res.writeHead(404);
            res.end();
        }
    });
    
    server.listen(CONFIG.QR_SERVER_PORT, () => {
        console.log(`\n🌐 QR Code Server: http://localhost:${CONFIG.QR_SERVER_PORT}`);
        console.log('   Open this URL in your browser to scan the QR code\n');
    });
}

function randomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizePhone(phone) {
    if (!phone) return null;
    let cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+')) {
        cleaned = cleaned.substring(1);
    }
    if (cleaned.startsWith('0')) {
        cleaned = '84' + cleaned.substring(1);
    }
    if (!cleaned.startsWith('84') && cleaned.length >= 9) {
        cleaned = '84' + cleaned;
    }
    return cleaned;
}

async function checkNumber(sock, phone) {
    try {
        const normalized = normalizePhone(phone);
        if (!normalized) {
            return { phone, exists: false, error: 'Invalid phone format' };
        }

        const jid = normalized + '@s.whatsapp.net';
        const result = await sock.onWhatsApp(jid);

        if (result && result.length > 0 && result[0].exists) {
            return { phone, exists: true, jid: result[0].jid };
        } else {
            return { phone, exists: false };
        }
    } catch (error) {
        console.error(`Error checking ${phone}:`, error.message);
        return { phone, exists: false, error: error.message };
    }
}

async function loadPhoneNumbers(csvPath) {
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n').slice(1);
    const phones = [];
    
    for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.split(',');
        if (parts.length >= 3) {
            phones.push({
                id: parts[0],
                name: parts[1],
                phone: parts[2]
            });
        }
    }
    
    return phones;
}

function saveResults(results, outputPath) {
    const csvContent = ['phone,exists,id,name,error']
        .concat(results.map(r => 
            `${r.phone},${r.exists},${r.id || ''},${r.name || ''},${r.error || ''}`
        ))
        .join('\n');
    
    fs.writeFileSync(outputPath, csvContent);
    console.log(`Results saved to ${outputPath}`);
}

let sockInstance = null;
let phoneNumbersToCheck = [];

async function main() {
    console.log('🚀 WhatsApp Checker - Low Risk Mode');
    console.log('=' .repeat(60));

    const args = process.argv.slice(2);
    const csvPath = args[0] || path.join(__dirname, '../output/contacts.csv');
    
    if (!fs.existsSync(csvPath)) {
        console.error(`❌ File not found: ${csvPath}`);
        process.exit(1);
    }

    console.log(`📋 Loading numbers from: ${csvPath}`);
    phoneNumbersToCheck = await loadPhoneNumbers(csvPath);
    console.log(`✅ Loaded ${phoneNumbersToCheck.length} numbers`);

    startQRServer();

    const { state, saveCreds } = await useMultiFileAuthState(CONFIG.AUTH_DIR);

    sockInstance = makeWASocket({
        auth: state,
    });

    sockInstance.ev.on('creds.update', saveCreds);

    sockInstance.ev.on('connection.update', async (update) => {
        const { connection, qr } = update;
        
        if (qr) {
            console.log('📱 QR code generated - open http://localhost:3000 to scan');
            currentQR = await qrcode.toDataURL(qr);
        }

        if (connection === 'close') {
            const shouldReconnect = update.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed. Reconnecting:', shouldReconnect);
            if (shouldReconnect) {
                currentQR = null;
                await main();
            }
        }

        if (connection === 'open') {
            console.log('\n✅ Connected to WhatsApp!');
            currentQR = null;
            await runChecks(sockInstance, phoneNumbersToCheck);
        }
    });
}

async function runChecks(sock, phoneNumbers) {
    const results = [];
    const batchSize = Math.min(CONFIG.BATCH_SIZE, phoneNumbers.length);
    
    console.log(`\n🔍 Starting checks (batch size: ${batchSize})`);
    console.log(`⏱️  Delay between checks: ${CONFIG.MIN_DELAY/1000}-${CONFIG.MAX_DELAY/1000}s`);
    console.log('=' .repeat(60));

    for (let i = 0; i < batchSize; i++) {
        const item = phoneNumbers[i];
        console.log(`\n[${i + 1}/${batchSize}] Checking: ${item.phone} (${item.name})`);
        
        const result = await checkNumber(sock, item.phone);
        result.id = item.id;
        result.name = item.name;
        results.push(result);
        
        console.log(`   Result: ${result.exists ? '✅ Registered' : '❌ Not registered'}`);
        
        if (i < batchSize - 1) {
            const delayMs = randomDelay(CONFIG.MIN_DELAY, CONFIG.MAX_DELAY);
            console.log(`   ⏳ Waiting ${(delayMs/1000).toFixed(1)}s...`);
            await delay(delayMs);
        }
    }

    console.log('\n' + '=' .repeat(60));
    console.log('✅ Check complete!');
    console.log(`   Total: ${results.length}`);
    console.log(`   Registered: ${results.filter(r => r.exists).length}`);
    console.log(`   Not registered: ${results.filter(r => !r.exists).length}`);

    const outputPath = path.join(__dirname, '../output/whatsapp_results.csv');
    saveResults(results, outputPath);

    if (server) {
        server.close();
    }

    console.log('\n👋 Exiting...');
    process.exit(0);
}

main().catch(console.error);
