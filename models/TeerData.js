const mongoose = require('mongoose');

// One collection to rule them all
const teerDataSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['result', 'common', 'dream']
    },
    date: String,  // For results and common numbers
    data: mongoose.Schema.Types.Mixed  // Store any structure
}, { timestamps: true });

module.exports = mongoose.model('TeerData', teerDataSchema);
