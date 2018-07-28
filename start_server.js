"use strict";

//start_server.js
// var http = require('http');
const express = require('express');
// var path = require('path'); 
const db = require('./src/database');
const fs = require('fs');

const Debug = require('./src/debug');
const ErrorLevel = Debug.ErrorLevel;

const app = express();

var port = process.env.PORT || 3000;

//app.use('/', express.static(__dirname + '/public'));

Debug.set("log", true); //This sets to log every thing to a file
Debug.set("logfile", "log.txt");
app.set('view engine', 'pug');

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
};

/**
 * Parse the inventory object from the file string
 * 
 * @param {String} file_data The UTF8 String data from the file converts it to an object
 * @returns {Object} The object for the inventory object
 */
function parse_inventory_object_sync(file_data)
{
	if(!file_data)
	{
		Debug.log(ErrorLevel.ERR, "File data is null, cannot create an inventory object from a null data");
		return null;
	}

    let lines = file_data.split('\n');

	for(var index in lines)
	{
		var words = lines[index].split(','); 
		
		var ret = { 
			upc : Number.parseInt(words[0]), 
			part_number : Number.parseInt(words[1]),  
			description : words[2], 
			min : Number.parseInt(words[3]), 
			max : Number.parseInt(words[4]), 
			manufacterer_upc : Number.parseInt(words[5]), 
			current_amount : Number.parseInt(words[6])
		};
	}

	return ret; 
}

/**
 * Checks for duplicates synchronously in th csv file
 * 
 * @param {String} db_file The csv file that initializes the database
 * @returns {Boolean} Checks for duplicates returns true if duplicate found
 */
function check_for_duplicates_sync(db_file)
{
	try
	{
		var buf = fs.readFileSync(db_file).toString('utf8');
		var lines = buf.split('\n');

		for(var index in lines)
		{
			var data = lines[index];
			for(var index_ in lines)
			{
				var data_ = lines[index_]; 
				if(index !== index_ && data === data_)
				{
					Debug.log(ErrorLevel.ERR, "Duplicate entries found in: " + db_file);
					return true; 
				}
			}
		}

		return false;
	}
	catch(err)
	{
		Debug.log(ErrorLevel.WARN, "Error reading file: " + err.message);
	}
}

/**
 * Create an inventory from a CSV file. 
 * 
 * @param {String} csv_file The CSV inventory file
 * @param {String} db_path The path for the databse
 * @param {Function} callback The callback once its complete
 */
function create_db_from_csv(csv_file, db_path, callback)
{
	fs.readFile(csv_file, 'utf8', (err, raw_data) => { 
		if(err){
			Debug.log(ErrorLevel.ERR, "Error reading file: " +  err.message); 
			callback();
		}
		else
		{
			Debug.log(ErrorLevel.INFO, "Read data successfully");

			var lines = raw_data.split('\n'); 

			//Need to fix this up a little
			for(var line in lines)
			{
				var words = lines[line].split(','); 

				if(line == 0 || lines[line] === '')
					continue;

				var file_name = words[0]; 
			
				fs.writeFile(db_path + file_name + ".csv", lines[line], (err) => { 
					if(err)
					{
						Debug.log(ErrorLevel.ERR, "Error Writing file: " + err.message);
						callback(); 
					}
				});
			}
			callback();
		} 
	});
}

/**
 * Read all the files in a directory
 * 
 * @param {String} dirname The directory to read
 * @param {Function} onFileContent The callback once the files are read
 * @param {Function} onError The callback if there is an error
 */
function readFiles(dirname, onFileContent, onError) {
	fs.readdir(dirname, function(err, filenames) {
	  if (err) {
		onError(err);
		return;
	  }
	  filenames.forEach(function(filename) {
		fs.readFile(dirname + filename, 'utf-8', function(err, content) {
		  if (err) {
			onError(err);
			return;
		  }
		  onFileContent(filename, content);
		});
	  });
	});
  }

/**
 * Check if overstocked or understocked
 * 
 * @param {Function} callback The callback once this is complete
 */
function check_all_max_min(callback)
{
	readFiles('./db/', (filename, content) => { 
		var object_to_test = parse_inventory_object_sync(content);

		if(object_to_test.current_amount < object_to_test.min)	
		{
			Debug.log(ErrorLevel.INFO, "Low qty on: " + object_to_test.description);

			callback(object_to_test);
		}
		
	}, (err) => Debug.log(ErrorLevel.ERR, "Error reading the database directory: " + err.message));
}

/**
 * Create an order list for parts under their minimum qty
 * 
 * @param {Object} low_stock The array that specifies all the low quantity stock items
 * @param {Function} callback The callback once this is complete
 */
function create_order_list(low_stock, callback)
{
	var order = {
		part_number: low_stock.part_number, 
		description: low_stock.description
	};
	
	Debug.log(ErrorLevel.INFO, "Item to order added: " + order);
	
	callback(order)
}

/**
 * Add qty to inventory
 * TODO(Demetry): Fix this
 * @param {Number} id 
 * @param {Number} amnt 
 */
function add_to_inventory(id, amnt)
{ 
	Debug.log(ErrorLevel.DEBUG, "Typeof inventory current amount: " + typeof(inventory_object.current_amount));

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
	Debug.log(ErrorLevel.DEBUG, "Typeof inventory current amount: " + typeof(inventory_object.current_amount));

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
			Debug.log(ErrorLevel.INFO, "Read data successfully");
			callback(raw_data);
		} 
	});
}

/**
 * Write data to a file, and create it if it doesn't exist
 *
 * @param {String} file The filename
 * @param {String} data The data to write to the file 
 * @param {Function} onComplete The callback that gets called once data is finished writing
 * @param {Function} onError The callback that gets called if there is an error
 */
function write_data(file, data, onComplete, onError)
{
	// console.log(file);
	fs.writeFile(file, data, (err) => {
		if(err){
			// Debug.log(ErrorLevel.ERR, "Error writing file: " + err.message);
			if(onError)
				onError(err);
		}
		else
		{
			// Debug.log(ErrorLevel.INFO, "Wrote data successfully");
			if(onComplete)
				onComplete();
		}
	});
}

/**
 * Write data to the database
 * @param {String} file The filename
 * @param {String} data The data to write to the file
 * @param {Function} callback The callback that gets called once data is finished writing
 */
function write_data_db(file, data, callback)
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
function load_check_id_exists(id, callback) 
{
	load_data(id.toString(), (data) => {
		if(data !== undefined)
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
 *
 */
function add_new_item(inventory_object, callback)
{
	var inventory_object_string = inventory_object_to_string(inventory_object); 

	write_data_db(inventory_object.upc, inventory_object_string, () => {
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

	write_data_db(inventory_object.upc, inventory_object_string, () => {
		callback(); 
	});
}

/**
 * Handle the addnew request
 */
app.get('/addnew', (req, res) => {
	var query = req.query;

	if( !query ||
		!query.id ||
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
app.get('/inventory', (req, res) => {
	if(!req.query.id || !req.query.add)
	{
		res.send("ERROR QUERY INCORRECTLY FORMATTED");
		Debug.log(Debug.ERR, "QUERY INCORRECTLY FORMATTED");
	}

	var id_ = req.query.id; 
	var add_ = req.query.add; 

	if(add_ === 'true')
		add_to_inventory(id_, 1); 
	else
		remove_from_inventory(id_, 1); 
	
	res.render('index', { id: id_, inventory_object: inventory_object });
}); 

/**
 * When user requests to create a order list
 */
app.get('/orderlist', (req, res) => {

	var order = [];

	check_all_max_min((low_stock) => { 
		create_order_list(low_stock, (order) => { 
			Debug.log(ErrorLevel.DEBUG, "Order: " + order);

			order.push(order); 
		});
	});

	res.render('orderlist', {order: order});
}); 

/**
 * When the user requests to read a item from the inventory
 * (SCANS A QR CODE)
 */
app.get('/read', (req, res) => {
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
		
		if(exists === true)
			res.render('index', { id: id_, inventory_object: inventory_object});
		else 
			res.render('new_add', {id: id_});
	});
}); 

/**
 * All other requests
 */
app.get('*', (req, res) => {
	Debug.log(ErrorLevel.ERR, "BAD REQUEST: " + req.url); 
	res.send("BAD REQUEST - YOU'RE DOING IT WRONG");
}); 

/**
 * Start the webserver
 */
app.listen(port, () => {
	Debug.log(ErrorLevel.INFO, 'Server started on port: ' + port);

	//db.migrate_db("CREATE TABLE Users (UserID integer PRIMARY KEY AUTOINCREMENT, FirstName text, LastName text, HashedPassword varchar);" +
    //    "CREATE TABLE Inventory (ItemID integer PRIMARY KEY AUTOINCREMENT, UPC varchar, PartNumber varchar, ManufactererUPC varchar, Manufacterer varchar, Description text, Min integer, Max integer, Qty integer);");

    db.add_user({
        user_id : 1,
        first_name : "Demetry",
        last_name : "Romanowski",
        password : "testing"
    });

	if(!check_for_duplicates_sync('inventory_db.csv'))
	{
		if(!fs.existsSync('./db'))
		{
			Debug.log(ErrorLevel.INFO, "Database does not exist, loading from inventory CSV");
			fs.mkdirSync('./db');

			create_db_from_csv('inventory_db.csv', './db/', () => { 
				Debug.log(ErrorLevel.INFO, "Finished migrating DB");
			});
		}
	}
});