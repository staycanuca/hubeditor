const express = require('express');
const fs = require('fs');
const path = require('path');
const auth = require('basic-auth');
const zlib = require('zlib');

const app = express();
const port = process.env.PORT || 3000;
const listaFilePath = path.join(__dirname, 'lista.txt');

// --- Encoding/Decoding Functions ---
function encodeContent(text) {
    if (!text) {
        return '';
    }
    const data = { 'data': text };
    const jsonData = JSON.stringify(data);
    const compressed = zlib.deflateSync(jsonData);
    const encoded = compressed.toString('base64');
    const reversed = encoded.split('').reverse().join('');
    return reversed;
}

function decodeContent(encodedText) {
    if (!encodedText) {
        return '';
    }
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

// --- Public Download Route ---
// This route is defined BEFORE authentication is applied.
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

// Serve static files for the editor interface
app.use(express.static('public'));

// Apply authentication to all routes DEFINED BELOW THIS LINE
app.use(authMiddleware);

// --- Protected Routes ---

// Use middleware to parse plain text bodies
app.use(express.text({ limit: '50mb' }));

// API endpoint to get the content of lista.txt
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

// API endpoint to save content to lista.txt
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

module.exports = app;
