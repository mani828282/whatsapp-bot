// index.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

const app = express();
app.use(express.json());

// IMPORTANT: Remember to paste your real n8n webhook URL here
const N8N_WEBHOOK_URL = 'PASTE_YOUR_N8N_WEBHOOK_URL_HERE';

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err, origin) => {
  console.error('Uncaught Exception:', err, 'Origin:', origin);
});

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        executablePath: '/usr/bin/chromium',
        args: [
            '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote',
            '--disable-gpu', '--disable-cache', '--media-cache-size=0', '--disk-cache-size=0',
        ],
    }
});

client.on('qr', qr => qrcode.generate(qr, { small: true }));
client.on('ready', () => console.log('Client is ready! Bot is running.'));

client.on('message', async (message) => {
    if (message.from.includes('@g.us')) return;
    try {
        console.log(`Forwarding message from ${message.from}`);
        await axios.post(N8N_WEBHOOK_URL, { sender: message.from, text: message.body });
    } catch (error) {
        console.error('Error forwarding message to n8n:', error.message);
    }
});

client.initialize().catch(err => console.error('Initialization failed', err));

app.get('/', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Bot is running.' });
});

app.post('/send-reply', async (req, res) => {
    const { number, message } = req.body;
    if (!number || !message) {
        return res.status(400).json({ error: 'Missing number or message' });
    }
    try {
        await client.sendMessage(number, message);
        res.status(200).json({ success: 'Reply sent' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send reply' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is listening on port ${PORT}`));
