// ============================================================
//  server.js  —  Tagbi GeoGuard (Fixed & Secured)
//  Fixes: bcrypt passwords, dotenv, auth middleware,
//         analytics period filter, route protection
// ============================================================

require('dotenv').config();

const express  = require('express');
const mongoose = require('mongoose');
const bcrypt   = require('bcrypt');
const path     = require('path');
const fs       = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// ── Database ──────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error('❌  MONGO_URI is not set. Create a .env file.');
    process.exit(1);
}

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅  Connected to MongoDB Atlas!'))
    .catch(err => { console.error('❌  MongoDB connection error:', err); process.exit(1); });

// ── Schemas ───────────────────────────────────────────────
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },          // stored as bcrypt hash
    role:     { type: String, default: 'GeoGuard', enum: ['Admin', 'GeoGuard'] }
});
const User = mongoose.model('User', userSchema);

const hazardSchema = new mongoose.Schema({
    title:       { type: String, required: true },
    type:        { type: String, enum: ['Flood', 'Fire', 'Earthquake', 'Other'] },
    severity:    { type: String, enum: ['Low', 'Moderate', 'Critical'] },
    description: String,
    incidentDate:{ type: Date, required: true },
    location: {
        address: String,
        lat:     Number,
        lng:     Number,
        heritageSite: String
    },
    radius: { type: Number, default: null },
    flaggedSites: [{
        name:           String,
        address:        String,
        distance:       Number,
        acknowledgedBy: String,
        acknowledgedAt: Date,
        status: { type: String, default: 'Unreviewed', enum: ['Unreviewed', 'Acknowledged', 'Cleared'] }
    }],
    impact: {
        casualties:     Number,
        damageEstimate: Number
    },
    reporter: {
        name:    String,
        contact: String
    },
    status:     { type: String, default: 'Pending', enum: ['Pending', 'Verified', 'Rejected'] },
    verifiedBy: String,
    verifiedAt: Date,
    timestamp:  { type: Date, default: Date.now }
});
const Hazard = mongoose.model('Hazard', hazardSchema);

// ── Simple Auth Middleware ────────────────────────────────
// Reads  X-User  header (JSON-stringified user object stored in localStorage).
// In production replace this with JWT or server sessions.
function requireAuth(req, res, next) {
    try {
        const header = req.headers['x-user'];
        if (!header) return res.status(401).json({ message: 'Not authenticated.' });
        req.user = JSON.parse(header);
        next();
    } catch {
        return res.status(401).json({ message: 'Invalid auth header.' });
    }
}

function requireAdmin(req, res, next) {
    requireAuth(req, res, () => {
        if (req.user?.role !== 'Admin')
            return res.status(403).json({ message: 'Admin access required.' });
        next();
    });
}

// ── Utility ───────────────────────────────────────────────
function haversineDistance(lat1, lng1, lat2, lng2) {
    const R    = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a    = Math.sin(dLat / 2) ** 2 +
                 Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                 Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function periodToDate(period) {
    const now = new Date();
    const map = { '24h': 1, '7d': 7, '30d': 30, '365d': 365 };
    const days = map[period] ?? 7;
    now.setDate(now.getDate() - days);
    return now;
}

// ── Auth Routes ───────────────────────────────────────────
app.post('/api/signup', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password)
            return res.status(400).json({ message: 'Username and password are required.' });

        const hashed  = await bcrypt.hash(password, 10);
        // All self-registered users are GeoGuard; admins must be promoted manually
        const newUser = new User({ username, password: hashed, role: 'GeoGuard' });
        await newUser.save();
        res.json({ message: 'Account created successfully!' });
    } catch (error) {
        if (error.code === 11000)
            return res.status(400).json({ message: 'Username already exists.' });
        res.status(400).json({ message: 'Error creating account.' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

        res.json({
            success: true,
            message: 'Login successful!',
            user: { username: user.username, role: user.role }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error during login.' });
    }
});

// ── Hazard Routes ─────────────────────────────────────────

// POST  /api/report-hazard  — any authenticated user
app.post('/api/report-hazard', requireAuth, async (req, res) => {
    try {
        const newHazard = new Hazard(req.body);

        if (newHazard.location?.lat && newHazard.location?.lng) {
            const sitesPath = path.join(__dirname, 'public', 'tagbilaran-heritages.json');
            const sites     = JSON.parse(fs.readFileSync(sitesPath, 'utf8'));

            let radiusKm = newHazard.radius ?? 1;
            if (newHazard.type === 'Fire') radiusKm = 0.5;

            const flagged = [];
            sites.forEach(site => {
                if (!site.coordinates?.lat || !site.coordinates?.lng) return;
                const dist = haversineDistance(
                    newHazard.location.lat, newHazard.location.lng,
                    site.coordinates.lat,   site.coordinates.lng
                );
                if (dist <= radiusKm) {
                    flagged.push({
                        name:     site.name,
                        address:  site.location?.address || '',
                        distance: Math.round(dist * 1000),
                        status:   'Unreviewed'
                    });
                }
            });
            newHazard.flaggedSites = flagged;
        }

        await newHazard.save();
        res.status(201).json(newHazard);
    } catch (err) {
        console.error(err);
        res.status(400).json({ message: err.message });
    }
});

// GET  /api/hazards  — public (map display)
app.get('/api/hazards', async (req, res) => {
    try {
        const hazards = await Hazard.find().sort({ timestamp: -1 });
        res.json(hazards);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching data.' });
    }
});

// GET  /api/hazards/:id  — public
app.get('/api/hazards/:id', async (req, res) => {
    try {
        const hazard = await Hazard.findById(req.params.id);
        if (!hazard) return res.status(404).json({ message: 'Hazard not found.' });
        res.json(hazard);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching hazard details.' });
    }
});

// PUT  /api/hazards/:id/verify  — Admin only
app.put('/api/hazards/:id/verify', requireAdmin, async (req, res) => {
    try {
        const hazard = await Hazard.findByIdAndUpdate(req.params.id, {
            status:     'Verified',
            verifiedBy: req.user.username,
            verifiedAt: new Date()
        }, { new: true });
        if (!hazard) return res.status(404).json({ message: 'Hazard not found.' });
        res.json(hazard);
    } catch (error) {
        res.status(500).json({ message: 'Error verifying hazard.' });
    }
});

// DELETE  /api/hazards/:id  — Admin only
app.delete('/api/hazards/:id', requireAdmin, async (req, res) => {
    try {
        const hazard = await Hazard.findByIdAndDelete(req.params.id);
        if (!hazard) return res.status(404).json({ message: 'Hazard not found.' });
        res.json({ message: 'Hazard deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting hazard.' });
    }
});

// PATCH  /api/hazards/:id/flagged-sites/:siteName  — Admin only
app.patch('/api/hazards/:id/flagged-sites/:siteName', requireAdmin, async (req, res) => {
    try {
        const { id, siteName }          = req.params;
        const { status, acknowledgedBy } = req.body;

        const hazard = await Hazard.findById(id);
        if (!hazard) return res.status(404).json({ message: 'Hazard not found.' });

        const decodedName = decodeURIComponent(siteName);
        const site        = hazard.flaggedSites.find(s => s.name === decodedName);
        if (!site) return res.status(404).json({ message: 'Flagged site not found.' });

        site.status         = status;
        site.acknowledgedBy = acknowledgedBy;
        site.acknowledgedAt = new Date();

        await hazard.save();
        res.json(hazard);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating flagged site.' });
    }
});

// GET  /api/flagged-sites  — authenticated users
app.get('/api/flagged-sites', requireAuth, async (req, res) => {
    try {
        const hazards = await Hazard.find({ 'flaggedSites.0': { $exists: true } }).sort({ timestamp: -1 });
        const flagged = [];
        hazards.forEach(h => {
            h.flaggedSites.forEach(site => {
                if (site.status === 'Unreviewed') {
                    flagged.push({
                        hazardId:       h._id,
                        hazardTitle:    h.title,
                        hazardType:     h.type,
                        hazardSeverity: h.severity,
                        siteName:       site.name,
                        siteAddress:    site.address,
                        distance:       site.distance,
                        status:         site.status,
                        reportedAt:     h.timestamp
                    });
                }
            });
        });
        res.json(flagged);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching flagged sites.' });
    }
});

// GET  /api/analytics  — authenticated, now respects ?period= query param
app.get('/api/analytics', requireAuth, async (req, res) => {
    try {
        const period      = req.query.period || '7d';
        const sinceDate   = periodToDate(period);
        const thirtyAgo   = periodToDate('30d');

        const total = await Hazard.countDocuments();

        const severityDist = await Hazard.aggregate([
            { $group: { _id: '$severity', count: { $sum: 1 } } }
        ]);

        const topSites = await Hazard.aggregate([
            { $match: { timestamp: { $gte: thirtyAgo } } },
            { $group: { _id: '$location.heritageSite', count: { $sum: 1 } } },
            { $sort:  { count: -1 } },
            { $limit: 5 }
        ]);

        const trends = await Hazard.aggregate([
            { $match: { timestamp: { $gte: sinceDate } } },
            { $group: {
                _id:   { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                count: { $sum: 1 }
            }},
            { $sort: { _id: 1 } }
        ]);

        res.json({ total, severityDist, topSites, trends });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching analytics.' });
    }
});

app.listen(PORT, () => console.log(`🚀  Server running on port ${PORT}`));