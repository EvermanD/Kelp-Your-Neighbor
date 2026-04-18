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
app.use(express.urlencoded({ extended: true }));
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
            return res.json({ error: "Error: username cannot be blank" });
        }

        if (password === "") {
            return res.json({ error: "Error: password cannot be blank" });
        }

        let sql = `SELECT username
                   FROM userGig
                   WHERE username = ?`;
        let sqlParams = [username];

        const [rows] = await pool.query(sql, sqlParams);

        if (rows.length > 0) {
            return res.json({ error: "Error: username already exists" });
        }

        sql = `INSERT INTO userGig (username, password, is_admin)
               VALUES (?, ?, ?)`;
        sqlParams = [username, password, 0];

        await pool.query(sql, sqlParams);

        res.json({ success: "Account created successfully!" });
    } catch (err) {
        console.error("Database error:", err);
        res.json({ error: "Error: database error" });
    }
});

// Login logic
app.post('/login', async (req, res) => {
    let username = req.body.username;
    let password = req.body.password;

    try {
        if (username === "") {
            return res.json({ error: "Error: username cannot be blank" });
        }

        if (password === "") {
            return res.json({ error: "Error: password cannot be blank" });
        }

        let sql = `SELECT id, username, is_admin
                   FROM userGig
                   WHERE username = ?
                     AND password = ?`;
        let sqlParams = [username, password];

        const [rows] = await pool.query(sql, sqlParams);

        if (rows.length === 0) {
            return res.json({ error: "Error: invalid username or password" });
        }

        req.session.userId = rows[0].id;
        req.session.username = rows[0].username;
        req.session.isAdmin = rows[0].is_admin;

        res.json({ success: "Login successful!", redirect: "/home" });
    } catch (err) {
        console.error("Database error:", err);
        res.json({ error: "Error: database error" });
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

app.get('/home', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/');
    }

    res.render('home', {
        username: req.session.username
    });
});

app.get('/findGig', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/');
    }

    let search = req.query.search || '';
    let category = req.query.category || '';
    let location = req.query.location || '';
    let urgency = req.query.urgency || '';
    let beginner = req.query.beginner || '';

    try {
        let sql = `
            SELECT id, title, description, category, looking_for, organization_name,
                   location, location_type, budget, budget_min, budget_max,
                   deadline, urgency, beginner_friendly, image_url, status
            FROM Gig
            WHERE status = 'Open'
        `;

        let sqlParams = [];

        if (search.trim() !== '') {
            sql += `
                AND (
                    title LIKE ?
                    OR description LIKE ?
                    OR category LIKE ?
                    OR looking_for LIKE ?
                    OR organization_name LIKE ?
                )
            `;
            let searchTerm = `%${search}%`;
            sqlParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
        }

        if (category.trim() !== '') {
            sql += ` AND category = ?`;
            sqlParams.push(category);
        }

        if (location.trim() !== '') {
            sql += ` AND location LIKE ?`;
            sqlParams.push(`%${location}%`);
        }

        if (urgency.trim() !== '') {
            sql += ` AND urgency = ?`;
            sqlParams.push(urgency);
        }

        if (beginner === '1') {
            sql += ` AND beginner_friendly = 1`;
        }

        sql += ` ORDER BY created_at DESC`;

        const [gigs] = await pool.query(sql, sqlParams);

        res.render('findGig', {
            gigs,
            filters: {
                search,
                category,
                location,
                urgency,
                beginner
            }
        });
    } catch (err) {
        console.error('Database error in /findGig:', err);
        res.status(500).send('Database error loading gigs.');
    }
});

app.get('/gigInfo/:id', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/');
    }

    let gigId = req.params.id;

    try {
        let sql = `
            SELECT id, title, description, category, looking_for, organization_name,
                   location, location_type, budget, budget_min, budget_max,
                   deadline, event_date, urgency, beginner_friendly, image_url,
                   contact_email, status, created_at, updated_at
            FROM Gig
            WHERE id = ?
        `;
        let sqlParams = [gigId];

        const [rows] = await pool.query(sql, sqlParams);

        if (rows.length === 0) {
            return res.status(404).render('404', {
                title: 'Gig Not Found',
                heading: 'Gig Not Found',
                description: 'That gig does not exist.'
            });
        }

        res.render('gigInfo', {
            gig: rows[0]
        });
    } catch (err) {
        console.error('Database error in /gigInfo/:id:', err);
        res.status(500).send('Database error loading gig details.');
    }
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