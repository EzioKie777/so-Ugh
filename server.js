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
if (!MONGO_URI) { console.error('❌  MONGO_URI not set.'); process.exit(1); }

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('✅  Connected to MongoDB Atlas!');
        await seedVerifiedHazards();
    })
    .catch(err => { console.error('❌  MongoDB error:', err); process.exit(1); });

// ── Permanent Verified Seed Data ──────────────────────────
async function seedVerifiedHazards() {
    const verifiedCount = await Hazard.countDocuments({ status: 'Verified' });
    if (verifiedCount > 0) return;

    const sites = JSON.parse(fs.readFileSync(path.join(__dirname, 'public', 'tagbilaran-heritages.json'), 'utf8'));
    const getFlaggedSites = (lat, lng, radiusKm) => sites
        .filter(s => s.coordinates?.lat && s.coordinates?.lng)
        .map(s => ({ site: s, dist: haversineDistance(lat, lng, s.coordinates.lat, s.coordinates.lng) }))
        .filter(({ dist }) => dist <= radiusKm)
        .map(({ site, dist }) => ({ name: site.name, address: site.location?.address || '', distance: Math.round(dist * 1000), status: 'Unreviewed' }));

    const verifiedHazards = [
        {
            title: '2026 Rain Flooding at Plaza Rizal',
            type: 'Flood',
            severity: 'Moderate',
            description: 'Heavy monsoon rains caused street flooding and water intrusion around Plaza Rizal, forcing temporary closures of nearby heritage walkways.',
            incidentDate: new Date('2026-03-18T09:15:00Z'),
            location: { address: 'Plaza Rizal, Poblacion II, Tagbilaran City', lat: 9.6435, lng: 123.8544, heritageSite: 'Plaza Rizal' },
            radius: 1.2,
            flaggedSites: [],
            impact: { casualties: 0, damageEstimate: 850000 },
            reporter: { name: 'Tagbilaran City DRRM Office', contact: '032-123-4567' },
            status: 'Verified',
            verifiedBy: 'Tagbilaran GeoGuard',
            verifiedAt: new Date('2026-03-18T12:30:00Z'),
            timestamp: new Date('2026-03-18T09:15:00Z')
        },
        {
            title: '2025 Heritage House Fire in Sitio Ubos',
            type: 'Fire',
            severity: 'Critical',
            description: 'A fire incident near Casa Rocha-Suarez Heritage House damaged nearby ancestral structures and triggered an emergency heritage protection response.',
            incidentDate: new Date('2025-11-12T21:45:00Z'),
            location: { address: 'Sitio Ubos, Poblacion I, Tagbilaran City', lat: 9.64243, lng: 123.85218, heritageSite: 'Casa Rocha-Suarez Heritage House' },
            radius: 0.8,
            flaggedSites: [],
            impact: { casualties: 0, damageEstimate: 3200000 },
            reporter: { name: 'Tagbilaran City Fire Department', contact: '032-234-5678' },
            status: 'Verified',
            verifiedBy: 'Tagbilaran GeoGuard',
            verifiedAt: new Date('2025-11-13T02:00:00Z'),
            timestamp: new Date('2025-11-12T21:45:00Z')
        },
        {
            title: '2025 Seismic Shake Near Cathedral',
            type: 'Earthquake',
            severity: 'Moderate',
            description: 'Tremors affecting the Cathedral of St. Joseph the Worker prompted heritage assessments and temporary perimeter closures around the structure.',
            incidentDate: new Date('2025-12-05T04:20:00Z'),
            location: { address: 'Carlos P. Garcia Avenue, Poblacion II, Tagbilaran City', lat: 9.64325, lng: 123.85435, heritageSite: 'Cathedral of St. Joseph the Worker' },
            radius: 2.0,
            flaggedSites: [],
            impact: { casualties: 0, damageEstimate: 1150000 },
            reporter: { name: 'Philippine Institute of Volcanology', contact: '032-345-6789' },
            status: 'Verified',
            verifiedBy: 'Tagbilaran GeoGuard',
            verifiedAt: new Date('2025-12-05T08:00:00Z'),
            timestamp: new Date('2025-12-05T04:20:00Z')
        },
        {
            title: '2026 Water Main Break Near National Museum',
            type: 'Other',
            severity: 'Low',
            description: 'A main water pipe failure flooded streets near the National Museum and required urgent heritage site protection measures to prevent interior damage.',
            incidentDate: new Date('2026-01-22T15:10:00Z'),
            location: { address: 'Carlos P. Garcia Avenue, Poblacion II, Tagbilaran City', lat: 9.6439, lng: 123.8547, heritageSite: 'National Museum of the Philippines – Bohol' },
            radius: 0.6,
            flaggedSites: [],
            impact: { casualties: 0, damageEstimate: 520000 },
            reporter: { name: 'Tagbilaran Public Works', contact: '032-456-7890' },
            status: 'Verified',
            verifiedBy: 'Tagbilaran GeoGuard',
            verifiedAt: new Date('2026-01-22T17:30:00Z'),
            timestamp: new Date('2026-01-22T15:10:00Z')
        },
        {
            title: '2025 Flash Floods in Barangay Tiptip',
            type: 'Flood',
            severity: 'Critical',
            description: 'Intense flash flooding in Barangay Tiptip threatened nearby heritage corridors and required emergency road closures and heritage asset monitoring.',
            incidentDate: new Date('2025-10-08T18:00:00Z'),
            location: { address: 'Barangay Tiptip, Tagbilaran City', lat: 9.6939, lng: 123.8683, heritageSite: 'Plaza Rizal' },
            radius: 2.4,
            flaggedSites: [],
            impact: { casualties: 0, damageEstimate: 2800000 },
            reporter: { name: 'Tagbilaran Environment Office', contact: '032-567-8901' },
            status: 'Verified',
            verifiedBy: 'Tagbilaran GeoGuard',
            verifiedAt: new Date('2025-10-08T20:15:00Z'),
            timestamp: new Date('2025-10-08T18:00:00Z')
        }
    ];

    for (const hazard of verifiedHazards) {
        hazard.flaggedSites = getFlaggedSites(hazard.location.lat, hazard.location.lng, hazard.radius || 1);
    }

    await Hazard.insertMany(verifiedHazards);
    console.log('✅  Seeded permanent verified Tagbilaran hazard reports.');
}

// ── Schemas ───────────────────────────────────────────────
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role:     { type: String, default: 'GeoGuard', enum: ['Admin', 'GeoGuard'] }
});
const User = mongoose.model('User', userSchema);

const hazardSchema = new mongoose.Schema({
    title:        { type: String, required: true },
    type:         { type: String, enum: ['Flood', 'Fire', 'Earthquake', 'Other'] },
    severity:     { type: String, enum: ['Low', 'Moderate', 'Critical'] },
    description:  String,
    incidentDate: { type: Date, required: true },
    location: { address: String, lat: Number, lng: Number, heritageSite: String },
    radius:   { type: Number, default: null },
    flaggedSites: [{
        name: String, address: String, distance: Number,
        acknowledgedBy: String, acknowledgedAt: Date,
        status: { type: String, default: 'Unreviewed', enum: ['Unreviewed', 'Acknowledged', 'Cleared'] }
    }],
    impact:     { casualties: Number, damageEstimate: Number },
    reporter:   { name: String, contact: String },
    status:     { type: String, default: 'Pending', enum: ['Pending', 'Verified', 'Rejected'] },
    verifiedBy: String,
    verifiedAt: Date,
    timestamp:  { type: Date, default: Date.now }
});
const Hazard = mongoose.model('Hazard', hazardSchema);

// ── Auth Middleware ───────────────────────────────────────
function requireAuth(req, res, next) {
    try {
        const h = req.headers['x-user'];
        if (!h) return res.status(401).json({ message: 'Not authenticated.' });
        req.user = JSON.parse(h);
        next();
    } catch { res.status(401).json({ message: 'Invalid auth header.' }); }
}
function requireAdmin(req, res, next) {
    requireAuth(req, res, () => {
        if (req.user?.role !== 'Admin')
            return res.status(403).json({ message: 'Admin access required.' });
        next();
    });
}

// ── Utilities ─────────────────────────────────────────────
function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371, toR = Math.PI / 180;
    const dLat = (lat2 - lat1) * toR, dLng = (lng2 - lng1) * toR;
    const a = Math.sin(dLat/2)**2 +
              Math.cos(lat1*toR) * Math.cos(lat2*toR) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function periodToDate(period) {
    const now = new Date();
    now.setDate(now.getDate() - ({ '24h':1, '7d':7, '30d':30, '365d':365 }[period] ?? 7));
    return now;
}

// ── Health Score Engine ───────────────────────────────────
const SEVERITY_WEIGHT = { Low: 1, Moderate: 3, Critical: 5 };

function scoreToHealth(score) {
    if (score === 0) return { status: 'Excellent', color: '#27ae60' };
    if (score <= 3)  return { status: 'Good',      color: '#2ecc71' };
    if (score <= 7)  return { status: 'Fair',       color: '#f39c12' };
    return               { status: 'At Risk',   color: '#e74c3c' };
}

async function computeHeritageHealth() {
    // Fetch all non-rejected hazards that have flagged sites
    const hazards = await Hazard.find({
        status: { $ne: 'Rejected' },
        'flaggedSites.0': { $exists: true }
    });

    const map = {};  // siteName → { score, activeHazards[] }

    hazards.forEach(h => {
        h.flaggedSites.forEach(site => {
            if (site.status === 'Cleared') return;   // cleared = no longer counts
            if (!map[site.name]) map[site.name] = { score: 0, activeHazards: [] };

            map[site.name].score += (SEVERITY_WEIGHT[h.severity] ?? 1);
            map[site.name].activeHazards.push({
                hazardId:    h._id,
                hazardTitle: h.title,
                severity:    h.severity,
                type:        h.type,
                hazardStatus: h.status,
                siteStatus:  site.status,
                distance:    site.distance
            });
        });
    });

    const result = {};
    Object.entries(map).forEach(([name, data]) => {
        result[name] = { score: data.score, activeHazards: data.activeHazards, ...scoreToHealth(data.score) };
    });
    return result;
}

// ── Auth Routes ───────────────────────────────────────────
app.post('/api/signup', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ message: 'Username and password required.' });
        const newUser = new User({ username, password: await bcrypt.hash(password, 10), role: 'GeoGuard' });
        await newUser.save();
        res.json({ message: 'Account created successfully!' });
    } catch (e) {
        res.status(400).json({ message: e.code === 11000 ? 'Username already exists.' : 'Error creating account.' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user || !(await bcrypt.compare(password, user.password)))
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        res.json({ success: true, user: { username: user.username, role: user.role } });
    } catch { res.status(500).json({ success: false, message: 'Server error during login.' }); }
});

// ── Heritage Health Route ─────────────────────────────────
// Returns computed health for every site that has active hazards.
// Sites with zero hazards = Excellent (handled client-side as default).
app.get('/api/heritage-health', requireAuth, async (req, res) => {
    try { res.json(await computeHeritageHealth()); }
    catch (err) { console.error(err); res.status(500).json({ message: 'Error computing heritage health.' }); }
});

// ── Hazard Routes ─────────────────────────────────────────
app.post('/api/report-hazard', requireAuth, async (req, res) => {
    try {
        const newHazard = new Hazard(req.body);
        if (newHazard.location?.lat && newHazard.location?.lng) {
            const sites   = JSON.parse(fs.readFileSync(path.join(__dirname, 'public', 'tagbilaran-heritages.json'), 'utf8'));
            let radiusKm  = newHazard.type === 'Fire' ? 0.5 : (newHazard.radius ?? 1);
            newHazard.flaggedSites = sites
                .filter(s => s.coordinates?.lat && s.coordinates?.lng)
                .map(s => ({ site: s, dist: haversineDistance(newHazard.location.lat, newHazard.location.lng, s.coordinates.lat, s.coordinates.lng) }))
                .filter(({ dist }) => dist <= radiusKm)
                .map(({ site, dist }) => ({ name: site.name, address: site.location?.address || '', distance: Math.round(dist * 1000), status: 'Unreviewed' }));
        }
        await newHazard.save();
        res.status(201).json(newHazard);
    } catch (err) { console.error(err); res.status(400).json({ message: err.message }); }
});

app.get('/api/hazards', async (req, res) => {
    try { res.json(await Hazard.find().sort({ timestamp: -1 })); }
    catch { res.status(500).json({ message: 'Error fetching data.' }); }
});

app.get('/api/hazards/:id', async (req, res) => {
    try {
        const h = await Hazard.findById(req.params.id);
        if (!h) return res.status(404).json({ message: 'Hazard not found.' });
        res.json(h);
    } catch { res.status(500).json({ message: 'Error fetching hazard.' }); }
});

app.put('/api/hazards/:id/verify', requireAdmin, async (req, res) => {
    try {
        const h = await Hazard.findByIdAndUpdate(req.params.id,
            { status: 'Verified', verifiedBy: req.user.username, verifiedAt: new Date() }, { new: true });
        if (!h) return res.status(404).json({ message: 'Hazard not found.' });
        res.json(h);
    } catch { res.status(500).json({ message: 'Error verifying hazard.' }); }
});

app.delete('/api/hazards/:id', requireAdmin, async (req, res) => {
    try {
        const h = await Hazard.findByIdAndDelete(req.params.id);
        if (!h) return res.status(404).json({ message: 'Hazard not found.' });
        res.json({ message: 'Hazard deleted successfully.' });
    } catch { res.status(500).json({ message: 'Error deleting hazard.' }); }
});

// Clearing a flagged site automatically improves the heritage's health score
app.patch('/api/hazards/:id/flagged-sites/:siteName', requireAdmin, async (req, res) => {
    try {
        const hazard = await Hazard.findById(req.params.id);
        if (!hazard) return res.status(404).json({ message: 'Hazard not found.' });
        const site = hazard.flaggedSites.find(s => s.name === decodeURIComponent(req.params.siteName));
        if (!site)  return res.status(404).json({ message: 'Flagged site not found.' });
        site.status = req.body.status;
        site.acknowledgedBy = req.body.acknowledgedBy;
        site.acknowledgedAt = new Date();
        await hazard.save();
        res.json(hazard);
    } catch (err) { console.error(err); res.status(500).json({ message: 'Error updating flagged site.' }); }
});

app.get('/api/flagged-sites', requireAuth, async (req, res) => {
    try {
        const hazards = await Hazard.find({ 'flaggedSites.0': { $exists: true } }).sort({ timestamp: -1 });
        const flagged = [];
        hazards.forEach(h => h.flaggedSites.forEach(site => {
            if (site.status === 'Unreviewed') flagged.push({
                hazardId: h._id, hazardTitle: h.title, hazardType: h.type,
                hazardSeverity: h.severity, siteName: site.name, siteAddress: site.address,
                distance: site.distance, status: site.status, reportedAt: h.timestamp
            });
        }));
        res.json(flagged);
    } catch { res.status(500).json({ message: 'Error fetching flagged sites.' }); }
});

app.get('/api/analytics', requireAuth, async (req, res) => {
    try {
        const sinceDate = periodToDate(req.query.period || '7d');
        const thirtyAgo = periodToDate('30d');
        const [total, severityDist, topSites, trends] = await Promise.all([
            Hazard.countDocuments(),
            Hazard.aggregate([{ $group: { _id: '$severity', count: { $sum: 1 } } }]),
            Hazard.aggregate([
                { $match: { incidentDate: { $gte: thirtyAgo } } },
                { $group: { _id: '$location.heritageSite', count: { $sum: 1 } } },
                { $sort: { count: -1 } }, { $limit: 5 }
            ]),
            Hazard.aggregate([
                { $match: { incidentDate: { $gte: sinceDate } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$incidentDate' } }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } }
            ])
        ]);
        res.json({ total, severityDist, topSites, trends });
    } catch { res.status(500).json({ message: 'Error fetching analytics.' }); }
});

app.listen(PORT, () => console.log(`🚀  Server running on port ${PORT}`));