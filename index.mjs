import express from 'express';
import path from 'path';
// import {fileURLToPath} from 'url';
import 'dotenv/config';
import mysql from 'mysql2/promise';
const session = (await import('express-session')).default;

const app = express();

const PORT = process.env.PORT || 3000;
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
// app.set('views', path.join(__dirname, 'views'));

app.use(session({
    secret: "neighborIBarelyKnowEr",
    resave: false,
    saveUninitialized: false
}));

const pool = mysql.createPool({
    host: "k2pdcy98kpcsweia.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: "nm2pf20notjcum1m",
    connectionLimit: 10,
    waitForConnections: true
});

app.get('/', (req, res) => {
    res.render('index', {});
});

app.get('/signup', (req, res) => {
    res.render('signup.ejs');
});

// Sign up logic
app.post('/signup', async (req, res) => {
    let username = req.body.username;
    let password = req.body.password;

    try {
        if (username === "") {
            return res.json({error: "Error: username cannot be blank"});
        }

        if (password === "") {
            return res.json({error: "Error: password cannot be blank"});
        }

        let sql = `SELECT username
                   FROM userGig
                   WHERE username = ?`;
        let sqlParams = [username];

        const [rows] = await pool.query(sql, sqlParams);

        if (rows.length > 0) {
            return res.json({error: "Error: username already exists"});
        }

        sql = `INSERT INTO userGig (username, password, is_admin)
               VALUES (?, ?, ?)`;
        sqlParams = [username, password, 0];

        await pool.query(sql, sqlParams);

        res.json({success: "Account created successfully!"});
    } catch (err) {
        console.error("Database error:", err);
        res.json({error: "Error: database error"});
    }
});

// Login logic
app.post('/login', async (req, res) => {
    let username = req.body.username;
    let password = req.body.password;

    try {
        if (username === "") {
            return res.json({error: "Error: username cannot be blank"});
        }

        if (password === "") {
            return res.json({error: "Error: password cannot be blank"});
        }

        let sql = `SELECT id, username, is_admin
                   FROM userGig
                   WHERE username = ?
                     AND password = ?`;
        let sqlParams = [username, password];

        const [rows] = await pool.query(sql, sqlParams);

        if (rows.length === 0) {
            return res.json({error: "Error: invalid username or password"});
        }

        console.log(rows[0]);
        req.session.userId = rows[0].id;
        req.session.username = rows[0].username;
        req.session.isAdmin = rows[0].is_admin;

        res.json({success: "Login successful!"});
    } catch (err) {
        console.error("Database error:", err);
        res.json({error: "Error: database error"});
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Logout error:", err);
            return res.status(500).send("Logout error!");
        }

        res.redirect('/');
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
