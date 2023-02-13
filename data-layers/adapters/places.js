const express = require('express')
const router = express.Router()
const axios = require('axios');
const { GEOAPIFY_KEY } = require('../secrets');

const GEOAPIFY_PLACES_URL = "https://api.geoapify.com/v2/places";


/**
 * @see https://apidocs.geoapify.com/docs/places/#api
 * @see https://apidocs.geoapify.com/playground/places/
 */
router.get('/', function (req, res) {
    const lon = req.lon;
    const lat = req.lat;

    let categories = ['catering'].join(',');
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
            res.status(500).json(err);
        });

});


module.exports = router;
