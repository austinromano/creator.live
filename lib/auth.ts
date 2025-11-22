import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';
import bs58 from 'bs58';
import bcrypt from 'bcryptjs';

// Set up SHA512 for ed25519
ed.hashes.sha512 = (message: Uint8Array) => {
  return sha512(message);
};

// In-memory user storage (in production, use a database)
const users = new Map<string, any>();
const usersByEmail = new Map<string, any>();

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    CredentialsProvider({
      id: 'phantom',
      name: 'Phantom Wallet',
      credentials: {
        publicKey: { label: "Public Key", type: "text" },
        signature: { label: "Signature", type: "text" },
        message: { label: "Message", type: "text" },
        username: { label: "Username", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.publicKey || !credentials?.signature || !credentials?.message) {
          return null;
        }

        try {
          // Verify the signature
          const publicKeyBytes = bs58.decode(credentials.publicKey);
          const signatureBytes = bs58.decode(credentials.signature);
          const messageBytes = new TextEncoder().encode(credentials.message);

          const isValid = await ed.verify(signatureBytes, messageBytes, publicKeyBytes);

          if (!isValid) {
            return null;
          }

          // Check if user exists or create new one
          let user = users.get(credentials.publicKey);

          if (!user) {
            user = {
              id: credentials.publicKey,
              name: credentials.username || `phantom_${credentials.publicKey.slice(0, 6)}`,
              walletAddress: credentials.publicKey,
              provider: 'phantom',
              createdAt: new Date().toISOString(),
            };
            users.set(credentials.publicKey, user);
          }

          return user;
        } catch (error) {
          console.error('Phantom auth error:', error);
          return null;
        }
      },
    }),
    CredentialsProvider({
      id: 'email',
      name: 'Email and Password',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        username: { label: "Username", type: "text" },
        isSignup: { label: "Is Signup", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const isSignup = credentials.isSignup === 'true';

        if (isSignup) {
          // Sign up flow
          if (!credentials.username) {
            throw new Error('Username is required for signup');
          }

          // Check if user already exists
          if (usersByEmail.has(credentials.email.toLowerCase())) {
            throw new Error('User with this email already exists');
          }

          // Hash password
          const hashedPassword = await bcrypt.hash(credentials.password, 10);

          // Create new user
          const userId = `email_${credentials.email}`;
          const newUser = {
            id: userId,
            email: credentials.email.toLowerCase(),
            name: credentials.username,
            password: hashedPassword,
            provider: 'email',
            createdAt: new Date().toISOString(),
          };

          users.set(userId, newUser);
          usersByEmail.set(credentials.email.toLowerCase(), newUser);

          // Return user without password
          const { password, ...userWithoutPassword } = newUser;
          return userWithoutPassword;
        } else {
          // Login flow
          const user = usersByEmail.get(credentials.email.toLowerCase());

          if (!user) {
            throw new Error('No user found with this email');
          }

          const isValidPassword = await bcrypt.compare(credentials.password, user.password);

          if (!isValidPassword) {
            throw new Error('Invalid password');
          }

          // Return user without password
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        const userId = `google_${user.email}`;

        let existingUser = users.get(userId);

        if (!existingUser) {
          existingUser = {
            id: userId,
            email: user.email,
            name: user.name,
            image: user.image,
            provider: 'google',
            createdAt: new Date().toISOString(),
          };
          users.set(userId, existingUser);
          if (user.email) {
            usersByEmail.set(user.email.toLowerCase(), existingUser);
          }
        }

        // Update user object with our custom ID
        user.id = userId;
      }

      if (account?.provider === 'phantom') {
        // Phantom user is already set up in the authorize callback
        // Just ensure the user ID is set correctly
        if (!user.id) {
          user.id = (user as any).walletAddress || user.email || `phantom_${Date.now()}`;
        }
      }

      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.image = user.image;
        token.provider = account?.provider || 'unknown';
        token.walletAddress = (user as any).walletAddress;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).name = token.name;
        (session.user as any).email = token.email;
        (session.user as any).image = token.image;
        (session.user as any).provider = token.provider;
        (session.user as any).walletAddress = token.walletAddress;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // After sign in, redirect to user's profile page
      if (url.startsWith(baseUrl)) {
        return url;
      }
      // Default redirect to home after sign in
      return `${baseUrl}/profile`;
    },
  },
  pages: {
    signIn: '/',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key-change-in-production',
};
