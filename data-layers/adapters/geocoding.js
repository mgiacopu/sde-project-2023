const express = require('express')
const router = express.Router()
const axios = require('axios');
const { parseLonLat } = require('../middleware');

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";
const CONFIG = {
    url: undefined,
    params: {
        format: 'jsonv2',
        addressdetails: 1,
        namedetails: 1,
    },
};

/**
* @openapi
* /adapters/v1/geocoding/search:
*   get:
*     description: Get the coordinates of a given address
*     parameters:
*       - in: query
*         name: address
*         schema:
*           type: string
*         required: true
*         description: Address to search
*     produces:
*       - application/json
*     responses:
*       200:
*         description: Return location info
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
*       404:
*         description: Address not found
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
router.get('/search', function (req, res) {
    if (!req.query.address || req.query.address.trim() == '') {
        res.status(400).json({ error: 'Address is a required parameter' });
        return;
    }

    let config = {
        ...CONFIG,
        url: `${NOMINATIM_BASE_URL}/search`,
        params: {
            ...CONFIG.params,
            q: req.query.address,
        }
    };
    axios(config)
        .then(response => {
            if (response.data.length != 0) {
                res.status(200).json(response.data[0]);
            } else {
                res.status(404).json({ error: 'Address not found' });
            }
        })
        .catch(err => {
            console.log(err)
            res.status(500).json({ error: err });
        });
}
);

/**
* @openapi
* /adapters/v1/geocoding/reverse:
*   get:
*     description: Get the address of given coordinates
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
*         description: Return location info
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
router.get('/reverse', parseLonLat, function (req, res) {
    let config = {
        ...CONFIG,
        url: `${NOMINATIM_BASE_URL}/reverse`,
        params: {
            ...CONFIG.params,
            lat: req.lat,
            lon: req.lon,
        }
    };
    axios(config)
        .then(response => {
            if (response.data.error) {
                res.status(400).json({ error: response.data.error });
            } else {
                res.status(200).json(response.data);
            }
        })
        .catch(err => {
            console.log(err)
            res.status(500).json({ error: err });
        });
}
);


module.exports = router;