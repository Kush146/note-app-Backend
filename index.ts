import express, { Request, Response } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import passport from 'passport';

import authRoutes from './routes/authRoutes';
import noteRoutes from './routes/noteRoutes';
import googleAuthRoutes from './routes/googleAuth';
import './utils/passportConfig'; // Google strategy config

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || '';

if (!MONGO_URI) {
    console.error('❌ MONGO_URI is missing in .env');
    process.exit(1);
}

// ✅ Middleware
app.use(cors({
    origin: 'http://localhost:3000', // Frontend URL
    credentials: true
}));
app.use(express.json());

// ✅ Passport setup
app.use(passport.initialize()); // Initialize passport without session

// ✅ Test route
app.get('/', (_req: Request, res: Response) => {
    res.send('✅ Note App API is running');
});

// ✅ Routes
app.use('/api/auth', authRoutes);         // Email OTP routes
app.use('/api/auth', googleAuthRoutes);   // Google Login routes
app.use('/api/notes', noteRoutes);        // Notes routes

// ✅ Connect DB and Start Server
const startServer = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    } catch (err: any) {
        console.error('❌ MongoDB connection error:', err.message || err);
        process.exit(1);
    }
};

startServer();
