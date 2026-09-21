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

export * from './auth-types';
import { UserRole, PermissionLevel, ModulePermissions, AppUser, ROLE_CONFIG } from './auth-types';


const AUTH_STORE_PATH = path.join(process.cwd(), 'data', 'auth_users.json');

// Default initial admin users requested by the user
const DEFAULT_ADMIN_USERS: Array<{ email: string; pass: string; name: string; dept?: string }> = [
  {
    email: 'helenguerra@gmail.com',
    pass: '123123',
    name: 'Helen Guerra',
    dept: 'Executive / General Contractor',
  },
  {
    email: 'btxsupply@yahoo.com',
    pass: '123123',
    name: 'BTX Supply',
    dept: 'Procurement & Supply Operations',
  },
  {
    email: 'gandl.superuser@gmail.com',
    pass: '123123',
    name: 'G&L Superuser',
    dept: 'System Administration',
  },
  {
    email: 'rwmason3@gmail.com',
    pass: '123123',
    name: 'RW Mason',
    dept: 'Commercial Operations',
  },
  {
    email: 'moli@consestimate.com',
    pass: '123123',
    name: 'Mo Li',
    dept: 'Project Management',
  },
];

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

export function getDefaultPermissionsForRole(role: UserRole): ModulePermissions {
  return { ...(ROLE_CONFIG[role]?.defaultPermissions || ROLE_CONFIG.admin.defaultPermissions) };
}

function loadUsers(): AppUser[] {
  try {
    if (fs.existsSync(AUTH_STORE_PATH)) {
      const content = fs.readFileSync(AUTH_STORE_PATH, 'utf8');
      if (content && content.trim()) {
        const parsed: any[] = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          let modified = false;

          // Migrate any users missing permissions or is_active fields
          const users: AppUser[] = parsed.map((u) => {
            const role: UserRole = (u.role as UserRole) in ROLE_CONFIG ? u.role : 'admin';
            const permissions = u.permissions && Object.keys(u.permissions).length > 0
              ? { ...getDefaultPermissionsForRole(role), ...u.permissions }
              : getDefaultPermissionsForRole(role);

            const is_active = typeof u.is_active === 'boolean' ? u.is_active : true;

            if (!u.permissions || typeof u.is_active !== 'boolean') {
              modified = true;
            }

            return {
              ...u,
              role,
              is_active,
              permissions,
            };
          });

          // Ensure all default users exist
          for (const def of DEFAULT_ADMIN_USERS) {
            const existing = users.find((u) => u.email.toLowerCase() === def.email.toLowerCase());
            if (!existing) {
              const salt = crypto.randomBytes(16).toString('hex');
              users.push({
                id: crypto.randomUUID(),
                email: def.email.toLowerCase(),
                name: def.name,
                role: 'admin',
                department: def.dept,
                is_active: true,
                permissions: getDefaultPermissionsForRole('admin'),
                salt,
                passwordHash: hashPassword(def.pass, salt),
                created_at: new Date().toISOString(),
              });
              modified = true;
            }
          }

          if (modified) {
            saveUsers(users);
          }
          return users;
        }
      }
    }
  } catch (err) {
    console.error('Error reading auth_users.json:', err);
  }

  // Generate initial default users
  const initialUsers: AppUser[] = DEFAULT_ADMIN_USERS.map((u) => {
    const salt = crypto.randomBytes(16).toString('hex');
    return {
      id: crypto.randomUUID(),
      email: u.email.toLowerCase(),
      name: u.name,
      role: 'admin',
      department: u.dept,
      is_active: true,
      permissions: getDefaultPermissionsForRole('admin'),
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

export type SafeUser = Omit<AppUser, 'passwordHash' | 'salt'>;

export function getAllUsers(): SafeUser[] {
  const users = loadUsers();
  return users.map(({ passwordHash, salt, ...u }) => u);
}

export function findUserById(id: string): AppUser | null {
  const users = loadUsers();
  return users.find((u) => u.id === id) || null;
}

export function findUserByEmail(email: string): AppUser | null {
  const users = loadUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim()) || null;
}

export function verifyCredentials(email: string, pass: string): SafeUser | null {
  const user = findUserByEmail(email);
  if (!user || !user.is_active) return null;

  const testHash = hashPassword(pass, user.salt);
  if (crypto.timingSafeEqual(Buffer.from(testHash), Buffer.from(user.passwordHash))) {
    const { passwordHash, salt, ...safeUser } = user;
    return safeUser;
  }
  return null;
}

export function createUser(data: {
  email: string;
  name: string;
  password?: string;
  role: UserRole;
  department?: string;
  phone?: string;
  permissions?: Partial<ModulePermissions>;
}): SafeUser {
  const users = loadUsers();
  const emailClean = data.email.toLowerCase().trim();

  if (users.some((u) => u.email.toLowerCase() === emailClean)) {
    throw new Error(`A user with email ${emailClean} already exists.`);
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const password = data.password || '123123';
  const role = data.role in ROLE_CONFIG ? data.role : 'project_manager';

  const defaultPerms = getDefaultPermissionsForRole(role);
  const permissions: ModulePermissions = {
    ...defaultPerms,
    ...(data.permissions || {}),
  };

  const newUser: AppUser = {
    id: crypto.randomUUID(),
    email: emailClean,
    name: data.name.trim(),
    role,
    department: data.department?.trim() || undefined,
    phone: data.phone?.trim() || undefined,
    is_active: true,
    permissions,
    salt,
    passwordHash: hashPassword(password, salt),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  users.push(newUser);
  saveUsers(users);

  const { passwordHash, salt: _, ...safeUser } = newUser;
  return safeUser;
}

export function updateUser(
  id: string,
  updates: {
    name?: string;
    email?: string;
    role?: UserRole;
    department?: string;
    phone?: string;
    is_active?: boolean;
    permissions?: Partial<ModulePermissions>;
    password?: string;
  }
): SafeUser {
  const users = loadUsers();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) {
    throw new Error('User not found.');
  }

  const existing = users[index];

  // If email changing, verify uniqueness
  if (updates.email && updates.email.toLowerCase().trim() !== existing.email.toLowerCase()) {
    const emailClean = updates.email.toLowerCase().trim();
    if (users.some((u) => u.id !== id && u.email.toLowerCase() === emailClean)) {
      throw new Error(`Email ${emailClean} is already taken by another team member.`);
    }
    existing.email = emailClean;
  }

  if (updates.name !== undefined) existing.name = updates.name.trim();
  if (updates.department !== undefined) existing.department = updates.department.trim();
  if (updates.phone !== undefined) existing.phone = updates.phone.trim();
  if (updates.is_active !== undefined) existing.is_active = updates.is_active;

  // Role change may update base permissions if not explicitly overridden
  if (updates.role && updates.role in ROLE_CONFIG && updates.role !== existing.role) {
    existing.role = updates.role;
    if (!updates.permissions) {
      existing.permissions = getDefaultPermissionsForRole(updates.role);
    }
  }

  // Update specific permissions
  if (updates.permissions) {
    existing.permissions = {
      ...existing.permissions,
      ...updates.permissions,
    };
  }

  // Update password if provided
  if (updates.password && updates.password.trim()) {
    const salt = crypto.randomBytes(16).toString('hex');
    existing.salt = salt;
    existing.passwordHash = hashPassword(updates.password.trim(), salt);
  }

  existing.updated_at = new Date().toISOString();
  users[index] = existing;
  saveUsers(users);

  const { passwordHash, salt: _, ...safeUser } = existing;
  return safeUser;
}

export function deleteUser(id: string): boolean {
  const users = loadUsers();
  const filtered = users.filter((u) => u.id !== id);
  if (filtered.length === users.length) {
    return false;
  }
  saveUsers(filtered);
  return true;
}
