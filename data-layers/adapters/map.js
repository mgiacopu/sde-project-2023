const express = require('express')
const router = express.Router()
const axios = require('axios');
const { Blob } = require('node:buffer');
const { OWM_API_KEY, GEOAPIFY_KEY } = require('../secrets');

const OWM_BASE_URL = "https://tile.openweathermap.org/map";
const GEOAPIFY_URL = "https://maps.geoapify.com/v1/tile";
const ZOOM = 12;

function lon2tile(lon, zoom) { return (Math.floor(((lon + 180) / 360) * Math.pow(2, zoom))); }
function lat2tile(lat, zoom) { return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))); }

/**
 * @see https://apidocs.geoapify.com/docs/maps/map-tiles/#about
 */
router.get('/', function (req, res) {
    const zoom = parseInt(req.query.zoom) || ZOOM;
    const lon = req.lon;
    const lat = req.lat;
    const x = lon2tile(lon, zoom);
    const y = lat2tile(lat, zoom);

    console.log("/map");
    console.log("zoom:", zoom);
    console.log("lon:", lon, "x:", x);
    console.log("lat:", lat, "y:", y);

    const MAP_STYLE = "osm-bright";
    let config = {
        url: `${GEOAPIFY_URL}/${MAP_STYLE}/${zoom}/${x}/${y}.png`,
        params: {
            apiKey: GEOAPIFY_KEY,
        },
        responseType: 'arraybuffer',
    };
    axios(config)
        .then(response => {
            let blob = new Blob(
                [response.data],
                { type: response.headers['content-type'] }
            )
            res.type(blob.type)
            blob.arrayBuffer().then((buf) => {
                res.send(Buffer.from(buf))
            });
        })
        .catch(err => {
            console.log(err)
            res.status(500).json(err);
        });
});


/**
 * @see https://openweathermap.org/api/weathermaps
 * @see https://www.netzwolf.info/geo/math/tilebrowser.html?tx=${x}&ty=${y}&tz=15#tile
 */
router.get('/precipitations', function (req, res) {
    const zoom = parseInt(req.query.zoom) || ZOOM;
    const lon = req.lon;
    const lat = req.lat;
    const x = lon2tile(lon, zoom);
    const y = lat2tile(lat, zoom);

    console.log("/map/precipitations");
    console.log("zoom:", zoom);
    console.log("lon:", lon, "x:", x);
    console.log("lat:", lat, "y:", y);

    let config = {
        url: `${OWM_BASE_URL}/precipitation_new/${zoom}/${x}/${y}.png`,
        params: {
            appid: OWM_API_KEY,
        },
        responseType: 'arraybuffer',
    };
    axios(config)
        .then(response => {
            let blob = new Blob(
                [response.data],
                { type: response.headers['content-type'] }
            )
            res.type(blob.type)
            blob.arrayBuffer().then((buf) => {
                res.send(Buffer.from(buf))
            });
        })
        .catch(err => {
            console.log(err)
            res.status(500).json(err);
        });
});



module.exports = router;