const express = require('express')
const router = express.Router()
const axios = require('axios');
const { GEOAPIFY_KEY } = require('../secrets');

const GEOAPIFY_PLACES_URL = "https://api.geoapify.com/v2/places";


/**
* @openapi
* /adapters/v1/places:
*   get:
*     description: Get places of a given category around a given location
*     parameters:
*       - in: query
*         name: lat
*         schema:
*           type: number
*         required: true
*         description: Latitude
*       - in: query
*         name: lon
*         schema:
*           type: number
*         required: true
*         description: Longitude
*       - in: query
*         name: categories
*         schema:
*           type: string
*         required: true
*         description: Categories to include in the list of places
*     produces:
*       - application/json
*     responses:
*       200:
*         description: Return the list of places of the given category near the given location
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

* @see https://apidocs.geoapify.com/docs/places/#api
* @see https://apidocs.geoapify.com/playground/places/
*/
router.get('/', function (req, res) {
    const lon = req.lon;
    const lat = req.lat;
    const categories = req.query.categories;
    if (!categories || categories.trim().length === 0) {
        res.status(400).json({ error: "Missing categories" });
        return;
    }

    let config = {
        url: `${GEOAPIFY_PLACES_URL}`,
        params: {
            apiKey: GEOAPIFY_KEY,
            categories: categories,
            filter: `circle:${lon},${lat},5000`,
            bias: `proximity:${lon},${lat}`,
            limit: 5
        },
    };
    axios(config)
        .then(response => {
            // console.log(response.data);
            res.status(200).json(response.data.features);
        })
        .catch(err => {
            console.log(err)
            res.status(500).json({ error: err });
        });

});


module.exports = router;
