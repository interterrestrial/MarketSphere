import bcrypt from "bcryptjs";

/**
 * Password hashing (bcrypt, cost 12). Pure JS so it runs in Node.js,
 * ts-node, and anywhere else the service layer is imported.
 */
const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
