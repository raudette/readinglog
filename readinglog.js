var express = require('express')
var formidable = require('formidable')
var request = require('request')
var app = express()
var ejs = require('ejs');
var mysql = require('mysql');
var fs = require('fs');

//Config
var data = fs.readFileSync('./readinglogconfig.json'),Config;
try {
  Config = JSON.parse(data);
}
catch (err) {
  console.log('Error parsing config')
  console.log(err);
}

//Setup DB pool
var pool  = mysql.createPool({
  host     : Config.host,
  user     : Config.user,
  password : Config.password,
  database : Config.database
});

var server = app.listen(Config.port, function () {

  var host = server.address().address
  var port = server.address().port

  console.log('Reading Log App Listening At http://%s:%s', host, port)

})

var options = {
	ZXingLocation: "./",
    try_harder: true,
	multi: false,
	ZXingVersion: "-3.3.1"}
var bardecoder = require('./zxing.js')(options);

app.post('/upload', function (req, res){
    var form = new formidable.IncomingForm();

    form.parse(req);

    form.on('fileBegin', function (name, file){
        file.path = __dirname + '/uploads/' + file.name;
    });

    form.on('file', function (name, file){
        console.log('Uploaded ' + file.name);
        bardecoder.decode(__dirname +'/uploads/'+file.name,
			function(err, isbn) {
				console.log(err);
				console.log(isbn);
				if (isbn.length>1) {
					request('https://www.googleapis.com/books/v1/volumes?q='+isbn, function (error, response, body) {
						//console.log('error:', error); // Print the error if one occurred
						//console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
						//console.log('body:', body); // Print the HTML for the Google homepage.
						var book = JSON.parse(body);
						console.log(book.items[0].volumeInfo.title);
						console.log(book.items[0].volumeInfo.authors[0]);
						if (book.totalItems > 0) {
							res.status=200;
							bookdetails = [isbn, book.items[0].volumeInfo.title,book.items[0].volumeInfo.authors[0]]
							res.send(bookdetails);
							}
						else {
							res.sendStatus(204);
						}
						
						//console.log(body.items[0].volumeInfo.title)
						//console.log(body.items[0].volumeInfo.author)
						});
					}
				else {
					res.sendStatus(204);
				}
			}
		);
        
    });

});

//INSERT INTO readinglog.readinglog (`userid`, `isbn`, `title`, `date`) VALUES ('3', '12', 'guy',concat(year(now()),'-',month(now()),'-',day(now()) ) );

app.post('/user/:id/upload', function (req, res){
    var form = new formidable.IncomingForm();

    form.parse(req);

    form.on('fileBegin', function (name, file){
        file.path = __dirname + '/uploads/' + file.name;
    });

    form.on('file', function (name, file){
        console.log('Uploaded ' + file.name);
        bardecoder.decode(__dirname +'/uploads/'+file.name,
			function(err, isbn) {
				console.log(err);
				console.log(isbn);
				if (isbn.length>1) {
					request('https://www.googleapis.com/books/v1/volumes?q='+isbn, function (error, response, body) {
						//console.log('error:', error); // Print the error if one occurred
						//console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
						//console.log('body:', body); // Print the HTML for the Google homepage.
						var book = JSON.parse(body);
						console.log(book.items[0].volumeInfo.title);
						console.log(book.items[0].volumeInfo.authors[0]);
						if (book.totalItems > 0) {
							pool.getConnection(function(err, connection) {
								title=connection.escape(book.items[0].volumeInfo.title)
								author=connection.escape(book.items[0].volumeInfo.authors[0])
								strQuery = "INSERT INTO readinglog.readinglog (`userid`, `isbn`,`author`, `title`, `date`) VALUES ("+req.params.id+","+isbn+", "+author+", "+title+",concat(year(now()),'-',month(now()),'-',day(now()) ) );";

								console.log(strQuery);
								connection.query( strQuery, function(err, rows) {
								connection.release();
								});
							});
						res.redirect('/user/'+req.params.id);
						}
						else {
						}
						
						//console.log(body.items[0].volumeInfo.title)
						//console.log(body.items[0].volumeInfo.author)
						});
					}
				else {
					res.sendStatus(204);
				}
			}
		);
        
    });

});


//app.use('/', express.static(__dirname + '/public'));

app.get('/olduser/:id', function(req, res){
console.log(req.params.id);
	pool.getConnection(function(err, connection) {
		connection.query("select username from user where userid = "+req.params.id , function(err, row) {
		if (row.length>0) {
			res.status=200;
			res.send(row[0].username);
			}
		else {
			res.sendStatus(204);
			}
		connection.release();
		});
	});
});	

app.get('/user/:id', function(req, res){

strQuery= "select username from user where userid = "+req.params.id;

var username
var readinglog

	pool.getConnection(function(err, connection) {
		connection.query(strQuery , function(err, row) {
			username=row[0].username;
			strQuery = "SELECT * FROM readinglog.readinglog where userid="+req.params.id;
			console.log(strQuery)
			connection.query( strQuery, function(err, rows) {
				readinglog=rows;

				res.render('user.ejs', {
					id: req.params.id,
					username: username,
					booklist: readinglog
					});
				});
			});
		connection.release();

	});


});	



app.get('/user/:id/list', function(req, res){		
		
	strQuery = "SELECT * FROM readinglog.readinglog="+req.params.id;

	pool.getConnection(function(err, connection) {
	connection.query( strQuery, function(err, rows) {
		res.send(JSON.stringify(rows))
		connection.release();
		});
	});

}); 
