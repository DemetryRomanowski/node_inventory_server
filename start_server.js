//start_server.js
// var http = require('http');
var express = require('express');
// var path = require('path'); 
var fs = require('fs'); 

var app = express();

var port = process.env.PORT || 3000; 

//app.use('/', express.static(__dirname + '/public'));

app.log_set = true; //This sets weather to log everthing to a file

app.set('view engine', 'pug');

var Colors = {
	Reset : "\x1b[0m",
	Bright : "\x1b[1m",
	Dim : "\x1b[2m",
	Underscore : "\x1b[4m",
	Blink : "\x1b[5m",
	Reverse : "\x1b[7m",
	Hidden : "\x1b[8m",
	FgBlack : "\x1b[30m",
	FgRed : "\x1b[31m",
	FgGreen : "\x1b[32m",
	FgYellow : "\x1b[33m",
	FgBlue : "\x1b[34m",
	FgMagenta : "\x1b[35m",
	FgCyan : "\x1b[36m",
	FgWhite : "\x1b[37m",
	BgBlack : "\x1b[40m",
	BgRed : "\x1b[41m",
	BgGreen : "\x1b[42m",
	BgYellow : "\x1b[43m",
	BgBlue : "\x1b[44m",
	BgMagenta : "\x1b[45m",
	BgCyan : "\x1b[46m",
	BgWhite : "\x1b[47m",
	Empty : ""
}

var ErrorLevel = { 
	DEBUG : {
		data: "DEBUG: ",
		fg_color: Colors.FgYellow, 
		bg_color: Colors.Empty
	}, 
	INFO : {
		data: "INFO: ", 
		fg_color: Colors.FgGreen,
		bg_color: Colors.Empty
	}, 
	WARN : {
		data: "WARNING: ",
		fg_color: Colors.FgRed,
		bg_color: Colors.Empty
	}, 
	ERR : {
		data: "ERROR: ", 
		fg_color: Colors.FgRed, 
		bg_color: Colors.Bright
	}
};

var Debug = {
	log : function(err_level, string) { 
		/**
		 * TODO(Demetry): Eventually add a log file writer
		 */
		if(err_level === undefined)
			throw "ERROR LEVEL IS UNDEFINED";
	
		if(app.log_set)
			;

		//Print the log to the console
		console.log(err_level.fg_color + err_level.bg_color + '%s' + Colors.Reset, new Date(Date.now()).toLocaleString() + " : " + err_level.data + string);
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
 * 
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
	}
	
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
function load_check_id_exists(id, callback) 
{
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
 *
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
		add_to_inventory(id_, 1); 
	else
		remove_from_inventory(id_, 1); 
	
	res.render('index', { id: id_, inventory_object: inventory_object });
}); 

/**
 * When user requests to create a order list
 */
app.get('/orderlist', (req, res, next) => { 

	var order = []

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