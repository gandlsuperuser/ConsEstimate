// ============================================================
// Timeline Module — TypeScript Type Definitions
// ============================================================

// ---- Enums / Union Types ----

export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled' | 'delayed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type DependencyType = 'FS' | 'FF' | 'SS' | 'SF';
export type ResourceType = 'employee' | 'subcontractor' | 'equipment' | 'material' | 'team';
export type MilestoneStatus = 'pending' | 'completed' | 'missed' | 'at_risk';
export type RiskProbability = 'low' | 'medium' | 'high';
export type RiskImpact = 'low' | 'medium' | 'high' | 'critical';
export type RiskStatus = 'open' | 'mitigated' | 'closed' | 'occurred';
export type WeatherType = 'rain' | 'snow' | 'wind' | 'extreme_heat' | 'extreme_cold' | 'storm' | 'other';
export type NotificationType = 'info' | 'warning' | 'urgent' | 'success';
export type NotificationCategory = 'general' | 'deadline' | 'overdue' | 'material' | 'inspection' | 'completed' | 'dependency' | 'weather';
export type InspectionResult = 'passed' | 'failed' | 'conditional' | 'pending';
export type EquipmentStatus = 'available' | 'in_use' | 'maintenance' | 'retired';
export type ProjectHealthStatus = 'on_schedule' | 'at_risk' | 'delayed';
export type ZoomLevel = 'day' | 'week' | 'month';
export type UpdateType = 'general' | 'milestone' | 'delay' | 'risk' | 'budget' | 'schedule';

// ---- Resource Entities ----

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  department: string | null;
  hourly_rate: number;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subcontractor {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  specialty: string | null;
  license_number: string | null;
  hourly_rate: number;
  rating: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Equipment {
  id: string;
  name: string;
  type: string | null;
  model: string | null;
  serial_number: string | null;
  daily_rate: number;
  status: EquipmentStatus;
  location: string | null;
  created_at: string;
  updated_at: string;
}

export interface Material {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  unit_cost: number;
  supplier: string | null;
  lead_time_days: number;
  in_stock: number;
  created_at: string;
  updated_at: string;
}

// ---- Timeline Core ----

export interface ProjectPhase {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  color: string;
  start_date: string | null;
  end_date: string | null;
  baseline_start: string | null;
  baseline_end: string | null;
  progress: number;
  status: TaskStatus;
  is_collapsed: boolean;
  created_at: string;
  updated_at: string;
  // Client-side computed
  tasks?: ProjectTask[];
}

export interface ProjectTask {
  id: string;
  project_id: string;
  phase_id: string | null;
  parent_task_id: string | null;
  name: string;
  description: string | null;
  assigned_to: string | null;
  department: string | null;
  start_date: string;
  end_date: string;
  duration: number;
  working_days: number | null;
  baseline_start: string | null;
  baseline_end: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  progress: number;
  is_milestone: boolean;
  is_critical: boolean;
  sort_order: number;
  budget: number;
  actual_cost: number;
  estimated_cost: number;
  weather_delay_days: number;
  inspection_required: boolean;
  inspection_passed: boolean | null;
  material_delivery_date: string | null;
  completion_date: string | null;
  notes: string | null;
  color: string | null;
  estimate_line_id: string | null;
  created_at: string;
  updated_at: string;
  // Client-side computed / joined
  dependencies?: TaskDependency[];
  assignments?: TaskAssignment[];
  children?: ProjectTask[];
  phase_name?: string;
  phase_color?: string;
}

export interface TaskDependency {
  id: string;
  predecessor_id: string;
  successor_id: string;
  dependency_type: DependencyType;
  lag_days: number;
  created_at: string;
}

export interface TaskAssignment {
  id: string;
  task_id: string;
  resource_type: ResourceType;
  resource_id: string;
  allocation_pct: number;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  // Joined resource name for display
  resource_name?: string;
}

export interface ProjectMilestone {
  id: string;
  project_id: string;
  task_id: string | null;
  name: string;
  description: string | null;
  target_date: string;
  actual_date: string | null;
  status: MilestoneStatus;
  is_key_milestone: boolean;
  sort_order: number;
  created_at: string;
}

// ---- Tracking ----

export interface ProjectUpdate {
  id: string;
  project_id: string;
  title: string;
  content: string | null;
  update_type: UpdateType;
  author: string | null;
  created_at: string;
}

export interface ProjectRisk {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  probability: RiskProbability;
  impact: RiskImpact;
  status: RiskStatus;
  mitigation_plan: string | null;
  owner: string | null;
  identified_date: string;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author: string;
  content: string;
  created_at: string;
}

export interface TaskStatusHistoryEntry {
  id: string;
  task_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  changed_at: string;
  notes: string | null;
}

export interface WeatherDelay {
  id: string;
  project_id: string;
  task_id: string | null;
  delay_date: string;
  delay_days: number;
  weather_type: WeatherType | null;
  description: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  project_id: string | null;
  task_id: string | null;
  title: string;
  message: string | null;
  type: NotificationType;
  category: NotificationCategory;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}

export interface Holiday {
  id: string;
  project_id: string | null;
  name: string;
  holiday_date: string;
  is_global: boolean;
}

export interface ProjectCalendar {
  id: string;
  project_id: string;
  work_days: string[];
  work_start_time: string;
  work_end_time: string;
}

export interface InspectionRecord {
  id: string;
  project_id: string;
  task_id: string | null;
  inspector_name: string | null;
  inspection_type: string | null;
  inspection_date: string;
  result: InspectionResult | null;
  notes: string | null;
  report_url: string | null;
  created_at: string;
}

export interface TaskChecklist {
  id: string;
  task_id: string;
  item: string;
  is_completed: boolean;
  sort_order: number;
  completed_at: string | null;
  completed_by: string | null;
}

export interface TimeEntry {
  id: string;
  task_id: string;
  employee_id: string | null;
  date: string;
  hours: number;
  description: string | null;
  billable: boolean;
}

export interface ActivityLog {
  id: string;
  project_id: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  description: string | null;
  actor: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ---- Composite / View Types ----

export interface TimelineData {
  phases: ProjectPhase[];
  tasks: ProjectTask[];
  dependencies: TaskDependency[];
  milestones: ProjectMilestone[];
  calendar: ProjectCalendar | null;
  holidays: Holiday[];
}

export interface GanttRow {
  id: string;
  type: 'phase' | 'task' | 'milestone';
  name: string;
  indent: number;
  startDate: Date;
  endDate: Date;
  baselineStart?: Date;
  baselineEnd?: Date;
  progress: number;
  status: TaskStatus;
  priority?: TaskPriority;
  isCritical: boolean;
  isCollapsed?: boolean;
  isMilestone: boolean;
  color: string;
  assignedTo?: string;
  phaseId?: string;
  parentTaskId?: string;
  dependencies?: string[]; // predecessor task IDs
  children?: GanttRow[];
  visible: boolean;
  task?: ProjectTask;
  phase?: ProjectPhase;
}

export interface ProjectHealth {
  status: ProjectHealthStatus;
  overallProgress: number;
  daysRemaining: number;
  daysBehind: number;
  estimatedCompletion: string | null;
  actualCompletion: string | null;
  scheduleVariance: number; // positive = ahead, negative = behind
  totalTasks: number;
  completedTasks: number;
  delayedTasks: number;
  criticalTasks: number;
  upcomingMilestones: ProjectMilestone[];
  totalBudget: number;
  spentBudget: number;
}

// ---- Form / Input Types ----

export interface CreateTaskInput {
  project_id: string;
  phase_id?: string;
  parent_task_id?: string;
  name: string;
  description?: string;
  assigned_to?: string;
  department?: string;
  start_date: string;
  end_date: string;
  duration?: number;
  status?: TaskStatus;
  priority?: TaskPriority;
  is_milestone?: boolean;
  budget?: number;
  estimated_cost?: number;
  inspection_required?: boolean;
  material_delivery_date?: string;
  notes?: string;
  color?: string;
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  progress?: number;
  actual_cost?: number;
  weather_delay_days?: number;
  inspection_passed?: boolean;
  completion_date?: string;
  sort_order?: number;
  is_critical?: boolean;
}

// ---- Constants ----

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  on_hold: 'On Hold',
  cancelled: 'Cancelled',
  delayed: 'Delayed',
};

export const TASK_STATUS_COLORS: Record<TaskStatus, { bg: string; text: string; ring: string; bar: string }> = {
  not_started: { bg: 'bg-slate-100', text: 'text-slate-700', ring: 'ring-slate-300', bar: '#94a3b8' },
  in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', ring: 'ring-blue-300', bar: '#3b82f6' },
  completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-300', bar: '#10b981' },
  on_hold: { bg: 'bg-amber-100', text: 'text-amber-700', ring: 'ring-amber-300', bar: '#f59e0b' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-300', bar: '#ef4444' },
  delayed: { bg: 'bg-orange-100', text: 'text-orange-700', ring: 'ring-orange-300', bar: '#f97316' },
};

export const PRIORITY_COLORS: Record<TaskPriority, { bg: string; text: string }> = {
  low: { bg: 'bg-slate-100', text: 'text-slate-600' },
  medium: { bg: 'bg-blue-100', text: 'text-blue-700' },
  high: { bg: 'bg-amber-100', text: 'text-amber-700' },
  critical: { bg: 'bg-red-100', text: 'text-red-700' },
};

export const HEALTH_STATUS_CONFIG: Record<ProjectHealthStatus, { label: string; emoji: string; color: string }> = {
  on_schedule: { label: 'On Schedule', emoji: '🟢', color: 'text-emerald-600' },
  at_risk: { label: 'At Risk', emoji: '🟡', color: 'text-amber-600' },
  delayed: { label: 'Delayed', emoji: '🔴', color: 'text-red-600' },
};

export const DEFAULT_PHASE_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#ef4444', '#f97316',
  '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
];

export const DEFAULT_CONSTRUCTION_PHASES = [
  { name: 'Preconstruction', tasks: ['Permits & Approvals', 'Site Survey', 'Engineering Review', 'Utility Locates', 'Submittals'] },
  { name: 'Site Work', tasks: ['Clearing & Demolition', 'Excavation', 'Grading', 'Erosion Control', 'Temporary Utilities'] },
  { name: 'Foundation', tasks: ['Footings Layout', 'Footings Pour', 'Foundation Walls', 'Waterproofing', 'Backfill'] },
  { name: 'Structural / Framing', tasks: ['Steel Erection', 'Floor Framing', 'Wall Framing', 'Roof Framing', 'Sheathing'] },
  { name: 'Roofing', tasks: ['Underlayment', 'Roofing Install', 'Flashing & Trim', 'Gutters'] },
  { name: 'Exterior', tasks: ['Windows & Doors', 'Siding / Cladding', 'Masonry Veneer', 'Exterior Painting'] },
  { name: 'MEP Rough-In', tasks: ['Electrical Rough', 'Plumbing Rough', 'HVAC Rough', 'Fire Suppression', 'Low Voltage / Data'] },
  { name: 'Insulation', tasks: ['Wall Insulation', 'Ceiling Insulation', 'Vapor Barrier'] },
  { name: 'Drywall', tasks: ['Drywall Hang', 'Drywall Tape & Mud', 'Drywall Sand & Prime'] },
  { name: 'Interior Finishes', tasks: ['Interior Paint', 'Trim & Millwork', 'Flooring Install', 'Tile Work'] },
  { name: 'Cabinets & Countertops', tasks: ['Cabinet Install', 'Countertop Fabrication', 'Countertop Install'] },
  { name: 'MEP Finish', tasks: ['Electrical Finish', 'Plumbing Fixtures', 'HVAC Finish', 'Testing & Balancing'] },
  { name: 'Fixtures & Hardware', tasks: ['Light Fixtures', 'Plumbing Fixtures', 'Door Hardware', 'Accessories'] },
  { name: 'Final Inspection', tasks: ['Pre-Inspection Walkthrough', 'Building Inspection', 'Fire Marshal', 'Health Dept'] },
  { name: 'Punch List', tasks: ['Punch List Generation', 'Punch List Completion', 'Owner Walkthrough'] },
  { name: 'Project Closeout', tasks: ['Final Cleaning', 'As-Built Documents', 'Warranty Handoff', 'Certificate of Occupancy', 'Key Turnover'] },
];
