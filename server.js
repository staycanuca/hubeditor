const express = require('express');
const fs = require('fs');
const path = require('path');
const auth = require('basic-auth');
const zlib = require('zlib');

const app = express();
const listaFilePath = path.join(__dirname, 'lista.txt');

// --- Encoding/Decoding Functions ---
function encodeContent(text) {
    if (!text) return '';
    const data = { 'data': text };
    const jsonData = JSON.stringify(data);
    const compressed = zlib.deflateSync(jsonData);
    const encoded = compressed.toString('base64');
    const reversed = encoded.split('').reverse().join('');
    return reversed;
}

function decodeContent(encodedText) {
    if (!encodedText) return '';
    try {
        const reversed = encodedText.split('').reverse().join('');
        const decoded = Buffer.from(reversed, 'base64');
        const decompressed = zlib.inflateSync(decoded);
        const jsonData = decompressed.toString('utf8');
        const data = JSON.parse(jsonData);
        return data.data;
    } catch (error) {
        console.log("Content is not encoded or is corrupt, treating as plain text.");
        return encodedText;
    }
}

// --- Serve static files for the editor interface ---
// In serverless, middleware globală nu funcționează la fel, deci...
// Trebuie apelată explicit la fiecare request GET pentru fișiere statice
app.use((req, res, next) => {
    // Servește orice din /public dacă există
    if (req.method === 'GET' && (
        req.url === '/' ||
        req.url.startsWith('/static') ||
        req.url.endsWith('.js') ||
        req.url.endsWith('.css') ||
        req.url.endsWith('.png') ||
        req.url.endsWith('.ico') ||
        req.url.endsWith('.svg') ||
        req.url.endsWith('.html')
    )) {
        express.static('public')(req, res, next);
    } else {
        next();
    }
});

// --- Public Download Route ---
app.get('/lista.txt', (req, res) => {
    res.sendFile(listaFilePath, (err) => {
        if (err) {
            if (err.code === "ENOENT") {
                res.status(404).send("File not found.");
            } else {
                console.error(err);
                res.status(500).send("Error sending file.");
            }
        }
    });
});

// --- Authentication Middleware ---
const authMiddleware = (req, res, next) => {
    const credentials = auth(req);
    const correctPassword = '2005KodiRoHub!';

    if (!credentials || credentials.pass !== correctPassword) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
        return res.status(401).send('Authentication required.');
    }
    return next();
};

// Aplică autentificare la toate rutele DE MAI JOS
app.use(authMiddleware);

// Pentru body text/plain mare
app.use(express.text({ limit: '50mb' }));

// --- Protected API Routes ---

app.get('/api/lista', (req, res) => {
    fs.readFile(listaFilePath, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                return res.send('');
            }
            console.error(err);
            return res.status(500).send('Error reading file');
        }
        const decodedContent = decodeContent(data);
        res.send(decodedContent);
    });
});

app.post('/api/lista', (req, res) => {
    const plainContent = req.body || '';
    const encodedContent = encodeContent(plainContent);
    fs.writeFile(listaFilePath, encodedContent, 'utf8', (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error saving file');
        }
        res.send('File saved successfully');
    });
});

// Exportă handler-ul compatibil cu Vercel serverless
module.exports = app;
module.exports.handler = (req, res) => app(req, res);
