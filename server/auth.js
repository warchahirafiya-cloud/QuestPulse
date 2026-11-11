import { randomBytes, createHash, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";

export const hashToken = value => createHash("sha256").update(value).digest("hex");
export const makeToken = () => randomBytes(32).toString("base64url");
export const hashPassword = password => bcrypt.hash(password, 12);
export const verifyPassword = (password, hash) => bcrypt.compare(password, hash);
export const newId = () => randomUUID();
