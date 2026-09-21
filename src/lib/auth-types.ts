export type UserRole =
  | 'admin'
  | 'project_manager'
  | 'superintendent'
  | 'estimator'
  | 'subcontractor'
  | 'owner_rep';

export type PermissionLevel = 'none' | 'view' | 'edit' | 'admin';

export interface ModulePermissions {
  estimates: PermissionLevel;
  bidding: PermissionLevel;
  contracts: PermissionLevel;
  submittals: PermissionLevel;
  timeline: PermissionLevel;
  drawings: PermissionLevel;
  financials: PermissionLevel;
  field_logs: PermissionLevel;
  user_management: 'none' | 'view' | 'admin';
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  phone?: string;
  is_active: boolean;
  permissions: ModulePermissions;
  passwordHash: string;
  salt: string;
  created_at: string;
  updated_at?: string;
}

export const ROLE_CONFIG: Record<
  UserRole,
  { label: string; description: string; badgeColor: string; defaultPermissions: ModulePermissions }
> = {
  admin: {
    label: 'Administrator',
    description: 'Full unrestricted control across all projects, financials, settings, and team management.',
    badgeColor: 'bg-orange-950/60 text-orange-400 border-orange-700/60',
    defaultPermissions: {
      estimates: 'admin',
      bidding: 'admin',
      contracts: 'admin',
      submittals: 'admin',
      timeline: 'admin',
      drawings: 'admin',
      financials: 'admin',
      field_logs: 'admin',
      user_management: 'admin',
    },
  },
  project_manager: {
    label: 'Project Manager',
    description: 'Manages schedules, submittals, RFIs, change orders, contracts, and day-to-day project workflows.',
    badgeColor: 'bg-blue-950/60 text-blue-400 border-blue-700/60',
    defaultPermissions: {
      estimates: 'edit',
      bidding: 'edit',
      contracts: 'edit',
      submittals: 'admin',
      timeline: 'admin',
      drawings: 'admin',
      financials: 'edit',
      field_logs: 'admin',
      user_management: 'view',
    },
  },
  superintendent: {
    label: 'Site Superintendent',
    description: 'Oversees site field operations, daily logs, inspections, observations, and drawing markups.',
    badgeColor: 'bg-emerald-950/60 text-emerald-400 border-emerald-700/60',
    defaultPermissions: {
      estimates: 'view',
      bidding: 'none',
      contracts: 'view',
      submittals: 'edit',
      timeline: 'edit',
      drawings: 'edit',
      financials: 'none',
      field_logs: 'admin',
      user_management: 'none',
    },
  },
  estimator: {
    label: 'Lead Estimator',
    description: 'Prepares cost estimates, unit cost databases, takeoff items, and bid package leveling.',
    badgeColor: 'bg-purple-950/60 text-purple-400 border-purple-700/60',
    defaultPermissions: {
      estimates: 'admin',
      bidding: 'admin',
      contracts: 'view',
      submittals: 'view',
      timeline: 'view',
      drawings: 'view',
      financials: 'view',
      field_logs: 'none',
      user_management: 'none',
    },
  },
  subcontractor: {
    label: 'Subcontractor / Trade Partner',
    description: 'External trade partner access to assigned submittals, drawings, RFIs, and schedule activities.',
    badgeColor: 'bg-amber-950/60 text-amber-400 border-amber-700/60',
    defaultPermissions: {
      estimates: 'none',
      bidding: 'view',
      contracts: 'view',
      submittals: 'edit',
      timeline: 'view',
      drawings: 'view',
      financials: 'none',
      field_logs: 'none',
      user_management: 'none',
    },
  },
  owner_rep: {
    label: 'Owner / Client Representative',
    description: 'Client transparency access to progress dashboards, owner billing, pay apps, and milestone schedules.',
    badgeColor: 'bg-cyan-950/60 text-cyan-400 border-cyan-700/60',
    defaultPermissions: {
      estimates: 'view',
      bidding: 'none',
      contracts: 'view',
      submittals: 'view',
      timeline: 'view',
      drawings: 'view',
      financials: 'view',
      field_logs: 'view',
      user_management: 'none',
    },
  },
};
