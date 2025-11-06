import { getServerSession } from 'next-auth/next';
import type { NextApiRequest, NextApiResponse } from 'next';

type AuthConfig = Exclude<Parameters<typeof getServerSession>[2], undefined>;

interface SessionLike {
  user?: {
    id?: string | null;
    email?: string | null;
  } | null;
}

export async function getSessionUserId(
  req: NextApiRequest,
  res: NextApiResponse,
  authConfig: AuthConfig,
): Promise<string | null> {
  const session = (await getServerSession(req, res, authConfig)) as SessionLike | null;
  const user = session?.user;
  return user?.id ?? user?.email ?? null;
}

export async function requireSessionUserId(
  req: NextApiRequest,
  res: NextApiResponse,
  authConfig: AuthConfig,
): Promise<string> {
  const userId = await getSessionUserId(req, res, authConfig);
  if (!userId) {
    throw new Error('UNAUTHORIZED');
  }
  return userId;
}
