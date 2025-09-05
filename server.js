const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

// Servește fișierele statice din directorul "public"
app.use(express.static(path.join(__dirname, 'public')));

// Route pentru rădăcină
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route pentru /lista
app.get('/lista', (req, res) => {
    const filePath = path.join(__dirname, 'lista.txt');
    fs.readFile(filePath, 'utf-8', (err, data) => {
        if (err) {
            console.error("Eroare la citirea fișierului lista.txt:", err.message);
            res.status(500).send("Nu am putut încărca lista.txt");
            return;
        }
        res.type('text/plain').send(data);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
