"use strict";

//start_server.js
// var http = require('http');
// var path = require('path');
const express = require('express');
const db = require('./src/database');
const fs = require('fs');
const bodyparser = require('body-parser');
const Debug = require('./src/debug');
const Application = require('./src/application');
const Models = require('./src/models/models');

const ErrorLevel = Debug.ErrorLevel;
const app = express();

const UserModel = Models.User;
const InventoryModel = Models.Inventory;

var port = process.env.PORT || 3000;

var users_logged_in = [];

Debug.set("log", true); //This sets to log every thing to a file
Debug.set("logfile", "log.txt");
app.set('view engine', 'pug');

app.use(bodyparser.urlencoded({extended: true}));
//app.use('/', express.static(__dirname + '/public'));

/**
 * Check if a user is already logged in
 *
 * @param req The request data
 * @param onUserLoggedIn The callback if a user is logged in
 * @param onUserNotLoggedIn The callback if a user is not logged in
 * @param onErr The callback if there is an error
 */
function check_logged_in(req, onUserLoggedIn, onUserNotLoggedIn, onErr)
{
    var logged_in = false;

    users_logged_in.forEach((user) => {
        //If the user is timed out
        if(user.time < new Date(Date.now() - 60000)){
            users_logged_in.splice(user, 1);
            logged_in = false;
            onUserNotLoggedIn();
        } else {
            //Check if the user is already logged in
            if (user.token === req.ip) {
                logged_in = true;
                onUserLoggedIn(user);
            }
        }
    });
    //If the user is not logged in redirect back to the login page
    if(logged_in !== true)
        onUserNotLoggedIn();
}

/**
 * Read route
 */
app.get('/read', (req, res) => {
    if(!req.query.id) {
        Debug.log(ErrorLevel.ERR, "Bad request: " + req.url + " IP: " + req.ip);
        res.render('errors/400');
    } else {
        db.get_item(req.query.id, (row_data) => {
            console.log(row_data);
            res.render('read', {item_data: row_data});
        }, (err) => {
            Debug.log(ErrorLevel.WARN, err.message);
            res.render('errors/item_doesnt_exist');
        });
    }
});

/**
 * Login get route
 */
app.get('/login', (req, res) => {
    res.render('login');
});

/**
 * Login post route
 */
app.post('/login', (req, res) => {
    if(req.body)
        db.get_user(req.body.username, (row) => {
            //console.log(row);
            if(row.HashedPassword === Application.hash_password(req.body.password)) {
                users_logged_in.push({user: row, token: req.ip, time: new Date(Date.now())});
                res.redirect("/dashboard");
            } else {
                res.render('login', {message : {error : true, data : "Incorrect Username or Password"}});
            }
        }, (err) => {
            Debug.log(ErrorLevel.ERR, err.message);
            res.render('login', {message : {error : true, data : err.message}});
        });
    else {
        res.render('errors/400');
        Debug.log(ErrorLevel.ERR, "Bad request: " + req.url + " IP: " + req.ip);
    }
});


//#region Dashboard Routes

/**
 * Dashboard route
 */
app.get('/dashboard', (req, res) => {
    db.get_inventory((rows) => {
        var itms = [];
        rows.forEach((row) => {
            var t = InventoryModel;
            
            var item = {
                item_id: row.ItemID,
                upc: row.UPC,
                part_number: row.PartNumber,
                manufacterer_upc: row.ManufactererUPC,
                manufacterer: row.Manufacterer,
                description: row.Description,
                min: row.Min,
                max: row.Max,
                qty: row.Qty
            };
            itms.push(item);
        });

        check_logged_in(req, (user) => {
            res.render('index', {
                user: user,
                inventory: {
                    items: itms,
                    top_items: {}
                }
            });
        }, () => {
            res.redirect('/login');
        });
    }, (err) => {
        res.render('errors/400', {err: err});
    });
});

/**
 * Settings route
 */
app.get('/settings', (req, res) => {
    res.render('errors/coming_soon');
});

/**
 * Inventory route
 */
app.get('/inventory', (req, res) => {
    check_logged_in(req, (user) => {
        res.render('dashboard_pages/inventory', {user: user});
    }, () => {
        res.redirect('/login');
    });
});

/**
 * Reports Route
 */
app.get('/reports', (req, res) => {
    res.render('errors/coming_soon');
});

/**
 * CMMS Route
 */
app.get('/cmms', (req, res) => {
    res.render('errors/coming_soon');
});

/**
 * Export Route
 */
app.get('/export', (req, res) => {
    res.render('errors/coming_soon');
});

//#endregion

/**
 * Default route
 */
app.get('/', (req, res) => {
    res.redirect('/dashboard');
});

/**
 * All other requests
 */
app.get('*', (req, res) => {
	Debug.log(ErrorLevel.ERR, "404: " + req.url + " IP: " + req.ip);
	res.render('errors/404');
});

/**
 * Start the webserver
 */
app.listen(port, () => {
	Debug.log(ErrorLevel.INFO, 'Server started on port: ' + port);

	//db.migrate_db("CREATE TABLE Users (UserID integer PRIMARY KEY AUTOINCREMENT, FirstName text, LastName text, HashedPassword varchar);" +
    //    "CREATE TABLE Inventory (ItemID integer PRIMARY KEY AUTOINCREMENT, UPC varchar, PartNumber varchar, ManufactererUPC varchar, Manufacterer varchar, Description text, Min integer, Max integer, Qty integer);");

    // let user = UserModel;
    //
    // user.first_name = "Demetry";
	// user.last_name = "Romanowski";
	// user.email = "demetryromanowski@gmail.com";
	// user.phone_number = "1-705-271-5704";
	// user.hashed_password = Application.hash_password("merlin171");
    //
	// user.sanitize_phone_number();
    //
	// db.add_user(user);

	// if(!check_for_duplicates_sync('inventory_db.csv'))
	// {
	// 	if(!fs.existsSync('./db'))
	// 	{
	// 		Debug.log(ErrorLevel.INFO, "Database does not exist, loading from inventory CSV");
	// 		fs.mkdirSync('./db');
    //
	// 		create_db_from_csv('inventory_db.csv', './db/', () => {
	// 			Debug.log(ErrorLevel.INFO, "Finished migrating DB");
	// 		});
	// 	}
	// }
});
