const express = require('express');
const path = require('path');
const { put, head, del, list } = require('@vercel/blob');
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
app.use(express.json());

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

// Protected routes below
app.use(authMiddleware);

// Route pentru /lista
app.get('/lista', async (req, res) => {
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

app.post('/lista', async (req, res) => {
    const plainContent = req.body;
    const encodedContent = encodeContent(plainContent);
    
    try {
        // 1. Create a backup before overwriting
        try {
            const currentBlob = await head('lista.txt');
            const currentContent = await (await fetch(currentBlob.url)).text();
            const backupPathname = `lista-backup-${new Date().toISOString()}.txt`;
            await put(backupPathname, currentContent, { access: 'public' });
        } catch (error) {
            if (error.code !== 'not_found') {
                console.error('Failed to create backup:', error.message);
                // Don't block the save operation if backup fails
            }
        }

        // 2. Overwrite the main file
        await put('lista.txt', encodedContent, { access: 'public', allowOverwrite: true });

        // 3. Prune old backups
        const { blobs } = await list({ prefix: 'lista-backup-' });
        if (blobs.length > 5) {
            const sortedBackups = blobs.sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt));
            const backupsToDelete = sortedBackups.slice(0, sortedBackups.length - 5);
            await del(backupsToDelete.map(b => b.url));
        }

        res.status(200).send('File saved successfully.');
    } catch (error) {
        console.error('Error writing blob:', error.message);
        res.status(500).send('Could not save lista.txt.');
    }
});

// Route for backups
app.get('/backups', async (req, res) => {
    try {
        const { blobs } = await list({ prefix: 'lista-backup-' });
        const sortedBackups = blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
        res.json(sortedBackups.slice(0, 5));
    } catch (error) {
        console.error('Error listing backups:', error.message);
        res.status(500).send('Could not list backups.');
    }
});

app.post('/restore', async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).send('Backup URL is required.');
    }

    try {
        // 1. Fetch backup content
        const backupContent = await (await fetch(url)).text();

        // 2. (Optional) create a backup of the current version before restoring
        // For simplicity, skipping this step, as the user is explicitly restoring.

        // 3. Overwrite lista.txt with backup content
        await put('lista.txt', backupContent, { access: 'public', allowOverwrite: true });

        res.status(200).send('File restored successfully.');
    } catch (error) {
        console.error('Error restoring from backup:', error.message);
        res.status(500).send('Could not restore file.');
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});