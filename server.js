const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// CORS for development (remove for production)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-admin-key');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// MongoDB Connection with better error handling
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/teer';

console.log('🔄 Connecting to MongoDB...');
// Hide credentials in logs
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
    console.log('⚠️  Continuing without database... API will return fallback data');
});

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('⚠️  MongoDB disconnected');
});

// Schema with validation
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
            return this.type !== 'dream'; // Dreams don't require date
        }
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    }
}, { timestamps: true });

// Create indexes for better performance
teerDataSchema.index({ type: 1, date: -1 });
teerDataSchema.index({ 'data.slNo': 1 });

const TeerData = mongoose.model('TeerData', teerDataSchema);

// ============ HEALTH CHECK ROUTE ============
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

// ============ PUBLIC API ROUTES ============

// Get today's result
app.get('/api/today-result', async (req, res) => {
    try {
        const today = new Date().toLocaleDateString('en-GB');
        console.log(`[${new Date().toISOString()}] Fetching result for date: ${today}`);
        
        // Check if database is connected
        if (mongoose.connection.readyState !== 1) {
            console.log('Database not connected, returning fallback');
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

// Get common numbers for today
app.get('/api/common-numbers', async (req, res) => {
    try {
        const today = new Date().toLocaleDateString('en-GB');
        console.log(`[${new Date().toISOString()}] Fetching common numbers for date: ${today}`);
        
        if (mongoose.connection.readyState !== 1) {
            return res.json({
                success: false,
                message: 'Database not connected',
                data: { direct: [], house: [], ending: [] }
            });
        }
        
        const common = await TeerData.findOne({ 
            type: 'common', 
            date: today 
        }).lean();
        
        if (common && common.data) {
            res.json({
                success: true,
                date: common.date,
                data: common.data
            });
        } else {
            res.json({
                success: false,
                message: 'No common numbers generated for today',
                data: { direct: [], house: [], ending: [] }
            });
        }
    } catch (error) {
        console.error('Error fetching common numbers:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error',
            data: { direct: [], house: [], ending: [] }
        });
    }
});

app.get('/api/results', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.json({
                success: false,
                message: 'Database not connected',
                data: [],
                count: 0
            });
        }
        
        // Get ALL results without limit for the public page
        const results = await TeerData.find({ type: 'result' })
            .sort({ date: -1 })  // Sort by date descending on server side
            .lean();
        
        const total = results.length;
        
        res.json({
            success: true,
            count: total,
            total: total,
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
// Search dream numbers
app.get('/api/search-dream', async (req, res) => {
    try {
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

// Get all dreams (with optional limit)
app.get('/api/dreams', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        
        if (mongoose.connection.readyState !== 1) {
            return res.json({
                success: false,
                message: 'Database not connected. Please run seed.js first.',
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

// ============ ADMIN AUTHENTICATION MIDDLEWARE ============
// This middleware accepts both Bearer token and x-admin-key formats
const authenticateAdmin = (req, res, next) => {
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    // Check multiple possible locations for the password/token
    let providedPassword = null;
    
    // 1. Check Authorization header (Bearer token) - What your frontend sends
    if (req.headers.authorization) {
        const parts = req.headers.authorization.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer') {
            providedPassword = parts[1];
        } else if (parts.length === 1) {
            providedPassword = parts[0];
        }
    }
    
    // 2. Check x-admin-key header
    if (!providedPassword && req.headers['x-admin-key']) {
        providedPassword = req.headers['x-admin-key'];
    }
    
    // 3. Check query parameter
    if (!providedPassword && req.query.adminKey) {
        providedPassword = req.query.adminKey;
    }
    
    // 4. Check body (for some requests)
    if (!providedPassword && req.body && req.body.adminKey) {
        providedPassword = req.body.adminKey;
    }
    
    // Verify the password
    if (providedPassword === adminPassword) {
        console.log('✅ Admin authenticated successfully');
        next();
    } else {
        console.log(`❌ Auth failed - Provided: ${providedPassword}, Expected: ${adminPassword}`);
        res.status(401).json({ 
            success: false, 
            error: 'Unauthorized. Invalid admin credentials.' 
        });
    }
};

// ============ ADMIN API ROUTES ============

// Admin login check (no authentication needed)
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
// Update ONLY First Round (keeps existing Second Round)
// Update ONLY First Round (keeps existing Second Round, or 'XX' if none)
app.post('/api/admin/update-first-round', authenticateAdmin, async (req, res) => {
    try {
        const { firstRound } = req.body;
        const today = new Date().toLocaleDateString('en-GB');
        
        if (!firstRound) {
            return res.status(400).json({ 
                success: false, 
                error: 'First Round number is required' 
            });
        }
        
        // Validate number is 2-digit
        if (!/^\d{2}$/.test(firstRound)) {
            return res.status(400).json({ 
                success: false, 
                error: 'First Round must be a 2-digit number (00-99)' 
            });
        }
        
        // Get existing result to preserve Second Round
        const existingResult = await TeerData.findOne({ type: 'result', date: today });
        let secondRound = 'XX'; // Default to 'XX' instead of '00'
        
        if (existingResult && existingResult.data && existingResult.data.secondRound && existingResult.data.secondRound !== 'XX') {
            secondRound = existingResult.data.secondRound;
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
        
        console.log(`✅ First Round updated for ${today}: ${firstRound} (Second Round: ${secondRound})`);
        res.json({ 
            success: true, 
            message: 'First Round updated successfully',
            data: result
        });
    } catch (error) {
        console.error('Error updating first round:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Update ONLY Second Round (keeps existing First Round, or 'XX' if none)
app.post('/api/admin/update-second-round', authenticateAdmin, async (req, res) => {
    try {
        const { secondRound } = req.body;
        const today = new Date().toLocaleDateString('en-GB');
        
        if (!secondRound) {
            return res.status(400).json({ 
                success: false, 
                error: 'Second Round number is required' 
            });
        }
        
        // Validate number is 2-digit
        if (!/^\d{2}$/.test(secondRound)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Second Round must be a 2-digit number (00-99)' 
            });
        }
        
        // Get existing result to preserve First Round
        const existingResult = await TeerData.findOne({ type: 'result', date: today });
        let firstRound = 'XX'; // Default to 'XX' instead of '00'
        
        if (existingResult && existingResult.data && existingResult.data.firstRound && existingResult.data.firstRound !== 'XX') {
            firstRound = existingResult.data.firstRound;
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
        
        console.log(`✅ Second Round updated for ${today}: ${secondRound} (First Round: ${firstRound})`);
        res.json({ 
            success: true, 
            message: 'Second Round updated successfully',
            data: result
        });
    } catch (error) {
        console.error('Error updating second round:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Update Both Rounds - Modified to handle 'XX'
app.post('/api/admin/update-result', authenticateAdmin, async (req, res) => {
    try {
        let { firstRound, secondRound } = req.body;
        const today = new Date().toLocaleDateString('en-GB');
        
        if (!firstRound || !secondRound) {
            return res.status(400).json({ 
                success: false, 
                error: 'Both rounds are required' 
            });
        }
        
        // Handle 'XX' as a special value (not a number)
        let formattedFR, formattedSR;
        
        if (firstRound === 'XX' || firstRound === '--') {
            formattedFR = 'XX';
        } else if (/^\d{1,2}$/.test(firstRound)) {
            formattedFR = parseInt(firstRound).toString().padStart(2, '0');
        } else {
            return res.status(400).json({ 
                success: false, 
                error: 'First Round must be a number (0-99) or XX' 
            });
        }
        
        if (secondRound === 'XX' || secondRound === '--') {
            formattedSR = 'XX';
        } else if (/^\d{1,2}$/.test(secondRound)) {
            formattedSR = parseInt(secondRound).toString().padStart(2, '0');
        } else {
            return res.status(400).json({ 
                success: false, 
                error: 'Second Round must be a number (0-99) or XX' 
            });
        }
        
        const result = await TeerData.findOneAndUpdate(
            { type: 'result', date: today },
            { 
                type: 'result', 
                date: today, 
                data: { firstRound: formattedFR, secondRound: formattedSR } 
            },
            { upsert: true, new: true }
        );
        
        console.log(`✅ Results updated for ${today}: ${formattedFR} / ${formattedSR}`);
        res.json({ 
            success: true, 
            message: 'Results updated successfully',
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
// Update today's result (requires authentication)
app.post('/api/admin/update-result', authenticateAdmin, async (req, res) => {
    try {
        const { firstRound, secondRound } = req.body;
        const today = new Date().toLocaleDateString('en-GB');
        
        if (!firstRound || !secondRound) {
            return res.status(400).json({ 
                success: false, 
                error: 'Both rounds are required' 
            });
        }
        
        // Validate numbers are 2-digit
        if (!/^\d{2}$/.test(firstRound) || !/^\d{2}$/.test(secondRound)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Both rounds must be 2-digit numbers (00-99)' 
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
        
        console.log(`✅ Result updated for ${today}: ${firstRound}, ${secondRound}`);
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
// Update result by specific date (for bulk import)
app.post('/api/admin/update-result-by-date', authenticateAdmin, async (req, res) => {
    try {
        const { date, firstRound, secondRound } = req.body;
        
        if (!date || !firstRound || !secondRound) {
            return res.status(400).json({ 
                success: false, 
                error: 'Date, firstRound, and secondRound are required' 
            });
        }
        
        // Validate date format (DD/MM/YYYY)
        const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid date format. Use DD/MM/YYYY' 
            });
        }
        
        // Validate numbers are 2-digit
        if (!/^\d{2}$/.test(firstRound) || !/^\d{2}$/.test(secondRound)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Both rounds must be 2-digit numbers (00-99)' 
            });
        }
        
        const result = await TeerData.findOneAndUpdate(
            { type: 'result', date: date },
            { 
                type: 'result', 
                date: date, 
                data: { firstRound, secondRound } 
            },
            { upsert: true, new: true }
        );
        
        console.log(`✅ Result updated for ${date}: ${firstRound}, ${secondRound}`);
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
// Update common numbers - Supports separate F/R and S/R
app.post('/api/admin/update-common', authenticateAdmin, async (req, res) => {
    try {
        const { fr, sr } = req.body;
        const today = new Date().toLocaleDateString('en-GB');
        
        // Structure to store both F/R and S/R common numbers
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
            { 
                type: 'common', 
                date: today, 
                data: commonData
            },
            { upsert: true, new: true }
        );
        
        console.log(`✅ Common numbers updated for ${today}`);
        console.log(`   F/R - Direct: ${commonData.fr.direct.join(', ')}`);
        console.log(`   S/R - Direct: ${commonData.sr.direct.join(', ')}`);
        
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

// Get common numbers - Returns separate F/R and S/R
app.get('/api/common-numbers', async (req, res) => {
    try {
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
            // Check if data has the new structure
            if (common.data.fr && common.data.sr) {
                res.json({
                    success: true,
                    date: common.date,
                    data: common.data
                });
            } else {
                // Convert old structure to new structure
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
// Add dream number (requires authentication)
app.post('/api/admin/add-dream', authenticateAdmin, async (req, res) => {
    try {
        const { dream, direct, house, ending } = req.body;
        
        if (!dream) {
            return res.status(400).json({ 
                success: false, 
                error: 'Dream description is required' 
            });
        }
        
        // Check if dream already exists
        const existingDream = await TeerData.findOne({ 
            type: 'dream',
            'data.dream': { $regex: new RegExp(`^${dream}$`, 'i') }
        });
        
        if (existingDream) {
            return res.status(400).json({ 
                success: false, 
                error: 'Dream already exists in database' 
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
        
        console.log(`✅ Dream added: ${dream} (ID: ${newSlNo})`);
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

// Delete dream (requires authentication)
app.delete('/api/admin/delete-dream/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid dream ID' 
            });
        }
        
        const deleted = await TeerData.findByIdAndDelete(id);
        
        if (!deleted) {
            return res.status(404).json({ 
                success: false, 
                error: 'Dream not found' 
            });
        }
        
        console.log(`✅ Dream deleted: ${deleted.data.dream}`);
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

// Get all results for admin (requires authentication)
app.get('/api/admin/all-results', authenticateAdmin, async (req, res) => {
    try {
        const results = await TeerData.find({ type: 'result' })
            .sort({ date: -1 })  // Sort descending on server
            .lean();
        
        console.log(`✅ Retrieved ${results.length} results for admin`);
        res.json({
            success: true,
            count: results.length,
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
// Delete result (requires authentication)
app.delete('/api/admin/delete-result/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid result ID' 
            });
        }
        
        const deleted = await TeerData.findByIdAndDelete(id);
        
        if (!deleted) {
            return res.status(404).json({ 
                success: false, 
                error: 'Result not found' 
            });
        }
        
        console.log(`✅ Result deleted for date: ${deleted.date}`);
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
// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ 
        success: false, 
        error: 'API endpoint not found' 
    });
});

// General 404 handler for non-API routes
app.use((req, res) => {
    if (!req.path.startsWith('/api')) {
        // Check if 404.html exists
        const fs = require('fs');
        const notFoundPath = path.join(__dirname, 'public', '404.html');
        if (fs.existsSync(notFoundPath)) {
            res.status(404).sendFile(notFoundPath);
        } else {
            res.status(404).send('<h1>404 - Page Not Found</h1>');
        }
    }
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
    });
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
    console.log('\n✅ API Endpoints:');
    console.log(`   GET  /api/health - Health check`);
    console.log(`   GET  /api/today-result - Today's results`);
    console.log(`   GET  /api/common-numbers - Common numbers`);
    console.log(`   GET  /api/results - Previous results`);
    console.log(`   GET  /api/dreams - Dream numbers`);
    console.log(`   POST /api/admin/login - Admin login`);
    console.log(`   POST /api/admin/update-result - Update results (Protected)`);
    console.log(`   POST /api/admin/update-common - Update common numbers (Protected)`);
    console.log(`   POST /api/admin/add-dream - Add dream (Protected)`);
    console.log(`   GET  /api/admin/all-results - Get all results (Protected)`);
    console.log(`   DELETE /api/admin/delete-result/:id - Delete result (Protected)`);
    console.log(`   DELETE /api/admin/delete-dream/:id - Delete dream (Protected)`);
    console.log('\n💡 TIPS:');
    console.log(`   - First time? Run: node data/seed.js`);
    console.log(`   - Check DB status: GET /api/health`);
    console.log('='.repeat(50) + '\n');
});

// Graceful shutdown
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

module.exports = app; // For testing purposes
