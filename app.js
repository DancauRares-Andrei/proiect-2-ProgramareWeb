const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser')
const app = express();
const port = 6789;
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
// la accesarea din browser adresei http://localhost:6789/ se va returna textul 'HelloWorld'
// proprietățile obiectului Request - req - https://expressjs.com/en/api.html#req
// proprietățile obiectului Response - res - https://expressjs.com/en/api.html#res
app.get('/', (req, res) => res.send('Hello World'));
// la accesarea din browser adresei http://localhost:6789/chestionar se va apela funcția specificată
app.get('/chestionar', (req, res) => {
    const listaIntrebari = [
  {
    intrebare: 'Ce companie a lansat primul smartphone cu ecran tactil?',
    variante: ['Apple', 'Samsung', 'Nokia', 'BlackBerry'],
    corect: 0
  },
  {
    intrebare: 'Care este cel mai bine vândut model de telefon din lume?',
    variante: ['iPhone', 'Samsung Galaxy', 'Nokia 1100', 'Motorola RAZR V3'],
    corect: 2
  },
  {
    intrebare: 'Ce înseamnă abrevierea "LTE" când vine vorba de tehnologie mobilă?',
    variante: ['Long-Term Evolution', 'Lightweight Terminal Emulator', 'Low-Temperature Electrodeposition', 'Liquid Tension Experiment'],
    corect: 0
  },
  {
    intrebare: 'Ce înseamnă abrevierea "GB" când vine vorba de spațiu de stocare?',
    variante: ['Gigabyte', 'Great Britain', 'Gummi Bears', 'Global Biodiversity'],
    corect: 0
  },
  {
    intrebare: 'Ce model de telefon a fost primul care a inclus un jack audio de 3.5mm?',
    variante: ['iPhone', 'Samsung Galaxy', 'Nokia', 'Sony Ericsson'],
    corect: 3
  },
  {
    intrebare: 'Ce marcă de telefoane folosește sistemul de operare iOS?',
    variante: ['Samsung', 'Huawei', 'Apple', 'LG'],
    corect: 2
  },
  {
    intrebare: 'Ce companie a lansat primul telefon cu ecran pliabil?',
    variante: ['Samsung', 'Huawei', 'Motorola', 'Sony'],
    corect: 0
  }
];
    // în fișierul views/chestionar.ejs este accesibilă variabila 'intrebari' care conține vectorul de întrebări
    res.render('chestionar', {
        intrebari: listaIntrebari
    });
});
const raspunsuriCorecte = {
    raspuns0: "Apple",
    raspuns1: "Nokia 1100",
    raspuns2: "Long-Term Evolution",
    raspuns3: "Gigabyte",
   raspuns4: "Nokia",
    raspuns5: "Apple",
    raspuns6: "Samsung"
    };
app.post('/rezultat-chestionar', (req, res) => {
    let numarRaspunsuriCorecte = 0;
    console.log(req.body)
for (const indexIntrebare in req.body) {
if (req.body[indexIntrebare] === raspunsuriCorecte[indexIntrebare]) {
numarRaspunsuriCorecte++;
}
}

const rezultat = `Ai răspuns corect la ${numarRaspunsuriCorecte} din 7 întrebări.`;
res.render('rezultat-chestionar', {
    rezultatC: rezultat
});
});
app.listen(port, () => console.log(`Serverul rulează la adresa http://localhost:`+port));