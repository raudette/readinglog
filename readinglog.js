var express = require('express')
var formidable = require('formidable')
var request = require('request')
var app = express()
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
			function(err, out) {
				console.log(err);
				console.log(out);
				res.redirect('/')
				request('https://www.googleapis.com/books/v1/volumes?q='+out, function (error, response, body) {
					//console.log('error:', error); // Print the error if one occurred
					//console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
					//console.log('body:', body); // Print the HTML for the Google homepage.
					var book = JSON.parse(body);
					console.log(book.items[0].volumeInfo.title);
					console.log(book.items[0].volumeInfo.authors[0]);
					//console.log(body.items[0].volumeInfo.title)
					//console.log(body.items[0].volumeInfo.author)
					});
				}
		);
        
    });

});



app.use('/', express.static(__dirname + '/public'));



