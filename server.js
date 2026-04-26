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
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// MongoDB Connection with better error handling
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/teer';

console.log('🔄 Connecting to MongoDB...');
console.log(`📦 Database URI: ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`); // Hide credentials in logs

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
                return /^\d{2}\/\d{2}\/\d{4}$/.test(v);
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
                data: { firstRound: 'Pending', secondRound: 'Pending' }
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

// Get all previous results (with pagination)
app.get('/api/results', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        
        if (mongoose.connection.readyState !== 1) {
            return res.json({
                success: false,
                message: 'Database not connected. Please run seed.js first.',
                data: [],
                count: 0
            });
        }
        
        const results = await TeerData.find({ type: 'result' })
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        
        const total = await TeerData.countDocuments({ type: 'result' });
        
        res.json({
            success: true,
            count: results.length,
            total: total,
            page: page,
            totalPages: Math.ceil(total / limit),
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

// ============ ADMIN API ROUTES (Protected) ============

// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
    const adminKey = req.headers['x-admin-key'] || req.query.adminKey;
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    if (adminKey === adminPassword) {
        next();
    } else {
        res.status(401).json({ 
            success: false, 
            error: 'Unauthorized. Invalid admin credentials.' 
        });
    }
};

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

// Update common numbers
app.post('/api/admin/update-common', authenticateAdmin, async (req, res) => {
    try {
        const { direct, house, ending } = req.body;
        const today = new Date().toLocaleDateString('en-GB');
        
        const common = await TeerData.findOneAndUpdate(
            { type: 'common', date: today },
            { 
                type: 'common', 
                date: today, 
                data: { 
                    direct: direct || [], 
                    house: house || [], 
                    ending: ending || [] 
                } 
            },
            { upsert: true, new: true }
        );
        
        console.log(`✅ Common numbers updated for ${today}`);
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

// Delete dream
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

// Get all results for admin
app.get('/api/admin/all-results', authenticateAdmin, async (req, res) => {
    try {
        const results = await TeerData.find({ type: 'result' })
            .sort({ date: -1 });
        
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

// Delete result
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
        res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
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

module.exports = app; // For testing purposes
