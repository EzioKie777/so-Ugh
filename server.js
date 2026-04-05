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
    type: { type: String, required: true },
    description: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now }
});

const Hazard = mongoose.model('Hazard', hazardSchema);

// --- NEW: Route to Save a Hazard ---
app.post('/api/report-hazard', async (req, res) => {
    try {
        const { type, description, lat, lng } = req.body;
        const newHazard = new Hazard({ type, description, lat, lng });
        await newHazard.save();
        res.json({ success: true, message: "Hazard reported successfully!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to save report." });
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

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));