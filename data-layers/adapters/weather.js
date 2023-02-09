const express = require('express')
const router = express.Router()
const axios = require('axios');
const { WEATHERAPI_KEY } = require('../secrets');

const WEATHERAPI_BASE_URL = "https://api.weatherapi.com/v1/forecast.json";
const CONFIG = {
    url: WEATHERAPI_BASE_URL,
    params: {
        key: WEATHERAPI_KEY
    },
};

/**
 * @see https://www.weatherapi.com/docs/
 */
router.get('/current', function (req, res) { 
    if (!req.query.lat || !req.query.lon) { 
        res.status(400).json({error: 'lat and lon are required parameters'});
        return;
    }

    const lat = req.query.lat;
    const lon = req.query.lon;

    let config = {
        ...CONFIG,
        params: {
            ...CONFIG.params,
            q: `${lat},${lon}`,
            alerts: "yes",
            days: 1,
            aqi: "yes",
        }
    };
    axios(config)
        .then(response => {
            res.status(200).json(response.data);
        })
        .catch(err => {
            console.log(err.response)
            res.status(500).json(err);
        });
});



module.exports = router;