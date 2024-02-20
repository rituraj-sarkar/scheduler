const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb+srv://rajsarkarbongaigaon7:yrKyx3JhMi5wGPki@cluster0.d85qsle.mongodb.net/scheduler_app');

// Define schemas
const UserSchema = new mongoose.Schema({
    email: String,
    refreshAccessToken: String
});

const User = mongoose.model('User', UserSchema);

module.exports = {
    User
};