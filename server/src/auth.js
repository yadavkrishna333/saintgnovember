import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

const SALT = 'KY_INVENTORY_SECURITY_SALT_2026';

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password) + SALT).digest('hex');
}

function safeRead(filePath, defaultValue) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf-8');
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content || '[]');
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return defaultValue;
  }
}

function safeWrite(filePath, data) {
  try {
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }
}

// Pre-seed user Krishan with Krishan@123
const DEFAULT_USERS = [
  {
    id: 'usr-krishan',
    username: 'Krishan',
    passwordHash: hashPassword('Krishan@123'),
    token: 'tok-krishan-master-key-2026',
    createdAt: new Date().toISOString()
  }
];

let users = safeRead(USERS_FILE, DEFAULT_USERS);

// Ensure Krishan always exists with correct credentials
if (!users.some(u => u.username.toLowerCase() === 'krishan')) {
  users.unshift({
    id: 'usr-krishan',
    username: 'Krishan',
    passwordHash: hashPassword('Krishan@123'),
    token: 'tok-krishan-master-key-2026',
    createdAt: new Date().toISOString()
  });
  safeWrite(USERS_FILE, users);
}

export function registerUser(username, password) {
  const cleanUsername = String(username || '').trim();
  const cleanPassword = String(password || '').trim();

  if (!cleanUsername || cleanUsername.length < 2) {
    throw new Error('Username must be at least 2 characters long');
  }
  if (!cleanPassword || cleanPassword.length < 4) {
    throw new Error('Password must be at least 4 characters long');
  }

  const existing = users.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
  if (existing) {
    throw new Error(`Username "${cleanUsername}" is already registered. Please sign in.`);
  }

  const userId = `usr-${cleanUsername.toLowerCase().replace(/[^a-z0-9]/g, '')}-${crypto.randomUUID().slice(0, 4)}`;
  const token = `tok-${crypto.randomUUID()}`;

  const newUser = {
    id: userId,
    username: cleanUsername,
    passwordHash: hashPassword(cleanPassword),
    token,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  safeWrite(USERS_FILE, users);

  return {
    user: { id: newUser.id, username: newUser.username },
    token: newUser.token
  };
}

export function loginUser(username, password) {
  const cleanUsername = String(username || '').trim();
  const cleanPassword = String(password || '').trim();

  const user = users.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase());
  if (!user) {
    throw new Error('User not found. Please register first or check spelling.');
  }

  const expectedHash = hashPassword(cleanPassword);
  if (user.passwordHash !== expectedHash) {
    throw new Error('Incorrect password. Please try again.');
  }

  // Refresh token if needed
  if (!user.token) {
    user.token = `tok-${crypto.randomUUID()}`;
    safeWrite(USERS_FILE, users);
  }

  return {
    user: { id: user.id, username: user.username },
    token: user.token
  };
}

export function getUserByToken(token) {
  if (!token) return null;
  const user = users.find(u => u.token === token);
  if (!user) return null;
  return { id: user.id, username: user.username };
}

export function getUserById(userId) {
  if (!userId) return null;
  const user = users.find(u => u.id === userId);
  if (!user) return null;
  return { id: user.id, username: user.username };
}
