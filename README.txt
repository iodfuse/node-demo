Start the node server with:

node app.js

Then, visit the webpage at 'localhost' in a browser.
The default credentials are reset on startup:
username: admin
password: password

The app assumes MongoDB is running and available at localhost:27017
The app will create a new collection if necessary, but it should include multiple pre-existing users if you point MongoDB to the db directory.