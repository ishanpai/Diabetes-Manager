import {
  Adapter,
  AdapterAccount,
  AdapterSession,
  AdapterUser,
} from 'next-auth/adapters';

import {
  createAccount,
  createSession,
  createUser,
  deleteSession,
  findAccountByProvider,
  findSessionByToken,
  findUserByEmail,
  findUserById,
} from './database';

export function CustomAdapter(): Adapter {
  return {
    async createUser(user: any) {
      const createdUser = createUser({
        name: user.name || undefined,
        email: user.email!,
        emailVerified: user.emailVerified || undefined,
        image: user.image || undefined,
        password: undefined
      });
      
      return {
        id: createdUser.id,
        email: createdUser.email,
        name: createdUser.name,
        image: createdUser.image,
        emailVerified: createdUser.emailVerified
      } as AdapterUser;
    },

    async getUser(id) {
      const user = findUserById(id);
      if (!user) return null;
      
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: user.emailVerified
      } as AdapterUser;
    },

    async getUserByEmail(email) {
      const user = findUserByEmail(email);
      if (!user) return null;
      
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: user.emailVerified
      } as AdapterUser;
    },

    async getUserByAccount({ provider, providerAccountId }) {
      const account = findAccountByProvider(provider, providerAccountId);
      if (!account) return null;
      
      const user = findUserById(account.userId);
      if (!user) return null;
      
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: user.emailVerified
      } as AdapterUser;
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
      const createdAccount = createAccount({
        userId: account.userId,
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        refresh_token: account.refresh_token || undefined,
        access_token: account.access_token || undefined,
        expires_at: account.expires_at || undefined,
        token_type: account.token_type || undefined,
        scope: account.scope || undefined,
        id_token: account.id_token || undefined,
        session_state: account.session_state || undefined
      });
      
      return createdAccount as unknown as AdapterAccount;
    },

    async unlinkAccount({ provider, providerAccountId }) {
      // Implementation would delete the account
      // For now, we'll just return undefined
      return undefined;
    },

    async createSession(session) {
      const createdSession = createSession({
        sessionToken: session.sessionToken,
        userId: session.userId,
        expires: session.expires
      });
      
      return {
        sessionToken: createdSession.sessionToken,
        userId: createdSession.userId,
        expires: createdSession.expires
      } as AdapterSession;
    },

    async getSessionAndUser(sessionToken) {
      const session = findSessionByToken(sessionToken);
      if (!session) return null;
      
      const user = findUserById(session.userId);
      if (!user) return null;
      
      return {
        session: {
          sessionToken: session.sessionToken,
          userId: session.userId,
          expires: session.expires
        } as AdapterSession,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          emailVerified: user.emailVerified
        } as AdapterUser
      };
    },

    async updateSession(session) {
      // For now, we'll just return the session as-is
      // In a real implementation, you'd update the session in the database
      return session as AdapterSession;
    },

    async deleteSession(sessionToken) {
      deleteSession(sessionToken);
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