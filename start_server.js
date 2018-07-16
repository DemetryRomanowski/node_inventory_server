//start_server.js
var http = require('http');
var express = require('express');
var path = require('path'); 
var fs = require('fs'); 

var app = express();

//app.use('/', express.static(__dirname + '/public'));

app.set('view engine', 'pug')

/**
 * Current Inventory object
 */
var inventory_object = {
	
	upc : 0, 
	part_number : 0,  
	description : "", 
	min : 0, 
	max : 0, 
	manufacterer_upc : 0, 
	current_amount : 0
}

/**
 * Add qty to inventory
 * @param {Number} id 
 * @param {Number} amnt 
 */
function add_to_inventory(id, amnt){ 
	console.log("ADDED: " + id); 
}

/**
 * Remove qty from inventory
 * @param {Number} id 
 * @param {Number} amnt 
 */
function remove_from_inventory(id, amnt){
	console.log("REMOVED: " + id); 
} 

/**
 * Load the data from the database
 * @param {function} callback 
 */
function load_data(callback)
{
	fs.readFile("inventory_db.csv", 'utf8', (err, raw_data) => { 
		if(err)
			console.log(err.message); 

		callback(raw_data); 
	});
}

/**
 * Load the information for the inventory item into memory 
 * if the id exists in the database
 * @param {Number} id The id you want to check in the database
 * @param {function} callback The callback that passes a boolean value if the id was found and other data
 */
function load_check_id_exists(id, callback) {
	load_data((data) => { 
		var lines = data.split('\n');
		var words; 

		for(var i = 1; i < lines.length - 1; i++)
		{
			words = lines[i].split(',');

			if(words[1] == id)
			{
				callback(true, 
				{
					upc : words[0], 
					part_number : words[1],  
					description : words[2], 
					min : words[3], 
					max : words[4], 
					manufacterer_upc : words[5], 
					current_amount : words[6].replace('\r', '')
				});
				return; 
			}
		}
		callback(false, null);
	});
}

/**
 * When the user requests to add or remove 
 * an item from the inventory
 */
app.get('/inventory', (req, res, next) => { 
	if(!req.query.id || !req.query.add)
		res.send("ERROR QUERY INCORRECTLY FORMATTED");

	var id_ = req.query.id; 
	var add_ = req.query.add; 

	if(add_ == 'true')
	{
		add_to_inventory(id_); 
	}
	else
	{ 
		remove_from_inventory(id_); 
	}
	
	res.render('index', { id: id_ });
}); 

/**
 * When the user requests to read a item from the inventory
 */
app.get('/read', (req, res, next) => { 
	if(!req.query.id)
		res.send("ERROR"); 
	
	var id_ = req.query.id;

	inventory_object = null;

	load_check_id_exists(id_, (exists, loaded_inventory) => { 
		if(exists == true)
		{ 
			console.log(new Date(Date.now()).toLocaleString() + ":    USER: REQUESTED: " + id_ + " and it exists");

			inventory_object = loaded_inventory;  

			res.render('index', { id: id_, inventory_object: inventory_object});
		}
		else
		{
			console.log(new Date(Date.now()).toLocaleString() + ":     USER: REQUESTED: " + id_ + " and it does not exist");

			res.render('new_add', {id: id_})
		}
	});
	
}); 

/**
 * All other requests
 */
app.get('*', (req, res, next) => { 
	
	res.send("YOU'RE DOING IT WRONG");
}); 

app.listen(3000, ()=> { 
	console.log('Server started on port: 3000')
});