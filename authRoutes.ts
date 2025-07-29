import express, { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import Otp from '../models/Otp'; // OTP model
import Note from '../models/Note'; // Note model
import passport from 'passport';
import authMiddleware from '../middleware/authMiddleware'; // Import auth middleware

dotenv.config();

const router = express.Router();

// Set up nodemailer transporter for OTP email sending
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// ✅ Send OTP - This sends the OTP to the user's email
router.post('/send-otp', async (req: Request, res: Response) => {
    const { email } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    try {
        // Send OTP to user's email
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your OTP Code',
            text: `Your OTP is: ${otp}`,
        });

        // Store OTP with expiry of 5 minutes
        await Otp.findOneAndUpdate(
            { email },
            {
                otp,
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 5 * 60 * 1000), // OTP expiry in 5 minutes
            },
            { upsert: true, new: true }
        );

        console.log(`📩 OTP ${otp} sent to ${email}`);
        res.status(200).json({ message: 'OTP sent successfully' });
    } catch (err) {
        console.error('❌ Email send error:', err);
        res.status(500).json({ message: 'Failed to send OTP' });
    }
});

// ✅ Verify OTP - This checks if the OTP matches and isn't expired
router.post('/verify-otp', async (req: Request, res: Response) => {
    const { email, otp } = req.body;  // Extract email and OTP from the body

    try {
        const record = await Otp.findOne({ email });

        if (!record) {
            return res.status(400).json({ error: 'OTP not found' });
        }

        // Check if OTP is expired or mismatched
        const isExpired = record.expiresAt && record.expiresAt < new Date();
        const isMismatch = record.otp !== otp;

        if (isExpired || isMismatch) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        // Clean up OTP after verification
        await Otp.deleteOne({ email });

        // Generate JWT Token
        const token = jwt.sign({ email }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

        res.status(200).json({ token }); // Send back the token
    } catch (err) {
        console.error('❌ OTP verification error:', err);
        res.status(500).json({ error: 'Server error during verification' });
    }
});

// Google OAuth route (Google Login)
router.get(
    '/google',
    passport.authenticate('google', { scope: ['email', 'profile'], session: false }) // Disable session handling
);

// Google OAuth2 callback route
router.get(
    '/google/callback',
    passport.authenticate('google', { failureRedirect: '/login', session: false }), // No session, use JWT for stateless authentication
    (req: Request, res: Response) => {
        const user = req.user as { email: string; name: string };

        if (!user || !user.email) {
            console.error('❌ Google auth failed: No user info');
            return res.redirect('http://localhost:3000/login'); // Redirect to login if no user info
        }

        // Generate JWT Token
        const token = jwt.sign(
            { email: user.email, name: user.name },
            process.env.JWT_SECRET || 'secret', // Use JWT_SECRET from environment variables
            { expiresIn: '1h' } // Token expires in 1 hour
        );

        console.log('Redirecting to frontend with token:', token);

        // Redirect to frontend with token in URL
        res.redirect(`http://localhost:3000/dashboard?token=${token}`);
    }
);

// ✅ Create Note
router.post('/', authMiddleware, async (req: Request, res: Response) => {
    const { title, content } = req.body;
    const userEmail = req.user?.email; // Assuming user info is added via JWT middleware

    if (!userEmail) {
        return res.status(401).json({ error: 'Unauthorized: No email in token' });
    }

    if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' });
    }

    try {
        const newNote = new Note({ title, content, email: userEmail });
        await newNote.save();

        console.log('✅ Note created:', newNote);
        res.status(201).json(newNote);
    } catch (err) {
        console.error('❌ Error creating note:', err);
        res.status(500).json({ error: 'Failed to create note' });
    }
});

// ✅ Get Notes
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    const userEmail = req.user?.email;

    try {
        const notes = await Note.find({ email: userEmail });
        res.status(200).json(notes);
    } catch (err) {
        console.error('❌ Error fetching notes:', err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// ✅ Update Note
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
    const { title, content } = req.body;
    const userEmail = req.user?.email;

    if (!userEmail) {
        return res.status(401).json({ error: 'Unauthorized: No email in token' });
    }

    if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' });
    }

    try {
        const updatedNote = await Note.findOneAndUpdate(
            { _id: req.params.id, email: userEmail },
            { title, content },
            { new: true }
        );

        if (!updatedNote) {
            return res.status(404).json({ error: 'Note not found' });
        }

        res.status(200).json(updatedNote);
    } catch (err) {
        console.error('❌ Error updating note:', err);
        res.status(500).json({ error: 'Failed to update note' });
    }
});

// ✅ Delete Note
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
    const userEmail = req.user?.email;

    try {
        const result = await Note.findOneAndDelete({ _id: req.params.id, email: userEmail });

        if (!result) {
            return res.status(404).json({ error: 'Note not found' });
        }

        console.log('🗑️ Note deleted:', req.params.id);
        res.status(200).json({ message: 'Note deleted' });
    } catch (err) {
        console.error('❌ Error deleting note:', err);
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

export default router;
