const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser')
const app = express();
const port = 6789;
const fs = require('fs');
const cookieParser = require('cookie-parser');
const mysql = require('mysql');

// directorul 'views' va conține fișierele .ejs (html + js executat la server)
app.set('view engine', 'ejs');
// suport pentru layout-uri - implicit fișierul care reprezintă template-ul site-ului este views/layout.ejs
app.use(expressLayouts);
// directorul 'public' va conține toate resursele accesibile direct de către client(e.g., fișiere css, javascript, imagini)
app.use(express.static('public'))
// corpul mesajului poate fi interpretat ca json; datele de la formular se găsesc în format json în req.body
app.use(bodyParser.json());
// utilizarea unui algoritm de deep parsing care suportă obiecte în obiecte
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(cookieParser());
const session = require('express-session');
app.use(session({
    secret: 'secret-key',
    resave: true,
    saveUninitialized: false
}));
// proprietățile obiectului Request - req - https://expressjs.com/en/api.html#req
// proprietățile obiectului Response - res - https://expressjs.com/en/api.html#res
app.get('/', (req, res) => {
    const utilizator = req.cookies.utilizator;
    // Configurarea conexiunii la baza de date
const connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'rares',
  password : 'rares',
  database : 'BazaProduse'
});
connection.query('SELECT * FROM produse', function(err, rows, fields) {
  if (err) throw err;
  res.clearCookie('mesajEroare');
    res.render('index', {
        utilizator: utilizator,
        layout: 'layout',
        produse: rows
    });
});
});
app.get('/favicon.ico', (req, res) => res.send('Hello World'));
// la accesarea din browser adresei http://localhost:6789/chestionar se va apela funcția specificată
app.get('/chestionar', (req, res) => {
    const utilizator = req.cookies.utilizator;
    // în fișierul views/chestionar.ejs este accesibilă variabila 'intrebari' care conține vectorul de întrebări
    fs.readFile('./intrebari.json', (err, data) => {
        if (err) throw err;
        var listaIntrebari = JSON.parse(data);
        res.render('chestionar', {
            utilizator: utilizator,
            intrebari: listaIntrebari,
            layout: 'layout'
        });
    });
});

app.post('/rezultat-chestionar', (req, res) => {
    const utilizator = req.cookies.utilizator;
    let numarRaspunsuriCorecte = 0;
    console.log(req.body);
    fs.readFile('./intrebari.json', (err, data) => {
        if (err) throw err;
        var listaIntrebari = JSON.parse(data);
        for (const indexIntrebare in req.body) {
            const raspunsIntrebare = req.body[indexIntrebare];
            const intrebare = listaIntrebari[indexIntrebare.substring(7)];
            if (intrebare.variante[intrebare.corect] === raspunsIntrebare) {
                numarRaspunsuriCorecte++;
            }
        }
        const rezultat = `Ai răspuns corect la ${numarRaspunsuriCorecte} din 7 întrebări.`;
        res.render('rezultat-chestionar', {
            utilizator: utilizator,
            rezultatC: rezultat,
            layout: 'layout'
        });
    });
});
app.get('/autentificare', function(req, res) {
    const utilizator = req.cookies.utilizator;
    res.render('autentificare', {
        utilizator: utilizator,
        mesajEroare: req.cookies.mesajEroare,
        layout: 'layout'
    });
});
app.post('/verificare-autentificare', function(req, res) {
    const utilizator = req.body.utilizator;
    const parola = req.body.parola;
    const utilizatori = JSON.parse(fs.readFileSync('./utilizatori.json'));
    console.log(req.body);
    // Parcurgem lista de utilizatori pentru a căuta o combinație validă de utilizator și parolă
    let utilizatorValid = false;
    for (const u of utilizatori) {
        if (u.utilizator === utilizator && u.parola === parola) {
            utilizatorValid = true;
            // Setăm cookie-ul pentru utilizator
            req.session.utilizator = utilizator;
            req.session.nume = u.nume;
            req.session.prenume = u.prenume;
            req.session.varsta = u.varsta;
            break;
        }
    }
    if (utilizatorValid) {
        res.cookie('utilizator', utilizator, { maxAge: 7 * 24 * 60 * 60 * 1000 });
        res.clearCookie('mesajEroare');
        res.redirect('/');
        console.log(req.session.nume)
    } else {
        res.cookie('mesajEroare', 'Nume de utilizator sau parolă incorecte. Vă rugăm să încercați din nou!');
        res.redirect('/autentificare');
    }
});
app.post('/logout', function(req, res) {
    req.session.destroy(function(err) {
        res.clearCookie('utilizator');
        res.clearCookie('mesajEroare');
        res.redirect('/');
    });
});
app.get('/creare-bd', function(req, res) {
    
// Configurarea conexiunii la baza de date
const connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'rares',
    password : 'rares',
    database : 'BazaProduse'
  });
  
  // Conectarea la baza de date
  connection.connect(function(err) {
    if (err) {
      console.error('Eroare la conectarea la baza de date: ' + err.stack);
      return;
    }
    console.log('Conexiunea la baza de date a fost realizată cu succes.');
  });
  
  // Crearea bazei de date si tabelului "produse"
  connection.query('CREATE DATABASE IF NOT EXISTS BazaProduse', function(err, result) {
    if (err) throw err;
    console.log('Baza de date a fost creată cu succes.');
  
    const sql = "CREATE TABLE IF NOT EXISTS produse (id INT AUTO_INCREMENT PRIMARY KEY, nume VARCHAR(255), descriere VARCHAR(255), pret DECIMAL(10, 2))";
    connection.query(sql, function (err, result) {
      if (err) throw err;
      console.log("Tabelul 'produse' a fost creat cu succes.");
      // Închiderea conexiunii la baza de date
      connection.end();
      res.redirect('/');
    });
  });
    
});
app.get('/inserare-bd', function(req, res) {
    const connection = mysql.createConnection({
      host: 'localhost',
      user: 'rares',
      password: 'rares',
      database: 'BazaProduse'
    });
  
    connection.connect(function(err) {
      if (err) {
        console.error('Eroare la conectare:', err);
        throw err;
      }
      console.log('Conexiune la baza de date MySQL reusita!');
  
      const query = `INSERT INTO produse (nume, descriere, pret) VALUES 
                      ('Samsung Galaxy A04s', '32GB, 3GB RAM, 4G, Black', 600.00),
                      ('Motorola Moto g73', 'Dual SIM, 8GB RAM, 256GB, 5G, Midnight Blue', 1300.00),
                      ('Samsung Galaxy A14', 'Dual SIM, 4GB RAM, 64GB, 4G, Black', 800.00),
                      ('Samsung Galaxy A54', 'Dual SIM, 8GB RAM, 128GB, 5G, Black', 1880.00),
                      ('Motorola Edge 20 Lite', '28GB, 8GB RAM, 5G, Electric Graphite', 1000.00),
                      ('Apple iPhone 14 Pro', '128GB, 5G, Space Black', 5350.00),
                      ('Apple iPhone 14 Pro Max', '128GB, 5G, Space Black', 6000.00),
                      ('Samsung Galaxy S23 Ultra', 'Dual SIM, 512GB, 12GB RAM, 5G, Phantom Black', 6000.00),
                      ('Samsung Galaxy A34', 'Dual SIM, 6GB RAM, 128GB, 5G, Black', 1510.00),
                      ('Apple iPhone 11', '64GB, Black', 2270.00)`;
  
      connection.query(query, function (err, result) {
        if (err) {
          console.error('Eroare la inserare:', err);
          throw err;
        }
        console.log('Inserare cu succes!');
  
        // Închide conexiunea la baza de date
        connection.end();
  
        res.redirect('/');
      });
    });
  });
  app.post('/adaugare_cos', function(req, res) {
    const produsId = req.body.id; // id-ul produsului primit prin POST
    req.session.cos = req.session.cos || []; // inițializăm vectorul de cos, dacă nu există deja
    
    // Verificăm dacă produsul se află deja în coș
    const produsExistent = req.session.cos.find(function(produs) {
      return produs.id === produsId;
    });
    
    if (produsExistent) {
      // Actualizăm cantitatea produsului existent
      produsExistent.cantitate++;
    } else {
      // Adăugăm un nou produs în coș
      req.session.cos.push({ id: produsId, cantitate: 1 });
    }
    
    console.log(req.session.cos);
    res.redirect('/'); // redirecționăm utilizatorul înapoi la pagina principală
  });
  
  app.get('/vizualizare-cos', function(req, res) {
    const utilizator = req.cookies.utilizator;
    var cos = req.session.cos || [];
  
    if (cos.length > 0) {
      const connection = mysql.createConnection({
        host: 'localhost',
        user: 'rares',
        password: 'rares',
        database: 'BazaProduse'
      });
  
      var placeholders = cos.map(function(produs) { return '?'; }).join(',');
      var values = cos.map(function(produs) { return produs.id; });
      var sql = 'SELECT * FROM produse WHERE id IN (' + placeholders + ')';
  
      connection.query(sql, values, function(err, result) {
        if (err) throw err;
  
        // Combinați rezultatul interogării cu cantitățile din coș
        var produseCos = result.map(function(produs) {
          var produsCos = cos.find(function(item) {
            return item.id == produs.id;
          });
  
          produs.cantitate = produsCos ? produsCos.cantitate : 0;
          return produs;
        });
  
        res.render('vizualizare-cos', { utilizator: utilizator, layout: 'layout', produse: produseCos });
        connection.end(); // Închideți conexiunea la baza de date după utilizare
      });
    } else {
      res.render('vizualizare-cos', { utilizator: utilizator, layout: 'layout', produse: [] });
    }
  });
  
  

app.listen(port, () => console.log(`Serverul rulează la adresa http://localhost:` + port));