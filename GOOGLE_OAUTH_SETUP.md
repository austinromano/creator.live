# Google OAuth Setup - 5 Minute Guide

## Step 1: Go to Google Cloud Console
👉 Click here: https://console.cloud.google.com/apis/credentials

## Step 2: Create/Select Project
- If you don't have a project: Click "CREATE PROJECT"
  - Project name: `Pillowtalk` (or any name)
  - Click "CREATE"
- If you have a project: Select it from the dropdown

## Step 3: Configure OAuth Consent Screen
1. Click "OAuth consent screen" (left sidebar)
2. Select **"External"** → Click "CREATE"
3. Fill in the required fields:
   - **App name**: `Pillowtalk`
   - **User support email**: Your email
   - **Developer contact information**: Your email
4. Click "SAVE AND CONTINUE"
5. Click "SAVE AND CONTINUE" (skip scopes)
6. Click "SAVE AND CONTINUE" (skip test users)
7. Click "BACK TO DASHBOARD"

## Step 4: Create OAuth Credentials
1. Click "Credentials" (left sidebar)
2. Click "CREATE CREDENTIALS" → "OAuth client ID"
3. Fill in:
   - **Application type**: Web application
   - **Name**: `Pillowtalk Web Client`
   - **Authorized redirect URIs**: Click "ADD URI" and paste:
     ```
     http://localhost:3000/api/auth/callback/google
     ```
4. Click "CREATE"

## Step 5: Copy Your Credentials
A popup will show your credentials:
- **Client ID**: Copy this (looks like: `xxxxx.apps.googleusercontent.com`)
- **Client secret**: Copy this

Keep this popup open and continue to Step 6...

## Step 6: Add Credentials to Your App

Open the file: `.env.local` in your project root

Replace these lines:
```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

With your actual credentials:
```env
GOOGLE_CLIENT_ID=paste-your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=paste-your-client-secret-here
```

Save the file.

## Step 7: Restart Your Server

In your terminal, stop the server (Ctrl+C) and restart:
```bash
npm run dev
```

## Step 8: Test It!

1. Go to http://localhost:3000
2. Click "Login" button
3. Click "Continue with Google"
4. Select your Google account
5. ✅ Done! You're logged in!

---

## Troubleshooting

### "Redirect URI mismatch" error
- Make sure the redirect URI is exactly: `http://localhost:3000/api/auth/callback/google`
- No trailing slash
- Must be `http` not `https` for localhost

### "App not verified" warning
- This is normal for development
- Click "Advanced" → "Go to [app name] (unsafe)"
- This won't show in production after verification

### Still not working?
1. Check `.env.local` has no extra spaces
2. Restart the dev server completely
3. Clear browser cookies
4. Try incognito mode

---

That's it! The whole process takes about 5 minutes.
