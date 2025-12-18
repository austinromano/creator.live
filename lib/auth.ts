import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';
import bs58 from 'bs58';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

// Set up SHA512 for ed25519
ed.hashes.sha512 = (message: Uint8Array) => sha512(message);

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
    CredentialsProvider({
      id: 'phantom',
      name: 'Phantom Wallet',
      credentials: {
        publicKey: { label: 'Public Key', type: 'text' },
        signature: { label: 'Signature', type: 'text' },
        message: { label: 'Message', type: 'text' },
        username: { label: 'Username', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.publicKey || !credentials?.signature || !credentials?.message) {
          return null;
        }

        try {
          const publicKeyBytes = bs58.decode(credentials.publicKey);
          const signatureBytes = bs58.decode(credentials.signature);
          const messageBytes = new TextEncoder().encode(credentials.message);

          const isValid = await ed.verify(signatureBytes, messageBytes, publicKeyBytes);

          if (!isValid) {
            return null;
          }

          let user = await prisma.user.findUnique({
            where: { walletAddress: credentials.publicKey },
          });

          if (!user) {
            const tempId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
            user = await prisma.user.create({
              data: {
                username: `user_${tempId}`,
                walletAddress: credentials.publicKey,
                hasCompletedOnboarding: false,
              },
            });
          }

          return {
            id: user.id,
            name: user.username,
            walletAddress: user.walletAddress,
            provider: 'phantom',
          };
        } catch {
          return null;
        }
      },
    }),
    CredentialsProvider({
      id: 'email',
      name: 'Email and Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        username: { label: 'Username', type: 'text' },
        isSignup: { label: 'Is Signup', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const isSignup = credentials.isSignup === 'true';

        if (isSignup) {
          if (!credentials.username) {
            throw new Error('Username is required for signup');
          }

          const existingUser = await prisma.user.findUnique({
            where: { email: credentials.email.toLowerCase() },
          });

          if (existingUser) {
            throw new Error('User with this email already exists');
          }

          const hashedPassword = await bcrypt.hash(credentials.password, 10);

          const newUser = await prisma.user.create({
            data: {
              username: credentials.username,
              email: credentials.email.toLowerCase(),
              password: hashedPassword,
            },
          });

          return {
            id: newUser.id,
            name: newUser.username,
            email: newUser.email,
            provider: 'email',
          };
        } else {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email.toLowerCase() },
          });

          if (!user || !user.password) {
            throw new Error('No user found with this email');
          }

          const isValidPassword = await bcrypt.compare(credentials.password, user.password);

          if (!isValidPassword) {
            throw new Error('Invalid password');
          }

          return {
            id: user.id,
            name: user.username,
            email: user.email,
            provider: 'email',
          };
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // For Google OAuth, ensure user exists in database with normalized username
      if (account?.provider === 'google' && user.email) {
        let existingUser = await prisma.user.findUnique({
          where: { email: user.email.toLowerCase() },
        });

        if (!existingUser) {
          // Normalize username to lowercase and make URL-safe
          const baseUsername = (user.name || user.email.split('@')[0])
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, '_')
            .slice(0, 30);

          existingUser = await prisma.user.create({
            data: {
              username: baseUsername,
              email: user.email.toLowerCase(),
              avatar: user.image,
            },
          });
        }
        // Note: user.id will be set properly in jwt callback
      }

      return true;
    },
    async jwt({ token, user, account }) {
      // On initial sign-in, always look up the database user to get correct ID
      if (account && user) {
        token.provider = account.provider;
        token.email = user.email;
        token.image = user.image;
        token.walletAddress = user.walletAddress;

        let dbUser = null;

        // Always query database to ensure we have the correct user ID
        if (account.provider === 'google' && user.email) {
          dbUser = await prisma.user.findUnique({
            where: { email: user.email.toLowerCase() },
            select: { id: true, username: true },
          });
        } else if (account.provider === 'phantom' && user.walletAddress) {
          dbUser = await prisma.user.findUnique({
            where: { walletAddress: user.walletAddress },
            select: { id: true, username: true },
          });
        } else if (account.provider === 'email' && user.email) {
          dbUser = await prisma.user.findUnique({
            where: { email: (user.email as string).toLowerCase() },
            select: { id: true, username: true },
          });
        }

        if (dbUser) {
          token.id = dbUser.id;
          token.name = dbUser.username;
        } else {
          // Fallback - should only happen if DB lookup fails
          token.id = user.id;
          token.name = user.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.image = token.image as string | undefined;
        session.user.provider = token.provider as string;
        session.user.walletAddress = token.walletAddress as string | undefined;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) {
        return url;
      }
      return `${baseUrl}/golive`;
    },
  },
  pages: {
    signIn: '/',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  useSecureCookies: process.env.NODE_ENV === 'production',
  secret: process.env.NEXTAUTH_SECRET,
};
