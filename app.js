const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser')
const app = express();
const port = 6789;
const fs = require('fs');
//const listaIntrebari = JSON.parse(fs.readFileSync('./public/intrebari.json', 'utf-8'));
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
app.get('/favicon.ico', (req, res) => res.send('Hello World'));
// la accesarea din browser adresei http://localhost:6789/chestionar se va apela funcția specificată
app.get('/chestionar', (req, res) => {
    // în fișierul views/chestionar.ejs este accesibilă variabila 'intrebari' care conține vectorul de întrebări
    fs.readFile('./public/intrebari.json', (err, data) => {
      if (err) throw err;
      var listaIntrebari = JSON.parse(data);
      res.render('chestionar', {
        intrebari: listaIntrebari
    });
    });
});

app.post('/rezultat-chestionar', (req, res) => {
    let numarRaspunsuriCorecte = 0;
    console.log(req.body);
    fs.readFile('./public/intrebari.json', (err, data) => {
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
      res.render('rezultat-chestionar', { rezultatC: rezultat });
    });
    });
  
app.listen(port, () => console.log(`Serverul rulează la adresa http://localhost:`+port));