const http = require('http');
const express = require('express');
const axios = require('axios');

/**
 * Default configuration for axios web requests
 */
axios.defaults.method = 'get';
axios.defaults.headers = { 
    'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:107.0) Gecko/20100101 Firefox/109.0', 
};

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


/**
 * ADAPTER LAYER
*/
const routerAdapterLayer = express.Router();
const { parseLonLat } = require('./middleware');

const geocodings = require('./adapters/geocoding');
routerAdapterLayer.use('/v1/geocoding/', geocodings);
const air_pollution = require('./adapters/air_pollution');
routerAdapterLayer.use('/v1/air_pollution/', parseLonLat, air_pollution);
const weather = require('./adapters/weather');
routerAdapterLayer.use('/v1/weather/', parseLonLat, weather);
const map = require('./adapters/map');
routerAdapterLayer.use('/v1/map/', parseLonLat, map);
const places = require('./adapters/places');
routerAdapterLayer.use('/v1/places/', parseLonLat, places);

/**
 * USER DATABASE
 */
const routerDatabase = express.Router();

const db_user = require('./db/user');
routerDatabase.use('/v1/user', db_user);


/**
 * DATA LAYER
 */
app.use('/api/adapters/', routerAdapterLayer);
app.use('/api/db/', routerDatabase);


const httpServer = http.createServer(app);
httpServer.listen(80, () => {
    console.log('HTTP Server running on port 80');
});
