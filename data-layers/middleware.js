
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

function parseTgUserId(req, res, next) {
    if (!req.params.tgUserId) {
        res.status(400).json({error: 'id is a required parameter'});
        return;
    }

    req.tgUserId = parseInt(req.params.tgUserId);

    if (isNaN(req.tgUserId)) {
        res.status(400).json({error: 'id must be a number'});
        return;
    }

    next();
}

module.exports = {
    parseLonLat,
    parseTgUserId,
}
