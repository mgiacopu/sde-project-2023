const express = require('express')
const router = express.Router()
const axios = require('axios');

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";
const CONFIG = {
    method: 'get',
    headers: {'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:107.0) Gecko/20100101 Firefox/109.0'},
    url: undefined,
    params: {
        format: 'jsonv2',
        addressdetails: 1,
        namedetails: 1,
    },
};

router.get('/search', function (req, res) {
    if (!req.query.address && req.query.address.trim() !== '') { 
        res.status(400).json({error: 'Address is a required parameter'});
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
                res.status(404).json({error: 'Address not found'});
            }
        })
        .catch(err => {
            console.log(err)
            res.status(500).json(err);
        });
    }
);


router.get('/reverse', function (req, res) {
    if (!req.query.lat || !req.query.lon) { 
        res.status(400).json({error: 'lat and lon are required parameters'});
        return;
    }

    const lat = req.query.lat;
    const lon = req.query.lon;

    let config = {
        ...CONFIG,
        url: `${NOMINATIM_BASE_URL}/reverse`,
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
            console.log(err)
            res.status(500).json(err);
        });
    }
);


module.exports = router;