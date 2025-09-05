const express = require('express');
const fs = require('fs');
const path = require('path');
const auth = require('basic-auth');
const zlib = require('zlib');

const app = express();
const port = 3000;
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
        // If any step fails (e.g., file is not encoded), assume it's plain text.
        console.log("Content is not encoded or is corrupt, treating as plain text.");
        return encodedText;
    }
}

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

// Apply authentication to all routes
app.use(authMiddleware);

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Use middleware to parse plain text bodies
app.use(express.text({ limit: '50mb' })); // Increased limit for potentially large lists

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

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log('Open this URL in your browser to use the editor.');
});
