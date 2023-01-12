const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const mongoose = require('mongoose');
const passport = require('passport');
const flash = require('connect-flash');
const session = require('express-session');
const bodyParser = require("body-parser");
const { default: puppeteer } = require("puppeteer");


const app = express();
const MongoClient = require('mongodb').MongoClient;
let token = 10000;
app.use(bodyParser.urlencoded({ extended: false }));
const uri = "mongodb+srv://stickman:shreyansh@stickman.jtwgqqr.mongodb.net/?retryWrites=true&w=majority";




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
  
      db.collection('users').findOne({ name: name }, function (err, result) {
          if (err) {
              console.log(err);
          }
          // If a document with the same name already exists, return an error
          if (result) {
              res.send("Data Already Exists with the Same Name!");
          } else {
  
              // Insert the data into the database
              db.collection('users').insertOne({ name: name, number: num, date: date }, function (err, result) {
                  if (err) {
                      console.log(err);
                  }
                  console.log('Data added to the collection');
                  res.redirect('/success');
              });
          }
      });
  
  });
  
        //Using Puppeteer to Generate Name Filtered PDF=====================================

        app.post('/pdf/filtered', async (req, res) => {
          // Get the filter criteria from the query parameter
          const filter ={name: req.body.name};
      
          // Find the documents that match the filter criteria
          const collection = db.collection('users');
          const data = await collection.find(filter).toArray();
      
          // Generate the PDF as before
          const html = `
        <html>
            <body>
                <table>
                    <thead>
                        <tr>
                            
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(row => `
                            ${row.number.map((number,i) => `
                                <tr>
                                    ${i==0 ? `<td>${row.name}</td>` : `<td></td>`}
                                </tr>
                                <tr>
                                    <td>${number}</td>
                                </tr>
                            `).join('')}
                        `).join('')}
                    </tbody>
                </table>
            </body>
        </html>
    `;
          const browser = await puppeteer.launch({args: ['--no-sandbox']});
          const page = await browser.newPage();
          await page.setContent(html);
          const buffer = await page.pdf({ format: 'A4' });
          await browser.close();
      
          // Send the PDF to the client
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${req.body.name}-${new Date().toLocaleDateString()}.pdf"`);
  
          res.send(buffer);
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
        
      //   app.post('/pdf/date', async (req, res) => {
      //     let startDate = new Date(req.body.startDate);
      //     let endDate = new Date(req.body.endDate);
      //     startDate = startDate.toISOString();
      //     endDate = endDate.toISOString();
      //     // Get the filter criteria from the query parameters
      //     const filter = { 
      //       name: req.body.name, 
      //       date: { 
      //           $gte: new Date(req.body.startDate), 
      //           $lte: new Date(req.body.endDate) 
      //       }
      //   };
        
      
      //     // Find the documents that match the filter criteria
      //     const collection = db.collection('users');
      //     const data = await collection.find(filter).toArray();
      
      //     // Generate the PDF
      //     const html = `
      //         <html>
      //             <body>
      //                 <table>
      //                     <thead>
      //                         <tr>
                                  
      //                         </tr>
      //                     </thead>
      //                     <tbody>
      //                         ${data.map(row => `
      //                             ${row.number.map((number,i) => `
      //                                 <tr>
      //                                     ${i==0 ? `<td>${row.name}</td>` : `<td></td>`}
      //                                 </tr>
      //                                 <tr>
      //                                     <td>${number}</td>
      //                                 </tr>
      //                             `).join('')}
      //                         `).join('')}
      //                     </tbody>
      //                 </table>
      //             </body>
      //         </html>
      //     `;
      //     const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
      //     const page = await browser.newPage();
      //     await page.setContent(html);
      //     const buffer = await page.pdf({ format: 'A4' });
      //     await browser.close();
      
      //     // Send the PDF to the client
      //     res.setHeader('Content-Type', 'application/pdf');
      //     res.setHeader('Content-Disposition', `attachment; filename="${req.body.name}-${new Date().toLocaleDateString()}.pdf"`);
      //     res.send(buffer);
      // });
      

        


    

})







    app.get('/success', (req, res) => {
        res.sendFile(__dirname + '/success.html');
    });


    // app.get('/', (req, res) => {
    //     res.sendFile(__dirname + "/dashboard.ejs")
    // })








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