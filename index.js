// index.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

const app = express();
app.use(express.json());

// IMPORTANT: We will get this URL from n8n in the next phase.
// For now, leave it as a placeholder.
const N8N_WEBHOOK_URL = 'PASTE_YOUR_N8N_WEBHOOK_URL_HERE';

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true, // This is the default, but it's good to be explicit
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ],
    }
});

client.on('qr', qr => qrcode.generate(qr, { small: true }));
client.on('ready', () => console.log('Client is ready!'));

// This part listens for messages and forwards them to n8n
client.on('message', async (message) => {
    // Ignore messages from groups
    if (message.from.includes('@g.us')) return;
    
    try {
        console.log(`Forwarding message from ${message.from}`);
        // Send the sender's number and the message text to our n8n workflow
        await axios.post(N8N_WEBHOOK_URL, {
            sender: message.from,
            text: message.body
        });
    } catch (error) {
        console.error('Error forwarding message to n8n:', error.message);
    }
});

client.initialize();

// This part creates a mini-API so n8n can tell our bot to send a reply
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

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
