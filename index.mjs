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

function requireLogin(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/');
    }
    next();
}

async function getCurrentUser(userId) {
    const sql = `
        SELECT id, username, display_name, profile_type, bio, about,
               profile_image_url, portfolio_image_1, portfolio_image_2, portfolio_image_3,
               location, contact_email
        FROM userGig
        WHERE id = ?
    `;
    const [rows] = await pool.query(sql, [userId]);
    return rows.length > 0 ? rows[0] : null;
}

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

app.get('/home', requireLogin, async (req, res) => {
    try {
        const user = await getCurrentUser(req.session.userId);

        res.render('home', {
            user
        });
    } catch (err) {
        console.error('Database error in /home:', err);
        res.status(500).send('Database error loading home page.');
    }
});

app.get('/findGig', requireLogin, async (req, res) => {
    let search = req.query.search || '';
    let category = req.query.category || '';
    let location = req.query.location || '';
    let urgency = req.query.urgency || '';
    let beginner = req.query.beginner || '';

    try {
        let sql = `
            SELECT g.id, g.title, g.description, g.category, g.looking_for, g.organization_name,
                   g.location, g.location_type, g.budget, g.budget_min, g.budget_max,
                   g.deadline, g.urgency, g.beginner_friendly, g.image_url, g.status,
                   g.user_id, u.display_name, u.profile_image_url
            FROM Gig g
            JOIN userGig u ON g.user_id = u.id
            WHERE g.status = 'Open'
        `;

        let sqlParams = [];

        if (search.trim() !== '') {
            sql += `
                AND (
                    g.title LIKE ?
                    OR g.description LIKE ?
                    OR g.category LIKE ?
                    OR g.looking_for LIKE ?
                    OR g.organization_name LIKE ?
                )
            `;
            let searchTerm = `%${search}%`;
            sqlParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
        }

        if (category.trim() !== '') {
            sql += ` AND g.category = ?`;
            sqlParams.push(category);
        }

        if (location.trim() !== '') {
            sql += ` AND g.location LIKE ?`;
            sqlParams.push(`%${location}%`);
        }

        if (urgency.trim() !== '') {
            sql += ` AND g.urgency = ?`;
            sqlParams.push(urgency);
        }

        if (beginner === '1') {
            sql += ` AND g.beginner_friendly = 1`;
        }

        sql += ` ORDER BY g.created_at DESC`;

        const [gigs] = await pool.query(sql, sqlParams);
        const user = await getCurrentUser(req.session.userId);

        res.render('findGig', {
            gigs,
            filters: {
                search,
                category,
                location,
                urgency,
                beginner
            },
            user
        });
    } catch (err) {
        console.error('Database error in /findGig:', err);
        res.status(500).send('Database error loading gigs.');
    }
});

app.get('/gigInfo/:id', requireLogin, async (req, res) => {
    let gigId = req.params.id;

    try {
        let sql = `
            SELECT g.id, g.title, g.description, g.category, g.looking_for, g.organization_name,
                   g.location, g.location_type, g.budget, g.budget_min, g.budget_max,
                   g.deadline, g.event_date, g.urgency, g.beginner_friendly, g.image_url,
                   g.contact_email, g.status, g.created_at, g.updated_at, g.user_id,
                   u.display_name, u.profile_type, u.profile_image_url, u.bio
            FROM Gig g
            JOIN userGig u ON g.user_id = u.id
            WHERE g.id = ?
        `;

        const [rows] = await pool.query(sql, [gigId]);

        if (rows.length === 0) {
            return res.status(404).render('404', {
                title: 'Gig Not Found',
                heading: 'Gig Not Found',
                description: 'That gig does not exist.'
            });
        }

        const gig = rows[0];

        const [savedRows] = await pool.query(
            `SELECT id FROM SavedGig WHERE user_id = ? AND gig_id = ?`,
            [req.session.userId, gigId]
        );

        const user = await getCurrentUser(req.session.userId);

        res.render('gigInfo', {
            gig,
            isSaved: savedRows.length > 0,
            isOwner: req.session.userId === gig.user_id,
            user
        });
    } catch (err) {
        console.error('Database error in /gigInfo/:id:', err);
        res.status(500).send('Database error loading gig details.');
    }
});

app.post('/saveGig/:id', requireLogin, async (req, res) => {
    let gigId = req.params.id;
    let userId = req.session.userId;

    try {
        const [existing] = await pool.query(
            `SELECT id FROM SavedGig WHERE user_id = ? AND gig_id = ?`,
            [userId, gigId]
        );

        if (existing.length === 0) {
            await pool.query(
                `INSERT INTO SavedGig (user_id, gig_id) VALUES (?, ?)`,
                [userId, gigId]
            );
        }

        res.redirect(`/gigInfo/${gigId}`);
    } catch (err) {
        console.error('Database error in /saveGig/:id:', err);
        res.status(500).send('Database error saving gig.');
    }
});

app.post('/unsaveGig/:id', requireLogin, async (req, res) => {
    let gigId = req.params.id;
    let userId = req.session.userId;

    try {
        await pool.query(
            `DELETE FROM SavedGig
             WHERE user_id = ? AND gig_id = ?`,
            [userId, gigId]
        );

        res.redirect(`/gigInfo/${gigId}`);
    } catch (err) {
        console.error('Database error in /unsaveGig/:id:', err);
        res.status(500).send('Database error unsaving gig.');
    }
});

app.get('/postGig', requireLogin, async (req, res) => {
    try {
        const user = await getCurrentUser(req.session.userId);

        res.render('postGig', {
            user
        });
    } catch (err) {
        console.error('Database error in GET /postGig:', err);
        res.status(500).send('Database error loading post gig page.');
    }
});

app.post('/postGig', requireLogin, async (req, res) => {
    const {
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
        contact_email
    } = req.body;

    try {
        const sql = `
            INSERT INTO Gig
            (
                user_id, title, description, category, looking_for, organization_name,
                location, location_type, budget, budget_min, budget_max,
                deadline, event_date, urgency, beginner_friendly, image_url,
                contact_email, status, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Open', NOW(), NOW())
        `;

        const sqlParams = [
            req.session.userId,
            title,
            description,
            category,
            looking_for,
            organization_name,
            location,
            location_type,
            budget,
            budget_min || null,
            budget_max || null,
            deadline || null,
            event_date || null,
            urgency,
            beginner_friendly ? 1 : 0,
            image_url,
            contact_email
        ];

        await pool.query(sql, sqlParams);

        res.redirect('/findGig');
    } catch (err) {
        console.error('Database error in POST /postGig:', err);
        res.status(500).send('Database error posting gig.');
    }
});

app.get('/updateGig/:id', requireLogin, async (req, res) => {
    let gigId = req.params.id;

    try {
        const [rows] = await pool.query(
            `SELECT *
             FROM Gig
             WHERE id = ? AND user_id = ?`,
            [gigId, req.session.userId]
        );

        if (rows.length === 0) {
            return res.status(403).send('You cannot edit this gig.');
        }

        const user = await getCurrentUser(req.session.userId);

        res.render('updateGig', {
            gig: rows[0],
            user
        });
    } catch (err) {
        console.error('Database error in GET /updateGig/:id:', err);
        res.status(500).send('Database error loading update gig page.');
    }
});

app.post('/updateGig/:id', requireLogin, async (req, res) => {
    let gigId = req.params.id;

    const {
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
        status
    } = req.body;

    try {
        const sql = `
            UPDATE Gig
            SET title = ?,
                description = ?,
                category = ?,
                looking_for = ?,
                organization_name = ?,
                location = ?,
                location_type = ?,
                budget = ?,
                budget_min = ?,
                budget_max = ?,
                deadline = ?,
                event_date = ?,
                urgency = ?,
                beginner_friendly = ?,
                image_url = ?,
                contact_email = ?,
                status = ?,
                updated_at = NOW()
            WHERE id = ? AND user_id = ?
        `;

        const sqlParams = [
            title,
            description,
            category,
            looking_for,
            organization_name,
            location,
            location_type,
            budget,
            budget_min || null,
            budget_max || null,
            deadline || null,
            event_date || null,
            urgency,
            beginner_friendly ? 1 : 0,
            image_url,
            contact_email,
            status,
            gigId,
            req.session.userId
        ];

        await pool.query(sql, sqlParams);

        res.redirect(`/gigInfo/${gigId}`);
    } catch (err) {
        console.error('Database error in POST /updateGig/:id:', err);
        res.status(500).send('Database error updating gig.');
    }
});

app.get('/profile', requireLogin, async (req, res) => {
    try {
        const [users] = await pool.query(
            `SELECT *
             FROM userGig
             WHERE id = ?`,
            [req.session.userId]
        );

        const [postedGigs] = await pool.query(
            `SELECT id, title, category, status, created_at
             FROM Gig
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [req.session.userId]
        );

        const [savedGigs] = await pool.query(
            `SELECT g.id, g.title, g.category, g.status, sg.created_at AS saved_at
             FROM SavedGig sg
             JOIN Gig g ON sg.gig_id = g.id
             WHERE sg.user_id = ?
             ORDER BY sg.created_at DESC`,
            [req.session.userId]
        );

        const [postedPitches] = await pool.query(
            `SELECT id,
                    title,
                    category_skills AS category,
                    status,
                    created_at
             FROM Pitch
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [req.session.userId]
        );

        const [savedPitches] = await pool.query(
            `SELECT p.id,
                    p.title,
                    p.category_skills AS category,
                    p.status,
                    sp.created_at AS saved_at
             FROM SavedPitch sp
             JOIN Pitch p ON sp.pitch_id = p.id
             WHERE sp.user_id = ?
             ORDER BY sp.created_at DESC`,
            [req.session.userId]
        );

        res.render('profile', {
            profileUser: users[0],
            postedGigs,
            savedGigs,
            postedPitches,
            savedPitches,
            isOwnProfile: true
        });
    } catch (err) {
        console.error('Database error in /profile:', err);
        res.status(500).send('Database error loading profile.');
    }
});

app.get('/profile/:id', requireLogin, async (req, res) => {
    try {
        const profileId = req.params.id;

        const [users] = await pool.query(
            `SELECT *
             FROM userGig
             WHERE id = ?`,
            [profileId]
        );

        if (users.length === 0) {
            return res.status(404).render('404', {
                title: 'Profile Not Found',
                heading: 'Profile Not Found',
                description: 'That profile does not exist.'
            });
        }

        const [postedGigs] = await pool.query(
            `SELECT id, title, category, status, created_at
             FROM Gig
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [profileId]
        );

        const [postedPitches] = await pool.query(
            `SELECT id,
                    title,
                    category_skills AS category,
                    status,
                    created_at
             FROM Pitch
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [profileId]
        );

        res.render('profile', {
            profileUser: users[0],
            postedGigs,
            savedGigs: [],
            postedPitches,
            savedPitches: [],
            isOwnProfile: Number(profileId) === req.session.userId
        });
    } catch (err) {
        console.error('Database error in /profile/:id:', err);
        res.status(500).send('Database error loading public profile.');
    }
});

app.get('/updateProfile', requireLogin, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT *
             FROM userGig
             WHERE id = ?`,
            [req.session.userId]
        );

        res.render('updateProfile', {
            profileUser: rows[0]
        });
    } catch (err) {
        console.error('Database error in GET /updateProfile:', err);
        res.status(500).send('Database error loading update profile page.');
    }
});

app.post('/updateProfile', requireLogin, async (req, res) => {
    const {
        display_name,
        profile_type,
        bio,
        about,
        profile_image_url,
        portfolio_image_1,
        portfolio_image_2,
        portfolio_image_3,
        location,
        contact_email
    } = req.body;

    try {
        const sql = `
            UPDATE userGig
            SET display_name = ?,
                profile_type = ?,
                bio = ?,
                about = ?,
                profile_image_url = ?,
                portfolio_image_1 = ?,
                portfolio_image_2 = ?,
                portfolio_image_3 = ?,
                location = ?,
                contact_email = ?
            WHERE id = ?
        `;

        await pool.query(sql, [
            display_name,
            profile_type,
            bio,
            about,
            profile_image_url,
            portfolio_image_1,
            portfolio_image_2,
            portfolio_image_3,
            location,
            contact_email,
            req.session.userId
        ]);

        res.redirect('/profile');
    } catch (err) {
        console.error('Database error in POST /updateProfile:', err);
        res.status(500).send('Database error updating profile.');
    }
});

app.get('/findPitch', requireLogin, async (req, res) => {
    let search = req.query.search || '';
    let category = req.query.category || '';
    let location = req.query.location || '';
    let beginner = req.query.beginner || '';

    try {
        let sql = `
            SELECT p.id,
                   p.title,
                   p.service_name AS name,
                   p.category_skills AS category,
                   p.bio,
                   p.portfolio,
                   p.location,
                   p.location_type,
                   p.rate_type,
                   p.rate_min,
                   p.rate_max,
                   p.availability,
                   p.beginner_friendly,
                   p.image_url,
                   p.contact_email,
                   p.status,
                   p.user_id,
                   u.display_name,
                   u.profile_image_url
            FROM Pitch p
            JOIN userGig u ON p.user_id = u.id
            WHERE p.status = 'Open'
        `;

        let sqlParams = [];

        if (search.trim() !== '') {
            sql += `
                AND (
                    p.title LIKE ?
                    OR p.service_name LIKE ?
                    OR p.category_skills LIKE ?
                    OR p.bio LIKE ?
                )
            `;
            let searchTerm = `%${search}%`;
            sqlParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        if (category.trim() !== '') {
            sql += ` AND p.category_skills = ?`;
            sqlParams.push(category);
        }

        if (location.trim() !== '') {
            sql += ` AND p.location LIKE ?`;
            sqlParams.push(`%${location}%`);
        }

        if (beginner === '1') {
            sql += ` AND p.beginner_friendly = 1`;
        }

        sql += ` ORDER BY p.created_at DESC`;

        const [pitches] = await pool.query(sql, sqlParams);
        const user = await getCurrentUser(req.session.userId);

        res.render('findPitch', {
            pitches,
            filters: {
                search,
                category,
                location,
                beginner
            },
            user
        });
    } catch (err) {
        console.error('Database error in /findPitch:', err);
        res.status(500).send('Database error loading pitches.');
    }
});

app.get('/pitchInfo/:id', requireLogin, async (req, res) => {
    let pitchId = req.params.id;

    try {
        let sql = `
            SELECT p.id,
                   p.title,
                   p.service_name AS name,
                   p.category_skills AS category,
                   p.bio,
                   p.portfolio,
                   p.location,
                   p.location_type,
                   p.rate_type,
                   p.rate_min,
                   p.rate_max,
                   p.availability,
                   p.beginner_friendly,
                   p.image_url,
                   p.contact_email,
                   p.status,
                   p.created_at,
                   p.updated_at,
                   p.user_id,
                   u.display_name,
                   u.profile_type,
                   u.profile_image_url
            FROM Pitch p
            JOIN userGig u ON p.user_id = u.id
            WHERE p.id = ?
        `;

        const [rows] = await pool.query(sql, [pitchId]);

        if (rows.length === 0) {
            return res.status(404).render('404', {
                title: 'Pitch Not Found',
                heading: 'Pitch Not Found',
                description: 'That pitch does not exist.'
            });
        }

        const pitch = rows[0];

        const [savedRows] = await pool.query(
            `SELECT id FROM SavedPitch WHERE user_id = ? AND pitch_id = ?`,
            [req.session.userId, pitchId]
        );

        const user = await getCurrentUser(req.session.userId);

        res.render('pitchInfo', {
            pitch,
            isSaved: savedRows.length > 0,
            isOwner: req.session.userId === pitch.user_id,
            user
        });
    } catch (err) {
        console.error('Database error in /pitchInfo/:id:', err);
        res.status(500).send('Database error loading pitch details.');
    }
});

app.post('/savePitch/:id', requireLogin, async (req, res) => {
    let pitchId = req.params.id;
    let userId = req.session.userId;

    try {
        const [existing] = await pool.query(
            `SELECT id FROM SavedPitch WHERE user_id = ? AND pitch_id = ?`,
            [userId, pitchId]
        );

        if (existing.length === 0) {
            await pool.query(
                `INSERT INTO SavedPitch (user_id, pitch_id) VALUES (?, ?)`,
                [userId, pitchId]
            );
        }

        res.redirect(`/pitchInfo/${pitchId}`);
    } catch (err) {
        console.error('Database error in /savePitch/:id:', err);
        res.status(500).send('Database error saving pitch.');
    }
});

app.post('/unsavePitch/:id', requireLogin, async (req, res) => {
    let pitchId = req.params.id;
    let userId = req.session.userId;

    try {
        await pool.query(
            `DELETE FROM SavedPitch
             WHERE user_id = ? AND pitch_id = ?`,
            [userId, pitchId]
        );

        res.redirect(`/pitchInfo/${pitchId}`);
    } catch (err) {
        console.error('Database error in /unsavePitch/:id:', err);
        res.status(500).send('Database error unsaving pitch.');
    }
});

app.get('/postPitch', requireLogin, async (req, res) => {
    try {
        const user = await getCurrentUser(req.session.userId);

        res.render('postPitch', {
            user
        });
    } catch (err) {
        console.error('Database error in GET /postPitch:', err);
        res.status(500).send('Database error loading post pitch page.');
    }
});

app.post('/postPitch', requireLogin, async (req, res) => {
    const {
        title,
        name,
        category,
        bio,
        portfolio,
        location,
        location_type,
        rate_type,
        rate_min,
        rate_max,
        availability,
        beginner_friendly,
        image_url,
        contact_email
    } = req.body;

    try {
        const sql = `
            INSERT INTO Pitch
            (
                user_id,
                title,
                service_name,
                category_skills,
                bio,
                portfolio,
                location,
                location_type,
                rate_type,
                rate_min,
                rate_max,
                availability,
                beginner_friendly,
                image_url,
                contact_email,
                status,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Open', NOW(), NOW())
        `;

        const sqlParams = [
            req.session.userId,
            title,
            name,
            category,
            bio,
            portfolio,
            location,
            location_type,
            rate_type,
            rate_min || null,
            rate_max || null,
            availability,
            beginner_friendly ? 1 : 0,
            image_url,
            contact_email
        ];

        await pool.query(sql, sqlParams);

        res.redirect('/findPitch');
    } catch (err) {
        console.error('Database error in POST /postPitch:', err);
        res.status(500).send('Database error posting pitch.');
    }
});

app.get('/updatePitch/:id', requireLogin, async (req, res) => {
    let pitchId = req.params.id;

    try {
        const [rows] = await pool.query(
            `SELECT id,
                    user_id,
                    title,
                    service_name AS name,
                    category_skills AS category,
                    bio,
                    portfolio,
                    location,
                    location_type,
                    rate_type,
                    rate_min,
                    rate_max,
                    availability,
                    beginner_friendly,
                    image_url,
                    contact_email,
                    status,
                    created_at,
                    updated_at
             FROM Pitch
             WHERE id = ? AND user_id = ?`,
            [pitchId, req.session.userId]
        );

        if (rows.length === 0) {
            return res.status(403).send('You cannot edit this pitch.');
        }

        const user = await getCurrentUser(req.session.userId);

        res.render('updatePitch', {
            pitch: rows[0],
            user
        });
    } catch (err) {
        console.error('Database error in GET /updatePitch/:id:', err);
        res.status(500).send('Database error loading update pitch page.');
    }
});

app.post('/updatePitch/:id', requireLogin, async (req, res) => {
    let pitchId = req.params.id;

    const {
        title,
        name,
        category,
        bio,
        portfolio,
        location,
        location_type,
        rate_type,
        rate_min,
        rate_max,
        availability,
        beginner_friendly,
        image_url,
        contact_email,
        status
    } = req.body;

    try {
        const sql = `
            UPDATE Pitch
            SET title = ?,
                service_name = ?,
                category_skills = ?,
                bio = ?,
                portfolio = ?,
                location = ?,
                location_type = ?,
                rate_type = ?,
                rate_min = ?,
                rate_max = ?,
                availability = ?,
                beginner_friendly = ?,
                image_url = ?,
                contact_email = ?,
                status = ?,
                updated_at = NOW()
            WHERE id = ? AND user_id = ?
        `;

        const sqlParams = [
            title,
            name,
            category,
            bio,
            portfolio,
            location,
            location_type,
            rate_type,
            rate_min || null,
            rate_max || null,
            availability,
            beginner_friendly ? 1 : 0,
            image_url,
            contact_email,
            status,
            pitchId,
            req.session.userId
        ];

        await pool.query(sql, sqlParams);

        res.redirect(`/pitchInfo/${pitchId}`);
    } catch (err) {
        console.error('Database error in POST /updatePitch/:id:', err);
        res.status(500).send('Database error updating pitch.');
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