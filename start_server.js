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

app.get('/dashboard', (req, res) => {
    var user_login = false;

    users_logged_in.forEach((user) => {
        //If the user is timed out
        if(user.time < new Date(Date.now() - 60000)){
            user_login = false;
        } else {
            //Check if the user is already logged in
            if (user.token === req.ip) {
                res.render('index');
                user_login = true;
            }
        }
    });
    //If the user is not logged in redirect back to the login page
    if(user_login !== true)
        res.redirect('login');
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
                res.render('login', {message : {error : true}});
            }
        }, (err) => {
            Debug.log(ErrorLevel.ERR, err.message);
        });
    else {
        res.render('errors/400');
        Debug.log(ErrorLevel.ERR, "Bad request: " + req.url + " IP: " + req.ip);
    }
});

/**
 * Default route
 */
app.get('/', (req, res) => {
    res.redirect('/dashboard');
});

app.get('/settings', (req, res) => {
    res.render('errors/coming_soon');
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