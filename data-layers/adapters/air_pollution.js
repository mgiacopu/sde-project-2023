const express = require('express')
const router = express.Router()
const axios = require('axios');
const { OWM_API_KEY } = require('../secrets');

const OWM_BASE_URL = "https://api.openweathermap.org/data/2.5/air_pollution";
const CONFIG = {
    url: OWM_BASE_URL,
    params: {
        appid: OWM_API_KEY
    },
};

/**
 * @see https://openweathermap.org/api/air-pollution
 */
router.get('/', function (req, res) { 
    const lat = req.lat;
    const lon = req.lon;

    let config = {
        ...CONFIG,
        params: {
            ...CONFIG.params,
            lat: lat,
            lon: lon,
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