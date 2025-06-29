import {
  Adapter,
  AdapterAccount,
  AdapterSession,
  AdapterUser,
} from 'next-auth/adapters';

import {
  createUser,
  findUserByEmail,
} from './database';

export function CustomAdapter(): Adapter {
  return {
    async createUser(user: any) {
      const createdUser = await createUser({
        name: user.name || undefined,
        email: user.email!,
        image: user.image || undefined,
      });
      
      if (!createdUser) {
        throw new Error('Failed to create user');
      }
      
      return {
        id: createdUser.id,
        email: createdUser.email,
        name: createdUser.name,
        image: createdUser.image,
        emailVerified: null
      } as AdapterUser;
    },

    async getUser(id) {
      // For now, we'll use findUserByEmail as a workaround
      // In a real implementation, you'd add findUserById to the database functions
      return null;
    },

    async getUserByEmail(email) {
      const user = await findUserByEmail(email);
      if (!user) return null;
      
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: null
      } as AdapterUser;
    },

    async getUserByAccount({ provider, providerAccountId }) {
      // For now, we'll return null
      // In a real implementation, you'd implement account linking
      return null;
    },

    async updateUser(user) {
      // For now, we'll just return the user as-is
      // In a real implementation, you'd update the user in the database
      return user as AdapterUser;
    },

    async deleteUser(userId) {
      // Implementation would delete user and related data
      // For now, we'll just return undefined
      return undefined;
    },

    async linkAccount(account: any) {
      // For now, we'll just return the account as-is
      // In a real implementation, you'd create the account in the database
      return account as unknown as AdapterAccount;
    },

    async unlinkAccount({ provider, providerAccountId }) {
      // Implementation would delete the account
      // For now, we'll just return undefined
      return undefined;
    },

    async createSession(session) {
      // For now, we'll just return the session as-is
      // In a real implementation, you'd create the session in the database
      return {
        sessionToken: session.sessionToken,
        userId: session.userId,
        expires: session.expires
      } as AdapterSession;
    },

    async getSessionAndUser(sessionToken) {
      // For now, we'll return null
      // In a real implementation, you'd implement session management
      return null;
    },

    async updateSession(session) {
      // For now, we'll just return the session as-is
      // In a real implementation, you'd update the session in the database
      return session as AdapterSession;
    },

    async deleteSession(sessionToken) {
      // Implementation would delete the session
      // For now, we'll just return undefined
      return undefined;
    },

    async createVerificationToken(verificationToken) {
      // Implementation would create verification token
      // For now, we'll just return the token as-is
      return verificationToken;
    },

    async useVerificationToken({ identifier, token }) {
      // Implementation would use and delete verification token
      // For now, we'll just return null
      return null;
    }
  };
} 