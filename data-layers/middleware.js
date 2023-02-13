
/**
 * Check if the request has the required parameters "lat" and "lon" and parse them to float
 * @param {*} req express request fn
 * @param {*} res express response fn
 * @param {*} next express next fn
 * @returns req.lat and req.lon as floats variables if valid, otherwise returns a 400 error
 */
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

/**
 * Check if the request has the required parameter "tgUserId" and parse it to int
 * @param {*} req express request fn
 * @param {*} res express response fn
 * @param {*} next express next fn
 * @returns req.tgUserId as int variable if valid, otherwise returns a 400 error
 */
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

/**
 * Check if the request has the required parameter "tgUserId" and parse it to int
 * @param {*} req express request fn
 * @param {*} res express response fn
 * @param {*} next express next fn
 * @returns req.tgUserId as int variable if valid, otherwise returns a 400 error
 */
function parseXY(req, res, next) {
    if (!req.query.x || !req.query.y) {
        res.status(400).json({error: 'x and y are required parameters'});
        return;
    }

    req.x = parseInt(req.query.x);
    req.y = parseInt(req.query.y);

    if (isNaN(req.x) || isNaN(req.y)) {
        res.status(400).json({error: 'x and y must be numbers'});
        return;
    }

    next();
}

module.exports = {
    parseLonLat,
    parseTgUserId,
    parseXY,
}
