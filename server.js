const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Use your connection string here (replace the placeholders!)
const MONGO_URI = "mongodb+srv://eziokie:endevourmysoul@cluster0.hbawoz5.mongodb.net/?appName=Cluster0";

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ SUCCESS: Connected to MongoDB Atlas!"))
    .catch(err => console.error("❌ ERROR: Could not connect to MongoDB:", err));

// Define the User Schema (The "Blueprint")
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'GeoGuard', enum: ['Admin', 'GeoGuard'] }
});

const User = mongoose.model('User', userSchema);

// 3. Updated Signup Logic
app.post('/api/signup', async (req, res) => {
    try {
        const { username, password, role = 'GeoGuard' } = req.body;
        const newUser = new User({ username, password, role });
        await newUser.save(); // This sends the data to the cloud
        res.json({ message: "Account saved to the cloud!" });
    } catch (error) {
        res.status(400).json({ message: "Error: User might already exist." });
    }
});

// 4. Updated Login Logic
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });

    if (user) {
        res.json({ success: true, message: "Login successful!", user: { username: user.username, role: user.role } });
    } else {
        res.status(401).json({ success: false, message: "Invalid credentials." });
    }
});

// --- NEW: Hazard Schema ---
const hazardSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ['Flood', 'Fire', 'Earthquake', 'Other'] },
  severity: { type: String, enum: ['Low', 'Moderate', 'Critical'] },
  description: String,
  incidentDate: { type: Date, required: true },
  location: {
    address: String,
    lat: Number,
    lng: Number,
    heritageSite: String
  },
  radius: { type: Number, default: null },
  flaggedSites: [{
    name: String,
    address: String,
    distance: Number,
    acknowledgedBy: String,
    acknowledgedAt: Date,
    status: { type: String, default: 'Unreviewed', enum: ['Unreviewed', 'Acknowledged', 'Cleared'] }
  }],
  impact: {
    casualties: Number,
    damageEstimate: Number
  },
  reporter: {
    name: String,
    contact: String
  },
  status: { type: String, default: 'Pending', enum: ['Pending', 'Verified', 'Rejected'] },
  verifiedBy: String,
  verifiedAt: Date,
  timestamp: { type: Date, default: Date.now }
});

const Hazard = mongoose.model('Hazard', hazardSchema);

// Haversine formula — returns distance in kilometers between two coordinates
function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// --- NEW: Route to Save a Hazard ---
app.post('/api/report-hazard', async (req, res) => {
    try {
        const newHazard = new Hazard(req.body);

        if (newHazard.location?.lat && newHazard.location?.lng) {
            const sitesPath = path.join(__dirname, 'public', 'tagbilaran-heritages.json');
            const sites = JSON.parse(fs.readFileSync(sitesPath, 'utf8'));

            let radiusKm = newHazard.radius ?? 1;
            if (newHazard.type === 'Fire') radiusKm = 0.5;

            const flagged = [];
            sites.forEach(site => {
                if (!site.coordinates?.lat || !site.coordinates?.lng) return;
                const dist = haversineDistance(
                    newHazard.location.lat, newHazard.location.lng,
                    site.coordinates.lat, site.coordinates.lng
                );
                if (dist <= radiusKm) {
                    flagged.push({
                        name: site.name,
                        address: site.location?.address || '',
                        distance: Math.round(dist * 1000),
                        status: 'Unreviewed'
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

// PATCH: Acknowledge or clear a flagged heritage site
app.patch('/api/hazards/:id/flagged-sites/:siteName', async (req, res) => {
    try {
        const { id, siteName } = req.params;
        const { status, acknowledgedBy } = req.body;

        const hazard = await Hazard.findById(id);
        if (!hazard) return res.status(404).json({ message: "Hazard not found." });

        const decodedName = decodeURIComponent(siteName);
        const site = hazard.flaggedSites.find(s => s.name === decodedName);
        if (!site) return res.status(404).json({ message: "Flagged site not found." });

        site.status = status;
        site.acknowledgedBy = acknowledgedBy;
        site.acknowledgedAt = new Date();

        await hazard.save();
        res.json(hazard);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error updating flagged site." });
    }
});

// GET: All unreviewed flagged sites across all hazards (for Command Center)
app.get('/api/flagged-sites', async (req, res) => {
    try {
        const hazards = await Hazard.find({ 'flaggedSites.0': { $exists: true } })
            .sort({ timestamp: -1 });

        const flagged = [];
        hazards.forEach(h => {
            h.flaggedSites.forEach(site => {
                if (site.status === 'Unreviewed') {
                    flagged.push({
                        hazardId: h._id,
                        hazardTitle: h.title,
                        hazardType: h.type,
                        hazardSeverity: h.severity,
                        siteName: site.name,
                        siteAddress: site.address,
                        distance: site.distance,
                        status: site.status,
                        reportedAt: h.timestamp
                    });
                }
            });
        });

        res.json(flagged);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching flagged sites." });
    }
});

// --- NEW: Route to Get All Hazards (To show on the map) ---
app.get('/api/hazards', async (req, res) => {
    try {
        const hazards = await Hazard.find().sort({ timestamp: -1 });
        res.json(hazards);
    } catch (error) {
        res.status(500).json({ message: "Error fetching data." });
    }
});

// --- GET: Single Hazard by ID ---
app.get('/api/hazards/:id', async (req, res) => {
    try {
        const hazard = await Hazard.findById(req.params.id);
        if (!hazard) {
            return res.status(404).json({ message: "Hazard not found." });
        }
        res.json(hazard);
    } catch (error) {
        res.status(500).json({ message: "Error fetching hazard details." });
    }
});

// GET: Aggregated Trends and Analytics
app.get('/api/analytics', async (req, res) => {
    try {
        const total = await Hazard.countDocuments();
        
        const severityDist = await Hazard.aggregate([
            { $group: { _id: "$severity", count: { $sum: 1 } } }
        ]);

        // Updated: Top Vulnerable Sites based on recent reports (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const topSites = await Hazard.aggregate([
            { $match: { timestamp: { $gte: thirtyDaysAgo } } },
            { $group: { _id: "$location.heritageSite", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const trends = await Hazard.aggregate([
            { $match: { timestamp: { $gte: sevenDaysAgo } } },
            { $group: { 
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } }, 
                count: { $sum: 1 } 
            }},
            { $sort: { "_id": 1 } }
        ]);

        res.json({ total, severityDist, topSites, trends });
    } catch (error) {
        res.status(500).json({ message: "Error fetching analytics" });
    }
});

// --- NEW: Route to Verify a Hazard Report ---
app.put('/api/hazards/:id/verify', async (req, res) => {
    try {
        const { id } = req.params;
        const { verifiedBy } = req.body; // Assume we pass the admin username
        const hazard = await Hazard.findByIdAndUpdate(id, {
            status: 'Verified',
            verifiedBy,
            verifiedAt: new Date()
        }, { new: true });
        if (!hazard) {
            return res.status(404).json({ message: "Hazard not found" });
        }
        res.json(hazard);
    } catch (error) {
        res.status(500).json({ message: "Error verifying hazard" });
    }
});

// --- DELETE: Remove a Hazard Report ---
app.delete('/api/hazards/:id', async (req, res) => {
    try {
        const hazard = await Hazard.findByIdAndDelete(req.params.id);
        if (!hazard) {
            return res.status(404).json({ message: "Hazard not found." });
        }
        res.json({ message: "Hazard deleted successfully." });
    } catch (error) {
        res.status(500).json({ message: "Error deleting hazard." });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));