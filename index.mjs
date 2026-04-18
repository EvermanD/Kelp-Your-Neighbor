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
    res.render('postGig.ejs');
});

app.post('/postGig', async (req, res) => {
    let title = req.body.title;
    let description = req.body.description;
    let category = req.body.category;
    let looking_for = req.body.looking_for;
    let organization_name = req.body.organization_name;
    let location = req.body.location;
    let location_type = req.body.location_type;
    let budget = req.body.budget;
    let budget_min = req.body.budget_min;
    let budget_max = req.body.budget_max;
    let deadline = req.body.deadline;
    let event_date = req.body.event_date;
    let urgency = req.body.urgency;
    let beginner_friendly = req.body.beginner_friendly ? 1 : 0;
    let image_url = req.body.image_url;
    let contact_email = req.body.contact_email;
    let status = req.body.status;

    let user_id = 1; // temporary for now until login/session is connected

    try {
        if (title == "") {
            return res.json({ error: "Error: title cannot be blank" });
        }

        if (description == "") {
            return res.json({ error: "Error: description cannot be blank" });
        }

        let sql = `
            INSERT INTO Gig (
                title,
                description,
                category,
                looking_for,
                organization_name,
                location,
                location_type,
                budget,
                budget_min,
                budget_max,
                deadline,
                event_date,
                urgency,
                beginner_friendly,
                image_url,
                contact_email,
                status,
                user_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        let sqlParams = [
            title,
            description,
            category,
            looking_for,
            organization_name,
            location,
            location_type,
            budget,
            budget_min,
            budget_max,
            deadline,
            event_date,
            urgency,
            beginner_friendly,
            image_url,
            contact_email,
            status,
            user_id
        ];

        await pool.promise().query(sql, sqlParams);

        res.send("Gig created successfully!");
    } catch (err) {
        console.error("Database error:", err);
        res.json({ error: "Error: database error" });
    }
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
