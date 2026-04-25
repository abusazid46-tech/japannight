const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('public'));
app.use(cors());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.log('❌ MongoDB error:', err));

// Schema
const teerDataSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['result', 'common', 'dream']
    },
    date: String,
    data: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const TeerData = mongoose.model('TeerData', teerDataSchema);

// ============ SEED INITIAL DREAM DATA ============
async function seedInitialData() {
    const dreamCount = await TeerData.countDocuments({ type: 'dream' });
    if (dreamCount === 0) {
        const initialDreams = [
            { slNo: 1, dream: "Quarrel between husband and wife", direct: "03,08,13,37,40,73", house: "3", ending: "" },
            { slNo: 2, dream: "Erotic dream", direct: "17,40,53,59,60,83", house: "", ending: "" },
            { slNo: 3, dream: "Bathing in the open", direct: "08,18,28,48,78,98", house: "8", ending: "" },
            { slNo: 4, dream: "Travelling", direct: "08,14,18,52,64,68,74,78,98", house: "8", ending: "" },
            { slNo: 5, dream: "Snake or fish", direct: "09,17,37,57,77,99", house: "7", ending: "" },
            { slNo: 6, dream: "Money", direct: "00,14,15,20,25,35,50", house: "0,5", ending: "0" },
            { slNo: 7, dream: "Tiger", direct: "", house: "9", ending: "" },
            { slNo: 8, dream: "Elephant", direct: "", house: "9", ending: "" },
            { slNo: 9, dream: "Dog", direct: "4,5,6", house: "4", ending: "" },
            { slNo: 10, dream: "Fire", direct: "0", house: "", ending: "" }
        ];
        
        for (const dream of initialDreams) {
            await TeerData.create({
                type: 'dream',
                data: dream
            });
        }
        console.log('✅ Initial dream data seeded');
    }
}

// ============ PUBLIC API ROUTES ============

// Get today's result
app.get('/api/today-result', async (req, res) => {
    try {
        const today = new Date().toLocaleDateString('en-GB');
        const result = await TeerData.findOne({ 
            type: 'result', 
            date: today 
        });
        res.json(result || { success: false, message: 'No result for today' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get common numbers for today
app.get('/api/common-numbers', async (req, res) => {
    try {
        const today = new Date().toLocaleDateString('en-GB');
        const common = await TeerData.findOne({ 
            type: 'common', 
            date: today 
        });
        res.json(common || { success: false, message: 'No common numbers for today' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all previous results
app.get('/api/results', async (req, res) => {
    try {
        const results = await TeerData.find({ type: 'result' })
            .sort({ date: -1 })
            .limit(50);
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Search dream numbers
app.get('/api/search-dream', async (req, res) => {
    try {
        const keyword = req.query.q;
        if (!keyword) {
            const dreams = await TeerData.find({ type: 'dream' })
                .sort({ 'data.slNo': 1 });
            return res.json(dreams);
        }
        
        const dreams = await TeerData.find({ 
            type: 'dream',
            'data.dream': { $regex: keyword, $options: 'i' }
        });
        res.json(dreams);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all dreams
app.get('/api/dreams', async (req, res) => {
    try {
        const dreams = await TeerData.find({ type: 'dream' })
            .sort({ 'data.slNo': 1 });
        res.json(dreams);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
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
    try {
        const { firstRound, secondRound } = req.body;
        const today = new Date().toLocaleDateString('en-GB');
        
        await TeerData.findOneAndUpdate(
            { type: 'result', date: today },
            { 
                type: 'result', 
                date: today, 
                data: { firstRound, secondRound } 
            },
            { upsert: true }
        );
        res.json({ success: true, message: 'Result updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update common numbers
app.post('/api/admin/update-common', async (req, res) => {
    try {
        const { direct, house, ending } = req.body;
        const today = new Date().toLocaleDateString('en-GB');
        
        await TeerData.findOneAndUpdate(
            { type: 'common', date: today },
            { 
                type: 'common', 
                date: today, 
                data: { direct, house, ending } 
            },
            { upsert: true }
        );
        res.json({ success: true, message: 'Common numbers updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add dream number
app.post('/api/admin/add-dream', async (req, res) => {
    try {
        const dreamData = req.body;
        
        // Get highest slNo
        const lastDream = await TeerData.findOne({ type: 'dream' })
            .sort({ 'data.slNo': -1 });
        const newSlNo = lastDream ? lastDream.data.slNo + 1 : 1;
        
        dreamData.slNo = newSlNo;
        
        await TeerData.create({
            type: 'dream',
            data: dreamData
        });
        res.json({ success: true, message: 'Dream added successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete dream
app.delete('/api/admin/delete-dream/:id', async (req, res) => {
    try {
        await TeerData.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Dream deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all results for admin
app.get('/api/admin/all-results', async (req, res) => {
    try {
        const results = await TeerData.find({ type: 'result' })
            .sort({ date: -1 });
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete result
app.delete('/api/admin/delete-result/:id', async (req, res) => {
    try {
        await TeerData.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Result deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    await seedInitialData();
});
