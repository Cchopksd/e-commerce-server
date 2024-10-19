import * as bcrypt from 'bcrypt';

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt();
  const hashPassword = await bcrypt.hash(password, salt);
  return hashPassword;
}

export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string,
): Promise<Boolean> {
  const match = await bcrypt.compare(plainPassword, hashedPassword);
  return match;
}
