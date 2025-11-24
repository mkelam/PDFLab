"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const passport_oauth2_1 = require("passport-oauth2");
const models_1 = require("../models");
const axios_1 = __importDefault(require("axios"));
// Google OAuth Strategy
passport_1.default.use(new passport_google_oauth20_1.Strategy({
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3006/api/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
    try {
        console.log('[Google OAuth] Callback received');
        console.log('[Google OAuth] Profile ID:', profile.id);
        const email = profile.emails?.[0]?.value;
        console.log('[Google OAuth] Email:', email);
        if (!email) {
            console.error('[Google OAuth] ERROR: No email found in profile');
            return done(new Error('No email found in Google profile'));
        }
        // Find or create user
        let user = await models_1.User.findOne({ where: { email } });
        console.log('[Google OAuth] User lookup:', user ? 'Found existing user' : 'New user');
        if (!user) {
            // Create new user
            console.log('[Google OAuth] Creating new user:', email);
            user = await models_1.User.create({
                email,
                name: profile.displayName || email.split('@')[0],
                password_hash: '', // No password for OAuth users
                plan: 'free',
                conversions_used: 0,
                conversions_limit: 3,
                google_id: profile.id,
            });
            console.log('[Google OAuth] ✅ New user created:', user.id);
        }
        else if (!user.google_id) {
            // Link existing user to Google
            console.log('[Google OAuth] Linking existing user to Google:', user.id);
            user.google_id = profile.id;
            await user.save();
            console.log('[Google OAuth] ✅ User linked to Google');
        }
        else {
            console.log('[Google OAuth] ✅ User already linked to Google');
        }
        return done(null, user);
    }
    catch (error) {
        console.error('[Google OAuth] ERROR:', error);
        return done(error);
    }
}));
// LinkedIn OAuth Strategy (OpenID Connect) - Disabled for now
// Only enable if LINKEDIN_CLIENT_ID is configured
if (process.env.LINKEDIN_CLIENT_ID) {
    const linkedInStrategy = new passport_oauth2_1.Strategy({
        authorizationURL: 'https://www.linkedin.com/oauth/v2/authorization',
        tokenURL: 'https://www.linkedin.com/oauth/v2/accessToken',
        clientID: process.env.LINKEDIN_CLIENT_ID || '',
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
        callbackURL: process.env.LINKEDIN_CALLBACK_URL || 'http://localhost:3006/api/auth/linkedin/callback',
        scope: ['openid', 'profile', 'email'],
        state: false, // Disable state for stateless JWT auth
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            // Manually fetch user profile from LinkedIn OpenID Connect endpoint
            const { data: userInfo } = await axios_1.default.get('https://api.linkedin.com/v2/userinfo', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });
            const email = userInfo.email;
            const linkedinId = userInfo.sub;
            const name = userInfo.name || `${userInfo.given_name || ''} ${userInfo.family_name || ''}`.trim() || email.split('@')[0];
            if (!email) {
                return done(new Error('No email found in LinkedIn profile'));
            }
            // Find or create user
            let user = await models_1.User.findOne({ where: { email } });
            if (!user) {
                // Create new user
                user = await models_1.User.create({
                    email,
                    name,
                    password_hash: '', // No password for OAuth users
                    plan: 'free',
                    conversions_used: 0,
                    conversions_limit: 3,
                    linkedin_id: linkedinId,
                });
            }
            else if (!user.linkedin_id) {
                // Link existing user to LinkedIn
                user.linkedin_id = linkedinId;
                await user.save();
            }
            return done(null, user);
        }
        catch (error) {
            console.error('LinkedIn OAuth error:', error);
            return done(error);
        }
    });
    // Override userProfile to use LinkedIn OpenID Connect
    linkedInStrategy.userProfile = function (accessToken, done) {
        axios_1.default.get('https://api.linkedin.com/v2/userinfo', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        })
            .then(({ data }) => {
            const profile = {
                provider: 'linkedin',
                id: data.sub,
                displayName: data.name || `${data.given_name || ''} ${data.family_name || ''}`.trim(),
                name: {
                    familyName: data.family_name,
                    givenName: data.given_name,
                },
                emails: [{ value: data.email }],
                email: data.email,
                _raw: JSON.stringify(data),
                _json: data,
            };
            done(null, profile);
        })
            .catch((error) => {
            console.error('LinkedIn userProfile error:', error);
            done(error);
        });
    };
    passport_1.default.use('linkedin', linkedInStrategy);
}
exports.default = passport_1.default;
//# sourceMappingURL=passport.js.map