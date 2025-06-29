import {
  NextApiRequest,
  NextApiResponse,
} from 'next';

import { hashPassword } from '@/lib/auth';
import {
  createUser,
  findUserByEmail,
} from '@/lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, name, password, confirmPassword } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  // Check if user already exists
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    return res.status(409).json({ error: 'User already exists' });
  }

  // Hash the password
  const hashedPassword = await hashPassword(password);

  const user = await createUser({ 
    email, 
    name, 
    password: hashedPassword 
  });
  
  if (!user) {
    return res.status(500).json({ error: 'Failed to create user' });
  }

  return res.status(201).json({
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
  });
} 