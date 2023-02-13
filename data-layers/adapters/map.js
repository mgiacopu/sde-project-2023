const express = require('express')
const router = express.Router()
const axios = require('axios');
const { Blob } = require('node:buffer');
const { OWM_API_KEY, GEOAPIFY_KEY } = require('../secrets');

const OWM_BASE_URL = "https://tile.openweathermap.org/map";
const GEOAPIFY_URL = "https://maps.geoapify.com/v1/tile";
const ZOOM = 15;

/**
* @openapi
* /adapters/v1/map:
*   get:
*     description: Get the map tile for a given location
*     parameters:
*       - in: query
*         name: x
*         schema:
*           type: number
*         required: true
*         description: Coordinate x of tile
*         example: 8698
*       - in: query
*         name: y
*         schema:
*           type: number
*         required: true
*         description: Coordinate y of tile
*         example: 5824
*       - in: query
*         name: zoom
*         schema:
*           type: integer
*         required: false
*         description: Zoom level between 1 and 18
*         example: 14
*     produces:
*       - image/png
*     responses:
*       200:
*         description: Return the image of the map tile
*       400:
*         description: Invalid parameters
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*                   description: Error message
*       500:
*         description: Internal server error
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*                   description: Error message

* @see https://apidocs.geoapify.com/docs/maps/map-tiles/#about
*/
router.get('/', function (req, res) {
    const zoom = parseInt(req.query.zoom) || ZOOM;
    const x = req.x;
    const y = req.y;

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
            res.status(500).json({ error: err });
        });
});


/**
* @openapi
* /adapters/v1/map/precipitations:
*   get:
*     description: Get the precipitation overlay tile for a given location
*     parameters:
*       - in: query
*         name: x
*         schema:
*           type: number
*         required: true
*         description: Coordinate x of tile
*         example: 8698
*       - in: query
*         name: y
*         schema:
*           type: number
*         required: true
*         description: Coordinate y of tile
*         example: 5824
*       - in: query
*         name: zoom
*         schema:
*           type: integer
*         required: false
*         description: Zoom level between 1 and 18
*         example: 14
*     produces:
*       - image/png
*     responses:
*       200:
*         description: Return the image of the precipitation overlay tile
*       400:
*         description: Invalid parameters
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*                   description: Error message
*       500:
*         description: Internal server error
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*                   description: Error message

* @see https://openweathermap.org/api/weathermaps
* @see https://www.netzwolf.info/geo/math/tilebrowser.html?tx=${x}&ty=${y}&tz=15#tile
*/
router.get('/precipitations', function (req, res) {
    const zoom = parseInt(req.query.zoom) || ZOOM;
    const x = req.x;
    const y = req.y;

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
            res.status(500).json({ error: err });
        });
});



module.exports = router;