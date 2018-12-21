const express = require('express');
const app = express();

const mongo = require('mongodb').MongoClient;
const port = 80;
const mongoURL = "mongodb://localhost:27017/";

// I tried to use as little middleware or libraries as possible to increase my understanding
// I only used body-parser to simplify POST requests, and crypto to perform encryption
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }))

/*  Encryption is only for demonstration purposes, it is not secure.
    Correctly handling passwords would involve hashing the password 
    on the client side so that the plain password is never transmitted
    or stored */
const crypto = require('crypto');
const algorithm = 'aes-256-ctr';
const key = 'asdfghjkl0987654321';

// Read the static part of the HTML used to build the main page.
const fs = require('fs');
fs.readFile(__dirname + '/html/main1.txt', 'utf8', function(err, data) {
  if (err) throw err;
  app.locals.main1 = data;
});
fs.readFile(__dirname + '/html/main2.txt', 'utf8', function(err, data) {
    if (err) throw err;
    app.locals.main2 = data;
});

// Connect to the database
mongo.connect(mongoURL, function(err, client) {
    if (err) throw err;
    console.log("Database connected!");
    app.locals.db = client.db("main");
    
    // Check for tables and default user, needed in case of new environment
    var cryptpass = encrypt("password");
    console.log("password encrypted as: " + cryptpass);
    console.log("decrypted: " + decrypt(cryptpass));
    // This will always set the defaul username and password on start
    app.locals.db.collection("users").updateOne(
        { username: "admin" },
        { $set: 
        { username: "admin",
          password: cryptpass } },
        { upsert: true }
    );

    app.listen(port, () => console.log(`login app listening on port ${port}!`));
});


// Deliver the login page
app.get('/', (req, res) => res.sendFile(__dirname + '/html/login.html'));

// Handle a login attempt using an HTTP POST request
app.post('/main', (req, res) => {
    var name = req.body.username;
    var pass = req.body.password;

    console.log("POST request containing username: " + name + " and password: " + pass);
    app.locals.db.collection("users").findOne({ username: name }).then((data) => {
        console.log(data);
        if (data == null) res.sendFile(__dirname + '/html/noUser.html');
        else if (pass != decrypt(data.password)) res.sendFile(__dirname + '/html/wrongPassword.html');
        else {
            app.locals.db.collection("users").find({}).toArray(function(err, result) {
                if (err) {
                    console.log(err);
                } else if (result.length > 0) {
                    res.send(buildMainPage(result));
            }
        });
        }
    });
});

// Handle an addition or update to users using an HTTP POST request
// This is not secure, it can be accessed without logging in.
app.post('/add', (req, res) => {
    var name = req.body.username;
    var pass = req.body.password;

    console.log("UPDATE request containing username: " + name + " and password: " + pass);

    app.locals.db.collection("users").updateOne(
        { username: name },
        { $set: 
        { username: name,
          password: encrypt(pass) } },
        { upsert: true },
        function(err, result) {
            app.locals.db.collection("users").find({}).toArray(function(err, result) {
                if (err) {
                    console.log(err);
                } else if (result.length > 0) {
                    res.send(buildMainPage(result));
                }
            });
        }
    );
});

function encrypt(x) {
    var cipher = crypto.createCipher(algorithm, key);
    return cipher.update(x, 'utf8', 'hex') + cipher.final('hex');
}
 
function decrypt(x) {
    var decipher = crypto.createDecipher(algorithm, key);
    return decipher.update(x, 'hex', 'utf8') + decipher.final('utf8');
}

// Use an array of user documents to construct the main page after login
function buildMainPage(userlist) {
    var html = app.locals.main1;    

    userlist.forEach(element => {
        html += "<p>name: " + element.username + "<br>password encrypted: " 
              + element.password + "<br>password unencrypted: " + decrypt(element.password) + "</p>";
    });

    html += app.locals.main2;
    return html;
}
