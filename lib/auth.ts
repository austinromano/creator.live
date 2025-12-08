import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';
import bs58 from 'bs58';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

// Set up SHA512 for ed25519
ed.hashes.sha512 = (message: Uint8Array) => {
  return sha512(message);
};

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
        console.log('Phantom auth attempt:', {
          hasPublicKey: !!credentials?.publicKey,
          hasSignature: !!credentials?.signature,
          hasMessage: !!credentials?.message,
          publicKeyLength: credentials?.publicKey?.length,
          signatureLength: credentials?.signature?.length,
        });

        if (!credentials?.publicKey || !credentials?.signature || !credentials?.message) {
          console.error('Phantom auth: Missing credentials');
          return null;
        }

        try {
          // Verify the signature
          console.log('Decoding public key and signature...');
          const publicKeyBytes = bs58.decode(credentials.publicKey);
          const signatureBytes = bs58.decode(credentials.signature);
          const messageBytes = new TextEncoder().encode(credentials.message);

          console.log('Verifying signature...', {
            publicKeyBytesLength: publicKeyBytes.length,
            signatureBytesLength: signatureBytes.length,
            messageBytesLength: messageBytes.length,
          });

          const isValid = await ed.verify(signatureBytes, messageBytes, publicKeyBytes);
          console.log('Signature valid:', isValid);

          if (!isValid) {
            console.error('Phantom auth: Invalid signature');
            return null;
          }

          // Check if user exists in database or create new one
          console.log('Looking up user by wallet:', credentials.publicKey);
          let user = await prisma.user.findUnique({
            where: { walletAddress: credentials.publicKey },
          });

          if (!user) {
            console.log('Creating new user...');
            // Generate unique temp username - will be replaced during onboarding
            const tempId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
            user = await prisma.user.create({
              data: {
                username: `user_${tempId}`,
                walletAddress: credentials.publicKey,
                hasCompletedOnboarding: false,
              },
            });
            console.log('User created:', user.id);
          } else {
            console.log('Existing user found:', user.id);
          }

          return {
            id: user.id,
            name: user.username,
            walletAddress: user.walletAddress,
            provider: 'phantom',
          };
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
          const existingUser = await prisma.user.findUnique({
            where: { email: credentials.email.toLowerCase() },
          });

          if (existingUser) {
            throw new Error('User with this email already exists');
          }

          // Hash password
          const hashedPassword = await bcrypt.hash(credentials.password, 10);

          // Create new user in database
          const newUser = await prisma.user.create({
            data: {
              username: credentials.username,
              email: credentials.email.toLowerCase(),
              password: hashedPassword,
            },
          });

          // Return user without password
          return {
            id: newUser.id,
            name: newUser.username,
            email: newUser.email,
            provider: 'email',
          };
        } else {
          // Login flow
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

          // Return user without password
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
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google' && user.email) {
        // Check if user exists in database
        let existingUser = await prisma.user.findUnique({
          where: { email: user.email.toLowerCase() },
        });

        if (!existingUser) {
          // Create new user in database
          existingUser = await prisma.user.create({
            data: {
              username: user.name || user.email.split('@')[0],
              email: user.email.toLowerCase(),
              avatar: user.image,
            },
          });
        }

        // Update user object with database ID
        user.id = existingUser.id;
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
