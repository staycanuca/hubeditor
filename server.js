// Route to fetch and display lista.txt
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