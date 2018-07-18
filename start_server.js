//start_server.js
var http = require('http');
var express = require('express');
var path = require('path'); 
var fs = require('fs'); 

var app = express();

var port = process.env.PORT || 3000; 

//app.use('/', express.static(__dirname + '/public'));

app.set('view engine', 'pug')

var ErrorLevel = { 
	DEBUG : "DEBUG: ", 
	INFO : "INFO: ", 
	WARN : "WARNING: ", 
	ERR : "ERROR: "
};

var Debug = {
	log : function(err_level, string) { 
		/**
		 * TODO(Demetry): Eventually add a log file writer
		 */
		if(err_level == undefined) 
			throw "ERROR LEVEL IS UNDEFINED";
	
		console.log(new Date(Date.now()).toLocaleString() + " : " + err_level + string);
	}
};

/**
 * Current Inventory object
 */
var inventory_object = {

	/**
	 * Set the inventory object
	 * @param {Number} upc The ID
	 * @param {Number} pn The part number
	 * @param {String} desc The description
	 * @param {Number} min The minimum amount allowed in the inventory
	 * @param {Number} max The maximum amount allowed in the inventory
	 * @param {Number} manupc The manufacturer UPC
	 * @param {Number} curramnt The current QTY in the inventory
	 */
	set : function(
			upc, 
			pn, 
			desc, 
			min, 
			max, 
			manupc, 
			curramnt
	){ 
		this.upc = upc; 
		this.part_number = pn; 
		this.description = desc; 
		this.min = min; 
		this.max = max; 
		this.manufacterer_upc = manupc; 
		this.current_amount = curramnt;
	},
	line : 0, 
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
 * TODO(Demetry): Fix this
 * @param {Number} id 
 * @param {Number} amnt 
 */
function add_to_inventory(id, amnt){ 
	Debug.log(ErrorLevel.INFO, "ADDED: " + id); 

	inventory_object.current_amount += amnt; 
}

/**
 * Remove qty from inventory
 * TODO(Demetry): Fix this
 * @param {Number} id 
 * @param {Number} amnt 
 */
function remove_from_inventory(id, amnt){
	Debug.log(ErrorLevel.INFO, "REMOVED: " + id); 

	inventory_object.current_amount -= amnt;
} 

/**
 * Load the data from the database
 * @param {Function} callback The callback that gets called once data is finished reading
 */
function load_data(callback)
{
	fs.readFile("inventory_db.csv", 'utf8', (err, raw_data) => { 
		if(err)
			Debug.log(ErrorLevel.ERR, err.message); 

		callback(raw_data); 
	});
}

/**
 * 
 * @param {String} data The data to write to the file 
 * @param {Function} callback The callback that gets called once data is finished writing 
 */
function write_data(data, callback)
{
	fs.writeFile("inventory_db.csv", data, (err) => {
		if(err)
			Debug.log(ErrorLevel.ERR, err.message); 

		callback(); 
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
					line : i, 
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
 * Add a new item to the inventory
 * TODO(Demetry): Fix this shit
 * 
 * @param {Object} inventory_object The inventory object 
 * @param {Function} callback The callback once this is finished 
 */
function add_new_item(inventory_object, callback)
{
	load_check_id_exists(inventory_object.id, (loaded_object, exists)=> { 
		if(!exists) return; 
		var inventory_object_string;

		var line = loaded_object.line; 

		

		write_data(inventory_object_string, () => { 
			callback(); 
		});
	});
}

/**
 * Handle the addnew request
 */
app.get('/addnew', (req, res, next) => { 
	var query = req.query;

	if( !query.id || 
		!query.pn || 
		!query.desc || 
		!query.min || 
		!query.max || 
		!query.manupc || 
		!query.curramnt)
	{ 
		res.send("ERROR QUERY INCORRECTLY FORMATTED");
		Debug.log(Debug.ERR, "QUERY INCORRECTLY FORMATTED"); 
	}

	inventory_object.set(query.id, query.pn, query.desc, query.min, query.max, query.manupc, query.curramnt);
	
	add_new_item(inventory_object, () => { 
		res.render('index', {id: id_});
	}); 
});

/**
 * When the user requests to add or remove 
 * an item from the inventory
 */
app.get('/inventory', (req, res, next) => { 
	if(!req.query.id || !req.query.add)
	{
		res.send("ERROR QUERY INCORRECTLY FORMATTED");
		Debug.log(Debug.ERR, "QUERY INCORRECTLY FORMATTED");
	}

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
 * (SCANS A QR CODE)
 */
app.get('/read', (req, res, next) => { 
	if(!req.query.id)
	{
		Debug.log(ErrorLevel.ERROR, "USER: REQUESTED TO READ WITH NO ID"); 
		res.send("ERROR NO ID SENT TO READ"); 
	}

	var id_ = req.query.id;

	inventory_object = null;

	load_check_id_exists(id_, (exists, loaded_inventory) => { 
		if(exists == true)
		{ 
			Debug.log(ErrorLevel.INFO, " USER: REQUESTED: " + id_ + " and it exists");

			inventory_object = loaded_inventory;  

			res.render('index', { id: id_, inventory_object: inventory_object});
		}
		else
		{
			Debug.log(ErrorLevel.INFO, " USER: REQUESTED: " + id_ + " and it does not exist");

			res.render('new_add', {id: id_})
		}
	});
	
}); 

/**
 * All other requests
 */
app.get('*', (req, res, next) => {
	Debug.log(ErrorLevel.ERR, "BAD REQUEST: " + req.url); 
	res.send("BAD REQUEST - YOU'RE DOING IT WRONG");
}); 

/**
 * Start the webserver
 */
app.listen(port, () => {
	
	Debug.log(ErrorLevel.INFO, 'Server started on port: ' + port);
});