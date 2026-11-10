
require("dotenv").config();

const bcrypt = require("bcryptjs");
const User = require("../models/User");
const connectDB = require("../config/db");

const createAdmin = async () => {
    try {
        const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

        if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
            throw new Error(
                "Please provide ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD"
            );
        }

        if (ADMIN_PASSWORD.length < 6) {
            throw new Error("Admin password must contain at least 6 characters");
        }

        await connectDB();

        const existingAdmin = await User.findOne({
            email: ADMIN_EMAIL.toLowerCase()
        });

        if (existingAdmin) {
            console.log("An account with this email already exists.");
            return;
        }

        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

        const admin = await User.create({
            fullName: ADMIN_NAME,
            email: ADMIN_EMAIL,
            password: hashedPassword,
            role: "Admin"
        });

        console.log("Admin account created successfully!");
        console.log("Admin name:", admin.fullName);
        console.log("Admin email:", admin.email);
        console.log("Admin role:", admin.role);
    } catch (error) {
        console.error("Admin creation failed:", error.message);
        process.exitCode = 1;
    } finally {
        await require("mongoose").disconnect();
    }
};

createAdmin();
