const express = require('express');
const fs = require('fs');
const path = require('path');
const hbs = require('hbs');
const MySQL = require('./utilsMySQL');

const app = express();
const port = 3000;

// Detectar si estem al Proxmox (si és pm2)
const isProxmox = !!process.env.PM2_HOME;

// Iniciar connexió MySQL
const db = new MySQL();
if (!isProxmox) {
  db.init({
    host: '127.0.0.1',
    port: 3306,
    user: 'developer',
    password: 'P@ssw0rd',
    database: 'sakila'
  });
} else {
  db.init({
    host: '127.0.0.1',
    port: 3306,
    user: 'developer',
    password: 'P@ssw0rd',
    database: 'sakila'
  });
}

// Static files - ONLY ONCE
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))

// Disable cache
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Handlebars
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// Registrar "Helpers .hbs" aquí
hbs.registerHelper('eq', (a, b) => a == b);
hbs.registerHelper('gt', (a, b) => a > b);

// Partials de Handlebars
hbs.registerPartials(path.join(__dirname, 'views', 'partials'));

// Route
app.get('/', async (req, res) => {
  try {
    // Obtenir les dades de la base de dades
    const moviesRows = await db.query(`
        SELECT 
            f.film_id, 
            f.title, 
            f.release_year
            GROUP_CONCAT(CONCAT(a.first_name, ' ', a.last_name) SEPARATOR ', ') AS actors
        FROM film f
        JOIN film_actor fa ON f.film_id = fa.film_id
        JOIN actor a ON fa.actor_id = a.actor_id
        GROUP BY f.film_id
        ORDER BY f.film_id ASC
        LIMIT 5

    `);
    const categorysRows = await db.query(`
        SELECT 
            category_id,
            name
        FROM category
        GROUP BY category_id
        ORDER BY category_id ASC
        LIMIT 5
    `);

    // Transformar les dades a JSON (per les plantilles .hbs)
    // Cal informar de les columnes i els seus tipus
    const moviesJson = db.table_to_json(moviesRows, {
        film_id: 'number', 
        title: 'string', 
        release_year: 'number', 
        actors: 'string'
    });
    const categorysJson = db.table_to_json(categorysRows, { 
        category_id: 'number', 
        name: 'string' 
    });

    // Llegir l'arxiu .json amb dades comunes per a totes les pàgines
    const commonData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'data', 'common.json'), 'utf8')
    );

    // Construir l'objecte de dades per a la plantilla
    const data = {
      movies: moviesJson,
      categorys: categorysJson,
      common: commonData
    };

    // Renderitzar la plantilla amb les dades
    res.render('index', data);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error consultant la base de dades');
  }
});

app.get('/movies', async (req, res) => {
  try {

    // Obtenir les dades de la base de dades
    const allMoviesRows = await db.query(`
      SELECT 
            f.film_id, 
            f.title,
            f.description,
            f.release_year,
            f.rating,
            f.length,
            l.name AS language
            GROUP_CONCAT(CONCAT(a.first_name, ' ', a.last_name) SEPARATOR ', ') AS actors
        FROM film f
        JOIN language l ON f.language_id = l.language_id
        JOIN film_actor fa ON f.film_id = fa.film_id
        JOIN actor a ON fa.actor_id = a.actor_id
        GROUP BY f.film_id
        ORDER BY f.film_id ASC
        LIMIT 15
    `);

    // Transformar les dades a JSON (per les plantilles .hbs)
    const allMoviesJson = db.table_to_json(allMoviesRows, {
      film_id: 'number', 
      title: 'string', 
      release_year: 'number',
      rating: 'string',
      length: 'number',
      language: 'string',
      actors: 'string'
    });

    // Llegir l'arxiu .json amb dades comunes per a totes les pàgines
    const commonData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'data', 'common.json'), 'utf8')
    );

    // Construir l'objecte de dades per a la plantilla
    const data = {
      allMovies: allMoviesJson,
      common: commonData
    };

    // Renderitzar la plantilla amb les dades
    res.render('movies', data);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error consultant la base de dades');
  }
});

app.get('/customers', async (req, res) => {
  try {

    // Obtenir les dades de la base de dades
    const customersRows = await db.query(`
      SELECT
        c.customer_id,
        c.first_name,
        c.last_name,
        c.email,
        GROUP_CONCAT(
          DISTINCT CONTACT(f.title, '(', DATE_FORMAT(r.rental_date, '%d/%m/%Y'), ')')
          ORDER BY r.rental_date DESC
          SEPARATOR '|'
        ) AS rental_data
      FROM customers c
      JOIN rental r ON c.customer_id = r.customer_id
      JOIN inventory i ON r.inventory_id = r.invontory_id
      JOIN film f ON i.film_id = f.film_id
      GROUP BY c.customer_id
      ORDER BY c.customer_id ASC
      LIMIT 25
    `);

    // Transformar les dades a JSON (per les plantilles .hbs)
    const customersJson = db.table_to_json(customersRows, {
      customer_id: 'number',
      first_name: 'string',
      last_name: 'string',
      email: 'string',
      rentals_date: 'string'
    });

    // Llegir l'arxiu .json amb dades comunes per a totes les pàgines
    const commonData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'data', 'common.json'), 'utf8')
    );

    // Construir l'objecte de dades per a la plantilla
    const data = {
      customers: customersJson,
      common: commonData
    };

    // Renderitzar la plantilla amb les dades
    res.render('customers', data);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error consultant la base de dades');
  }
});

// Start server
const httpServer = app.listen(port, () => {
  console.log(`http://localhost:${port}`);
  console.log(`http://localhost:${port}/movies`);
  console.log(`http://localhost:${port}/customers`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await db.end();
  httpServer.close();
  process.exit(0);
});