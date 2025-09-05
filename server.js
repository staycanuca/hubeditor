const express = require('express');
const path = require('path');
const { put, head, del } = require('@vercel/blob');
const auth = require('basic-auth');

const app = express();

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
        const text = await response.text();
        res.type('text/plain').send(text);
    } catch (error) {
        if (error.status === 404) {
            res.type('text/plain').send('');
        } else {
            console.error('Error fetching blob:', error.message);
            res.status(500).send('Could not load lista.txt.');
        }
    }
});

app.post('/lista', authMiddleware, async (req, res) => {
    const content = req.body;
    try {
        await put('lista.txt', content, { access: 'public' });
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