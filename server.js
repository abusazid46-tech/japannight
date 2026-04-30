const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-admin-key');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/teer';

console.log('🔄 Connecting to MongoDB...');
const hiddenUri = MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
console.log(`📦 Database URI: ${hiddenUri}`);

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
})
.then(() => {
    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`📍 Host: ${mongoose.connection.host}`);
})
.catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('⚠️  Continuing without database...');
});

mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('⚠️  MongoDB disconnected');
});

// Schema
const teerDataSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['result', 'common', 'dream']
    },
    date: {
        type: String,
        validate: {
            validator: function(v) {
                return !v || /^\d{2}\/\d{2}\/\d{4}$/.test(v);
            },
            message: props => `${props.value} is not a valid date format (DD/MM/YYYY)!`
        },
        required: function() {
            return this.type !== 'dream';
        }
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    }
}, { timestamps: true });

teerDataSchema.index({ type: 1, date: -1 });
teerDataSchema.index({ 'data.slNo': 1 });

const TeerData = mongoose.model('TeerData', teerDataSchema);

// ============ CACHE CONFIGURATION ============
// Dream: 5 hours = 18000 seconds
// Common Numbers: 5 minutes = 300 seconds  
// Previous Results: 10 minutes = 600 seconds
// Today's Result: 5 minutes = 300 seconds

// ============ HEALTH CHECK ============
app.get('/api/health', (req, res) => {
    const dbState = mongoose.connection.readyState;
    const dbStatus = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    };
    
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: {
            state: dbStatus[dbState],
            connected: dbState === 1
        },
        environment: process.env.NODE_ENV || 'development'
    });
});

// ============ PUBLIC API ROUTES WITH CACHING ============

// Get today's result (CACHE: 5 minutes)
app.get('/api/today-result', async (req, res) => {
    try {
        // Cache for 5 minutes (300 seconds)
        res.set('Cache-Control', 'public, max-age=300');
        
        const today = new Date().toLocaleDateString('en-GB');
        console.log(`[${new Date().toISOString()}] Fetching result for date: ${today}`);
        
        if (mongoose.connection.readyState !== 1) {
            return res.json({
                success: false,
                message: 'Database not connected',
                data: { firstRound: '--', secondRound: '--' }
            });
        }
        
        const result = await TeerData.findOne({ 
            type: 'result', 
            date: today 
        }).lean();
        
        if (result && result.data) {
            res.json({
                success: true,
                date: result.date,
                data: result.data
            });
        } else {
            res.json({
                success: false,
                message: 'No result declared for today',
                data: { firstRound: 'XX', secondRound: 'XX' }
            });
        }
    } catch (error) {
        console.error('Error fetching today result:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error',
            data: { firstRound: 'Error', secondRound: 'Error' }
        });
    }
});

// Get common numbers (CACHE: 5 minutes)
app.get('/api/common-numbers', async (req, res) => {
    try {
        // Cache for 5 minutes (300 seconds)
        res.set('Cache-Control', 'public, max-age=300');
        
        const today = new Date().toLocaleDateString('en-GB');
        console.log(`[${new Date().toISOString()}] Fetching common numbers for date: ${today}`);
        
        if (mongoose.connection.readyState !== 1) {
            return res.json({
                success: false,
                message: 'Database not connected',
                data: { fr: { direct: [], house: [], ending: [] }, sr: { direct: [], house: [], ending: [] } }
            });
        }
        
        const common = await TeerData.findOne({ 
            type: 'common', 
            date: today 
        }).lean();
        
        if (common && common.data) {
            if (common.data.fr && common.data.sr) {
                res.json({
                    success: true,
                    date: common.date,
                    data: common.data
                });
            } else {
                res.json({
                    success: true,
                    date: common.date,
                    data: {
                        fr: {
                            direct: common.data.direct || [],
                            house: common.data.house || [],
                            ending: common.data.ending || []
                        },
                        sr: {
                            direct: [],
                            house: [],
                            ending: []
                        }
                    }
                });
            }
        } else {
            res.json({
                success: false,
                message: 'No common numbers generated for today',
                data: { fr: { direct: [], house: [], ending: [] }, sr: { direct: [], house: [], ending: [] } }
            });
        }
    } catch (error) {
        console.error('Error fetching common numbers:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error',
            data: { fr: { direct: [], house: [], ending: [] }, sr: { direct: [], house: [], ending: [] } }
        });
    }
});

// Get all previous results (CACHE: 10 minutes)
app.get('/api/results', async (req, res) => {
    try {
        // Cache for 10 minutes (600 seconds)
        res.set('Cache-Control', 'public, max-age=600');
        
        if (mongoose.connection.readyState !== 1) {
            return res.json({
                success: false,
                message: 'Database not connected',
                data: [],
                count: 0
            });
        }
        
        const results = await TeerData.find({ type: 'result' })
            .sort({ date: -1 })
            .lean();
        
        res.json({
            success: true,
            count: results.length,
            total: results.length,
            data: results
        });
    } catch (error) {
        console.error('Error fetching results:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            data: []
        });
    }
});

// Search dream numbers (CACHE: 5 hours)
app.get('/api/search-dream', async (req, res) => {
    try {
        // Cache for 5 hours (18000 seconds)
        res.set('Cache-Control', 'public, max-age=18000');
        
        const keyword = req.query.q;
        
        if (mongoose.connection.readyState !== 1) {
            return res.json({
                success: false,
                message: 'Database not connected',
                data: [],
                count: 0
            });
        }
        
        let dreams;
        if (keyword && keyword.trim()) {
            dreams = await TeerData.find({ 
                type: 'dream',
                'data.dream': { $regex: keyword, $options: 'i' }
            }).lean();
        } else {
            dreams = await TeerData.find({ type: 'dream' })
                .sort({ 'data.slNo': 1 })
                .lean();
        }
        
        res.json({
            success: true,
            count: dreams.length,
            keyword: keyword || '',
            data: dreams
        });
    } catch (error) {
        console.error('Error searching dreams:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            data: []
        });
    }
});

// Get all dreams (CACHE: 5 hours)
app.get('/api/dreams', async (req, res) => {
    try {
        // Cache for 5 hours (18000 seconds)
        res.set('Cache-Control', 'public, max-age=18000');
        
        const limit = parseInt(req.query.limit) || 100;
        
        if (mongoose.connection.readyState !== 1) {
            return res.json({
                success: false,
                message: 'Database not connected',
                data: [],
                count: 0
            });
        }
        
        const dreams = await TeerData.find({ type: 'dream' })
            .sort({ 'data.slNo': 1 })
            .limit(limit)
            .lean();
        
        res.json({
            success: true,
            count: dreams.length,
            total: await TeerData.countDocuments({ type: 'dream' }),
            data: dreams
        });
    } catch (error) {
        console.error('Error fetching dreams:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            data: []
        });
    }
});

// ============ ADMIN AUTHENTICATION ============
const authenticateAdmin = (req, res, next) => {
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    let providedPassword = null;
    
    if (req.headers.authorization) {
        const parts = req.headers.authorization.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer') {
            providedPassword = parts[1];
        } else if (parts.length === 1) {
            providedPassword = parts[0];
        }
    }
    
    if (!providedPassword && req.headers['x-admin-key']) {
        providedPassword = req.headers['x-admin-key'];
    }
    
    if (!providedPassword && req.query.adminKey) {
        providedPassword = req.query.adminKey;
    }
    
    if (!providedPassword && req.body && req.body.adminKey) {
        providedPassword = req.body.adminKey;
    }
    
    if (providedPassword === adminPassword) {
        console.log('✅ Admin authenticated successfully');
        next();
    } else {
        console.log(`❌ Auth failed`);
        res.status(401).json({ 
            success: false, 
            error: 'Unauthorized. Invalid admin credentials.' 
        });
    }
};

// ============ ADMIN API ROUTES (NO CACHE - ALWAYS FRESH) ============

// Admin login
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const isValid = password === adminPassword;
    
    console.log(`Admin login attempt: ${isValid ? 'SUCCESS' : 'FAILED'}`);
    res.json({ 
        success: isValid,
        message: isValid ? 'Login successful' : 'Invalid password'
    });
});

// Update ONLY First Round
app.post('/api/admin/update-first-round', authenticateAdmin, async (req, res) => {
    try {
        const { firstRound } = req.body;
        const today = new Date().toLocaleDateString('en-GB');
        
        if (!firstRound) {
            return res.status(400).json({ success: false, error: 'First Round number is required' });
        }
        
        if (!/^\d{2}$/.test(firstRound)) {
            return res.status(400).json({ success: false, error: 'First Round must be a 2-digit number (00-99)' });
        }
        
        const existingResult = await TeerData.findOne({ type: 'result', date: today });
        let secondRound = 'XX';
        
        if (existingResult && existingResult.data && existingResult.data.secondRound && existingResult.data.secondRound !== 'XX') {
            secondRound = existingResult.data.secondRound;
        }
        
        const result = await TeerData.findOneAndUpdate(
            { type: 'result', date: today },
            { type: 'result', date: today, data: { firstRound, secondRound } },
            { upsert: true, new: true }
        );
        
        console.log(`✅ First Round updated for ${today}: ${firstRound} (Second Round: ${secondRound})`);
        res.json({ success: true, message: 'First Round updated successfully', data: result });
    } catch (error) {
        console.error('Error updating first round:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update ONLY Second Round
app.post('/api/admin/update-second-round', authenticateAdmin, async (req, res) => {
    try {
        const { secondRound } = req.body;
        const today = new Date().toLocaleDateString('en-GB');
        
        if (!secondRound) {
            return res.status(400).json({ success: false, error: 'Second Round number is required' });
        }
        
        if (!/^\d{2}$/.test(secondRound)) {
            return res.status(400).json({ success: false, error: 'Second Round must be a 2-digit number (00-99)' });
        }
        
        const existingResult = await TeerData.findOne({ type: 'result', date: today });
        let firstRound = 'XX';
        
        if (existingResult && existingResult.data && existingResult.data.firstRound && existingResult.data.firstRound !== 'XX') {
            firstRound = existingResult.data.firstRound;
        }
        
        const result = await TeerData.findOneAndUpdate(
            { type: 'result', date: today },
            { type: 'result', date: today, data: { firstRound, secondRound } },
            { upsert: true, new: true }
        );
        
        console.log(`✅ Second Round updated for ${today}: ${secondRound} (First Round: ${firstRound})`);
        res.json({ success: true, message: 'Second Round updated successfully', data: result });
    } catch (error) {
        console.error('Error updating second round:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update Both Rounds
app.post('/api/admin/update-result', authenticateAdmin, async (req, res) => {
    try {
        let { firstRound, secondRound } = req.body;
        const today = new Date().toLocaleDateString('en-GB');
        
        if (!firstRound || !secondRound) {
            return res.status(400).json({ success: false, error: 'Both rounds are required' });
        }
        
        let formattedFR, formattedSR;
        
        if (firstRound === 'XX' || firstRound === '--') {
            formattedFR = 'XX';
        } else if (/^\d{1,2}$/.test(firstRound)) {
            formattedFR = parseInt(firstRound).toString().padStart(2, '0');
        } else {
            return res.status(400).json({ success: false, error: 'First Round must be a number (0-99) or XX' });
        }
        
        if (secondRound === 'XX' || secondRound === '--') {
            formattedSR = 'XX';
        } else if (/^\d{1,2}$/.test(secondRound)) {
            formattedSR = parseInt(secondRound).toString().padStart(2, '0');
        } else {
            return res.status(400).json({ success: false, error: 'Second Round must be a number (0-99) or XX' });
        }
        
        const result = await TeerData.findOneAndUpdate(
            { type: 'result', date: today },
            { type: 'result', date: today, data: { firstRound: formattedFR, secondRound: formattedSR } },
            { upsert: true, new: true }
        );
        
        console.log(`✅ Results updated for ${today}: ${formattedFR} / ${formattedSR}`);
        res.json({ success: true, message: 'Results updated successfully', data: result });
    } catch (error) {
        console.error('Error updating result:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update result by specific date (for bulk import)
app.post('/api/admin/update-result-by-date', authenticateAdmin, async (req, res) => {
    try {
        const { date, firstRound, secondRound } = req.body;
        
        if (!date || !firstRound || !secondRound) {
            return res.status(400).json({ success: false, error: 'Date, firstRound, and secondRound are required' });
        }
        
        const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({ success: false, error: 'Invalid date format. Use DD/MM/YYYY' });
        }
        
        if (!/^\d{2}$/.test(firstRound) || !/^\d{2}$/.test(secondRound)) {
            return res.status(400).json({ success: false, error: 'Both rounds must be 2-digit numbers (00-99)' });
        }
        
        const result = await TeerData.findOneAndUpdate(
            { type: 'result', date: date },
            { type: 'result', date: date, data: { firstRound, secondRound } },
            { upsert: true, new: true }
        );
        
        console.log(`✅ Result updated for ${date}: ${firstRound}, ${secondRound}`);
        res.json({ success: true, message: 'Result updated successfully', data: result });
    } catch (error) {
        console.error('Error updating result:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update common numbers
app.post('/api/admin/update-common', authenticateAdmin, async (req, res) => {
    try {
        const { fr, sr } = req.body;
        const today = new Date().toLocaleDateString('en-GB');
        
        const commonData = {
            fr: {
                direct: fr?.direct || [],
                house: fr?.house || [],
                ending: fr?.ending || []
            },
            sr: {
                direct: sr?.direct || [],
                house: sr?.house || [],
                ending: sr?.ending || []
            }
        };
        
        const common = await TeerData.findOneAndUpdate(
            { type: 'common', date: today },
            { type: 'common', date: today, data: commonData },
            { upsert: true, new: true }
        );
        
        console.log(`✅ Common numbers updated for ${today}`);
        res.json({ success: true, message: 'Common numbers updated successfully', data: common });
    } catch (error) {
        console.error('Error updating common numbers:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add dream
app.post('/api/admin/add-dream', authenticateAdmin, async (req, res) => {
    try {
        const { dream, direct, house, ending } = req.body;
        
        if (!dream) {
            return res.status(400).json({ success: false, error: 'Dream description is required' });
        }
        
        const existingDream = await TeerData.findOne({ 
            type: 'dream',
            'data.dream': { $regex: new RegExp(`^${dream}$`, 'i') }
        });
        
        if (existingDream) {
            return res.status(400).json({ success: false, error: 'Dream already exists in database' });
        }
        
        const lastDream = await TeerData.findOne({ type: 'dream' }).sort({ 'data.slNo': -1 });
        const newSlNo = lastDream ? lastDream.data.slNo + 1 : 1;
        
        const newDream = await TeerData.create({
            type: 'dream',
            data: { slNo: newSlNo, dream: dream, direct: direct || '', house: house || '', ending: ending || '' }
        });
        
        console.log(`✅ Dream added: ${dream} (ID: ${newSlNo})`);
        res.json({ success: true, message: 'Dream added successfully', data: newDream });
    } catch (error) {
        console.error('Error adding dream:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete dream
app.delete('/api/admin/delete-dream/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: 'Invalid dream ID' });
        }
        
        const deleted = await TeerData.findByIdAndDelete(id);
        
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Dream not found' });
        }
        
        console.log(`✅ Dream deleted: ${deleted.data.dream}`);
        res.json({ success: true, message: 'Dream deleted successfully' });
    } catch (error) {
        console.error('Error deleting dream:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all results for admin (NO CACHE - always fresh)
app.get('/api/admin/all-results', authenticateAdmin, async (req, res) => {
    try {
        // No cache for admin - always get fresh data
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        
        const results = await TeerData.find({ type: 'result' }).sort({ date: -1 }).lean();
        console.log(`✅ Retrieved ${results.length} results for admin`);
        res.json({ success: true, count: results.length, data: results });
    } catch (error) {
        console.error('Error fetching all results:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete result
app.delete('/api/admin/delete-result/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: 'Invalid result ID' });
        }
        
        const deleted = await TeerData.findByIdAndDelete(id);
        
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Result not found' });
        }
        
        console.log(`✅ Result deleted for date: ${deleted.date}`);
        res.json({ success: true, message: 'Result deleted successfully' });
    } catch (error) {
        console.error('Error deleting result:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============ SERVE HTML PAGES ============
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

// ============ ERROR HANDLING ============
app.use('/api/*', (req, res) => {
    res.status(404).json({ success: false, error: 'API endpoint not found' });
});

app.use((req, res) => {
    if (!req.path.startsWith('/api')) {
        const fs = require('fs');
        const notFoundPath = path.join(__dirname, 'public', '404.html');
        if (fs.existsSync(notFoundPath)) {
            res.status(404).sendFile(notFoundPath);
        } else {
            res.status(404).send('<h1>404 - Page Not Found</h1>');
        }
    }
});

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
});

// ============ START SERVER ============
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    console.log('\n' + '='.repeat(50));
    console.log('🚀 TEER RESULTS SERVER STARTED');
    console.log('='.repeat(50));
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`🔑 Admin Panel: http://localhost:${PORT}/admin.html`);
    console.log(`📝 Admin Password: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('\n✅ CACHE CONFIGURATION:');
    console.log(`   📊 Today's Result: 5 minutes`);
    console.log(`   📊 Common Numbers: 5 minutes`);
    console.log(`   📊 Previous Results: 10 minutes`);
    console.log(`   📊 Dreams: 5 hours`);
    console.log(`   🔒 Admin APIs: No cache (always fresh)`);
    console.log('\n✅ API Endpoints:');
    console.log(`   GET  /api/health`);
    console.log(`   GET  /api/today-result (Cache: 5min)`);
    console.log(`   GET  /api/common-numbers (Cache: 5min)`);
    console.log(`   GET  /api/results (Cache: 10min)`);
    console.log(`   GET  /api/dreams (Cache: 5hrs)`);
    console.log(`   GET  /api/search-dream (Cache: 5hrs)`);
    console.log(`   POST /api/admin/login`);
    console.log(`   POST /api/admin/update-first-round`);
    console.log(`   POST /api/admin/update-second-round`);
    console.log(`   POST /api/admin/update-result`);
    console.log(`   POST /api/admin/update-common`);
    console.log(`   POST /api/admin/add-dream`);
    console.log(`   GET  /api/admin/all-results (No cache)`);
    console.log(`   DELETE /api/admin/delete-result/:id`);
    console.log(`   DELETE /api/admin/delete-dream/:id`);
    console.log('='.repeat(50) + '\n');
});

process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    server.close(() => {
        mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed');
            process.exit(0);
        });
    });
});

process.on('SIGINT', () => {
    console.log('\nSIGINT received, closing server...');
    server.close(() => {
        mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed');
            process.exit(0);
        });
    });
});

module.exports = app;
