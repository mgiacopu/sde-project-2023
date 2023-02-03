const fs = require('fs');
const http = require('http');
const express = require('express');
const axios = require('axios');

/**
 * Default configuration for axios web requests
 */
axios.defaults.method = 'get';
axios.defaults.headers = {'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:107.0) Gecko/20100101 Firefox/109.0'};

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * ROUTES
 */
const geocodings = require('./adapters/geocoding');
app.use('/v1/geocoding/', geocodings);
const air_pollution = require('./adapters/air_pollution');
app.use('/v1/air_pollution/', air_pollution);


const httpServer = http.createServer(app);
httpServer.listen(80, () => {
    console.log('HTTP Server running on port 80');
});
