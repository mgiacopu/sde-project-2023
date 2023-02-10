const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
let connected = false;
/**
 * @see https://github.com/TryGhost/node-sqlite3/wiki/API
 */
const db = new sqlite3.Database('./db/db.sqlite3', sqlite3.OPEN_READWRITE | sqlite3.OPEN_FULLMUTEX, function (err) {
    if (err) {
        console.log(err);
    } else {
        console.log("Connected to DB");
        connected = true;
    }
});
const { parseTgUserId } = require('../middleware');


router.get("/:tgUserId", parseTgUserId, function (req, res) {
    if (!connected) {
        res.status(500).json({ error: "DB not connected" });
        return;
    }

    db.get("SELECT * FROM users WHERE id = ?", [req.params.tgUserId], function (err, row) {
        if (err) {
            res.status(500).json(err);
        } else {
            if (row) {
                res.status(200).json(row);
            } else {
                res.status(400).json({ error: "User not found" });
            }
        }
    });
});


router.post("/:tgUserId", parseTgUserId, function (req, res) {
    if (!connected) {
        res.status(500).json({ error: "DB not connected" });
        return;
    }

    db.run("INSERT INTO users(id, lat, lon) VALUES (?, NULL, NULL)", [req.tgUserId], function (err) {
        if (err) {
            res.status(500).json(err);
        } else {
            res.status(200).json({ 
                id: req.tgUserId,
                lat: null,
                lon: null,
            });
        }
    });
});

router.patch("/:tgUserId", parseTgUserId, function (req, res) {
    if (!connected) {
        res.status(500).json({ error: "DB not connected" });
        return;
    }

    if (!req.body.lat || !req.body.lon) {
        res.status(400).json({error: 'lat and lon are required parameters'});
        return;
    }
    lat = parseFloat(req.body.lat);
    lon = parseFloat(req.body.lon);
    if (isNaN(lat) || isNaN(lon)) {
        res.status(400).json({error: 'lat and lon must be numbers'});
        return;
    }

    db.run("UPDATE users SET lat = ?, lon = ? WHERE id = ?", [lat, lon, req.tgUserId], function (err) {
        if (err) {
            res.status(500).json(err);
        } else {
            let ret = {};
            if (this.changes > 0) {
                ret = { 
                    id: req.tgUserId,
                    lat: lat,
                    lon: lon,
                };
            } else {
                ret = { error: "User not found" };
            }
            res.status(200).json(ret);
        }
    });
});


module.exports = router;