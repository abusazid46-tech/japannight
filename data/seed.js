const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/teer';

// Schema definition (same as server.js)
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

// ============ INITIAL DREAM DATA ============
const initialDreams = [
    { slNo: 1, dream: "Quarrel between husband and wife", direct: "03,08,13,37,40,73", house: "3", ending: "" },
    { slNo: 2, dream: "Erotic dream", direct: "17,40,53,59,60,83", house: "", ending: "" },
    { slNo: 3, dream: "Bathing in the open", direct: "08,18,28,48,78,98", house: "8", ending: "" },
    { slNo: 4, dream: "Travelling", direct: "08,14,18,52,64,68,74,78,98", house: "8", ending: "" },
    { slNo: 5, dream: "Travelling in an aeroplane", direct: "23,43,53,63,68,73,83,93", house: "3", ending: "" },
    { slNo: 6, dream: "Taking a walk", direct: "", house: "0,1", ending: "" },
    { slNo: 7, dream: "Studying", direct: "", house: "5", ending: "" },
    { slNo: 8, dream: "Corpse", direct: "", house: "9", ending: "9" },
    { slNo: 9, dream: "Playing", direct: "00,27,40,50,57,60", house: "", ending: "" },
    { slNo: 10, dream: "Talking over the phone", direct: "98,96,94", house: "", ending: "" },
    { slNo: 11, dream: "Eating", direct: "01,02,05,15,16,45,75,85,95", house: "", ending: "" },
    { slNo: 12, dream: "Breast Feeding", direct: "02,03,05,12,20,52,53", house: "", ending: "" },
    { slNo: 13, dream: "Male", direct: "", house: "6", ending: "6" },
    { slNo: 14, dream: "Female", direct: "", house: "5", ending: "5" },
    { slNo: 15, dream: "Child", direct: "", house: "2,3", ending: "2,3" },
    { slNo: 16, dream: "Police", direct: "7,87,8", house: "", ending: "" },
    { slNo: 17, dream: "Wild Pig", direct: "46", house: "", ending: "" },
    { slNo: 18, dream: "Snake or Ilea Fish", direct: "09,17,37,57,77,99", house: "7", ending: "" },
    { slNo: 19, dream: "Cow, Goat or Buffalo", direct: "12,18,19,22,24,34,42,54,72,74,84,94,97", house: "", ending: "" },
    { slNo: 20, dream: "Cow", direct: "", house: "4", ending: "4" },
    { slNo: 21, dream: "Tiger", direct: "", house: "9", ending: "" },
    { slNo: 22, dream: "Dog", direct: "4,5,6", house: "4", ending: "" },
    { slNo: 23, dream: "Horse", direct: "", house: "8", ending: "" },
    { slNo: 24, dream: "Bird", direct: "", house: "2", ending: "" },
    { slNo: 25, dream: "Elephant", direct: "", house: "9", ending: "" },
    { slNo: 26, dream: "Snail", direct: "", house: "0", ending: "0" },
    { slNo: 27, dream: "Turtle", direct: "", house: "9", ending: "" },
    { slNo: 28, dream: "Crab", direct: "6,2", house: "6", ending: "2" },
    { slNo: 29, dream: "Spider", direct: "6,12", house: "", ending: "" },
    { slNo: 30, dream: "Honey Bee", direct: "74,24,14,04,94", house: "4", ending: "" },
    { slNo: 31, dream: "Insect", direct: "37,21", house: "", ending: "" },
    { slNo: 32, dream: "Sour fruits", direct: "00,03,11,12,13,23,32,43,53,63,70,73,79,93", house: "", ending: "" },
    { slNo: 33, dream: "Paddy field", direct: "24,38,52,54,64,68,74", house: "", ending: "" },
    { slNo: 34, dream: "Pumpkin", direct: "28,35,48,53,58,68,78,88,98", house: "", ending: "" },
    { slNo: 35, dream: "Bamboo", direct: "", house: "0,1", ending: "" },
    { slNo: 36, dream: "Big Tree", direct: "", house: "8,9", ending: "" },
    { slNo: 37, dream: "Small tree", direct: "", house: "2,3,8", ending: "" },
    { slNo: 38, dream: "Banana", direct: "11,3", house: "", ending: "" },
    { slNo: 39, dream: "Jackfruit", direct: "", house: "4", ending: "" },
    { slNo: 40, dream: "Papaya", direct: "1,12", house: "1", ending: "" },
    { slNo: 41, dream: "Orange", direct: "", house: "8,9", ending: "" },
    { slNo: 42, dream: "Chilli", direct: "1,2", house: "1", ending: "2" },
    { slNo: 43, dream: "Bamboo Shoot", direct: "1,11", house: "1", ending: "1" },
    { slNo: 44, dream: "Tool used to cut wood", direct: "1,57,61,67", house: "6", ending: "" },
    { slNo: 45, dream: "Tools: cutter, chopper, hammer", direct: "07,17,27,47,67,71,87", house: "7", ending: "" },
    { slNo: 46, dream: "An event or a shopping place", direct: "18,28,38,52,58,62", house: "8", ending: "" },
    { slNo: 47, dream: "Money", direct: "00,14,15,20,25,35,50", house: "0,5", ending: "0" },
    { slNo: 48, dream: "Small water body", direct: "00,01,02,80,90", house: "4,7", ending: "0" },
    { slNo: 49, dream: "Footpath or a road made of bricks", direct: "19,61,71,91", house: "", ending: "" },
    { slNo: 50, dream: "Automobile: 4 wheeler", direct: "21,24,54,62,64", house: "8", ending: "4" },
    { slNo: 51, dream: "Automobile: 2/3 wheeler", direct: "52,53,54,58,60,62,68", house: "", ending: "" },
    { slNo: 52, dream: "God", direct: "09,13,29,89", house: "", ending: "" },
    { slNo: 53, dream: "Book, pen, paper", direct: "00,02,05", house: "0", ending: "3" },
    { slNo: 54, dream: "Earthquake", direct: "00,07,08,14,41,75,95", house: "", ending: "" },
    { slNo: 55, dream: "Ghost or apparition", direct: "52,54,58,62,64,68", house: "9", ending: "9" },
    { slNo: 56, dream: "Oven, kiln, fireplace", direct: "12,31,63,66,68", house: "", ending: "" },
    { slNo: 57, dream: "Fire", direct: "0", house: "", ending: "" },
    { slNo: 58, dream: "Hand Pump", direct: "2,3,7,17,18,20,71", house: "", ending: "" },
    { slNo: 59, dream: "Water Carrier", direct: "", house: "8", ending: "8" },
    { slNo: 60, dream: "Lake", direct: "", house: "6", ending: "" },
    { slNo: 61, dream: "Boat", direct: "", house: "3", ending: "" },
    { slNo: 62, dream: "Rice Chopper", direct: "", house: "8", ending: "" },
    { slNo: 63, dream: "Big river", direct: "", house: "8", ending: "" },
    { slNo: 64, dream: "Cooking pan", direct: "", house: "2", ending: "" },
    { slNo: 65, dream: "Shoe", direct: "", house: "8", ending: "" },
    { slNo: 66, dream: "Train", direct: "", house: "9", ending: "" },
    { slNo: 67, dream: "Temple", direct: "", house: "1,2,9", ending: "" },
    { slNo: 68, dream: "Umbrella", direct: "", house: "1", ending: "1" },
    { slNo: 69, dream: "Pencil", direct: "7,77,79", house: "7", ending: "7" }
];

// ============ INITIAL SAMPLE RESULTS (Last 30 days) ============
const getSampleResults = () => {
    const results = [];
    const today = new Date();
    
    for (let i = 1; i <= 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toLocaleDateString('en-GB');
        
        // Generate random two-digit numbers
        const firstRound = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        const secondRound = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        
        results.push({
            type: 'result',
            date: dateStr,
            data: {
                firstRound: firstRound,
                secondRound: secondRound
            }
        });
    }
    
    return results;
};

// ============ INITIAL COMMON NUMBERS (Last 7 days) ============
const getSampleCommonNumbers = () => {
    const commonNumbers = [];
    const today = new Date();
    
    const sampleData = [
        { direct: ["68", "39", "81"], house: ["4", "5"], ending: ["7", "2"] },
        { direct: ["45", "23", "67"], house: ["3", "8"], ending: ["1", "9"] },
        { direct: ["12", "56", "90"], house: ["2", "7"], ending: ["4", "6"] },
        { direct: ["34", "78", "21"], house: ["1", "9"], ending: ["3", "8"] },
        { direct: ["56", "89", "43"], house: ["5", "6"], ending: ["0", "5"] },
        { direct: ["67", "12", "98"], house: ["4", "2"], ending: ["7", "3"] },
        { direct: ["89", "34", "56"], house: ["7", "1"], ending: ["9", "4"] }
    ];
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toLocaleDateString('en-GB');
        
        commonNumbers.push({
            type: 'common',
            date: dateStr,
            data: sampleData[i % sampleData.length]
        });
    }
    
    return commonNumbers;
};

// ============ SEED FUNCTION ============
async function seedDatabase() {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        // Clear existing data (optional - comment out if you want to keep data)
        console.log('🗑️  Clearing existing data...');
        await TeerData.deleteMany({});
        console.log('✅ Existing data cleared');
        
        // Seed Dreams
        console.log('📝 Seeding dream data...');
        let dreamsInserted = 0;
        for (const dream of initialDreams) {
            await TeerData.create({
                type: 'dream',
                data: dream
            });
            dreamsInserted++;
        }
        console.log(`✅ ${dreamsInserted} dreams seeded`);
        
        // Seed Sample Results
        console.log('📊 Seeding sample results...');
        const sampleResults = getSampleResults();
        let resultsInserted = 0;
        for (const result of sampleResults) {
            await TeerData.create(result);
            resultsInserted++;
        }
        console.log(`✅ ${resultsInserted} sample results seeded`);
        
        // Seed Sample Common Numbers
        console.log('🔢 Seeding sample common numbers...');
        const sampleCommon = getSampleCommonNumbers();
        let commonInserted = 0;
        for (const common of sampleCommon) {
            await TeerData.create(common);
            commonInserted++;
        }
        console.log(`✅ ${commonInserted} common numbers seeded`);
        
        // Show summary
        console.log('\n📊 Database Seeding Summary:');
        console.log('='.repeat(40));
        console.log(`Total Dreams: ${initialDreams.length}`);
        console.log(`Total Results: ${sampleResults.length}`);
        console.log(`Total Common Numbers: ${sampleCommon.length}`);
        console.log('='.repeat(40));
        console.log('\n🎉 Database seeding completed successfully!');
        
        // Verify data
        const dreamCount = await TeerData.countDocuments({ type: 'dream' });
        const resultCount = await TeerData.countDocuments({ type: 'result' });
        const commonCount = await TeerData.countDocuments({ type: 'common' });
        
        console.log('\n✅ Verification:');
        console.log(`   Dreams in DB: ${dreamCount}`);
        console.log(`   Results in DB: ${resultCount}`);
        console.log(`   Common numbers in DB: ${commonCount}`);
        
    } catch (error) {
        console.error('❌ Error seeding database:', error);
    } finally {
        // Close connection
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
    }
}

// ============ RUN SEEDER ============
console.log('🚀 Starting database seeding...\n');
seedDatabase();
