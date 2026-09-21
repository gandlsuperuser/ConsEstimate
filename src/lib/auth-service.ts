import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export {
  createSessionToken,
  verifySessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from './session-token';
export type { UserSession } from './session-token';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: 'admin';
  passwordHash: string;
  salt: string;
  created_at: string;
}

const AUTH_STORE_PATH = path.join(process.cwd(), 'data', 'auth_users.json');

// Default provisioned admin users requested by the user
const DEFAULT_ADMIN_USERS: Array<{ email: string; pass: string; name: string }> = [
  {
    email: 'helenguerra@gmail.com',
    pass: '123123',
    name: 'Helen Guerra',
  },
  {
    email: 'btxsupply@yahoo.com',
    pass: '123123',
    name: 'BTX Supply',
  },
  {
    email: 'gandl.superuser@gmail.com',
    pass: '123123',
    name: 'G&L Superuser',
  },
  {
    email: 'rwmason3@gmail.com',
    pass: '123123',
    name: 'RW Mason',
  },
  {
    email: 'moli@consestimate.com',
    pass: '123123',
    name: 'Mo Li',
  },
];

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

function loadUsers(): AppUser[] {
  try {
    if (fs.existsSync(AUTH_STORE_PATH)) {
      const content = fs.readFileSync(AUTH_STORE_PATH, 'utf8');
      if (content && content.trim()) {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          let modified = false;
          for (const def of DEFAULT_ADMIN_USERS) {
            const existing = parsed.find(u => u.email.toLowerCase() === def.email.toLowerCase());
            if (!existing) {
              const salt = crypto.randomBytes(16).toString('hex');
              parsed.push({
                id: crypto.randomUUID(),
                email: def.email.toLowerCase(),
                name: def.name,
                role: 'admin',
                salt,
                passwordHash: hashPassword(def.pass, salt),
                created_at: new Date().toISOString(),
              });
              modified = true;
            }
          }
          if (modified) {
            saveUsers(parsed);
          }
          return parsed;
        }
      }
    }
  } catch (err) {
    console.error('Error reading auth_users.json:', err);
  }

  // Generate initial users
  const initialUsers: AppUser[] = DEFAULT_ADMIN_USERS.map((u) => {
    const salt = crypto.randomBytes(16).toString('hex');
    return {
      id: crypto.randomUUID(),
      email: u.email.toLowerCase(),
      name: u.name,
      role: 'admin',
      salt,
      passwordHash: hashPassword(u.pass, salt),
      created_at: new Date().toISOString(),
    };
  });

  saveUsers(initialUsers);
  return initialUsers;
}

function saveUsers(users: AppUser[]) {
  try {
    const dir = path.dirname(AUTH_STORE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(AUTH_STORE_PATH, JSON.stringify(users, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving auth_users.json:', err);
  }
}

export function getAllUsers(): Omit<AppUser, 'passwordHash' | 'salt'>[] {
  const users = loadUsers();
  return users.map(({ passwordHash, salt, ...u }) => u);
}

export function findUserByEmail(email: string): AppUser | null {
  const users = loadUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim()) || null;
}

export function verifyCredentials(email: string, pass: string): Omit<AppUser, 'passwordHash' | 'salt'> | null {
  const user = findUserByEmail(email);
  if (!user) return null;

  const testHash = hashPassword(pass, user.salt);
  if (crypto.timingSafeEqual(Buffer.from(testHash), Buffer.from(user.passwordHash))) {
    const { passwordHash, salt, ...safeUser } = user;
    return safeUser;
  }
  return null;
}
