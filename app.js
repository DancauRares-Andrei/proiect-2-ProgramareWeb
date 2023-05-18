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
// Mapare pentru a urmări numărul de încercări de acces la resurse inexistente
const accessAttempts = new Map();
const blockDuration = 10 * 1000; // Durata de blocare în milisecunde (aici setată la 10 de secunde)
// Middleware pentru urmărirea accesului la resurse inexistente
app.use((req, res, next) => {
    // Obținem IP-ul utilizatorului
    const ip = req.ip;

    // Verificăm dacă utilizatorul/IP-ul are un număr prea mare de încercări nereușite repetate
    if (accessAttempts.has(ip) && accessAttempts.get(ip) >= 5) {
        // Verificăm dacă blocarea a expirat
        const blockTime = accessAttempts.get(ip + '-blockTime');
        if (blockTime && Date.now() < blockTime + blockDuration) {
            // Utilizatorul/IP-ul este încă blocat, returnăm un răspuns cu statusul 403
            return res.status(403).send('Acces blocat temporar.');
        } else {
            // Blocarea a expirat, eliminăm utilizatorul/IP-ul din lista de blocări
            accessAttempts.delete(ip);
            accessAttempts.delete(ip + '-blockTime');
        }
    }

    next();
});
app.use(session({
    secret: 'secret-key',
    resave: true,
    saveUninitialized: false
}));
// proprietățile obiectului Request - req - https://expressjs.com/en/api.html#req
// proprietățile obiectului Response - res - https://expressjs.com/en/api.html#res
app.get('/', (req, res) => {
    const utilizator = req.session.utilizator ;
    // Configurarea conexiunii la baza de date
    const connection = mysql.createConnection({
        host: 'localhost',
        user: 'rares',
        password: 'rares',
        database: 'cumparaturi'
    });
    connection.query('SELECT * FROM produse', function(err, rows, fields) {
        if (err) {}
        res.clearCookie('mesajEroare');
        res.render('index', {
            utilizator: utilizator,
            tip: req.session.tip,
            layout: 'layout',
            produse: rows
        });
    });
});
app.get('/favicon.ico', (req, res) => res.send('Hello World'));
// la accesarea din browser adresei http://localhost:6789/chestionar se va apela funcția specificată
app.get('/chestionar', (req, res) => {
    const utilizator = req.session.utilizator;
    // în fișierul views/chestionar.ejs este accesibilă variabila 'intrebari' care conține vectorul de întrebări
    fs.readFile('./intrebari.json', (err, data) => {
        if (err) throw err;
        var listaIntrebari = JSON.parse(data);
        res.render('chestionar', {
            utilizator: utilizator,
            intrebari: listaIntrebari,
            tip: req.session.tip,
            layout: 'layout'
        });
    });
});

app.post('/rezultat-chestionar', (req, res) => {
    const utilizator = req.session.utilizator ;
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
            tip: req.session.tip,
            layout: 'layout'
        });
    });
});

// Mapare pentru a urmări numărul de încercări nereușite în intervalele scurt și lung
const failedLoginAttemptsShortInterval = new Map();
const failedLoginAttemptsLongInterval = new Map();
const maxFailedAttemptsShortInterval = 3; // Numărul maxim de încercări nereușite în intervalul scurt
const maxFailedAttemptsLongInterval = 5; // Numărul maxim de încercări nereușite în intervalul lung

// Middleware pentru verificarea accesului și blocarea temporară la autentificare și pagina "/autentificare"
const blockAccessMiddleware = (req, res, next) => {
    const ip = req.ip;

    // Verificăm numărul de încercări nereușite în intervalul scurt și lung
    if (
        (failedLoginAttemptsShortInterval.has(ip) && failedLoginAttemptsShortInterval.get(ip) >= maxFailedAttemptsShortInterval) ||
        (failedLoginAttemptsLongInterval.has(ip) && failedLoginAttemptsLongInterval.get(ip) >= maxFailedAttemptsLongInterval)
    ) {
        // Verificăm dacă utilizatorul/IP-ul este încă blocat într-unul dintre intervale
        const blockTimeShortInterval = failedLoginAttemptsShortInterval.get(ip + '-startTime');
        const blockTimeLongInterval = failedLoginAttemptsLongInterval.get(ip + '-startTime');

        if (
            (blockTimeShortInterval && Date.now() < blockTimeShortInterval + blockDuration) ||
            (blockTimeLongInterval && Date.now() < blockTimeLongInterval + blockDuration)
        ) {
            // Utilizatorul/IP-ul este încă blocat, returnăm un mesaj de eroare
            return res.status(403).send('Acces blocat temporar. Încercați din nou mai târziu.');
        } else {
            // Blocarea a expirat, resetăm numărul de încercări nereușite și timpul de blocare
            failedLoginAttemptsShortInterval.delete(ip);
            failedLoginAttemptsShortInterval.delete(ip + '-startTime');
            failedLoginAttemptsLongInterval.delete(ip);
            failedLoginAttemptsLongInterval.delete(ip + '-startTime');
        }
    }

    next();
};
// Middleware-ul este aplicat atât pentru ruta "/verificare-autentificare" cât și pentru "/autentificare"
app.post('/verificare-autentificare', blockAccessMiddleware);
app.get('/autentificare', blockAccessMiddleware);
app.get('/autentificare', function(req, res) {
    const utilizator = req.session.utilizator ;
    res.render('autentificare', {
        utilizator: utilizator,
        mesajEroare: req.cookies.mesajEroare,
        tip: req.session.tip,
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
            //res.cookie('tip', u.tip);
            req.session.tip=u.tip;
            console.log(u.tip);
            break;
        }
    }
    if (utilizatorValid) {
        res.cookie('utilizator', utilizator, {
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        res.clearCookie('mesajEroare');
        res.redirect('/');
        //console.log(req.session.nume);
    } else {
        res.cookie('mesajEroare', 'Nume de utilizator sau parolă incorecte. Vă rugăm să încercați din nou!');
        // Dacă autentificarea eșuează, înregistrăm încercarea nereușită pentru IP-ul utilizatorului
        const ip = req.ip;

        // Verificăm în ce interval de timp se încadrează încercarea nereușită și actualizăm mapările corespunzătoare
        const currentTime = Date.now();
        const shortIntervalStartTime = currentTime - (10 * 60 * 1000); // Interval scurt de 10 minute
        const longIntervalStartTime = currentTime - (60 * 60 * 1000); // Interval lung de 1 oră

        if (!failedLoginAttemptsShortInterval.has(ip)) {
            // Înregistrăm timpul de început al intervalului scurt pentru IP-ul utilizatorului
            failedLoginAttemptsShortInterval.set(ip, 0);
            failedLoginAttemptsShortInterval.set(ip + '-startTime', currentTime);
        }

        if (!failedLoginAttemptsLongInterval.has(ip)) {
            // Înregistrăm timpul de început al intervalului lung pentru IP-ul utilizatorului
            failedLoginAttemptsLongInterval.set(ip, 0);
            failedLoginAttemptsLongInterval.set(ip + '-startTime', currentTime);
        }

        if (failedLoginAttemptsShortInterval.get(ip + '-startTime') < shortIntervalStartTime) {
            // Resetăm numărul de încercări nereușite în intervalul scurt
            failedLoginAttemptsShortInterval.set(ip, 1);
            failedLoginAttemptsShortInterval.set(ip + '-startTime', currentTime);
        } else {
            // Incrementăm numărul de încercări nereușite în intervalul scurt
            failedLoginAttemptsShortInterval.set(ip, failedLoginAttemptsShortInterval.get(ip) + 1);
        }

        if (failedLoginAttemptsLongInterval.get(ip + '-startTime') < longIntervalStartTime) {
            // Resetăm numărul de încercări nereușite în intervalul lung
            failedLoginAttemptsLongInterval.set(ip, 1);
            failedLoginAttemptsLongInterval.set(ip + '-startTime', currentTime);
        } else {
            // Incrementăm numărul de încercări nereușite în intervalul lung
            failedLoginAttemptsLongInterval.set(ip, failedLoginAttemptsLongInterval.get(ip) + 1);
        }
        res.redirect('/autentificare');
    }
});
app.post('/logout', function(req, res) {
    req.session.destroy(function(err) {
        res.clearCookie('utilizator');
        res.clearCookie('mesajEroare');
        //res.clearCookie('tip');
        res.redirect('/');
    });
});
app.get('/creare-bd', function(req, res) {

    // Configurarea conexiunii la baza de date
    const connection = mysql.createConnection({
        host: 'localhost',
        user: 'rares',
        password: 'rares',
        database: 'cumparaturi'
    });

    // Conectarea la baza de date
    connection.connect(function(err) {
        if (err) {
            console.error('Eroare la conectarea la baza de date: ' + err.stack);
            return;
        }
        console.log('Conexiunea la baza de date a fost realizată cu succes.');
    });

    const sql = "CREATE TABLE IF NOT EXISTS produse (id INT AUTO_INCREMENT PRIMARY KEY, nume VARCHAR(255), descriere VARCHAR(255), pret DECIMAL(10, 2))";
    connection.query(sql, function(err, result) {
        if (err) throw err;
        console.log("Tabelul 'produse' a fost creat cu succes.");
        // Închiderea conexiunii la baza de date
        connection.end();
        res.redirect('/');
    });

});
app.get('/inserare-bd', function(req, res) {
    const connection = mysql.createConnection({
        host: 'localhost',
        user: 'rares',
        password: 'rares',
        database: 'cumparaturi'
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

        connection.query(query, function(err, result) {
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
        req.session.cos.push({
            id: produsId,
            cantitate: 1
        });
    }

    console.log(req.session.cos);
    res.redirect('/'); // redirecționăm utilizatorul înapoi la pagina principală
});

app.get('/vizualizare-cos', function(req, res) {
    const utilizator = req.session.utilizator ;
    var cos = req.session.cos || [];

    if (cos.length > 0) {
        const connection = mysql.createConnection({
            host: 'localhost',
            user: 'rares',
            password: 'rares',
            database: 'cumparaturi'
        });

        var placeholders = cos.map(function(produs) {
            return '?';
        }).join(',');
        var values = cos.map(function(produs) {
            return produs.id;
        });
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

            res.render('vizualizare-cos', {
                utilizator: utilizator,
                tip: req.session.tip,
                layout: 'layout',
                produse: produseCos
            });
            connection.end(); // Închideți conexiunea la baza de date după utilizare
        });
    } else {
        res.render('vizualizare-cos', {
            utilizator: utilizator,
            tip: req.session.tip,
            layout: 'layout',
            produse: []
        });
    }
});

// Ruta pentru pagina /admin
app.get('/admin', (req, res) => {
    // Verificăm dacă există cookie-ul "admin" și are valoarea "true"
    if (req.session.tip=== 'ADMIN') {
        res.render('admin', {
            tip: req.session.tip,
            layout: 'layout'
        });
    } else {
        res.status(403).send('Acces interzis!');
    }
});
// Ruta pentru inserarea unui produs în baza de date
app.post('/adauga-produs', (req, res) => {
    // Extragem valorile din corpul cererii (request body)
    const nume = req.body.nume;
    const descriere = req.body.descriere;
    const pret = req.body.pret;

    // Aici poți adăuga codul pentru inserarea produsului în baza de date
    const connection = mysql.createConnection({
        host: 'localhost',
        user: 'rares',
        password: 'rares',
        database: 'cumparaturi'
    });
    if (nume && descriere && pret) {
        // Construim interogarea SQL pentru inserarea în baza de date, folosind parametrii
        const query = `INSERT INTO produse (nume, descriere, pret) VALUES (?, ?, ?)`;
        connection.query(query, [nume, descriere, pret], function(err, result) {
            if (err) {
                console.error('Eroare la inserare:', err);
                res.status(500).send('A apărut o eroare în timpul adăugării produsului.');
            } else {
                console.log('Inserare cu succes!');

                // Închide conexiunea la baza de date
                connection.end();

                res.redirect('/');
            }
        });
    } else {
        res.status(400).send('Parametrii incorecți pentru adăugarea produsului!');
    }
});
// Ruta pentru resurse inexistente
app.all('*',(req, res) => {
    // Incrementăm numărul de încercări nereușite repetate pentru utilizatorul/IP-ul curent
    const ip = req.ip;
    accessAttempts.set(ip, (accessAttempts.get(ip) || 0) + 1);

    // Setăm timpul de expirare pentru blocare
    accessAttempts.set(ip + '-blockTime', Date.now());

    res.status(404).send('Pagina nu a fost găsită.');
});
app.listen(port, () => console.log(`Serverul rulează la adresa http://localhost:` + port));