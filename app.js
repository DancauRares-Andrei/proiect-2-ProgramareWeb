const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser')
const app = express();
const port = 6789;
const fs = require('fs');
const cookieParser = require('cookie-parser');

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
    res.clearCookie('mesajEroare');
    res.render('index', {
        utilizator: utilizator,
        layout: 'layout'
    })
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

app.listen(port, () => console.log(`Serverul rulează la adresa http://localhost:` + port));