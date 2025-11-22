# Authentication Setup Guide

Your application now has full authentication support with **Google OAuth** and **Phantom Wallet**!

## ✅ What's Been Implemented

1. **NextAuth.js Integration** - Industry-standard authentication framework
2. **Google OAuth** - Sign in with Google accounts
3. **Phantom Wallet Auth** - Cryptographic signature-based authentication
4. **Session Management** - Persistent user sessions
5. **Protected Routes** - User menu and profile system

## 🚀 Current Status

### Working Now (Without Setup)
- ✅ **Phantom Wallet Authentication** - Fully functional!
  - Users can connect their Phantom wallet
  - Sign a message to prove ownership
  - Create an account and log in
  - All cryptographic verification is working

### Requires Setup
- ⚠️ **Google OAuth** - Needs Google Cloud credentials (see below)

## 🔧 Google OAuth Setup

To enable Google login, you need to create OAuth credentials:

### Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select an existing one
3. Click "Create Credentials" → "OAuth client ID"
4. Configure the OAuth consent screen:
   - User Type: External
   - App name: Pillowtalk (or your app name)
   - User support email: your email
   - Developer contact: your email
5. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Name: Pillowtalk Web Client
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
     - (Add production URL later)
6. Copy the **Client ID** and **Client Secret**

### Step 2: Add Credentials to .env.local

Open `.env.local` and add your credentials:

```env
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

### Step 3: Restart the Development Server

Kill the current server (Ctrl+C) and restart:
```bash
npm run dev
```

## 🧪 Testing Authentication

### Test Phantom Wallet Login

1. Install [Phantom Wallet](https://phantom.app/) browser extension
2. Create/import a Solana wallet
3. Go to http://localhost:3000
4. Click "Login" or "Sign Up" button (top right)
5. Click "Continue with Phantom"
6. Choose a username (optional)
7. Click "Sign Message & Continue"
8. Approve the signature request in Phantom
9. ✅ You're logged in!

### Test Google Login (After Setup)

1. Go to http://localhost:3000
2. Click "Login" or "Sign Up" button
3. Click "Continue with Google"
4. Select your Google account
5. Approve the permissions
6. ✅ You're logged in!

## 🔐 How It Works

### Phantom Wallet Authentication
1. User connects wallet → Gets public key
2. App generates a unique sign-in message
3. User signs message with private key (in Phantom)
4. App verifies signature using public key
5. Creates authenticated session

### Google OAuth
1. User clicks "Continue with Google"
2. Redirects to Google's OAuth flow
3. User approves permissions
4. Google redirects back with auth code
5. NextAuth exchanges code for user info
6. Creates authenticated session

## 📁 Key Files

- `lib/auth.ts` - NextAuth configuration
- `lib/phantom-auth.ts` - Phantom wallet signature utilities
- `app/api/auth/[...nextauth]/route.ts` - NextAuth API routes
- `components/auth/AuthModal.tsx` - Login/signup UI
- `components/layout/UserMenu.tsx` - Logged-in user menu
- `.env.local` - Environment variables

## 🔄 Session Management

- Sessions persist across page reloads
- Stored securely via JWT tokens
- Auto-refresh to keep users logged in
- `useSession()` hook available throughout the app

## 🚨 Security Notes

### Production Deployment

Before deploying to production:

1. **Change NEXTAUTH_SECRET**:
   ```bash
   openssl rand -base64 32
   ```
   Add to `.env.local` and production environment

2. **Update NEXTAUTH_URL**:
   ```env
   NEXTAUTH_URL=https://your-production-domain.com
   ```

3. **Add production redirect URIs** to Google OAuth:
   - `https://your-domain.com/api/auth/callback/google`

4. **Use a real database** (currently using in-memory storage):
   - MongoDB, PostgreSQL, or any database
   - Update `lib/auth.ts` to use database instead of `Map`

## 🎯 What Users Can Do Now

- ✅ Create accounts with Google or Phantom
- ✅ Log in with their chosen method
- ✅ View their profile
- ✅ Access protected features
- ✅ Log out securely
- ✅ Session persists across refreshes

## 💡 Next Steps

Consider adding:
- [ ] User profile editing
- [ ] Email verification
- [ ] Password reset (for email/password auth)
- [ ] Two-factor authentication
- [ ] Social account linking
- [ ] Admin roles and permissions

## 🐛 Troubleshooting

### "Failed to authenticate with Phantom"
- Make sure Phantom extension is installed
- Check that you approved the signature request
- Try refreshing the page

### "Failed to login with Google"
- Verify Google OAuth credentials in `.env.local`
- Check redirect URIs match exactly
- Ensure OAuth consent screen is published

### Session not persisting
- Clear browser cookies
- Check `NEXTAUTH_SECRET` is set
- Restart development server

## 📞 Support

For issues or questions:
1. Check the console for error messages
2. Verify environment variables are set correctly
3. Ensure all dependencies are installed (`npm install`)

---

**🎉 Your authentication system is ready!** Users can now create accounts and log in with both Phantom Wallet and Google.
