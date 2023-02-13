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


/**
* @openapi
* /db/v1/user/{tgUserId}:
*   get:
*     description: Get user favourite coordinates by Telegram user id
*     parameters:
*       - in: path
*         name: tgUserId
*         schema:
*           type: integer
*         required: true
*         description: Telegram id of the user
*     produces:
*       - application/json
*     responses:
*       200:
*         description: Return user info
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
*         description: User not found
*       500:
*         description: Database not connected or internal server error
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*                   description: Error message
*/
router.get("/:tgUserId", parseTgUserId, function (req, res) {
    if (!connected) {
        res.status(500).json({ error: "DB not connected" });
        return;
    }

    db.get("SELECT * FROM users WHERE id = ?", [req.params.tgUserId], function (err, row) {
        if (err) {
            res.status(500).json({ error: err });
        } else {
            if (row) {
                res.status(200).json(row);
            } else {
                res.status(404).json({ error: "User not found" });
            }
        }
    });
});

/**
* @openapi
* /db/v1/user/{tgUserId}:
*   post:
*     description: Create a new user with id {tgUserId} and no favourite coordinates
*     parameters:
*       - in: path
*         name: tgUserId
*         schema:
*           type: integer
*         required: true
*         description: Telegram id of the user
*     produces:
*       - application/json
*     responses:
*       200:
*         description: Return the created user
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
*       409:
*         description: User already exists
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*                   description: Error message
*       500:
*         description: Database not connected
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*                   description: Error message
*/
router.post("/:tgUserId", parseTgUserId, function (req, res) {
    if (!connected) {
        res.status(500).json({ error: "DB not connected" });
        return;
    }

    db.run("INSERT INTO users(id, lat, lon) VALUES (?, NULL, NULL)", [req.tgUserId], function (err) {
        if (err) {
            res.status(409).json({ error: err });
        } else {
            res.status(200).json({
                id: req.tgUserId,
                lat: null,
                lon: null,
            });
        }
    });
});

/**
* @openapi
* /db/v1/user/{tgUserId}:
*   patch:
*     description: Change the favourite coordinates of the user with id {tgUserId}
*     parameters:
*       - in: path
*         name: tgUserId
*         schema:
*           type: integer
*         required: true
*         description: Telegram id of the user
*     requestBody:
*       description: Latitude and longitude to update
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             properties:
*               lat:
*                 type: number
*                 required: true
*               lon:
*                 type: number
*                 required: true
*     produces:
*       - application/json
*     responses:
*       200:
*         description: Return the new user info
*       400:
*         description: Invalid parameter or user not found
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*                   description: Error message
*       500:
*         description: Database not connected or error while updating
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
*                   description: Error message
*/
router.patch("/:tgUserId", parseTgUserId, function (req, res) {
    if (!connected) {
        res.status(500).json({ error: "DB not connected" });
        return;
    }

    if (!req.body.lat || !req.body.lon) {
        res.status(400).json({ error: 'lat and lon are required parameters' });
        return;
    }
    lat = parseFloat(req.body.lat);
    lon = parseFloat(req.body.lon);
    if (isNaN(lat) || isNaN(lon)) {
        res.status(400).json({ error: 'lat and lon must be numbers' });
        return;
    }

    db.run("UPDATE users SET lat = ?, lon = ? WHERE id = ?", [lat, lon, req.tgUserId], function (err) {
        if (err) {
            res.status(500).json({ error: err });
        } else {
            let ret = {};
            let status;
            if (this.changes > 0) {
                ret = {
                    id: req.tgUserId,
                    lat: lat,
                    lon: lon,
                };
                status = 200;
            } else {
                ret = { error: "User not found" };
                status = 400;
            }
            res.status(status).json(ret);
        }
    });
});


module.exports = router;