const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// 1. Connect to MongoDB (Paste your string here)
const MONGO_URI = "YOUR_MONGODB_CONNECTION_STRING_HERE";
mongoose.connect(MONGO_URI)
    .then(() => console.log("Connected to MongoDB Atlas!"))
    .catch(err => console.error("Connection error:", err));

// 2. Define the "Schema" (Like defining a Struct in C++)
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

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));