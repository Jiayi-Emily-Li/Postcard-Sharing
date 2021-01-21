// server.js
// where your node app starts

// include modules
const express = require('express');

const multer = require('multer');
const bodyParser = require('body-parser');
const fs = require('fs');
const sql = require("sqlite3").verbose();
const FormData = require("form-data");

const postcardDB = new sql.Database("postcard.db");

// Actual table creation; only runs if "shoppingList.db" is not found or empty
// Does the database table exist?
let cmd = " SELECT name FROM sqlite_master WHERE type='table' AND name='PostcardTable' ";
postcardDB.get(cmd, function (err, val) {
    console.log(err, val);
    if (val == undefined) {
        console.log("No database file - creating one");
        createPostcardDB();
    } else {
        console.log("Database file found");
    }
});

function createPostcardDB() {
  // explicitly declaring the rowIdNum protects rowids from changing if the 
  // table is compacted; not an issue here, but good practice
  const cmd = 'CREATE TABLE PostcardTable ( rowIdNum INTEGER PRIMARY KEY, image TEXT, color TEXT, font TEXT, message TEXT, html TEXT)';
  postcardDB.run(cmd, function(err, val) {
    if (err) {
      console.log("Database creation failure",err.message);
    } else {
      console.log("Created database");
    }
  });
}


let storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, __dirname+'/images')    
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
})
// let upload = multer({dest: __dirname+"/assets"});
let upload = multer({storage: storage});


// begin constructing the server pipeline
const app = express();



// Serve static files out of public directory
app.use(express.static('public'));

// Also serve static files out of /images
app.use("/images",express.static('images'));

// Handle GET request to base URL with no other route specified
// by sending creator.html, the main page of the app
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/public/creator.html');
});

// Next, the the two POST AJAX queries

let filename = '/images/bridge.jpg';
// Handle a post request to upload an image. 
app.post('/upload', upload.single('newImage'), function (request, response) {
  if(request.file) {
    // file is automatically stored in /images, 
    // even though we can't see it. 
    // We set this up when configuring multer
    console.log(request.file.originalname);
    filename = "/images/" + request.file.originalname;
    sendMediaStore(filename, request, response);
    //response.end("recieved "+request.file.originalname);
  }
  else throw 'error';
  
  
});


// Handle a post request containing JSON
app.use(bodyParser.json());
// gets JSON data into req.body
app.post('/saveDisplay', function (req, res, next) {
  console.log(req.body);
  let r = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
  // put new item into database
  let image = req.body.image;
  let font = req.body.font;
  let color = req.body.color;
  let message = req.body.message;
  let html = r;
  let cmd = "INSERT INTO PostcardTable ( image, color, font, message, html) VALUES (?,?,?,?,?) ";
  postcardDB.run(cmd,image,color,font,message,html, function(err) {
    if (err) {
      console.log("DB insert error",err.message);
      next();
    } else {
      console.log("send randomStr res:");
      res.send(r);
    }
  }); 
  
});

app.get("/showPostcard", handlePostcardList);

function handlePostcardList(request, response, next) {
  let xcmd = ' SELECT * FROM PostcardTable WHERE html = ?';
  let html = request.query.id;
  html = html.substring(4);
  console.log("html:");
  console.log(html);
  postcardDB.get( xcmd, html, dataCallback );
    
  function dataCallback( err, rowData ) {    
     if (err) { 
       console.log("error: ",err.message); 
     }
     else { 
       console.log( "got: ", rowData);
       response.send(rowData);
     }
  } 
}




// The GET AJAX query is handled by the static server, since the 
// file postcardData.json is stored in /public

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});




function sendMediaStore(filename, serverRequest, serverResponse) {
  let apiKey = "3c61ha9ln0";
  if (apiKey === undefined) {
    serverResponse.status(400);
    serverResponse.send("No API key provided");
  } else {
    // we'll send the image from the server in a FormData object
    let form = new FormData();
    
    // we can stick other stuff in there too, like the apiKey
    form.append("apiKey", apiKey);
    // stick the image into the formdata object
    form.append("storeImage", fs.createReadStream(__dirname + filename));
    // and send it off to this URL
    form.submit("http://ecs162.org:3000/fileUploadToAPI", function(err, APIres) {
      // did we get a response from the API server at all?
      if (APIres) {
        // OK we did
        console.log("API response status", APIres.statusCode);
        // the body arrives in chunks - how gruesome!
        // this is the kind stream handling that the body-parser 
        // module handles for us in Express.  
        let body = "";
        APIres.on("data", chunk => {
          body += chunk;
        });
        APIres.on("end", () => {
          // now we have the whole body
          if (APIres.statusCode != 200) {
            serverResponse.status(400); // bad request
            serverResponse.send(" Media server says: " + body);
          } else {
            serverResponse.status(200);
            serverResponse.send(body);
          }
        });
      } else { // didn't get APIres at all
        serverResponse.status(500); // internal server error
        serverResponse.send("Media server seems to be down.");
      }
    });
  }
}
