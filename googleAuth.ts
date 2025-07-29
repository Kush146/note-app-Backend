import { Router, Request, Response } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';

const router = Router();

// Step 1: Redirect to Google for authentication
router.get(
    '/google',
    passport.authenticate('google', {
        scope: ['email', 'profile'],
        session: false, // Disable session handling for Google login
    })
);

// Step 2: Google OAuth2 callback route
router.get(
    '/google/callback',
    passport.authenticate('google', { failureRedirect: '/login', session: false }), // No session
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

export default router;
