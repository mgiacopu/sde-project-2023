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
* @openapi
* /adapters/v1/weather/current:
*   get:
*     description: Get the current weather info for a given location
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
*         description: Return the current weather info
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

* @see https://www.weatherapi.com/docs/
*/
router.get('/current', function (req, res) {
    const lat = req.lat;
    const lon = req.lon;

    let config = {
        ...CONFIG,
        params: {
            ...CONFIG.params,
            q: `${lat},${lon}`,
            alerts: "yes",
            // days: 1,
        }
    };
    axios(config)
        .then(response => {
            let ret = {
                current: response.data.current,
                alerts: response.data.alerts,
            }
            res.status(200).json(ret);
        })
        .catch(err => {
            console.log(err)
            res.status(500).json({ error: err });
        });
});

/**
* @openapi
* /adapters/v1/weather/forecast:
*   get:
*     description: Get the weather info for a given location and day
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
*         description: Day to get forecast for in YYYY-MM-DD format
*     produces:
*       - application/json
*     responses:
*       200:
*         description: Return the weather info
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
    const dt = new Date(dayQuery);
    if (!dayQuery || dt.toString() === "Invalid Date") {
        res.status(400).json({ error: "Invalid day" });
        return;
    }

    const day = dt.getFullYear() + "-" + (dt.getMonth() + 1) + "-" + dt.getDate();

    let config = {
        ...CONFIG,
        params: {
            ...CONFIG.params,
            q: `${lat},${lon}`,
            alerts: "yes",
            dt: day,
        }
    };
    axios(config)
        .then(response => {
            if (response.data.forecast.forecastday.length === 0) {
                res.status(400).json({ error: "Forecast day must be within 14 days" });
                return;
            } else {
                let ret = {
                    [response.data.forecast.forecastday[0].date]: response.data.forecast.forecastday[0].day,
                    alerts: response.data.alerts,
                }
                res.status(200).json(ret);
            }
        })
        .catch(err => {
            console.log(err)
            res.status(500).json({ error: err });
        });
});



module.exports = router;