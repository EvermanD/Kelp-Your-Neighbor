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
    host: "jw0ch9vofhcajqg7.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: "u2d8f0jswasdnehx",
    connectionLimit: 5,
    waitForConnections: true
});

function requireLogin(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/');
    }
    next();
}

const MONTEREY_AREA_COORDINATES = {
    marina: {
        key: 'marina',
        label: 'Marina',
        lat: 36.6844,
        lng: -121.8022
    },
    monterey: {
        key: 'monterey',
        label: 'Monterey',
        lat: 36.6002,
        lng: -121.8947
    },
    seaside: {
        key: 'seaside',
        label: 'Seaside',
        lat: 36.6111,
        lng: -121.8516
    },
    salinas: {
        key: 'salinas',
        label: 'Salinas',
        lat: 36.6777,
        lng: -121.6555
    },
    pacific_grove: {
        key: 'pacific_grove',
        label: 'Pacific Grove',
        lat: 36.6177,
        lng: -121.9166
    },
    sand_city: {
        key: 'sand_city',
        label: 'Sand City',
        lat: 36.6170,
        lng: -121.8463
    },
    carmel: {
        key: 'carmel',
        label: 'Carmel',
        lat: 36.5552,
        lng: -121.9233
    },
    csumb: {
        key: 'csumb',
        label: 'CSUMB',
        lat: 36.6533,
        lng: -121.7989
    }
};

function normalizeLocationToArea(locationText = '') {
    const value = String(locationText).trim().toLowerCase();

    if (!value) return null;

    if (value.includes('csumb') || value.includes('campus') || value.includes('cal state monterey bay')) {
        return MONTEREY_AREA_COORDINATES.csumb;
    }

    if (value.includes('marina')) {
        return MONTEREY_AREA_COORDINATES.marina;
    }

    if (value.includes('monterey')) {
        return MONTEREY_AREA_COORDINATES.monterey;
    }

    if (value.includes('seaside')) {
        return MONTEREY_AREA_COORDINATES.seaside;
    }

    if (value.includes('salinas')) {
        return MONTEREY_AREA_COORDINATES.salinas;
    }

    if (value.includes('pacific grove')) {
        return MONTEREY_AREA_COORDINATES.pacific_grove;
    }

    if (value.includes('sand city')) {
        return MONTEREY_AREA_COORDINATES.sand_city;
    }

    if (value.includes('carmel')) {
        return MONTEREY_AREA_COORDINATES.carmel;
    }

    return null;
}

function groupMapRows(rows, type) {
    const grouped = {};

    for (const row of rows) {
        const area = normalizeLocationToArea(row.location);

        if (!area) {
            continue;
        }

        if (!grouped[area.key]) {
            grouped[area.key] = {
                areaKey: area.key,
                label: area.label,
                lat: area.lat,
                lng: area.lng,
                count: 0,
                type,
                filterLocation: area.label,
                items: []
            };
        }

        grouped[area.key].count += 1;
        grouped[area.key].items.push({
            id: row.id,
            title: row.title,
            location: row.location,
            category: row.category || '',
            url: type === 'gig' ? `/gigInfo/${row.id}` : `/pitchInfo/${row.id}`
        });
    }

    return Object.values(grouped).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function requireApiLogin(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Authentication required.' });
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

async function getVisibleProfileReviews(profileUserId) {
    const sql = `
        SELECT
            pr.id,
            pr.profile_user_id,
            pr.reviewer_user_id,
            pr.title,
            pr.comment,
            pr.created_at,
            u.display_name,
            u.username,
            u.profile_image_url
        FROM profile_reviews pr
        JOIN userGig u ON pr.reviewer_user_id = u.id
        WHERE pr.profile_user_id = ?
          AND pr.is_visible = 1
        ORDER BY pr.created_at DESC
    `;

    const [rows] = await pool.query(sql, [profileUserId]);
    return rows;
}

app.get('/', async (req, res) => {
    const featuredBusinesses = [
        {
            name: "Cypress Coast Coffee",
            city: "Monterey",
            type: "Sample coffee shop",
            imageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80"
        },
        {
            name: "Lighthouse Letterpress",
            city: "Pacific Grove",
            type: "Sample bookstore",
            imageUrl: "https://images.unsplash.com/photo-1526243741027-444d633d7365?auto=format&fit=crop&w=1200&q=80"
        },
        {
            name: "Marina Salt & Butter",
            city: "Marina",
            type: "Sample bakery",
            imageUrl: "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?auto=format&fit=crop&w=1200&q=80"
        },
        {
            name: "Sandbar Social Kitchen",
            city: "Seaside",
            type: "Sample restaurant",
            imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80"
        },
        {
            name: "Carmel Tide Gallery",
            city: "Carmel",
            type: "Sample art gallery",
            imageUrl: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1200&q=80"
        },
        {
            name: "Wharf & Bloom Boutique",
            city: "Monterey",
            type: "Sample boutique",
            imageUrl: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=80"
        },
        {
            name: "Ocean Porch Market",
            city: "Pacific Grove",
            type: "Sample neighborhood cafe",
            imageUrl: "https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=1200&q=80"
        }
    ];

    const communityPhotos = [
        {
            title: "Monterey Coastline",
            label: "Monterey",
            imageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80"
        },
        {
            title: "Pacific Grove Streets",
            label: "Pacific Grove",
            imageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80"
        },
        {
            title: "Marina Community Energy",
            label: "Marina",
            imageUrl: "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80"
        },
        {
            title: "Seaside Creative Spirit",
            label: "Seaside",
            imageUrl: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=80"
        },
        {
            title: "Carmel Inspiration",
            label: "Carmel",
            imageUrl: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80"
        },
        {
            title: "CSUMB Student Community",
            label: "CSUMB",
            imageUrl: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80"
        }
    ];

    const testimonials = [
        {
            quote: "Helped me find my first paid design opportunity with a local group.",
            name: "CSUMB student creative"
        },
        {
            quote: "A simple way to discover nearby talent without digging through giant freelance sites.",
            name: "Monterey small business owner"
        },
        {
            quote: "It feels built for real community collaboration, not just transactions.",
            name: "Local event organizer"
        }
    ];

    function shuffleArray(items) {
        const copy = [...items];
        for (let i = copy.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    try {
        const gigsSql = `
            SELECT g.id, g.title, g.description, g.category, g.looking_for, g.organization_name,
                   g.location, g.location_type, g.budget, g.budget_min, g.budget_max,
                   g.deadline, g.urgency, g.beginner_friendly, g.image_url, g.status,
                   g.user_id, u.display_name, u.profile_image_url
            FROM Gig g
            JOIN userGig u ON g.user_id = u.id
            WHERE g.status = 'Open'
            ORDER BY RAND()
            LIMIT 6
        `;

        const [gigs] = await pool.query(gigsSql);

        const [recentActivityRows] = await pool.query(`
            SELECT *
            FROM (
                SELECT
                    g.created_at,
                    CONCAT('New gig posted: ', g.title) AS text,
                    g.location AS meta
                FROM Gig g
                WHERE g.status = 'Open'

                UNION ALL

                SELECT
                    p.created_at,
                    CONCAT('New pitch posted: ', p.title) AS text,
                    p.location AS meta
                FROM Pitch p
                WHERE p.status = 'Open'

                UNION ALL

                SELECT
                    pr.created_at,
                    CONCAT(
                        COALESCE(NULLIF(reviewer.display_name, ''), reviewer.username),
                        ' reviewed ',
                        COALESCE(NULLIF(profileUser.display_name, ''), profileUser.username)
                    ) AS text,
                    'Community review' AS meta
                FROM profile_reviews pr
                JOIN userGig reviewer ON pr.reviewer_user_id = reviewer.id
                JOIN userGig profileUser ON pr.profile_user_id = profileUser.id
                WHERE pr.is_visible = 1
            ) activity
            ORDER BY created_at DESC
            LIMIT 5
        `);

        res.render('index', {
            gigs,
            featuredBusinesses: shuffleArray(featuredBusinesses),
            communityPhotos: shuffleArray(communityPhotos),
            testimonials: shuffleArray(testimonials),
            recentActivity: recentActivityRows
        });
    } catch (err) {
        console.error('Database error in /:', err);
        res.status(500).send('Database error loading gigs.');
    }
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

        sql = `INSERT INTO userGig (username, password, is_admin, profile_image_url)
               VALUES (?, ?, ?, ?)`;
        sqlParams = [username, password, 0, '/img/defaultImage.jpg'];

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
                   g.user_id, g.created_at,
                   u.display_name, u.profile_image_url,
                   COUNT(sg.id) AS save_count
            FROM Gig g
            JOIN userGig u ON g.user_id = u.id
            LEFT JOIN SavedGig sg ON sg.gig_id = g.id
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

        sql += `
            GROUP BY g.id, g.title, g.description, g.category, g.looking_for, g.organization_name,
                     g.location, g.location_type, g.budget, g.budget_min, g.budget_max,
                     g.deadline, g.urgency, g.beginner_friendly, g.image_url, g.status,
                     g.user_id, g.created_at, u.display_name, u.profile_image_url
            ORDER BY RAND()
        `;

        const [gigs] = await pool.query(sql, sqlParams);

        const [newestRows] = await pool.query(`
            SELECT g.id, g.title, g.category, g.location, g.image_url, g.created_at,
                   COUNT(sg.id) AS save_count
            FROM Gig g
            LEFT JOIN SavedGig sg ON sg.gig_id = g.id
            WHERE g.status = 'Open'
            GROUP BY g.id, g.title, g.category, g.location, g.image_url, g.created_at
            ORDER BY g.created_at DESC
            LIMIT 1
        `);

        const [trendingRows] = await pool.query(`
            SELECT g.id, g.title, g.category, g.location, g.image_url, g.created_at,
                   COUNT(sg.id) AS save_count
            FROM Gig g
            LEFT JOIN SavedGig sg ON sg.gig_id = g.id
            WHERE g.status = 'Open'
              AND sg.created_at >= NOW() - INTERVAL 7 DAY
            GROUP BY g.id, g.title, g.category, g.location, g.image_url, g.created_at
            ORDER BY save_count DESC, g.created_at DESC
            LIMIT 1
        `);

        const [discoverRows] = await pool.query(`
            SELECT g.id, g.title, g.category, g.location, g.image_url, g.created_at,
                   COUNT(sg.id) AS save_count
            FROM Gig g
            LEFT JOIN SavedGig sg ON sg.gig_id = g.id
            WHERE g.status = 'Open'
            GROUP BY g.id, g.title, g.category, g.location, g.image_url, g.created_at
            ORDER BY RAND()
            LIMIT 1
        `);

        const highlightGigs = [
            newestRows[0]
                ? {
                    ...newestRows[0],
                    label: 'Newest Gig',
                    description: 'Just posted to the community.'
                }
                : null,
            trendingRows[0]
                ? {
                    ...trendingRows[0],
                    label: 'Trending Gig',
                    description: 'Most saved over the last 7 days.'
                }
                : null,
            discoverRows[0]
                ? {
                    ...discoverRows[0],
                    label: 'Discover This Gig',
                    description: 'A fresh opportunity worth checking out.'
                }
                : null
        ].filter(Boolean);

        const user = await getCurrentUser(req.session.userId);

        res.render('findGig', {
            gigs,
            highlightGigs,
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
            theme: 'gig',
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
        const user = await getCurrentUser(req.session.userId);

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

        const [completedGigs] = await pool.query(
            `SELECT cg.id,
                    cg.feedback,
                    cg.completed_at,
                    g.id AS gig_id,
                    g.title,
                    g.category,
                    u.display_name AS poster_name,
                    u.username AS poster_username
             FROM CompletedGig cg
             JOIN Gig g ON cg.gig_id = g.id
             JOIN userGig u ON cg.poster_user_id = u.id
             WHERE cg.completed_user_id = ?
             ORDER BY cg.completed_at DESC`,
            [req.session.userId]
        );

        const [completedPitches] = await pool.query(
            `SELECT cp.id,
                    cp.feedback,
                    cp.completed_at,
                    p.id AS pitch_id,
                    p.title,
                    p.category_skills AS category,
                    u.display_name AS poster_name,
                    u.username AS poster_username
             FROM CompletedPitch cp
             JOIN Pitch p ON cp.pitch_id = p.id
             JOIN userGig u ON cp.poster_user_id = u.id
             WHERE cp.completed_user_id = ?
             ORDER BY cp.completed_at DESC`,
            [req.session.userId]
        );

        res.render('profile', {
            user,
            profileUser: users[0],
            postedGigs,
            savedGigs,
            postedPitches,
            savedPitches,
            completedGigs,
            completedPitches,
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
        const user = await getCurrentUser(req.session.userId);

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

        const [completedGigs] = await pool.query(
            `SELECT cg.id,
                    cg.feedback,
                    cg.completed_at,
                    g.id AS gig_id,
                    g.title,
                    g.category,
                    u.display_name AS poster_name,
                    u.username AS poster_username
             FROM CompletedGig cg
             JOIN Gig g ON cg.gig_id = g.id
             JOIN userGig u ON cg.poster_user_id = u.id
             WHERE cg.completed_user_id = ?
             ORDER BY cg.completed_at DESC`,
            [profileId]
        );

        const [completedPitches] = await pool.query(
            `SELECT cp.id,
                    cp.feedback,
                    cp.completed_at,
                    p.id AS pitch_id,
                    p.title,
                    p.category_skills AS category,
                    u.display_name AS poster_name,
                    u.username AS poster_username
             FROM CompletedPitch cp
             JOIN Pitch p ON cp.pitch_id = p.id
             JOIN userGig u ON cp.poster_user_id = u.id
             WHERE cp.completed_user_id = ?
             ORDER BY cp.completed_at DESC`,
            [profileId]
        );

        res.render('profile', {
            user,
            profileUser: users[0],
            postedGigs,
            savedGigs: [],
            postedPitches,
            savedPitches: [],
            completedGigs,
            completedPitches,
            isOwnProfile: Number(profileId) === req.session.userId
        });
    } catch (err) {
        console.error('Database error in /profile/:id:', err);
        res.status(500).send('Database error loading public profile.');
    }
});

app.get('/api/reviews/:profile_user_id', requireApiLogin, async (req, res) => {
    const profileUserId = Number(req.params.profile_user_id);

    if (!Number.isInteger(profileUserId) || profileUserId <= 0) {
        return res.status(400).json({ error: 'Invalid profile user id.' });
    }

    try {
        const reviews = await getVisibleProfileReviews(profileUserId);
        res.json({ reviews });
    } catch (err) {
        console.error('Database error in GET /api/reviews/:profile_user_id:', err);
        res.status(500).json({ error: 'Database error loading reviews.' });
    }
});

app.post('/api/reviews', requireApiLogin, async (req, res) => {
    const profileUserId = Number(req.body.profile_user_id);
    const reviewerUserId = req.session.userId;
    const rawTitle = typeof req.body.title === 'string' ? req.body.title : '';
    const rawComment = typeof req.body.comment === 'string' ? req.body.comment : '';
    const title = rawTitle.trim();
    const comment = rawComment.trim();

    if (!Number.isInteger(profileUserId) || profileUserId <= 0) {
        return res.status(400).json({ error: 'Invalid profile user id.' });
    }

    if (!comment) {
        return res.status(400).json({ error: 'Comment is required.' });
    }

    if (profileUserId === reviewerUserId) {
        return res.status(400).json({ error: 'You cannot review your own profile.' });
    }

    try {
        const [profileRows] = await pool.query(
            `SELECT id
             FROM userGig
             WHERE id = ?`,
            [profileUserId]
        );

        if (profileRows.length === 0) {
            return res.status(404).json({ error: 'Profile not found.' });
        }

        const [existingRows] = await pool.query(
            `SELECT id
             FROM profile_reviews
             WHERE profile_user_id = ?
               AND reviewer_user_id = ?
             LIMIT 1`,
            [profileUserId, reviewerUserId]
        );

        let mode = 'created';

        if (existingRows.length > 0) {
            await pool.query(
                `UPDATE profile_reviews
                 SET title = ?,
                     comment = ?,
                     is_visible = 1,
                     created_at = NOW()
                 WHERE id = ?`,
                [title || null, comment, existingRows[0].id]
            );
            mode = 'updated';
        } else {
            await pool.query(
                `INSERT INTO profile_reviews
                    (profile_user_id, reviewer_user_id, title, comment, is_visible, created_at)
                 VALUES (?, ?, ?, ?, 1, NOW())`,
                [profileUserId, reviewerUserId, title || null, comment]
            );
        }

        const reviews = await getVisibleProfileReviews(profileUserId);

        res.json({
            success: true,
            mode,
            message: mode === 'updated' ? 'Review updated successfully.' : 'Review submitted successfully.',
            reviews
        });
    } catch (err) {
        console.error('Database error in POST /api/reviews:', err);
        res.status(500).json({ error: 'Database error saving review.' });
    }
});

app.get('/updateProfile', requireLogin, async (req, res) => {
    try {
        const user = await getCurrentUser(req.session.userId);

        const [rows] = await pool.query(
            `SELECT *
             FROM userGig
             WHERE id = ?`,
            [req.session.userId]
        );

        res.render('updateProfile', {
            user,
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
                   p.created_at,
                   u.display_name,
                   u.profile_image_url,
                   COUNT(sp.id) AS save_count
            FROM Pitch p
            JOIN userGig u ON p.user_id = u.id
            LEFT JOIN SavedPitch sp ON sp.pitch_id = p.id
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

        sql += `
            GROUP BY p.id, p.title, p.service_name, p.category_skills, p.bio, p.portfolio,
                     p.location, p.location_type, p.rate_type, p.rate_min, p.rate_max,
                     p.availability, p.beginner_friendly, p.image_url, p.contact_email,
                     p.status, p.user_id, p.created_at, u.display_name, u.profile_image_url
            ORDER BY RAND()
        `;

        const [pitches] = await pool.query(sql, sqlParams);

        const [newestRows] = await pool.query(`
            SELECT p.id, p.title, p.category_skills AS category, p.location, p.image_url, p.created_at,
                   COUNT(sp.id) AS save_count
            FROM Pitch p
            LEFT JOIN SavedPitch sp ON sp.pitch_id = p.id
            WHERE p.status = 'Open'
            GROUP BY p.id, p.title, p.category_skills, p.location, p.image_url, p.created_at
            ORDER BY p.created_at DESC
            LIMIT 1
        `);

        const [trendingRows] = await pool.query(`
            SELECT p.id, p.title, p.category_skills AS category, p.location, p.image_url, p.created_at,
                   COUNT(sp.id) AS save_count
            FROM Pitch p
            LEFT JOIN SavedPitch sp ON sp.pitch_id = p.id
            WHERE p.status = 'Open'
              AND sp.created_at >= NOW() - INTERVAL 7 DAY
            GROUP BY p.id, p.title, p.category_skills, p.location, p.image_url, p.created_at
            ORDER BY save_count DESC, p.created_at DESC
            LIMIT 1
        `);

        const [discoverRows] = await pool.query(`
            SELECT p.id, p.title, p.category_skills AS category, p.location, p.image_url, p.created_at,
                   COUNT(sp.id) AS save_count
            FROM Pitch p
            LEFT JOIN SavedPitch sp ON sp.pitch_id = p.id
            WHERE p.status = 'Open'
            GROUP BY p.id, p.title, p.category_skills, p.location, p.image_url, p.created_at
            ORDER BY RAND()
            LIMIT 1
        `);

        const highlightPitches = [
            newestRows[0]
                ? {
                    ...newestRows[0],
                    label: 'Newest Pitch',
                    description: 'Recently added by a local creator.'
                }
                : null,
            trendingRows[0]
                ? {
                    ...trendingRows[0],
                    label: 'Trending Pitch',
                    description: 'Most saved over the last 7 days.'
                }
                : null,
            discoverRows[0]
                ? {
                    ...discoverRows[0],
                    label: 'Discover This Pitch',
                    description: 'A creator profile worth exploring.'
                }
                : null
        ].filter(Boolean);

        const user = await getCurrentUser(req.session.userId);

        res.render('findPitch', {
            pitches,
            highlightPitches,
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
            theme: 'pitch',
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

app.get('/completeGig/:id', requireLogin, async (req, res) => {
    const gigId = req.params.id;

    try {
        const [gigRows] = await pool.query(
            `SELECT id, title, user_id, status
             FROM Gig
             WHERE id = ? AND user_id = ?`,
            [gigId, req.session.userId]
        );

        if (gigRows.length === 0) {
            return res.status(403).send('You cannot complete this gig.');
        }

        const [users] = await pool.query(
            `SELECT
                u.id,
                u.username,
                u.display_name,
                u.profile_type,
                CASE WHEN sg.id IS NOT NULL THEN 1 ELSE 0 END AS saved_this_gig,
                sg.created_at AS saved_at
             FROM userGig u
             LEFT JOIN SavedGig sg
                ON sg.user_id = u.id
               AND sg.gig_id = ?
             WHERE u.id != ?
             ORDER BY
                saved_this_gig DESC,
                COALESCE(NULLIF(u.display_name, ''), u.username) ASC`,
            [gigId, req.session.userId]
        );

        const user = await getCurrentUser(req.session.userId);

        res.render('completeGig', {
            gig: gigRows[0],
            users,
            user
        });
    } catch (err) {
        console.error('Database error in GET /completeGig/:id:', err);
        res.status(500).send('Database error loading complete gig page.');
    }
});

app.post('/completeGig/:id', requireLogin, async (req, res) => {
    const gigId = req.params.id;
    const { completed_user_id, feedback } = req.body;

    try {
        const [gigRows] = await pool.query(
            `SELECT id, user_id
             FROM Gig
             WHERE id = ? AND user_id = ?`,
            [gigId, req.session.userId]
        );

        if (gigRows.length === 0) {
            return res.status(403).send('You cannot complete this gig.');
        }

        await pool.query(
            `UPDATE Gig
             SET status = 'Completed',
                 updated_at = NOW()
             WHERE id = ? AND user_id = ?`,
            [gigId, req.session.userId]
        );

        await pool.query(
            `INSERT INTO CompletedGig (gig_id, poster_user_id, completed_user_id, feedback)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                 completed_user_id = VALUES(completed_user_id),
                 feedback = VALUES(feedback),
                 completed_at = CURRENT_TIMESTAMP`,
            [gigId, req.session.userId, completed_user_id, feedback]
        );

        res.redirect(`/gigInfo/${gigId}`);
    } catch (err) {
        console.error('Database error in POST /completeGig/:id:', err);
        res.status(500).send('Database error completing gig.');
    }
});

app.get('/completePitch/:id', requireLogin, async (req, res) => {
    const pitchId = req.params.id;

    try {
        const [pitchRows] = await pool.query(
            `SELECT id, title, user_id, status
             FROM Pitch
             WHERE id = ? AND user_id = ?`,
            [pitchId, req.session.userId]
        );

        if (pitchRows.length === 0) {
            return res.status(403).send('You cannot complete this pitch.');
        }

        const [users] = await pool.query(
            `SELECT u.id,
                    u.username,
                    u.display_name,
                    u.profile_type,
                    CASE WHEN sp.user_id IS NOT NULL THEN 1 ELSE 0 END AS saved_this_pitch
             FROM userGig u
             LEFT JOIN SavedPitch sp
                    ON sp.user_id = u.id
                   AND sp.pitch_id = ?
             WHERE u.id != ?
             ORDER BY saved_this_pitch DESC,
                      COALESCE(NULLIF(TRIM(u.display_name), ''), u.username) ASC`,
            [pitchId, req.session.userId]
        );

        const user = await getCurrentUser(req.session.userId);

        res.render('completePitch', {
            pitch: pitchRows[0],
            users,
            user
        });
    } catch (err) {
        console.error('Database error in GET /completePitch/:id:', err);
        res.status(500).send('Database error loading complete pitch page.');
    }
});

app.post('/completePitch/:id', requireLogin, async (req, res) => {
    const pitchId = req.params.id;
    const { completed_user_id, feedback } = req.body;

    try {
        const [pitchRows] = await pool.query(
            `SELECT id, user_id
             FROM Pitch
             WHERE id = ? AND user_id = ?`,
            [pitchId, req.session.userId]
        );

        if (pitchRows.length === 0) {
            return res.status(403).send('You cannot complete this pitch.');
        }

        await pool.query(
            `UPDATE Pitch
             SET status = 'Completed',
                 updated_at = NOW()
             WHERE id = ? AND user_id = ?`,
            [pitchId, req.session.userId]
        );

        await pool.query(
            `INSERT INTO CompletedPitch (pitch_id, poster_user_id, completed_user_id, feedback)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                 completed_user_id = VALUES(completed_user_id),
                 feedback = VALUES(feedback),
                 completed_at = CURRENT_TIMESTAMP`,
            [pitchId, req.session.userId, completed_user_id, feedback]
        );

        res.redirect(`/pitchInfo/${pitchId}`);
    } catch (err) {
        console.error('Database error in POST /completePitch/:id:', err);
        res.status(500).send('Database error completing pitch.');
    }
});

app.get('/map', requireLogin, async (req, res) => {
    try {
        const user = await getCurrentUser(req.session.userId);

        res.render('mapView', {
            user
        });
    } catch (err) {
        console.error('Database error in /map:', err);
        res.status(500).send('Database error loading map page.');
    }
});

app.get('/api/motivation', requireLogin, async (req, res) => {
    try {
        const response = await fetch('https://zenquotes.io/api/random');
        const data = await response.json();

        if (!Array.isArray(data) || data.length === 0) {
            return res.json({
                quote: 'Your next opportunity might be one click away.',
                author: 'OtterGigs'
            });
        }

        return res.json({
            quote: data[0].q || 'Keep showing up. Your work matters.',
            author: data[0].a || 'Unknown'
        });
    } catch (err) {
        console.error('Quote API error:', err);

        return res.json({
            quote: 'Your next opportunity might be one click away.',
            author: 'OtterGigs'
        });
    }
});

app.get('/api/map-points', requireLogin, async (req, res) => {
    const type = (req.query.type || 'gig').toLowerCase();

    try {
        if (type === 'pitch') {
            const [rows] = await pool.query(
                `SELECT id, title, category_skills AS category, location
                 FROM Pitch
                 WHERE status = 'Open'`
            );

            return res.json(groupMapRows(rows, 'pitch'));
        }

        const [rows] = await pool.query(
            `SELECT id, title, category, location
             FROM Gig
             WHERE status = 'Open'`
        );

        return res.json(groupMapRows(rows, 'gig'));
    } catch (err) {
        console.error('Database error in /api/map-points:', err);
        res.status(500).json({ error: 'Database error loading map points.' });
    }
});

app.get('/api/home-stats', requireApiLogin, async (req, res) => {
    try {
        const [[openGigRow]] = await pool.query(`
            SELECT COUNT(*) AS total
            FROM Gig
            WHERE status = 'Open'
        `);

        const [[openPitchRow]] = await pool.query(`
            SELECT COUNT(*) AS total
            FROM Pitch
            WHERE status = 'Open'
        `);

        const [[completedGigRow]] = await pool.query(`
            SELECT COUNT(*) AS total
            FROM CompletedGig
        `);

        const [[completedPitchRow]] = await pool.query(`
            SELECT COUNT(*) AS total
            FROM CompletedPitch
        `);

        const [locationRows] = await pool.query(`
            SELECT location
            FROM Gig
            WHERE status = 'Open'
            UNION ALL
            SELECT location
            FROM Pitch
            WHERE status = 'Open'
        `);

        const activeAreas = new Set();

        locationRows.forEach((row) => {
            const area = normalizeLocationToArea(row.location);
            if (area) {
                activeAreas.add(area.key);
            }
        });

        const [recentActivity] = await pool.query(`
            SELECT *
            FROM (
                SELECT
                    cg.completed_at AS created_at,
                    CONCAT(
                        COALESCE(NULLIF(done.display_name, ''), done.username),
                        ' completed gig: ',
                        g.title
                    ) AS text,
                    CONCAT('/gigInfo/', g.id) AS url
                FROM CompletedGig cg
                JOIN Gig g ON cg.gig_id = g.id
                JOIN userGig done ON cg.completed_user_id = done.id

                UNION ALL

                SELECT
                    cp.completed_at AS created_at,
                    CONCAT(
                        COALESCE(NULLIF(done.display_name, ''), done.username),
                        ' completed pitch: ',
                        p.title
                    ) AS text,
                    CONCAT('/pitchInfo/', p.id) AS url
                FROM CompletedPitch cp
                JOIN Pitch p ON cp.pitch_id = p.id
                JOIN userGig done ON cp.completed_user_id = done.id

                UNION ALL

                SELECT
                    pr.created_at AS created_at,
                    CONCAT(
                        COALESCE(NULLIF(reviewer.display_name, ''), reviewer.username),
                        ' reviewed ',
                        COALESCE(NULLIF(profileUser.display_name, ''), profileUser.username)
                    ) AS text,
                    CONCAT('/profile/', pr.profile_user_id) AS url
                FROM profile_reviews pr
                JOIN userGig reviewer ON pr.reviewer_user_id = reviewer.id
                JOIN userGig profileUser ON pr.profile_user_id = profileUser.id
                WHERE pr.is_visible = 1
            ) activity
            ORDER BY created_at DESC
            LIMIT 5
        `);

        res.json({
            openGigs: openGigRow.total,
            openPitches: openPitchRow.total,
            activeAreas: activeAreas.size,
            completedWork: completedGigRow.total + completedPitchRow.total,
            recentActivity
        });
    } catch (err) {
        console.error('Database error in /api/home-stats:', err);
        res.status(500).json({ error: 'Unable to load home stats.' });
    }
});

app.get('/api/home-spotlight', requireApiLogin, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                u.id,
                u.username,
                u.display_name,
                u.profile_type,
                u.profile_image_url,
                u.location,
                (
                    SELECT COUNT(*)
                    FROM Gig g
                    WHERE g.user_id = u.id
                      AND g.status = 'Open'
                ) AS open_gigs,
                (
                    SELECT COUNT(*)
                    FROM Pitch p
                    WHERE p.user_id = u.id
                      AND p.status = 'Open'
                ) AS open_pitches,
                (
                    SELECT MAX(created_at)
                    FROM (
                        SELECT g.created_at
                        FROM Gig g
                        WHERE g.user_id = u.id
                          AND g.status = 'Open'

                        UNION ALL

                        SELECT p.created_at
                        FROM Pitch p
                        WHERE p.user_id = u.id
                          AND p.status = 'Open'
                    ) activity_dates
                ) AS last_activity_at
            FROM userGig u
            WHERE u.profile_type = 'business'
              AND (
                    EXISTS (
                        SELECT 1
                        FROM Gig g
                        WHERE g.user_id = u.id
                          AND g.status = 'Open'
                    )
                    OR EXISTS (
                        SELECT 1
                        FROM Pitch p
                        WHERE p.user_id = u.id
                          AND p.status = 'Open'
                    )
              )
            ORDER BY last_activity_at DESC
            LIMIT 1
        `);

        let spotlight = rows[0];

        if (!spotlight) {
            const [fallbackRows] = await pool.query(`
                SELECT
                    u.id,
                    u.username,
                    u.display_name,
                    u.profile_type,
                    u.profile_image_url,
                    u.location,
                    (
                        SELECT COUNT(*)
                        FROM Gig g
                        WHERE g.user_id = u.id
                          AND g.status = 'Open'
                    ) AS open_gigs,
                    (
                        SELECT COUNT(*)
                        FROM Pitch p
                        WHERE p.user_id = u.id
                          AND p.status = 'Open'
                    ) AS open_pitches
                FROM userGig u
                ORDER BY u.created_at DESC
                LIMIT 1
            `);

            spotlight = fallbackRows[0];
        }

        if (!spotlight) {
            return res.status(404).json({ error: 'No spotlight profile available.' });
        }

        const name = spotlight.display_name || spotlight.username;
        const profileTypeLabel = spotlight.profile_type === 'business' ? 'Local business spotlight' : 'Community creator spotlight';

        let summary = `${name} is helping keep the OtterGigs community active.`;

        if (spotlight.open_gigs > 0 && spotlight.open_pitches > 0) {
            summary = `${name} currently has ${spotlight.open_gigs} open gig${spotlight.open_gigs === 1 ? '' : 's'} and ${spotlight.open_pitches} open pitch${spotlight.open_pitches === 1 ? '' : 'es'} helping build local momentum.`;
        } else if (spotlight.open_gigs > 0) {
            summary = `${name} currently has ${spotlight.open_gigs} open gig${spotlight.open_gigs === 1 ? '' : 's'} posted for local creatives.`;
        } else if (spotlight.open_pitches > 0) {
            summary = `${name} currently has ${spotlight.open_pitches} active pitch${spotlight.open_pitches === 1 ? '' : 'es'} helping people discover local talent.`;
        }

        res.json({
            id: spotlight.id,
            name,
            profile_type_label: profileTypeLabel,
            profile_image_url: spotlight.profile_image_url || '/img/defaultImage.jpg',
            location: spotlight.location || 'Monterey Bay area',
            open_gigs: Number(spotlight.open_gigs || 0),
            open_pitches: Number(spotlight.open_pitches || 0),
            summary
        });
    } catch (err) {
        console.error('Database error in /api/home-spotlight:', err);
        res.status(500).json({ error: 'Unable to load spotlight.' });
    }
});

app.get('/api/home-pulse', requireApiLogin, async (req, res) => {
    const type = String(req.query.type || 'gig').toLowerCase() === 'pitch' ? 'pitch' : 'gig';

    try {
        if (type === 'pitch') {
            const [items] = await pool.query(`
                SELECT
                    id,
                    title,
                    category_skills AS category,
                    location,
                    beginner_friendly,
                    created_at
                FROM Pitch
                WHERE status = 'Open'
                ORDER BY created_at DESC
                LIMIT 6
            `);

            const [[countRow]] = await pool.query(`
                SELECT COUNT(*) AS total
                FROM Pitch
                WHERE status = 'Open'
            `);

            const [[beginnerRow]] = await pool.query(`
                SELECT COUNT(*) AS total
                FROM Pitch
                WHERE status = 'Open'
                  AND beginner_friendly = 1
            `);

            const [locationRows] = await pool.query(`
                SELECT location
                FROM Pitch
                WHERE status = 'Open'
            `);

            const areaCounts = {};
            locationRows.forEach((row) => {
                const area = normalizeLocationToArea(row.location);
                if (!area) return;
                areaCounts[area.label] = (areaCounts[area.label] || 0) + 1;
            });

            const topArea = Object.entries(areaCounts).sort((a, b) => b[1] - a[1])[0];

            res.json({
                updates: [
                    `${countRow.total} open pitches are currently active.`,
                    `${beginnerRow.total} beginner-friendly pitches are live right now.`,
                    topArea ? `${topArea[0]} has the most creator activity right now.` : `Local creator activity is spreading across the community.`,
                    items[0] ? `Newest pitch: ${items[0].title}` : `Fresh pitches will appear here as they are posted.`
                ],
                items: items.map((item) => ({
                    ...item,
                    url: `/pitchInfo/${item.id}`
                }))
            });

            return;
        }

        const [items] = await pool.query(`
            SELECT
                id,
                title,
                category,
                location,
                beginner_friendly,
                created_at
            FROM Gig
            WHERE status = 'Open'
            ORDER BY created_at DESC
            LIMIT 6
        `);

        const [[countRow]] = await pool.query(`
            SELECT COUNT(*) AS total
            FROM Gig
            WHERE status = 'Open'
        `);

        const [[beginnerRow]] = await pool.query(`
            SELECT COUNT(*) AS total
            FROM Gig
            WHERE status = 'Open'
              AND beginner_friendly = 1
        `);

        const [locationRows] = await pool.query(`
            SELECT location
            FROM Gig
            WHERE status = 'Open'
        `);

        const areaCounts = {};
        locationRows.forEach((row) => {
            const area = normalizeLocationToArea(row.location);
            if (!area) return;
            areaCounts[area.label] = (areaCounts[area.label] || 0) + 1;
        });

        const topArea = Object.entries(areaCounts).sort((a, b) => b[1] - a[1])[0];

        res.json({
            updates: [
                `${countRow.total} open gigs are currently available.`,
                `${beginnerRow.total} beginner-friendly gigs are live right now.`,
                topArea ? `${topArea[0]} has the most gig activity right now.` : `New local opportunities are being posted across the area.`,
                items[0] ? `Newest gig: ${items[0].title}` : `Fresh gigs will appear here as they are posted.`
            ],
            items: items.map((item) => ({
                ...item,
                url: `/gigInfo/${item.id}`
            }))
        });
    } catch (err) {
        console.error('Database error in /api/home-pulse:', err);
        res.status(500).json({ error: 'Unable to load pulse feed.' });
    }
});

app.get('/api/community-impact', async (req, res) => {
    try {
        const [[gigRow]] = await pool.query(`
            SELECT COUNT(*) AS total
            FROM Gig
        `);

        const [[completedGigRow]] = await pool.query(`
            SELECT COUNT(*) AS total
            FROM CompletedGig
        `);

        const [[completedPitchRow]] = await pool.query(`
            SELECT COUNT(*) AS total
            FROM CompletedPitch
        `);

        const [[reviewRow]] = await pool.query(`
            SELECT COUNT(*) AS total
            FROM profile_reviews
            WHERE is_visible = 1
        `);

        const [locationRows] = await pool.query(`
            SELECT location FROM Gig
            UNION ALL
            SELECT location FROM Pitch
        `);

        const activeAreas = new Set();

        locationRows.forEach((row) => {
            const area = normalizeLocationToArea(row.location);
            if (area) {
                activeAreas.add(area.key);
            }
        });

        res.json({
            gigsPosted: gigRow.total,
            collaborationsCompleted: Number(completedGigRow.total || 0) + Number(completedPitchRow.total || 0),
            activeAreas: activeAreas.size,
            reviewsShared: reviewRow.total
        });
    } catch (err) {
        console.error('Database error in /api/community-impact:', err);
        res.status(500).json({ error: 'Unable to load community impact.' });
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