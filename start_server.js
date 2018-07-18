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
	console.log(typeof(inventory_object.current_amount));

	inventory_object.current_amount = Number.parseInt(inventory_object.current_amount + amnt); 

	update_item(inventory_object, () => { 
		Debug.log(ErrorLevel.INFO, "ADDED: " + id); 
	});
}

/**
 * Remove qty from inventory
 * TODO(Demetry): Fix this
 * @param {Number} id 
 * @param {Number} amnt 
 */
function remove_from_inventory(id, amnt){
	console.log(typeof(inventory_object.current_amount));

	inventory_object.current_amount = Number.parseInt(inventory_object.current_amount - amnt);

	update_item(inventory_object, () => { 
		Debug.log(ErrorLevel.INFO, "REMOVED: " + id); 
	});
} 

/**
 * Load the data from the database
 * @param {String} file The file name
 * @param {Function} callback The callback that gets called once data is finished reading
 */
function load_data(file, callback)
{
	fs.readFile("./db/"+file+".csv", 'utf8', (err, raw_data) => { 
		if(err){
			Debug.log(ErrorLevel.ERR, "Error reading file: " +  err.message); 
			callback(undefined);
		}
		else
		{
			Debug.log(ErrorLevel.INFO, "Read data successfully")
			callback(raw_data);
		} 
	});
}

/**
 * Write data to the database
 * @param {String} file The filename
 * @param {String} data The data to write to the file 
 * @param {Function} callback The callback that gets called once data is finished writing 
 */
function write_data(file, data, callback)
{
	fs.writeFile("./db/"+file+".csv", data, (err) => {
		if(err){
			Debug.log(ErrorLevel.ERR, "Error writing file: " + err.message); 
			callback(undefined)
		}
		else
		{
			Debug.log(ErrorLevel.INFO, "Wrote data successfully");
			callback(); 
		}
	});
}

/**
 * Load the information for the inventory item into memory 
 * if the id exists in the database
 * @param {Number} id The id you want to check in the database
 * @param {function} callback The callback that passes a boolean value if the id was found and other data
 */
function load_check_id_exists(id, callback) {
	load_data(id, (data) => { 
		if(data != undefined)
		{
			var words = data.split(','); 

			callback(true, {
				upc : Number.parseInt(words[0]), 
				part_number : Number.parseInt(words[1]), 
				description : words[2], 
				min : Number.parseInt(words[3]), 
				max : Number.parseInt(words[4]), 
				manufacterer_upc : Number.parseInt(words[5]), 
				current_amount : Number.parseInt(words[6].replace('\r', ''))
			});
		}
		else
		{
			callback(false, {upc: id});
		}
	});
}

/**
 * Create a string from the object
 * @param {Object} obj The inventory object to turn into a string
 * @returns {String} The string to save to file 
 */
function inventory_object_to_string(obj)
{
	return obj.upc + "," +
		   obj.part_number + "," + 
		   obj.description + "," +
		   obj.min + "," +
		   obj.max + "," +
		   obj.manufacterer_upc + "," +
		   obj.current_amount;
}

/**
 * Add a new item to the inventory
 * 
 * @param {Object} inventory_object The inventory object to create
 * @param {Function} callback The callback once this is finished 
 */
function add_new_item(inventory_object, callback)
{
	var inventory_object_string = inventory_object_to_string(inventory_object); 

	write_data(inventory_object.upc, inventory_object_string, () => { 
		callback(); 
	});
}

/**
 * Update an item in the inventory
 * 
 * @param {Object} inventory_object The inventory object to update
 * @param {Function} callback The callback once its complete 
 */
function update_item(inventory_object, callback) 
{
	var inventory_object_string = inventory_object_to_string(inventory_object); 

	write_data(inventory_object.upc, inventory_object_string, () => { 
		callback(); 
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

	inventory_object = {
		upc: Number.parseInt(query.id), 
		part_number: Number.parseInt(query.pn),
		description: query.desc,
		min: Number.parseInt(query.min),
		max: Number.parseInt(query.max),
		manufacterer_upc: Number.parseInt(query.manupc),
		current_amount: Number.parseInt(query.curramnt)
	};

	add_new_item(inventory_object,  () => { 
		res.render('index', {id: query.id, inventory_object});
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
		add_to_inventory(id_, 1); 
	}
	else
	{ 
		remove_from_inventory(id_, 1); 
	}
	
	res.render('index', { id: id_, inventory_object: inventory_object });
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
		Debug.log(ErrorLevel.INFO, "USER: REQUESTED: " + id_ + " and it exists");
		inventory_object = loaded_inventory;
		
		if(exists == true)
			res.render('index', { id: id_, inventory_object: inventory_object});
		else 
			res.render('new_add', {id: id_});
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