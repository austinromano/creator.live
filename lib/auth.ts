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
      if (account?.provider === 'google' && user.email) {
        let existingUser = await prisma.user.findUnique({
          where: { email: user.email.toLowerCase() },
        });

        if (!existingUser) {
          existingUser = await prisma.user.create({
            data: {
              username: user.name || user.email.split('@')[0],
              email: user.email.toLowerCase(),
              avatar: user.image,
            },
          });
        }

        user.id = existingUser.id;
      }

      if (account?.provider === 'phantom' && !user.id) {
        user.id = user.walletAddress || user.email || `phantom_${Date.now()}`;
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
        token.walletAddress = user.walletAddress;
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
  },
  secret: process.env.NEXTAUTH_SECRET,
};
