import { default as makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONFIG = {
    MIN_DELAY: 8000,
    MAX_DELAY: 20000,
    BATCH_SIZE: 15,
    SESSION_TIMEOUT: 300000,
    AUTH_DIR: path.join(__dirname, 'auth')
};

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

async function main() {
    console.log('🚀 WhatsApp Checker - Low Risk Mode');
    console.log('=' .repeat(50));

    const args = process.argv.slice(2);
    const csvPath = args[0] || path.join(__dirname, '../output/contacts.csv');
    
    if (!fs.existsSync(csvPath)) {
        console.error(`❌ File not found: ${csvPath}`);
        process.exit(1);
    }

    console.log(`📋 Loading numbers from: ${csvPath}`);
    const phoneNumbers = await loadPhoneNumbers(csvPath);
    console.log(`✅ Loaded ${phoneNumbers.length} numbers`);

    const { state, saveCreds } = await useMultiFileAuthState(CONFIG.AUTH_DIR);

    const sock = makeWASocket({
        auth: state,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, qr } = update;
        
        if (qr) {
            console.log('\n📱 Scan this QR code with WhatsApp:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = update.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed. Reconnecting:', shouldReconnect);
            if (shouldReconnect) {
                await main();
            }
        }

        if (connection === 'open') {
            console.log('\n✅ Connected to WhatsApp!');
            await runChecks(sock, phoneNumbers);
        }
    });
}

async function runChecks(sock, phoneNumbers) {
    const results = [];
    const batchSize = Math.min(CONFIG.BATCH_SIZE, phoneNumbers.length);
    
    console.log(`\n🔍 Starting checks (batch size: ${batchSize})`);
    console.log(`⏱️  Delay between checks: ${CONFIG.MIN_DELAY/1000}-${CONFIG.MAX_DELAY/1000}s`);
    console.log('=' .repeat(50));

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
            console.log(`   ⏳ Waiting ${delayMs/1000}s...`);
            await delay(delayMs);
        }
    }

    console.log('\n' + '=' .repeat(50));
    console.log('✅ Check complete!');
    console.log(`   Total: ${results.length}`);
    console.log(`   Registered: ${results.filter(r => r.exists).length}`);
    console.log(`   Not registered: ${results.filter(r => !r.exists).length}`);

    const outputPath = path.join(__dirname, '../output/whatsapp_results.csv');
    saveResults(results, outputPath);

    console.log('\n👋 Exiting...');
    process.exit(0);
}

main().catch(console.error);
