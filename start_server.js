//start_server.js
var http = require('http');
var express = require('express');
var path = require('path'); 
var app = express();

//app.use('/', express.static(__dirname + '/public'));

app.set('view engine', 'pug')

function add_to_inventory(id){ 
	console.log("ADDED: " + id); 
}

function remove_from_inventory(id){
	console.log("REMOVED: " + id); 
} 

app.get('/inventory', (req, res, next) => { 
	//console.log(req);
	var id_ = req.query.id; 
	var add_ = req.query.add; 
	
	//console.log(typeof(add_)); 
	
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

app.get('/read', (req, res, next) => { 
	if(!req.query.id)
		res.send("ERROR"); 
	
	var id_ = req.query.id;
	
	res.render('index', { id: id_ });
}); 

app.get('*', (req, res, next) => { 
	
	res.render('index', { id: id_ })
}); 

app.listen(3000, ()=> { 
	console.log('Server started on port: 3000')
});