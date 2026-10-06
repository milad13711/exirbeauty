import bcrypt from "bcryptjs";

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);
// Compared against when the user doesn't exist, so login timing doesn't reveal valid emails.
export const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO5y6zxZ9x6n5vWQhB1xq8Zl3m8F8x3Wm";
