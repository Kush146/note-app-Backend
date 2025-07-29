import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';

dotenv.config();

// Minimal user object for JWT payload
interface GoogleProfile {
    email: string;
    name: string;
}

// 🔐 Configure Google Strategy
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
            callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
        },
        async (_accessToken, _refreshToken, profile, done) => {
            try {
                const user: GoogleProfile = {
                    email: profile.emails?.[0]?.value || '',
                    name: profile.displayName,
                };

                // Instead of saving to session, we return the user object
                // Done is used to pass the user data back to the callback route
                return done(null, user);
            } catch (err) {
                return done(err as any, undefined);
            }
        }
    )
);


export default passport;
