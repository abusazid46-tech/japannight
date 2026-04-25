const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.log('❌ MongoDB error:', err));

const TeerData = require('./models/TeerData');

// ============ PUBLIC API ROUTES ============

// Get today's result
app.get('/api/today-result', async (req, res) => {
    const today = new Date().toLocaleDateString('en-GB');
    const result = await TeerData.findOne({ 
        type: 'result', 
        date: today 
    });
    res.json(result || { firstRound: '--', secondRound: '--' });
});

// Get common numbers for today
app.get('/api/common-numbers', async (req, res) => {
    const today = new Date().toLocaleDateString('en-GB');
    const common = await TeerData.findOne({ 
        type: 'common', 
        date: today 
    });
    res.json(common || { direct: [], house: [], ending: [] });
});

// Get all previous results
app.get('/api/results', async (req, res) => {
    const results = await TeerData.find({ type: 'result' })
        .sort({ date: -1 })
        .limit(50);
    res.json(results);
});

// Search dream numbers
app.get('/api/search-dream', async (req, res) => {
    const keyword = req.query.q;
    const dreams = await TeerData.find({ 
        type: 'dream',
        'data.dream': { $regex: keyword, $options: 'i' }
    });
    res.json(dreams);
});

// Get all dreams
app.get('/api/dreams', async (req, res) => {
    const dreams = await TeerData.find({ type: 'dream' })
        .sort({ 'data.slNo': 1 });
    res.json(dreams);
});

// ============ ADMIN API ROUTES ============

// Admin login check
app.post('/api/admin/login', async (req, res) => {
    const { password } = req.body;
    const isValid = password === process.env.ADMIN_PASSWORD;
    res.json({ success: isValid });
});

// Update today's result
app.post('/api/admin/update-result', async (req, res) => {
    const { firstRound, secondRound } = req.body;
    const today = new Date().toLocaleDateString('en-GB');
    
    await TeerData.findOneAndUpdate(
        { type: 'result', date: today },
        { type: 'result', date: today, data: { firstRound, secondRound } },
        { upsert: true }
    );
    res.json({ success: true });
});

// Update common numbers
app.post('/api/admin/update-common', async (req, res) => {
    const { direct, house, ending } = req.body;
    const today = new Date().toLocaleDateString('en-GB');
    
    await TeerData.findOneAndUpdate(
        { type: 'common', date: today },
        { type: 'common', date: today, data: { direct, house, ending } },
        { upsert: true }
    );
    res.json({ success: true });
});

// Add dream number
app.post('/api/admin/add-dream', async (req, res) => {
    const dreamData = req.body;
    await TeerData.create({
        type: 'dream',
        data: dreamData
    });
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
