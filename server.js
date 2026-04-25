const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// CORS for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/teer';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ MongoDB connected successfully'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err.message);
        console.log('⚠️  Continuing without database...');
    });

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

// ============ API ROUTES ============

// Get today's result
app.get('/api/today-result', async (req, res) => {
    try {
        const today = new Date().toLocaleDateString('en-GB');
        console.log(`Fetching result for date: ${today}`);
        
        const result = await TeerData.findOne({ 
            type: 'result', 
            date: today 
        });
        
        if (result) {
            res.json({
                success: true,
                date: result.date,
                data: result.data
            });
        } else {
            res.json({
                success: false,
                message: 'No result for today',
                data: { firstRound: '--', secondRound: '--' }
            });
        }
    } catch (error) {
        console.error('Error fetching today result:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Get common numbers for today
app.get('/api/common-numbers', async (req, res) => {
    try {
        const today = new Date().toLocaleDateString('en-GB');
        console.log(`Fetching common numbers for date: ${today}`);
        
        const common = await TeerData.findOne({ 
            type: 'common', 
            date: today 
        });
        
        if (common) {
            res.json({
                success: true,
                date: common.date,
                data: common.data
            });
        } else {
            res.json({
                success: false,
                message: 'No common numbers for today',
                data: { direct: [], house: [], ending: [] }
            });
        }
    } catch (error) {
        console.error('Error fetching common numbers:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Get all previous results
app.get('/api/results', async (req, res) => {
    try {
        const results = await TeerData.find({ type: 'result' })
            .sort({ date: -1 })
            .limit(50);
        
        res.json({
            success: true,
            count: results.length,
            data: results
        });
    } catch (error) {
        console.error('Error fetching results:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Search dream numbers
app.get('/api/search-dream', async (req, res) => {
    try {
        const keyword = req.query.q;
        let dreams;
        
        if (keyword && keyword.trim()) {
            dreams = await TeerData.find({ 
                type: 'dream',
                'data.dream': { $regex: keyword, $options: 'i' }
            });
        } else {
            dreams = await TeerData.find({ type: 'dream' })
                .sort({ 'data.slNo': 1 });
        }
        
        res.json({
            success: true,
            count: dreams.length,
            data: dreams
        });
    } catch (error) {
        console.error('Error searching dreams:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Get all dreams
app.get('/api/dreams', async (req, res) => {
    try {
        const dreams = await TeerData.find({ type: 'dream' })
            .sort({ 'data.slNo': 1 });
        
        res.json({
            success: true,
            count: dreams.length,
            data: dreams
        });
    } catch (error) {
        console.error('Error fetching dreams:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============ ADMIN API ROUTES ============

// Admin login check
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const isValid = password === adminPassword;
    
    res.json({ 
        success: isValid,
        message: isValid ? 'Login successful' : 'Invalid password'
    });
});

// Update today's result
app.post('/api/admin/update-result', async (req, res) => {
    try {
        const { firstRound, secondRound } = req.body;
        const today = new Date().toLocaleDateString('en-GB');
        
        if (!firstRound || !secondRound) {
            return res.status(400).json({ 
                success: false, 
                error: 'Both rounds are required' 
            });
        }
        
        const result = await TeerData.findOneAndUpdate(
            { type: 'result', date: today },
            { 
                type: 'result', 
                date: today, 
                data: { firstRound, secondRound } 
            },
            { upsert: true, new: true }
        );
        
        res.json({ 
            success: true, 
            message: 'Result updated successfully',
            data: result
        });
    } catch (error) {
        console.error('Error updating result:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Update common numbers
app.post('/api/admin/update-common', async (req, res) => {
    try {
        const { direct, house, ending } = req.body;
        const today = new Date().toLocaleDateString('en-GB');
        
        const common = await TeerData.findOneAndUpdate(
            { type: 'common', date: today },
            { 
                type: 'common', 
                date: today, 
                data: { direct, house, ending } 
            },
            { upsert: true, new: true }
        );
        
        res.json({ 
            success: true, 
            message: 'Common numbers updated successfully',
            data: common
        });
    } catch (error) {
        console.error('Error updating common numbers:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Add dream number
app.post('/api/admin/add-dream', async (req, res) => {
    try {
        const { dream, direct, house, ending } = req.body;
        
        if (!dream) {
            return res.status(400).json({ 
                success: false, 
                error: 'Dream description is required' 
            });
        }
        
        // Get highest slNo
        const lastDream = await TeerData.findOne({ type: 'dream' })
            .sort({ 'data.slNo': -1 });
        const newSlNo = lastDream ? lastDream.data.slNo + 1 : 1;
        
        const newDream = await TeerData.create({
            type: 'dream',
            data: {
                slNo: newSlNo,
                dream: dream,
                direct: direct || '',
                house: house || '',
                ending: ending || ''
            }
        });
        
        res.json({ 
            success: true, 
            message: 'Dream added successfully',
            data: newDream
        });
    } catch (error) {
        console.error('Error adding dream:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Delete dream
app.delete('/api/admin/delete-dream/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await TeerData.findByIdAndDelete(id);
        
        res.json({ 
            success: true, 
            message: 'Dream deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting dream:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Get all results for admin
app.get('/api/admin/all-results', async (req, res) => {
    try {
        const results = await TeerData.find({ type: 'result' })
            .sort({ date: -1 });
        
        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Error fetching all results:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Delete result
app.delete('/api/admin/delete-result/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await TeerData.findByIdAndDelete(id);
        
        res.json({ 
            success: true, 
            message: 'Result deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting result:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============ Serve HTML Pages ============
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/results.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'results.html'));
});

app.get('/common.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'common.html'));
});

app.get('/dreams.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dreams.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ============ Error Handling ============
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        error: 'API endpoint not found' 
    });
});

// ============ Start Server ============
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n🚀 Server is running!`);
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`🔑 Admin Login: http://localhost:${PORT}/admin.html`);
    console.log(`📝 Admin Password: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
    console.log(`\n✅ API endpoints ready:`);
    console.log(`   GET  /api/today-result`);
    console.log(`   GET  /api/common-numbers`);
    console.log(`   GET  /api/results`);
    console.log(`   GET  /api/dreams`);
    console.log(`   POST /api/admin/login`);
    console.log(`\n💡 Make sure to run: node data/seed.js first!\n`);
});
