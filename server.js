const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;
// QUIET: set process.env.QUIET to 'false' to enable normal logging in dev
const QUIET = (process.env.QUIET === undefined) ? true : (String(process.env.QUIET).toLowerCase() !== 'false');

// Serve static files
app.use(express.static(__dirname));

// Send index.html for all routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    if (!QUIET) console.log(`Server is running on port ${port}`);
});
