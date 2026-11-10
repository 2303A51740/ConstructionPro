
const mongoose = require("mongoose");

const materialConsumptionSchema = new mongoose.Schema(
    {
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true
        },

        resource: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Resource",
            default: null
        },

        materialName: {
            type: String,
            required: true,
            trim: true
        },

        quantityConsumed: {
            type: Number,
            required: true,
            min: 0.01
        },

        unit: {
            type: String,
            required: true,
            trim: true
        },

        date: {
            type: Date,
            required: true
        },

        recordedBy: {
            type: String,
            required: true
        },

        notes: {
            type: String,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "MaterialConsumption",
    materialConsumptionSchema
);
