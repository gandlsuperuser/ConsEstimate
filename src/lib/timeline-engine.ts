// ============================================================
// Timeline Engine — Core scheduling business logic
// ============================================================

import {
  ProjectTask,
  ProjectPhase,
  TaskDependency,
  Holiday,
  ProjectCalendar,
  GanttRow,
  ProjectHealth,
  ProjectMilestone,
  TimelineData,
  DEFAULT_CONSTRUCTION_PHASES,
  DEFAULT_PHASE_COLORS,
} from '@/types/timeline';

// ---- Date Utilities ----

const DAY_MS = 86400000;

/** Parse a date string to a Date at midnight UTC */
export function parseDate(s: string): Date {
  const d = new Date(s + 'T00:00:00');
  return d;
}

/** Format a Date to YYYY-MM-DD */
export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Get day name (mon, tue, ...) */
function dayName(d: Date): string {
  return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][d.getDay()];
}

/** Check if a date is a working day */
export function isWorkingDay(
  d: Date,
  workDays: string[] = ['mon', 'tue', 'wed', 'thu', 'fri'],
  holidays: Set<string> = new Set()
): boolean {
  const dn = dayName(d);
  if (!workDays.includes(dn)) return false;
  if (holidays.has(formatDate(d))) return false;
  return true;
}

/** Add working days to a date, returns the resulting date */
export function addWorkingDays(
  start: Date,
  days: number,
  workDays: string[] = ['mon', 'tue', 'wed', 'thu', 'fri'],
  holidays: Set<string> = new Set()
): Date {
  let current = new Date(start);
  let remaining = Math.abs(days);
  const dir = days >= 0 ? 1 : -1;

  while (remaining > 0) {
    current = new Date(current.getTime() + dir * DAY_MS);
    if (isWorkingDay(current, workDays, holidays)) {
      remaining--;
    }
  }
  return current;
}

/** Count working days between two dates (inclusive of start, exclusive of end) */
export function countWorkingDays(
  start: Date,
  end: Date,
  workDays: string[] = ['mon', 'tue', 'wed', 'thu', 'fri'],
  holidays: Set<string> = new Set()
): number {
  let count = 0;
  let current = new Date(start);
  while (current < end) {
    if (isWorkingDay(current, workDays, holidays)) {
      count++;
    }
    current = new Date(current.getTime() + DAY_MS);
  }
  return count;
}

/** Get date range between two dates as array */
export function getDateRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  let current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current = new Date(current.getTime() + DAY_MS);
  }
  return dates;
}

// ---- Critical Path ----

interface CpmNode {
  id: string;
  duration: number;
  es: number; // early start
  ef: number; // early finish
  ls: number; // late start
  lf: number; // late finish
  slack: number;
  predecessors: string[];
  successors: string[];
}

/**
 * Calculate the critical path using CPM (forward + backward pass).
 * Returns a Set of task IDs on the critical path.
 */
export function calculateCriticalPath(
  tasks: ProjectTask[],
  dependencies: TaskDependency[]
): Set<string> {
  if (tasks.length === 0) return new Set();

  // Build adjacency
  const nodes = new Map<string, CpmNode>();
  for (const t of tasks) {
    if (t.is_milestone) continue; // milestones have 0 duration
    nodes.set(t.id, {
      id: t.id,
      duration: t.duration || 1,
      es: 0,
      ef: 0,
      ls: Infinity,
      lf: Infinity,
      slack: 0,
      predecessors: [],
      successors: [],
    });
  }

  for (const dep of dependencies) {
    const pred = nodes.get(dep.predecessor_id);
    const succ = nodes.get(dep.successor_id);
    if (pred && succ) {
      pred.successors.push(dep.successor_id);
      succ.predecessors.push(dep.predecessor_id);
    }
  }

  // Forward pass (topological order)
  const visited = new Set<string>();
  const order: string[] = [];

  function dfs(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    const node = nodes.get(id);
    if (!node) return;
    for (const pred of node.predecessors) {
      dfs(pred);
    }
    order.push(id);
  }

  for (const id of nodes.keys()) {
    dfs(id);
  }

  for (const id of order) {
    const node = nodes.get(id)!;
    node.es = 0;
    for (const predId of node.predecessors) {
      const pred = nodes.get(predId);
      if (pred) {
        node.es = Math.max(node.es, pred.ef);
      }
    }
    node.ef = node.es + node.duration;
  }

  // Find project end
  let projectEnd = 0;
  for (const node of nodes.values()) {
    projectEnd = Math.max(projectEnd, node.ef);
  }

  // Backward pass
  for (const id of [...order].reverse()) {
    const node = nodes.get(id)!;
    if (node.successors.length === 0) {
      node.lf = projectEnd;
    } else {
      node.lf = Infinity;
      for (const succId of node.successors) {
        const succ = nodes.get(succId);
        if (succ) {
          node.lf = Math.min(node.lf, succ.ls);
        }
      }
    }
    node.ls = node.lf - node.duration;
    node.slack = node.ls - node.es;
  }

  // Critical path = tasks with 0 slack
  const critical = new Set<string>();
  for (const node of nodes.values()) {
    if (Math.abs(node.slack) < 0.001) {
      critical.add(node.id);
    }
  }

  return critical;
}

// ---- Auto-scheduling ----

/**
 * Recalculate task dates based on dependencies (respecting FS/FF/SS/SF and lag).
 * Modifies tasks in-place and returns the updated array.
 */
export function autoSchedule(
  tasks: ProjectTask[],
  dependencies: TaskDependency[],
  workDays: string[] = ['mon', 'tue', 'wed', 'thu', 'fri'],
  holidays: Set<string> = new Set()
): ProjectTask[] {
  // Build dependency map: successor -> list of { predecessor task, type, lag }
  const depMap = new Map<string, Array<{ pred: ProjectTask; type: string; lag: number }>>();
  const taskMap = new Map<string, ProjectTask>();

  for (const t of tasks) {
    taskMap.set(t.id, { ...t });
  }

  for (const dep of dependencies) {
    const pred = taskMap.get(dep.predecessor_id);
    if (!pred) continue;
    const list = depMap.get(dep.successor_id) || [];
    list.push({ pred, type: dep.dependency_type, lag: dep.lag_days });
    depMap.set(dep.successor_id, list);
  }

  // Topological sort
  const inDegree = new Map<string, number>();
  for (const t of tasks) inDegree.set(t.id, 0);
  for (const dep of dependencies) {
    const cur = inDegree.get(dep.successor_id) || 0;
    inDegree.set(dep.successor_id, cur + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    sorted.push(id);
    for (const dep of dependencies) {
      if (dep.predecessor_id === id) {
        const newDeg = (inDegree.get(dep.successor_id) || 1) - 1;
        inDegree.set(dep.successor_id, newDeg);
        if (newDeg === 0) queue.push(dep.successor_id);
      }
    }
  }

  // Process in order
  for (const id of sorted) {
    const task = taskMap.get(id)!;
    const deps = depMap.get(id);
    if (!deps || deps.length === 0) continue;

    let earliestStart = new Date(0);

    for (const { pred, type, lag } of deps) {
      const predStart = parseDate(pred.start_date);
      const predEnd = parseDate(pred.end_date);
      let constraintDate: Date;

      switch (type) {
        case 'FS': // Finish-to-Start
          constraintDate = addWorkingDays(predEnd, lag + 1, workDays, holidays);
          break;
        case 'SS': // Start-to-Start
          constraintDate = addWorkingDays(predStart, lag, workDays, holidays);
          break;
        case 'FF': // Finish-to-Finish — push start so finish aligns
          constraintDate = addWorkingDays(predEnd, lag - (task.duration - 1), workDays, holidays);
          break;
        case 'SF': // Start-to-Finish
          constraintDate = addWorkingDays(predStart, lag - (task.duration - 1), workDays, holidays);
          break;
        default:
          constraintDate = addWorkingDays(predEnd, lag + 1, workDays, holidays);
      }

      if (constraintDate > earliestStart) {
        earliestStart = constraintDate;
      }
    }

    // Ensure start lands on a working day
    while (!isWorkingDay(earliestStart, workDays, holidays)) {
      earliestStart = new Date(earliestStart.getTime() + DAY_MS);
    }

    task.start_date = formatDate(earliestStart);
    task.end_date = formatDate(addWorkingDays(earliestStart, task.duration - 1, workDays, holidays));
    taskMap.set(id, task);
  }

  return Array.from(taskMap.values());
}

// ---- Progress Calculation ----

/** Calculate phase progress from its child tasks */
export function calculatePhaseProgress(tasks: ProjectTask[]): number {
  if (tasks.length === 0) return 0;
  const totalWeight = tasks.reduce((sum, t) => sum + t.duration, 0);
  if (totalWeight === 0) return 0;
  const weightedProgress = tasks.reduce((sum, t) => sum + t.progress * t.duration, 0);
  return Math.round(weightedProgress / totalWeight);
}

/** Calculate overall project health metrics */
export function calculateProjectHealth(
  tasks: ProjectTask[],
  milestones: ProjectMilestone[],
  projectStartDate: string
): ProjectHealth {
  const now = new Date();
  const today = formatDate(now);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const delayedTasks = tasks.filter(t => t.status === 'delayed' || (t.end_date < today && t.status !== 'completed')).length;
  const criticalTasks = tasks.filter(t => t.is_critical).length;

  // Overall progress (weighted by duration)
  const totalDuration = tasks.reduce((s, t) => s + t.duration, 0);
  const overallProgress = totalDuration > 0
    ? Math.round(tasks.reduce((s, t) => s + t.progress * t.duration, 0) / totalDuration)
    : 0;

  // Project dates
  const projectEnd = tasks.length > 0
    ? tasks.reduce((max, t) => t.end_date > max ? t.end_date : max, tasks[0].end_date)
    : projectStartDate;

  const endDate = parseDate(projectEnd);
  const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / DAY_MS));

  // Schedule variance (planned vs actual progress)
  const projectStart = parseDate(projectStartDate);
  const totalProjectDays = Math.max(1, Math.ceil((endDate.getTime() - projectStart.getTime()) / DAY_MS));
  const elapsedDays = Math.ceil((now.getTime() - projectStart.getTime()) / DAY_MS);
  const expectedProgress = Math.min(100, Math.round((elapsedDays / totalProjectDays) * 100));
  const scheduleVariance = overallProgress - expectedProgress;

  // Days behind
  const daysBehind = scheduleVariance < 0
    ? Math.abs(Math.round(scheduleVariance * totalProjectDays / 100))
    : 0;

  // Health status
  let status: 'on_schedule' | 'at_risk' | 'delayed' = 'on_schedule';
  if (daysBehind > 5 || delayedTasks > totalTasks * 0.2) {
    status = 'delayed';
  } else if (daysBehind > 0 || delayedTasks > 0 || scheduleVariance < -5) {
    status = 'at_risk';
  }

  // Upcoming milestones (next 30 days)
  const thirtyDaysOut = formatDate(new Date(now.getTime() + 30 * DAY_MS));
  const upcomingMilestones = milestones.filter(m =>
    m.status !== 'completed' && m.target_date >= today && m.target_date <= thirtyDaysOut
  ).sort((a, b) => a.target_date.localeCompare(b.target_date));

  // Budget
  const totalBudget = tasks.reduce((s, t) => s + t.budget, 0);
  const spentBudget = tasks.reduce((s, t) => s + t.actual_cost, 0);

  // Actual completion
  const allCompleted = totalTasks > 0 && completedTasks === totalTasks;
  const actualCompletion = allCompleted
    ? tasks.reduce((max, t) => (t.completion_date && t.completion_date > max ? t.completion_date : max), '')
    : null;

  return {
    status,
    overallProgress,
    daysRemaining,
    daysBehind,
    estimatedCompletion: projectEnd,
    actualCompletion: actualCompletion || null,
    scheduleVariance,
    totalTasks,
    completedTasks,
    delayedTasks,
    criticalTasks,
    upcomingMilestones,
    totalBudget,
    spentBudget,
  };
}

// ---- Gantt Row Building ----

/**
 * Build flat list of GanttRow objects for rendering.
 * Phases become group rows; tasks are children.
 */
export function buildGanttRows(data: TimelineData): GanttRow[] {
  const rows: GanttRow[] = [];
  const criticalTasks = calculateCriticalPath(data.tasks, data.dependencies);

  // Group tasks by phase
  const tasksByPhase = new Map<string, ProjectTask[]>();
  const orphanTasks: ProjectTask[] = [];

  for (const t of data.tasks) {
    if (t.phase_id) {
      const list = tasksByPhase.get(t.phase_id) || [];
      list.push(t);
      tasksByPhase.set(t.phase_id, list);
    } else {
      orphanTasks.push(t);
    }
  }

  // Sort phases by sort_order
  const sortedPhases = [...data.phases].sort((a, b) => a.sort_order - b.sort_order);

  for (const phase of sortedPhases) {
    const phaseTasks = tasksByPhase.get(phase.id) || [];
    const sortedTasks = phaseTasks.sort((a, b) => a.sort_order - b.sort_order);

    // Calculate phase dates from tasks
    let phaseStart = phase.start_date ? parseDate(phase.start_date) : new Date();
    let phaseEnd = phase.end_date ? parseDate(phase.end_date) : new Date();

    if (sortedTasks.length > 0) {
      phaseStart = sortedTasks.reduce(
        (min, t) => { const d = parseDate(t.start_date); return d < min ? d : min; },
        parseDate(sortedTasks[0].start_date)
      );
      phaseEnd = sortedTasks.reduce(
        (max, t) => { const d = parseDate(t.end_date); return d > max ? d : max; },
        parseDate(sortedTasks[0].end_date)
      );
    }

    // Phase row
    rows.push({
      id: phase.id,
      type: 'phase',
      name: phase.name,
      indent: 0,
      startDate: phaseStart,
      endDate: phaseEnd,
      baselineStart: phase.baseline_start ? parseDate(phase.baseline_start) : undefined,
      baselineEnd: phase.baseline_end ? parseDate(phase.baseline_end) : undefined,
      progress: phase.progress,
      status: phase.status,
      isCritical: false,
      isCollapsed: phase.is_collapsed,
      isMilestone: false,
      color: phase.color,
      phaseId: phase.id,
      visible: true,
      phase,
    });

    // Task rows (hidden if phase is collapsed)
    for (const task of sortedTasks) {
      // Check for parent tasks — support 1 level of nesting
      const isChild = task.parent_task_id != null;

      rows.push({
        id: task.id,
        type: task.is_milestone ? 'milestone' : 'task',
        name: task.name,
        indent: isChild ? 2 : 1,
        startDate: parseDate(task.start_date),
        endDate: parseDate(task.end_date),
        baselineStart: task.baseline_start ? parseDate(task.baseline_start) : undefined,
        baselineEnd: task.baseline_end ? parseDate(task.baseline_end) : undefined,
        progress: task.progress,
        status: task.status,
        priority: task.priority,
        isCritical: criticalTasks.has(task.id),
        isMilestone: task.is_milestone,
        color: task.color || phase.color,
        assignedTo: task.assigned_to || undefined,
        phaseId: phase.id,
        parentTaskId: task.parent_task_id || undefined,
        dependencies: data.dependencies
          .filter(d => d.successor_id === task.id)
          .map(d => d.predecessor_id),
        visible: !phase.is_collapsed,
        task,
      });
    }
  }

  // Orphan tasks (no phase)
  for (const task of orphanTasks) {
    rows.push({
      id: task.id,
      type: task.is_milestone ? 'milestone' : 'task',
      name: task.name,
      indent: 0,
      startDate: parseDate(task.start_date),
      endDate: parseDate(task.end_date),
      progress: task.progress,
      status: task.status,
      priority: task.priority,
      isCritical: criticalTasks.has(task.id),
      isMilestone: task.is_milestone,
      color: task.color || '#6366f1',
      assignedTo: task.assigned_to || undefined,
      visible: true,
      task,
    });
  }

  return rows;
}

// ---- Default Timeline Generation ----

/**
 * Generate default phases and tasks for a project.
 * Returns arrays ready to insert into the database.
 */
export function generateDefaultTimeline(
  projectId: string,
  startDate: string,
  workDays: string[] = ['mon', 'tue', 'wed', 'thu', 'fri'],
  holidays: Set<string> = new Set()
): {
  phases: Omit<ProjectPhase, 'id' | 'created_at' | 'updated_at'>[];
  tasks: Omit<ProjectTask, 'id' | 'created_at' | 'updated_at'>[];
} {
  const phases: Omit<ProjectPhase, 'id' | 'created_at' | 'updated_at'>[] = [];
  const tasks: Omit<ProjectTask, 'id' | 'created_at' | 'updated_at'>[] = [];

  let currentDate = parseDate(startDate);

  // Ensure start is a working day
  while (!isWorkingDay(currentDate, workDays, holidays)) {
    currentDate = new Date(currentDate.getTime() + DAY_MS);
  }

  for (let pi = 0; pi < DEFAULT_CONSTRUCTION_PHASES.length; pi++) {
    const phaseDef = DEFAULT_CONSTRUCTION_PHASES[pi];
    const phaseId = `temp-phase-${pi}`;
    const phaseStart = new Date(currentDate);

    // Generate tasks for this phase
    for (let ti = 0; ti < phaseDef.tasks.length; ti++) {
      const taskName = phaseDef.tasks[ti];
      // Vary duration 2-15 days
      const duration = Math.floor(Math.random() * 10) + 3;
      const taskStart = new Date(currentDate);
      const taskEnd = addWorkingDays(taskStart, duration - 1, workDays, holidays);

      tasks.push({
        project_id: projectId,
        phase_id: phaseId as unknown as string,
        parent_task_id: null,
        name: taskName,
        description: null,
        assigned_to: null,
        department: null,
        start_date: formatDate(taskStart),
        end_date: formatDate(taskEnd),
        duration,
        working_days: duration,
        baseline_start: formatDate(taskStart),
        baseline_end: formatDate(taskEnd),
        status: 'not_started',
        priority: 'medium',
        progress: 0,
        is_milestone: false,
        is_critical: false,
        sort_order: ti,
        budget: 0,
        actual_cost: 0,
        estimated_cost: 0,
        weather_delay_days: 0,
        inspection_required: false,
        inspection_passed: null,
        material_delivery_date: null,
        completion_date: null,
        notes: null,
        color: null,
        estimate_line_id: null,
      });

      // Advance date (some tasks overlap within a phase, some sequential)
      if (ti < phaseDef.tasks.length - 1 && Math.random() > 0.3) {
        // Partial overlap
        const advance = Math.floor(duration * 0.6);
        currentDate = addWorkingDays(currentDate, advance, workDays, holidays);
      } else {
        currentDate = new Date(taskEnd.getTime() + DAY_MS);
        while (!isWorkingDay(currentDate, workDays, holidays)) {
          currentDate = new Date(currentDate.getTime() + DAY_MS);
        }
      }
    }

    const phaseEnd = new Date(currentDate);

    phases.push({
      project_id: projectId,
      name: phaseDef.name,
      description: null,
      sort_order: pi,
      color: DEFAULT_PHASE_COLORS[pi % DEFAULT_PHASE_COLORS.length],
      start_date: formatDate(phaseStart),
      end_date: formatDate(phaseEnd),
      baseline_start: formatDate(phaseStart),
      baseline_end: formatDate(phaseEnd),
      progress: 0,
      status: 'not_started',
      is_collapsed: false,
    });

    // Gap between phases
    currentDate = addWorkingDays(currentDate, 1, workDays, holidays);
  }

  return { phases, tasks };
}

// ---- Zoom / Date Grid Helpers ----

export interface DateColumn {
  date: Date;
  label: string;
  subLabel?: string;
  isToday: boolean;
  isWeekend: boolean;
  isMonthStart: boolean;
  width: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function buildDateColumns(
  start: Date,
  end: Date,
  zoom: 'day' | 'week' | 'month'
): DateColumn[] {
  const columns: DateColumn[] = [];
  const today = formatDate(new Date());

  if (zoom === 'day') {
    let current = new Date(start);
    while (current <= end) {
      columns.push({
        date: new Date(current),
        label: `${current.getDate()}`,
        subLabel: DAYS[current.getDay()],
        isToday: formatDate(current) === today,
        isWeekend: current.getDay() === 0 || current.getDay() === 6,
        isMonthStart: current.getDate() === 1,
        width: 30,
      });
      current = new Date(current.getTime() + DAY_MS);
    }
  } else if (zoom === 'week') {
    let current = new Date(start);
    // Align current start date to Monday
    const day = current.getDay();
    const diffToMonday = (day === 0 ? -6 : 1 - day);
    current = new Date(current.getTime() + diffToMonday * DAY_MS);

    while (current <= end) {
      const weekEnd = new Date(current.getTime() + 6 * DAY_MS);
      columns.push({
        date: new Date(current),
        label: `${MONTHS[current.getMonth()]} ${current.getDate()}`,
        subLabel: `W${getWeekNumber(current)}`,
        isToday: formatDate(current) <= today && formatDate(weekEnd) >= today,
        isWeekend: false,
        isMonthStart: current.getDate() <= 7,
        width: 42,
      });
      current = new Date(current.getTime() + 7 * DAY_MS);
    }
  } else {
    // month
    let current = new Date(start.getFullYear(), start.getMonth(), 1);
    while (current <= end) {
      const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
      columns.push({
        date: new Date(current),
        label: `${MONTHS[current.getMonth()]} ${current.getFullYear()}`,
        isToday: current.getMonth() === new Date().getMonth() && current.getFullYear() === new Date().getFullYear(),
        isWeekend: false,
        isMonthStart: true,
        width: Math.max(65, daysInMonth * 2.5),
      });
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    }
  }

  return columns;
}

function getWeekNumber(d: Date): number {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / (7 * DAY_MS));
}

/**
 * Calculate the X position and width of a task bar within the date grid.
 */
export function getBarPosition(
  taskStart: Date,
  taskEnd: Date,
  gridStart: Date,
  columnWidth: number,
  zoom: 'day' | 'week' | 'month'
): { x: number; width: number } {
  if (zoom === 'day') {
    const startOffset = Math.floor((taskStart.getTime() - gridStart.getTime()) / DAY_MS);
    const duration = Math.floor((taskEnd.getTime() - taskStart.getTime()) / DAY_MS) + 1;
    return {
      x: startOffset * columnWidth,
      width: Math.max(duration * columnWidth, columnWidth),
    };
  } else if (zoom === 'week') {
    const mondayGridStart = new Date(gridStart);
    const day = mondayGridStart.getDay();
    const diffToMonday = (day === 0 ? -6 : 1 - day);
    mondayGridStart.setDate(mondayGridStart.getDate() + diffToMonday);

    const startOffset = (taskStart.getTime() - mondayGridStart.getTime()) / (7 * DAY_MS);
    const durationWeeks = Math.max(1, Math.ceil((taskEnd.getTime() - taskStart.getTime() + DAY_MS) / DAY_MS)) / 7;
    return {
      x: Math.round(startOffset * columnWidth),
      width: Math.max(Math.round(durationWeeks * columnWidth), 18),
    };
  } else {
    // month — approximate
    const monthsDiff = (taskStart.getFullYear() - gridStart.getFullYear()) * 12 +
      (taskStart.getMonth() - gridStart.getMonth()) +
      (taskStart.getDate() - 1) / 30;
    const durationMonths = (taskEnd.getTime() - taskStart.getTime()) / (30 * DAY_MS) + 1 / 30;
    return {
      x: monthsDiff * columnWidth,
      width: Math.max(durationMonths * columnWidth, 8),
    };
  }
}
