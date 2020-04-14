var express = require('express');
var router = express.Router();
const path = require('path');
var moment = require('moment');
var nav = 1;

const helpers = require("../helpers/util")


module.exports = (pool) => {

    // ============================= Router Home Redirect Project =============================
    router.get('/', helpers.isLoggedIn, function (req, res, next) {



        const {
            ckid,
            id,
            ckname,
            name,
            ckmember,
            member
        } = req.query;
        const url = (req.url == '/') ? `/?page=1` : req.url
        const page = req.query.page || 1;
        const limit = 3;
        const offset = (page - 1) * limit
        let params = [];
        if (ckid && id) {
            params.push(`projects.projectid = ${id}`);
        }
        if (ckname && name) {
            params.push(`projects.name ILIKE '%${name}%'`)
        }
        if (ckmember && member) {
            params.push(`members.userid = '${member}'`)
        }

        let sql = `SELECT COUNT(id) as total FROM (SELECT DISTINCT projects.projectid AS id FROM projects LEFT JOIN members ON projects.projectid = members.projectid`;

        if (params.length > 0) {
            sql += ` WHERE ${params.join(" AND ")}`
        }
        sql += `) AS projectmember`;

        pool.query(sql, (err, count) => {


            const total = count.rows[0].total;
            const pages = Math.ceil(total / limit)

            sql = `SELECT DISTINCT projects.projectid, projects.name FROM projects LEFT JOIN members ON projects.projectid = members.projectid`


            if (params.length > 0) {
                sql += ` WHERE ${params.join(" AND ")}`
            }
            sql += ` ORDER BY projects.projectid LIMIT ${limit} OFFSET ${offset}`
            let subquery = `SELECT DISTINCT projects.projectid FROM projects LEFT JOIN members ON projects.projectid = members.projectid`
            if (params.length > 0) {
                subquery += ` WHERE ${params.join(" AND ")}`
            }
            subquery += ` ORDER BY projects.projectid LIMIT ${limit} OFFSET ${offset}`
            let sqlMembers = `SELECT projects.projectid, users.userid, CONCAT (users.firstname,' ',users.lastname) AS fullname FROM projects LEFT JOIN members ON projects.projectid = members.projectid LEFT JOIN users ON users.userid = members.userid WHERE projects.projectid IN (${subquery})`

            pool.query(sql, (err, projectData) => {


                if (err) throw err;


                pool.query(sqlMembers, (err, memberData) => {

                    projectData.rows.map(project => {
                        project.members = memberData.rows.filter(member => {
                            return member.projectid == project.projectid
                        }).map(data => data.fullname)
                    })
                    let sqlusers = `SELECT * FROM users`;
                    let sqloption = `SELECT projectopt  FROM users  WHERE userid =${req.session.user.userid}`;


                    pool.query(sqlusers, (err, data) => {


                        pool.query(sqloption, (err, options) => {


                            res.render('projects/view', {
                                nav,
                                data: projectData.rows,
                                query: req.query,
                                users: data.rows,
                                page: page,
                                pages: pages,
                                url: url,
                                option: options.rows[0].projectopt,
                                user: req.session.user
                            })
                        })
                    })
                })
            })
        })
    });

    router.post('/update', (req, res) => {

        let sql = `UPDATE users SET projectopt = '${JSON.stringify(req.body)}' WHERE userid =${req.session.user.userid} `
        pool.query(sql, (err) => {
            if (err) throw err;

            res.redirect('/projects');
        })

    })

    //Get From Add
    router.get('/add', helpers.isLoggedIn, (req, res, next) => {
        let sqladd = `SELECT * FROM users`;
        pool.query(sqladd, (err, row) => {
            if (err) {
                throw err
            }
            res.render('projects/add', {
                data: row.rows,
                user: req.session.user,
                path,
                dataNull: req.flash('dataNull'),
                nav
            })
        })
    })

    //Post add project
    router.post('/add', function (req, res, next) {


        const {
            name,
            member
        } = req.body;


        if (name && member) {
            ceklist = true

            const insertId = `INSERT INTO projects (name) VALUES ('${name}')`
            pool.query(insertId, (err, dbProjects) => {
                let selectidMax = `SELECT MAX (projectid) FROM projects`
                pool.query(selectidMax, (err, dataMax) => {
                    let insertidMax = dataMax.rows[0].max
                    let insertMember = 'INSERT INTO members (userid, role, projectid) VALUES '
                    if (typeof member == 'string') {
                        insertMember += `(${member}, ${insertidMax});`
                    } else {

                        let members = member.map(item => {
                            return `(${item}, ${insertidMax})`
                        }).join(',')
                        insertMember += `${members};`
                    }
                    pool.query(insertMember, (err, dataSelect) => {

                    })

                })

            })
            res.redirect('/projects');


        } else {

            console.log("data kosong");
            req.flash('dataNull', 'Please Select Member ')
            res.redirect('/projects/add');

        }

    })

    //Router GET Edit
    router.get('/edit/:projectid', helpers.isLoggedIn, (req, res) => {


        let edit = parseInt(req.params.id);
        let sql = `SELECT members.userid, projects.name, projects.projectid FROM members LEFT JOIN projects ON projects.projectid = members.projectid WHERE projects.projectid = ${req.params.projectid}`;
        console.log(sql);
        pool.query(sql, (err, data) => {
            pool.query(`SELECT * FROM users`, (err, user) => {
                if (err) throw err;
                console.log('suksess edit');
                res.render('projects/edit', {
                    nav,
                    name: data.rows[0].name,
                    projectid: data.rows[0].projectid,
                    members: data.rows.map(item => item.userid),
                    users: user.rows,
                    path,
                    user: req.session.user,
                })

            })

        })
    })

    //Post edit
    router.post('/edit/:projectid', (req, res) => {
        const {
            name,
            member
        } = req.body;
        let id = req.params.projectid;
        let sql = `UPDATE projects SET name= '${name}' WHERE projectid=${req.params.projectid}`;
        console.log(sql);

        pool.query(sql, (err, row) => {
            if (err) throw err;
            pool.query(`DELETE FROM members WHERE projectid = ${req.params.projectid}`, (err) => {
                let temp = []
                if (typeof req.body.member == 'string') {
                    temp.push(`(${req.body.member}, ${id})`)
                } else {
                    for (let i = 0; i < member.length; i++) {
                        temp.push(`(${member[i]}, ${id})`)
                    }
                }

                let input = `INSERT INTO members (userid, role,  projectid)VALUES ${temp.join(",")}`;
                pool.query(input, (err) => {
                    res.redirect('/projects')
                })
            })
        });
    });

    //delete
    router.get("/delete/:projectid", helpers.isLoggedIn, (req, res, next) => {

        let projectid = req.params.projectid;

        let sqlDeleteProject = `DELETE FROM members WHERE projectid = ${projectid};
        DELETE FROM projects WHERE projectid = ${projectid}`;
        pool.query(sqlDeleteProject, (err, data) => {

            res.redirect(`/projects`);

        });
    })


    //OVERVIEW PROJECT
    router.get("/overview/:projectid", helpers.isLoggedIn, (req, res, next) => {
        let projectid = req.params.projectid;
        let sql1 = `SELECT * FROM members JOIN projects ON (members.projectid = ${projectid} AND projects.projectid = ${projectid}) JOIN users ON members.userid = users.userid`;
        let sql2 = `SELECT * FROM issues WHERE projectid = ${projectid}`;
        console.log(sql1);


        pool.query(sql1, (err, data) => {
            pool.query(sql2, (err, issues) => {
                //bug counter
                let bugOpen = 0;
                let bugTotal = 0;
                issues.rows.forEach((item, index) => {
                    if (item.tracker == "bug" && item.status != "closed") {
                        bugOpen += 1;
                    }
                    if (item.tracker == "bug") {
                        bugTotal += 1;
                    }
                });
                //featur Counter
                let featureOpen = 0;
                let featureTotal = 0;
                issues.rows.forEach((item, index) => {
                    if (item.tracker == "feature" && item.status != "closed") {
                        featureOpen += 1;
                    }
                    if (item.tracker == "feature") {
                        featureTotal += 1;
                    }
                });

                //support counter
                let supportOpen = 0;
                let supportTotal = 0;
                issues.rows.forEach((item, index) => {
                    if (item.tracker == "support" && item.status != "closed") {
                        supportOpen += 1;
                    }
                    if (item.tracker == "support") {
                        supportTotal += 1;
                    }
                });

                res.render("projects/overview/view", {
                    nav,

                    data: data.rows,
                    issues: issues.rows,
                    //todo: issue tracking
                    bugOpen,
                    bugTotal,
                    featureOpen,
                    featureTotal,
                    supportOpen,
                    supportTotal,
                    user: req.session.user,
                    projectid: req.params.projectid,

                });
            });
        });
    });

    //ROUTE GET ACTIVITY
    router.get("/activity/:projectid", helpers.isLoggedIn, (req, res, next) => {
        let projectid = req.params.projectid;

        let sqlProject = `SELECT * FROM projects WHERE projectid = ${projectid} ORDER BY projectid DESC`;
        let sql2 = `SELECT * ,(SELECT CONCAT(firstname, ' ', lastname) AS author FROM users WHERE userid = activity.author AND projectid = ${projectid}) FROM activity WHERE projectid = ${projectid} ORDER BY activityid DESC`;

        console.log(sql2);

        pool.query(sqlProject, (err, data) => {

            pool.query(sql2, (err, issues) => {

                res.render("projects/activity/view", {
                    nav,
                    data: data.rows,
                    // issues: issues.rows,
                    moment,
                    projectid: req.params.projectid,
                    user: req.session.user,
                });
            });
        });

    });


    //==================================Router Get MEMBER======================================================\\
    router.get('/members/:projectid', helpers.isLoggedIn, (req, res) => {
        let path = "members"
        console.log("=================Router Get Overview Members============");
        console.log("==");
        console.log("==");
        console.log("==");


        const {
            ckid,
            memberid,
            ckname,
            name,
            ckposition,
            position
        } = req.query;
        let temp = []
        const pathside = "member";
        console.log(req.url)
        const url = (req.url == `/members/${req.params.projectid}`) ? `/members/${req.params.projectid}/?page=1` : req.url
        let page = req.query.page || 1;
        let limit = 3;
        let offset = (page - 1) * limit;

        if (ckid && memberid) {
            temp.push(`members.id = ${memberid}`)
        }

        if (ckname && name) {
            temp.push(`CONCAT (users.firstname,' ',users.lastname) ILIKE'%${name}%'`)
        }

        if (ckposition && position) {
            temp.push(`members.role = '${position}'`)
        }
        let sql = `SELECT count(*) as total FROM members WHERE members.projectid = ${req.params.projectid}`;
        if (temp.length > 0) {
            sql += ` AND ${temp.join(" AND ")}`
        }
        pool.query(sql, (err, count) => {
            const total = count.rows[0].total
            const pages = Math.ceil(total / limit)
            let sqlmember = `SELECT projects.projectid, members.id, members.role, CONCAT (users.firstname,' ',users.lastname) AS fullname FROM members LEFT JOIN projects ON projects.projectid = members.projectid LEFT JOIN users ON users.userid = members.userid WHERE members.projectid = ${req.params.projectid}`;
            if (temp.length > 0) {
                sqlmember += ` AND ${temp.join(" AND ")}`
            }
            sqlmember += ` ORDER BY members.id LIMIT ${limit} OFFSET ${offset}`


            console.log('this sql member>', sqlmember);

            let sqloption = `SELECT memberopt  FROM users  WHERE userid = ${req.session.user.userid}`;
            console.log(sqloption);

            pool.query(sqlmember, (err, data) => {
                pool.query(sqloption, (err, option) => {
                    res.render('projects/members/view', {
                        nav,
                        // data: data.rows,
                        projectid: req.params.projectid,
                        page: page,
                        pages: pages,
                        url: url,
                        // fullname: data.fullname,
                        option: option.rows[0].memberopt,
                        pathside,
                        path,
                        user: req.session.user,
                        query: req.query
                    })
                })
            });
        })
    });

    router.post('/optionmember/:projectid', (req, res) => {
        projectid = req.params.projectid;

        console.log("====================Router Post Members options================");
        console.log("==");
        console.log("==");
        console.log("==");

        let sql = `UPDATE users SET memberopt = '${JSON.stringify(req.body)}' WHERE userid =${req.session.user.userid} `
        console.log('this sql members update>', sql);
        console.log(req.session.user);

        pool.query(sql, (err) => {
            if (err) throw err;

            res.redirect(`/projects/members/${projectid}`);
        })
    })


    //=======================ISSUES========================================//
    router.get('/issues/:projectid', (req, res, next) => {
        projectid = req.params.projectid;
        let sql = `SELECT * FROM issues`;
        pool.query(sql, (err, data) => {
            if(err){
                throw err
            }
            res.render('projects/issues/view')
        })
    })




    return router;
}