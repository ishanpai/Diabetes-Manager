import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';

import { comparePassword } from '@/lib/auth';
import {
  createUser,
  findUserByEmail,
} from '@/lib/database';
import { CustomAdapter } from '@/lib/nextauth-adapter';

export const authOptions: NextAuthOptions = {
  adapter: CustomAdapter(),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await findUserByEmail(credentials.email);
          if (!user || !user.password) {
            return null;
          }

          const isValidPassword = await comparePassword(credentials.password, user.password);
          
          if (!isValidPassword) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user, account }: any) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (token) {
        session.user.id = token.id as string;
      }
      return session;
    },
    async signIn({ user, account, profile }: any) {
      if (account?.provider === 'google') {
        // Ensure user has required fields
        if (!user.email) {
          return false;
        }
        
        // Check if user exists, if not create them
        const existingUser = await findUserByEmail(user.email);

        if (!existingUser) {
          // Create new user from Google OAuth
          await createUser({
            email: user.email,
            name: user.name || '',
            image: user.image || '',
          });
        }
      }
      return true;
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions); 