const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL);

// Define schemas
const UserSchema = new mongoose.Schema({
    email: String,
    refreshAccessToken: String
});

const User = mongoose.model('User', UserSchema);

module.exports = {
    User
};