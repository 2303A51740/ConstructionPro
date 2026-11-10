
const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
    {
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true
        },

        title: {
            type: String,
            required: true,
            trim: true
        },

        category: {
            type: String,
            required: true,
            enum: [
                "Material",
                "Labor",
                "Equipment",
                "Transportation",
                "Other"
            ]
        },

        amount: {
            type: Number,
            required: true,
            min: 0
        },

        date: {
            type: Date,
            required: true
        },

        description: {
            type: String,
            default: ""
        },

        recordedBy: {
            type: String,
            required: true
        },

        submittedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },

        status: {
            type: String,
            enum: ["Pending", "Approved", "Rejected"],
            default: "Approved"
        },

        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        reviewedAt: {
            type: Date,
            default: null
        },

        rejectionReason: {
            type: String,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Expense", expenseSchema);
