
function parseLonLat(req, res, next) {
    if (!req.query.lat || !req.query.lon) {
        res.status(400).json({error: 'lat and lon are required parameters'});
        return;
    }

    req.lat = parseFloat(req.query.lat);
    req.lon = parseFloat(req.query.lon);

    if (isNaN(req.lat) || isNaN(req.lon)) {
        res.status(400).json({error: 'lat and lon must be numbers'});
        return;
    }

    next();
}

module.exports = {
    parseLonLat,
}
