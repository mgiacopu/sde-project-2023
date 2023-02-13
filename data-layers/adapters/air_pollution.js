const express = require('express')
const router = express.Router()
const axios = require('axios');
const { OWM_API_KEY } = require('../secrets');

const OWM_BASE_URL = "https://api.openweathermap.org/data/2.5/air_pollution";
const CONFIG = {
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
        url: OWM_BASE_URL,
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

router.get('/forecast', function (req, res) { 
    const lat = req.lat;
    const lon = req.lon;
    const dayQuery = req.query.day;
    const dtQuery = new Date(dayQuery);
    if (!dayQuery || dtQuery.toString() === "Invalid Date") {
        res.status(400).json({ error: "Invalid day" });
        return;
    }
    
    const day = dtQuery.getFullYear() + "-" + (dtQuery.getMonth() + 1) + "-" + dtQuery.getDate();

    let config = {
        ...CONFIG,
        url: `${OWM_BASE_URL}/forecast`,
        params: {
            ...CONFIG.params,
            lat: lat,
            lon: lon,
        }
    };
    axios(config)
        .then(response => {
            let ret = [];

            // Filter the response to only include the requested day hours
            for (const hour of response.data.list) {
                let dt = new Date(hour.dt * 1000);
                let dtDay = dt.getFullYear() + "-" + (dt.getMonth() + 1) + "-" + dt.getDate();
                if (dtDay === day) {
                    ret.push(hour);
                }
            }

            res.status(200).json(ret);
        })
        .catch(err => {
            console.log(err.response)
            res.status(500).json(err);
        });
});




module.exports = router;