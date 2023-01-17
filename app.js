const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const mongoose = require('mongoose');
const passport = require('passport');
const flash = require('connect-flash');
const session = require('express-session');
const bodyParser = require("body-parser");
const { default: puppeteer } = require("puppeteer");

var moment = require('moment'); // require
moment().format(); 
const app = express();
const MongoClient = require('mongodb').MongoClient;
let token = 10000;
app.use(bodyParser.urlencoded({ extended: false }));
// const uri = "mongodb+srv://stickman:shreyansh@stickman.jtwgqqr.mongodb.net/?retryWrites=true&w=majority";

let datas=[];


//Passport Config
require("./config/passport")(passport);


const PORT = process.env.PORT || 5000;
app.use(express.static("public"));

mongoose.set("strictQuery", false);


//DB config
const db = require('./config/keys').mongoURI

//Connect to mongo
mongoose.connect(db, {useNewUrlParser: true})
    .then(() => console.log("MongoDB connected.."))
    .catch(err => console.log(err));
    


//Pushing the Data into Mongo DB ====================================================================

MongoClient.connect(db, { useNewUrlParser: true }, function (err, client) {
    if (err) {
        console.log('Error occurred while connecting to MongoDB Atlas...\n', err);
    }
    console.log('Connected...');
    const db = client.db('stickman');

    app.post('/', function (req, res) {

      const name = req.body.name;
      const number = req.body.number;
      const data = number.split(',');
  
      let num = [];
      data.forEach(number => {
          num.push(number + " - " + token++);
      });
  
      // Add the date field with the current date
      const date = new Date();
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
     
      db.collection('users').findOne({ name: name }, function (err, result) {
          if (err) {
              console.log(err);
          }
          // If a document with the same name already exists, return an error
          if (result) {
              res.send("Data Already Exists with the Same Name!");
          } else {
  
              // Insert the data into the database
              db.collection('users').insertOne({ name: name, number: num, date: dateOnly}, function (err, result) {
                  if (err) {
                      console.log(err);
                  }
                  console.log('Data added to the collection');
                  res.redirect('/data');
              });

          }
      });
  
  });

  

   
        //Using Puppeteer to Generate Name Filtered PDF=====================================
        app.post('/pdf/date', async (req, res) => {
            const startDate = req.body.startDate;
            const endDate = req.body.endDate;
          
            //query mongodb to get the data
            const collection = db.collection('users');
            const filter = {date: {$gte: new Date(startDate).toLocaleDateString(), $lt: new Date(endDate).toLocaleDateString()}};
            
            const filteredData = await collection.find(filter).toArray();
            console.log(filteredData);
            

          
            //HTML for the PDF
            const html = `
            <html>
              <body>
                <h1>Data from the database</h1>
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Number</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${filteredData.map(row => `
                      <tr>
                        <td>${row.name}</td>
                        <td>${row.number}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </body>
            </html>
          `;
          
            //Generating PDF
            const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
            const page = await browser.newPage();
            await page.setContent(html);
            const pdf = await page.pdf({ format: 'A4' });
            await browser.close();
          
            // send the PDF as a response
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=data.pdf');
            res.send(pdf);
          });
          
        
        // Using Puppeteer for Admin's PDF generation==================================================================

        app.post('/pdf/admin', async (req, res) => {

            const collection = db.collection('users');
            // const filter = {};
            // const data = await collection.find(filter).toArray();
            const data = await collection.find().toArray();

            //HTML for the PDF
            const html = `
  <html>
    <body>
      <h1>Data from the database</h1>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Number</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              <td>${row.name}</td>
              <td>${row.number}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
  </html>
`;

            //Generating PDF
            const browser = await puppeteer.launch({args: ['--no-sandbox']});

            const page = await browser.newPage();
            await page.setContent(html);
            const buffer = await page.pdf({ format: 'A4' });
            await browser.close();

            //Send the PDF to the Client
            res.setHeader('Content-Type', 'stickmanAdmin/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="stickmanAdmin.pdf"');
            res.send(buffer);

        });

 //=========================Filter PDF by DATE===============================//
        
      

      app.get('/data', (req, res) => {
        db.collection('users').find({}).toArray((err, data) => {
          if (err) {
            console.log(err);
          } else {
            res.render('data', { users: data });
          }
        });
      });
      
})

app.get('/print/:name/:numbers', async (req, res) => {
    const name = req.params.name;
    const numbers = req.params.numbers;
  
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
  
    // Use the `page.setContent()` method to set the content of the page
    // In this case we are using a simple HTML template with the name and numbers data
    await page.setContent(`
        <h1>${name}</h1>
        <p>${numbers}</p>

    `);
  
    // Use the `page.pdf()` method to generate a PDF of the page
    // You can also pass options to customize the PDF, such as the file name, paper size, etc.
    const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
    });

    res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${name}-${new Date().toLocaleDateString()}.pdf`,
    });
  
    // Send the PDF file as the response
    res.send(pdf);
});









//EJS
app.use(expressLayouts);
app.set('view engine', 'ejs');

//BodyParse
app.use(express.urlencoded({extended: true}))

//Express Session
app.use(session({
    secret: "secret",
    resave: true,
    saveUninitialized: true
}))

//Passport middleware
app.use(passport.initialize());
app.use(passport.session()); 

//flash
app.use(flash());

//Global Variables
app.use((req, res, next) => {
    res.locals.success_msg = req.flash("success_msg");
    res.locals.error_msg = req.flash("error_msg");
    res.locals.error = req.flash("error");
    next();
});


//Routes
app.use('/', require("./routes/index.js"));
app.use('/users', require("./routes/users.js"));










app.listen(PORT, console.log(`Server started on port ${PORT}`));


process.on('SIGINT', () => {
    client.close();
    console.log('Disconnected from MongoDB');
    process.exit(0);
});