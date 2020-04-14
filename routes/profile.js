var express = require('express');
var router = express.Router();

const helpers = require("../helpers/util")
let nav = 2;

module.exports = (pool) => {

    /* GET home page. */
    router.get('/', function (req, res, next) {
        // req.session.user = data.rows[0];
        sql = `SELECT * FROM users WHERE email = '${req.session.user.email}'`;
        pool.query(sql, (err, profile) => {

            res.render('profile/view', {
                nav,
                profile: profile.rows[0],
                user: req.session.user,
            });
        });
    });

    //update profile

    /* post edit users. */
    router.post('/', helpers.isLoggedIn, function (req, res, next) {
        const email = req.session.user.email;
        let sql = `UPDATE users SET firstname = $1, lastname = $2,  password = $3, position = $4, isfulltime = $5  WHERE email = '${req.session.user.email}' `;
        const data = [req.body.firstname, req.body.lastname, req.body.password, req.body.position, req.body.jobtype]

        pool.query(sql, data, (err, data) => {
            if (err) {
                throw err
            }
            res.redirect('/projects');

        });
    });

    return router;
}