const fs = require('fs');
const http = require('http');
const express = require('express');


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const geocodings = require('./adapters/geocoding');
app.use('/v1/geocoding/', geocodings)


const httpServer = http.createServer(app);
httpServer.listen(80, () => {
    console.log('HTTP Server running on port 80');
});