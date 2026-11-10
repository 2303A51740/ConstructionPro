const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        type: {
            type: String,
            required: true,
            enum: ["Material", "Equipment", "Labor"]
        },

        category: {
            type: String,
            required: true
        },

        quantity: {
            type: Number,
            required: true,
            min: 0
        },

        unit: {
            type: String,
            default: "Units"
        },

        unitCost: {
            type: Number,
            default: 0,
            min: 0
        },

        status: {
            type: String,
            enum: ["Available", "Assigned", "In Use", "Maintenance"],
            default: "Available"
        },

        assignedProject: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            default: null
        },

        contact: {
            type: String,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Resource", resourceSchema);