
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"]
        },

        password: {
            type: String,
            required: true,
            minlength: 6
        },

        role: {
            type: String,
            required: true,
            enum: [
                "Admin",
                "Project Manager",
                "Site Engineer",
                "Contractor",
                "Store Manager"
            ]
        },

        phone: {
            type: String,
            default: ""
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("User", userSchema);
