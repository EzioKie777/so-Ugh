const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
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
    password: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

// 3. Updated Signup Logic
app.post('/api/signup', async (req, res) => {
    try {
        const { username, password } = req.body;
        const newUser = new User({ username, password });
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
        res.json({ success: true, message: "Login successful!" });
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
  location: {
    address: String,
    lat: Number,
    lng: Number,
    heritageSite: String,
    radius: Number
  },
  impact: {
    casualties: Number,
    damageEstimate: Number
  },
  reporter: {
    name: String,
    contact: String
  },
  status: { type: String, default: 'Active' },
  timestamp: { type: Date, default: Date.now }
});

const Hazard = mongoose.model('Hazard', hazardSchema);

// --- NEW: Route to Save a Hazard ---
app.post('/api/report-hazard', async (req, res) => {
    try {
        const newHazard = new Hazard(req.body);
        await newHazard.save();
        res.status(201).json(newHazard);
    } catch (err) {
        console.error(err);
        res.status(400).send(err.message);
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

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));