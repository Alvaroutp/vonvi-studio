const express = require('express');
const app = express();
const path = require('path');
const PUERTO = 3000;

app.use(express.json());

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');

    if (req.method === 'OPTIONS') return res.sendStatus(200);

    next();
});

app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use('/api', require('./rutas/usuarios'));
app.use('/api', require('./rutas/catalogo'));
app.use('/api', require('./rutas/pedidos'));
app.use('/api', require('./rutas/admin'));

app.listen(PUERTO, () => {
    console.log('');
    console.log('  Servidor encendido');
    console.log('  http://localhost:' + PUERTO);
    console.log('');
    console.log('  Para detenerlo: Ctrl + C');
    console.log('');
});