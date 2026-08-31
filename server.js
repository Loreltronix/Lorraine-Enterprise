const express = require('express');
const app = express();
app.get('/', (req, res) => res.json({ message: 'Lorraine Enterprise is live!' }));
app.get('/favicon.ico', (req, res) => res.status(204).end());
module.exports = app;
