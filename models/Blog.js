const mongoose = require("mongoose");

let blogSchema = new mongoose.Schema({
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    message: {
        type: String,
        required: true
    },
    comments: [{
        sentBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        sentAt: {
            type: Date
        },
        liked: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }]
    }]
}, {timestamps: true})

module.exports = mongoose.model('Blog', blogSchema)