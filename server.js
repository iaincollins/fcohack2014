/**
 * TINATAPI - An API that provides information useful to travellers. For #FOCHACK
 * @author      me@iaincollins.com
 */

var express = require('express');
var partials = require('express-partials');
var ejs = require('ejs');
var mongoJs = require('mongojs');
var Q = require('q');
var dateFormat = require('dateformat');
var fs = require('fs');
var tinataCountries = require(__dirname + '/lib/tinata-countries');

GLOBAL.db = mongoJs.connect("127.0.0.1/tinatapi", ["countries"]);

// Initialise and configure Express and Express Partials
var app = express();
// Allows all JSON files (e.g. map GeoJSON) to be accessed from any domain
app.use(function(req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
});
app.use(express.static(__dirname + '/public'))
app.use(partials());
app.set('title', 'Tinata');
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.engine('ejs', ejs.__express);
partials.register('.ejs', ejs);

/**
 * The homepage
 */
app.get('/', function(req, res, next) {
    res.render('index');
});


/** 
 * The About page
 */
app.get('/about', function(req, res, next) {
    res.render('about');
});

/** 
 * The Maps page
 */
app.get('/maps', function(req, res, next) {
    res.render('maps');
});

/** 
 * Load individual maps
 */
app.get('/maps/:map', function(req, res, next) {
    var template = 'maps/'+req.params.map.replace( /[^A-z0-9_-]/ , '');
    fs.exists('./views/'+template+'.ejs', function(exists) {
      if (exists) {
        res.render(template);
      } else {
          res.status(404).render('page-not-found', { title: "Page not found" });
      }
    });
});

/** 
 * List all countries on an HTML page
 */
app.get('/countries(.html)?', function(req, res, next) {
    tinataCountries.getAllCountries()
    .then(function(countries) {
        res.render('countries', { countries: countries } );
    });
});

/** 
 * Return data for all countries in a JSON object
 */
app.get('/countries.json?', function(req, res, next) {
    tinataCountries.getAllCountries()
    .then(function(countries) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.send( JSON.stringify(countries) );
    });
});

/** 
 * List data for a specific country by 2 character ISO code
 */
app.get('/countries/:name', function(req, res, next) {
    var path = req.params.name.split('.');
    var countryIdentifier = path[0].replace(/_/g, ' ');
    
    // Default response is html. Returns JSON if .json file extention specified
    var responseFormat = 'html';
    if (path.length > 1)
        if (path[1] == 'json')
            responseFormat = 'json';

    tinataCountries.getCountry(countryIdentifier)
    .then(function(country) {
        if (country == false) {
            // If country not found, return 404
            res.status(404).render('page-not-found', { title: "Page not found" });
        } if (responseFormat == 'html') {
            // Return country information as an HTML page.
            // When returning HTML page identify known issues (missing data)
            // @todo Refactor, move knownIssues to function in class
            var knownIssues = [];
            res.render('country', { country: country, knownIssues: knownIssues, dateFormat: dateFormat } );
        } else if (responseFormat == 'json') {
            // Default (JSON)
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.send( JSON.stringify(country) );
        } else {
            // If file extention not supported, return 404
            res.status(404).render('page-not-found', { title: "Page not found" });
        }
    });
});

/** 
 * Return flag page for country (can be looked up by ISO code, name or an alias)
 */
app.get('/countries/:name/flag', function(req, res, next) {
    tinataCountries.getCountry(req.params.name)
    .then(function(country) {
        if (country == false) {
            // If country not found, return 404
            res.status(404).render('page-not-found', { title: "Page not found" });
        } else {
            res.render('flag', { country: country } );
        }
    });
});

/** 
 * Return flag for country (can be looked up by ISO code, name or an alias)
 */
app.get('/countries/:name/flag.svg', function(req, res, next) {
    tinataCountries.getCountry(req.params.name)
    .then(function(country) {
        if (country == false) {
            // If country not found, return 404
            res.status(404).render('page-not-found', { title: "Page not found" });
        } else {
            res.redirect('/img/flags/'+country.iso2.toLowerCase()+'.svg');
        }
    });
});


/** 
 * Return information about the status of the database (which data is avalible for what countries)
 */
app.get('/status', function(req, res, next) {
    db.countries.find({ '$query': {}, '$orderby': { name: 1 } }, function(err, countries) {
        res.render('status', { countries: countries } );
    });
});

/**
 * Handle all other requests as 404 / Page Not Found errors
 */
app.use(function(req, res, next) {
    res.status(404).render('page-not-found', { title: "Page not found" });
});

app.listen(3001);