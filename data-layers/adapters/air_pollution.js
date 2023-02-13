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
* @openapi
* /adapters/v1/air_pollution:
*   get:
*     description: Get the current air pollution data for a given location
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
*     produces:
*       - application/json
*     responses:
*       200:
*         description: Return current air quality info
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
*
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
            res.status(200).json(response.data.list[0]);
        })
        .catch(err => {
            console.log(err.response)
            res.status(500).json({ error: err });
        });
});

/**
* @openapi
* /adapters/v1/air_pollution/forecast:
*   get:
*     description: Get the air pollution data for a given location and day
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
*         name: day
*         schema:
*           type: string
*         required: true
*         description: Day in the format YYYY-MM-DD
*     produces:
*       - application/json
*     responses:
*       200:
*         description: Return air quality info for the requested day
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
*/
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
            res.status(500).json({ error: err });
        });
});




module.exports = router;