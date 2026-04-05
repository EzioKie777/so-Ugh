const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public')); // This looks for your HTML files

const DATA_PATH = path.join(__dirname, 'database.json');

// SIGNUP: Writing to the "JSON Database"
app.post('/api/signup', (req, res) => {
    const { username, password } = req.body;
    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    
    data.users.push({ username, password });
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
    
    res.json({ message: "Account saved!" });
});

app.listen(PORT, () => console.log(`Server live on port ${PORT}`));