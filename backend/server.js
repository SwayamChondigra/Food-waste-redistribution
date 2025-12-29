const express = require('express');
const app = express();

// Middleware to parse JSON and serve static frontend files
app.use(express.json());
app.use(express.static('frontend'));

// In-memory storage for food posts (no database)
let foodPosts = [];
let idCounter = 1;

// POST /api/food: Add a new food post from donor
app.post('/api/food', (req, res) => {
    const { foodName, quantity, location, expiry, phone } = req.body;
    // Validate required fields
    if (!foodName || !quantity || !location || !expiry || !phone) {
        return res.status(400).send('All fields are required');
    }
    const expiryDate = new Date(expiry);
    if (expiryDate <= new Date()) {
        return res.status(400).send('Expiry must be in the future');
    }
    // Create post with auto-generated ID and default status
    const post = {
        id: idCounter++,
        foodName,
        quantity,
        location,
        expiry: expiryDate, // Store as Date object for easy comparison
        phone,
        status: 'Available'
    };
    foodPosts.push(post);
    res.status(201).json(post);
});

// GET /api/food: Retrieve available (non-expired) food posts for NGO
app.get('/api/food', (req, res) => {
    const now = new Date();
    // Filter: Only available and not expired
    const available = foodPosts.filter(p => p.status === 'Available' && p.expiry > now);
    res.json(available);
});

// PUT /api/food/:id: Update status to 'Collected' for NGO
app.put('/api/food/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const post = foodPosts.find(p => p.id === id);
    if (post) {
        post.status = 'Collected';
        res.json(post);
    } else {
        res.status(404).send('Food post not found');
    }
});

// Start server on port 3000
app.listen(3000, () => console.log('RePlate server running on http://localhost:3000'));