import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import * as mysql from "mysql2";

const app = express();

const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.urlencoded({extended:true}));

const pool = mysql.createPool({
    host: "k2pdcy98kpcsweia.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: "nm2pf20notjcum1m",
    connectionLimit: 10,
    waitForConnections: true
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
    res.render('index', {
        title: 'Home',
        heading: 'Welcome to the Gig App',
        description: 'This is the homepage skeleton.',
    });
});

app.get('/findGig', (req, res) => {
    res.render('findGig', {
        title: 'Find Gig',
        heading: 'Find Gig',
        description: 'This is the Find Gig page skeleton.',
    });
});

app.get('/postGig', (req, res) => {
    res.render('postGig', {
        title: 'Post Gig',
        heading: 'Post Gig',
        description: 'This is the Post Gig page skeleton.',
    });
});

app.get('/myGig', (req, res) => {
    res.render('myGig', {
        title: 'My Gig',
        heading: 'My Gig',
        description: 'This is the My Gig page skeleton.',
    });
});

app.get('/myPitches', (req, res) => {
    res.render('myPitches', {
        title: 'My Pitches',
        heading: 'My Pitches',
        description: 'This is the My Pitches page skeleton.',
    });
});

app.get('/profile', (req, res) => {
    res.render('profile', {
        title: 'Profile',
        heading: 'Profile',
        description: 'This is the Profile page skeleton.',
    });
});

app.get('/guide', (req, res) => {
    res.render('guide', {
        title: 'Guide',
        heading: 'Guide',
        description: 'This is the Guide page skeleton.',
    });
});

app.use((req, res) => {
    res.status(404).render('404', {
        title: 'Not Found',
        heading: '404',
        description: `No page exists for ${req.originalUrl}.`,
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
