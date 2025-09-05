const express = require('express');
const path = require('path');
const { put, head, del } = require('@vercel/blob');
const auth = require('basic-auth');
const zlib = require('zlib');

const app = express();

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
app.get('/lista.txt', async (req, res) => {
    try {
        const blob = await head('lista.txt');
        res.setHeader('Content-Disposition', 'attachment; filename="lista.txt"');
        res.setHeader('Content-Type', 'text/plain');
        const response = await fetch(blob.url);
        const text = await response.text();
        res.send(text);
    } catch (error) {
        if (error.code === 'not_found') {
            res.status(404).send("File not found.");
        } else {
            console.error('Error fetching blob for download:', error.message);
            res.status(500).send('Could not download file.');
        }
    }
});

// Servește fișierele statice din directorul "public"
app.use(express.static(path.join(__dirname, 'public')));

// Route pentru rădăcină
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(express.text());

// Middleware de autentificare
const authMiddleware = (req, res, next) => {
    const credentials = auth(req);

    if (!credentials || credentials.name !== 'hubuser' || credentials.pass !== '2025KodiRoHub!') {
        res.setHeader('WWW-Authenticate', 'Basic realm="example"');
        return res.status(401).send('Authentication required.');
    } else {
        return next();
    }
};

// Route pentru /lista
app.get('/lista', authMiddleware, async (req, res) => {
    try {
        const blob = await head('lista.txt');
        const response = await fetch(blob.url);
        const encodedContent = await response.text();
        const decodedContent = decodeContent(encodedContent);
        res.type('text/plain').send(decodedContent);
    } catch (error) {
        if (error.code === 'not_found') {
            res.type('text/plain').send('');
        } else {
            console.error('Error fetching blob:', error.message);
            res.status(500).send('Could not load lista.txt.');
        }
    }
});

app.post('/lista', authMiddleware, async (req, res) => {
    const plainContent = req.body;
    const encodedContent = encodeContent(plainContent);
    try {
        await put('lista.txt', encodedContent, { access: 'public' });
        res.status(200).send('File saved successfully.');
    } catch (error) {
        console.error('Error writing blob:', error.message);
        res.status(500).send('Could not save lista.txt.');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
