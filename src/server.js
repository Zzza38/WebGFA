const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '../static')));

// Example dynamic route
app.get('/api/data', (req, res) => {
    res.json({ message: "Hello from your dynamic server!" });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
