import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// Realistic construction roles/names
const EMPLOYEES = [
  { first_name: 'Mike', last_name: 'Rodriguez', role: 'Project Manager', department: 'Management', hourly_rate: 85 },
  { first_name: 'Sarah', last_name: 'Chen', role: 'Site Superintendent', department: 'Operations', hourly_rate: 72 },
  { first_name: 'James', last_name: 'Wilson', role: 'Foreman', department: 'Operations', hourly_rate: 55 },
  { first_name: 'Maria', last_name: 'Garcia', role: 'Safety Manager', department: 'Safety', hourly_rate: 62 },
  { first_name: 'David', last_name: 'Thompson', role: 'Estimator', department: 'Pre-construction', hourly_rate: 68 },
  { first_name: 'Lisa', last_name: 'Anderson', role: 'Project Engineer', department: 'Engineering', hourly_rate: 65 },
  { first_name: 'Carlos', last_name: 'Martinez', role: 'Lead Carpenter', department: 'Carpentry', hourly_rate: 48 },
  { first_name: 'Robert', last_name: 'Johnson', role: 'Electrician', department: 'Electrical', hourly_rate: 52 },
  { first_name: 'Jennifer', last_name: 'Davis', role: 'Scheduler', department: 'Management', hourly_rate: 58 },
  { first_name: 'Kevin', last_name: 'Brown', role: 'Quality Control', department: 'QC', hourly_rate: 55 },
];

const SUBCONTRACTORS = [
  { company_name: 'Apex Electrical Services', specialty: 'Electrical', contact_name: 'Tom Harris', hourly_rate: 95 },
  { company_name: 'Premier Plumbing Co', specialty: 'Plumbing', contact_name: 'Dan Miller', hourly_rate: 88 },
  { company_name: 'Southwest HVAC Solutions', specialty: 'HVAC', contact_name: 'Amy Zhang', hourly_rate: 92 },
  { company_name: 'Precision Concrete Inc', specialty: 'Concrete', contact_name: 'Joe Russo', hourly_rate: 78 },
  { company_name: 'Pacific Roofing Group', specialty: 'Roofing', contact_name: 'Steve Park', hourly_rate: 72 },
  { company_name: 'Heritage Masonry', specialty: 'Masonry', contact_name: 'Bill O\'Brien', hourly_rate: 82 },
  { company_name: 'ProFinish Drywall', specialty: 'Drywall', contact_name: 'Marco Silva', hourly_rate: 65 },
  { company_name: 'Atlas Steel Erectors', specialty: 'Structural Steel', contact_name: 'Ray Kim', hourly_rate: 105 },
];

const EQUIPMENT_LIST = [
  { name: 'CAT 320 Excavator', type: 'Heavy Equipment', model: '320F', daily_rate: 850 },
  { name: 'Boom Lift 60ft', type: 'Aerial', model: 'JLG 600S', daily_rate: 450 },
  { name: 'Concrete Pump Truck', type: 'Concrete', model: '42m', daily_rate: 1200 },
  { name: 'Tower Crane', type: 'Crane', model: 'Liebherr 280 EC-H', daily_rate: 2500 },
  { name: 'Skid Steer Loader', type: 'Compact', model: 'Bobcat S650', daily_rate: 350 },
];

// Default phases with task details for a commercial construction project
const PHASES_WITH_TASKS = [
  {
    name: 'Preconstruction',
    color: '#6366f1',
    tasks: [
      { name: 'Permits & Approvals', dur: 15, priority: 'critical', inspection: true, budget: 25000 },
      { name: 'Site Survey & Geotechnical', dur: 5, priority: 'high', budget: 18000 },
      { name: 'Engineering Review', dur: 10, priority: 'high', budget: 35000 },
      { name: 'Utility Locates & Coordination', dur: 3, priority: 'medium', budget: 5000 },
      { name: 'Submittals & Shop Drawings', dur: 12, priority: 'high', budget: 15000 },
      { name: 'Material Procurement (Long Lead)', dur: 20, priority: 'critical', budget: 120000 },
    ],
  },
  {
    name: 'Site Work',
    color: '#8b5cf6',
    tasks: [
      { name: 'Mobilization & Site Setup', dur: 3, priority: 'high', budget: 22000 },
      { name: 'Clearing & Demolition', dur: 5, priority: 'medium', budget: 35000 },
      { name: 'Erosion & Sediment Control', dur: 2, priority: 'medium', budget: 8000 },
      { name: 'Excavation', dur: 8, priority: 'high', budget: 65000 },
      { name: 'Grading & Compaction', dur: 5, priority: 'medium', budget: 28000 },
      { name: 'Temporary Utilities', dur: 3, priority: 'medium', budget: 12000 },
      { name: 'Storm Drainage', dur: 6, priority: 'medium', budget: 42000 },
    ],
  },
  {
    name: 'Foundation',
    color: '#a855f7',
    tasks: [
      { name: 'Footings Layout & Formwork', dur: 4, priority: 'high', budget: 18000 },
      { name: 'Rebar Installation', dur: 5, priority: 'high', budget: 32000 },
      { name: 'Footings Pour', dur: 2, priority: 'critical', inspection: true, budget: 45000 },
      { name: 'Foundation Walls', dur: 8, priority: 'high', budget: 68000 },
      { name: 'Waterproofing & Dampproofing', dur: 3, priority: 'medium', budget: 15000 },
      { name: 'Backfill & Compaction', dur: 4, priority: 'medium', budget: 20000 },
      { name: 'Slab on Grade Prep', dur: 3, priority: 'high', budget: 12000 },
      { name: 'Slab Pour', dur: 2, priority: 'critical', inspection: true, budget: 55000 },
    ],
  },
  {
    name: 'Structural / Framing',
    color: '#d946ef',
    tasks: [
      { name: 'Steel Column Erection', dur: 10, priority: 'critical', budget: 185000 },
      { name: 'Steel Beam Installation', dur: 8, priority: 'critical', budget: 145000 },
      { name: 'Metal Decking', dur: 6, priority: 'high', budget: 72000 },
      { name: 'Concrete Topping', dur: 5, priority: 'high', inspection: true, budget: 48000 },
      { name: 'Stair Framing', dur: 4, priority: 'medium', budget: 28000 },
      { name: 'Exterior Wall Framing', dur: 8, priority: 'high', budget: 65000 },
      { name: 'Interior Wall Framing', dur: 10, priority: 'medium', budget: 52000 },
    ],
  },
  {
    name: 'Roofing',
    color: '#ec4899',
    tasks: [
      { name: 'Roof Deck Prep', dur: 3, priority: 'high', budget: 18000 },
      { name: 'Insulation Board', dur: 4, priority: 'medium', budget: 35000 },
      { name: 'Roofing Membrane', dur: 6, priority: 'high', budget: 85000 },
      { name: 'Flashing & Sheet Metal', dur: 4, priority: 'medium', budget: 22000 },
      { name: 'Roof Penetrations & Curbs', dur: 2, priority: 'medium', budget: 12000 },
      { name: 'Roof Inspection', dur: 1, priority: 'critical', inspection: true, budget: 2000 },
    ],
  },
  {
    name: 'Exterior Envelope',
    color: '#f43f5e',
    tasks: [
      { name: 'Window Installation', dur: 8, priority: 'high', budget: 125000 },
      { name: 'Storefront / Curtain Wall', dur: 12, priority: 'high', budget: 195000 },
      { name: 'Exterior Cladding', dur: 15, priority: 'medium', budget: 168000 },
      { name: 'Sealants & Caulking', dur: 4, priority: 'medium', budget: 18000 },
      { name: 'Exterior Doors', dur: 3, priority: 'medium', budget: 42000 },
    ],
  },
  {
    name: 'MEP Rough-In',
    color: '#f97316',
    tasks: [
      { name: 'Electrical Rough-In', dur: 15, priority: 'high', budget: 145000 },
      { name: 'Plumbing Rough-In', dur: 12, priority: 'high', budget: 98000 },
      { name: 'HVAC Ductwork', dur: 14, priority: 'high', budget: 165000 },
      { name: 'Fire Suppression Piping', dur: 8, priority: 'critical', budget: 85000 },
      { name: 'Low Voltage / Data Cabling', dur: 6, priority: 'medium', budget: 45000 },
      { name: 'MEP Coordination Checks', dur: 2, priority: 'high', inspection: true, budget: 5000 },
    ],
  },
  {
    name: 'Insulation & Air Barrier',
    color: '#f59e0b',
    tasks: [
      { name: 'Exterior Wall Insulation', dur: 6, priority: 'medium', budget: 42000 },
      { name: 'Interior Wall Insulation', dur: 4, priority: 'medium', budget: 28000 },
      { name: 'Ceiling Insulation', dur: 3, priority: 'medium', budget: 22000 },
      { name: 'Air / Vapor Barrier', dur: 4, priority: 'medium', budget: 18000 },
    ],
  },
  {
    name: 'Drywall',
    color: '#84cc16',
    tasks: [
      { name: 'Drywall Hang', dur: 10, priority: 'medium', budget: 65000 },
      { name: 'Taping & Mudding', dur: 8, priority: 'medium', budget: 38000 },
      { name: 'Sanding & Level 4 Finish', dur: 5, priority: 'medium', budget: 22000 },
      { name: 'Drywall Inspection', dur: 1, priority: 'high', inspection: true, budget: 2000 },
    ],
  },
  {
    name: 'Interior Finishes',
    color: '#22c55e',
    tasks: [
      { name: 'Interior Painting', dur: 10, priority: 'medium', budget: 58000 },
      { name: 'Trim & Millwork', dur: 8, priority: 'medium', budget: 72000 },
      { name: 'Flooring — Tile', dur: 8, priority: 'medium', budget: 85000 },
      { name: 'Flooring — Carpet/LVP', dur: 5, priority: 'medium', budget: 45000 },
      { name: 'Ceiling Grid & Tiles', dur: 6, priority: 'medium', budget: 38000 },
      { name: 'Specialty Finishes', dur: 4, priority: 'low', budget: 25000 },
    ],
  },
  {
    name: 'Cabinets & Countertops',
    color: '#14b8a6',
    tasks: [
      { name: 'Cabinet Installation', dur: 5, priority: 'medium', budget: 65000 },
      { name: 'Countertop Template', dur: 1, priority: 'medium', budget: 2000 },
      { name: 'Countertop Fabrication', dur: 8, priority: 'medium', budget: 42000 },
      { name: 'Countertop Installation', dur: 2, priority: 'medium', budget: 8000 },
    ],
  },
  {
    name: 'MEP Finish',
    color: '#06b6d4',
    tasks: [
      { name: 'Electrical Trim-Out', dur: 8, priority: 'high', budget: 55000 },
      { name: 'Plumbing Fixtures', dur: 5, priority: 'high', budget: 42000 },
      { name: 'HVAC Equipment & Controls', dur: 6, priority: 'high', budget: 85000 },
      { name: 'Testing & Balancing', dur: 4, priority: 'critical', inspection: true, budget: 15000 },
      { name: 'Fire Alarm & Detection', dur: 3, priority: 'critical', budget: 35000 },
    ],
  },
  {
    name: 'Final Inspection & Commissioning',
    color: '#0ea5e9',
    tasks: [
      { name: 'Pre-Inspection Walkthrough', dur: 2, priority: 'high', budget: 5000 },
      { name: 'Building Inspection', dur: 1, priority: 'critical', inspection: true, budget: 3000 },
      { name: 'Fire Marshal Inspection', dur: 1, priority: 'critical', inspection: true, budget: 2000 },
      { name: 'Elevator Inspection', dur: 1, priority: 'high', inspection: true, budget: 2000 },
      { name: 'Systems Commissioning', dur: 5, priority: 'high', budget: 25000 },
    ],
  },
  {
    name: 'Punch List',
    color: '#3b82f6',
    tasks: [
      { name: 'Generate Punch List', dur: 2, priority: 'high', budget: 5000 },
      { name: 'Punch List Completion', dur: 10, priority: 'high', budget: 35000 },
      { name: 'Owner Walkthrough', dur: 1, priority: 'critical', budget: 2000 },
      { name: 'Final Touch-Ups', dur: 3, priority: 'medium', budget: 8000 },
    ],
  },
  {
    name: 'Project Closeout',
    color: '#6366f1',
    tasks: [
      { name: 'Final Cleaning', dur: 3, priority: 'medium', budget: 15000 },
      { name: 'As-Built Documentation', dur: 5, priority: 'high', budget: 12000 },
      { name: 'O&M Manuals', dur: 3, priority: 'medium', budget: 8000 },
      { name: 'Warranty Documentation', dur: 2, priority: 'medium', budget: 3000 },
      { name: 'Certificate of Occupancy', dur: 1, priority: 'critical', inspection: true, budget: 2000 },
      { name: 'Key Turnover & Substantial Completion', dur: 1, priority: 'critical', budget: 0 },
    ],
  },
];

const WEATHER_TYPES = ['rain', 'wind', 'extreme_heat', 'storm'] as const;

const RISK_ITEMS = [
  { title: 'Material Supply Chain Delays', probability: 'high', impact: 'high', mitigation: 'Pre-order long-lead items. Identify alternative suppliers.' },
  { title: 'Severe Weather Events', probability: 'medium', impact: 'medium', mitigation: 'Build weather contingency into schedule. Monitor forecasts weekly.' },
  { title: 'Subcontractor Availability', probability: 'medium', impact: 'high', mitigation: 'Lock in contracts early. Maintain backup sub list.' },
  { title: 'Permit Delays', probability: 'low', impact: 'critical', mitigation: 'Submit early. Maintain relationship with building department.' },
  { title: 'Unforeseen Site Conditions', probability: 'medium', impact: 'high', mitigation: 'Complete thorough geotechnical investigation. Budget contingency.' },
  { title: 'Labor Shortage', probability: 'high', impact: 'medium', mitigation: 'Cross-train crews. Partner with trade schools.' },
  { title: 'Design Changes / RFIs', probability: 'high', impact: 'medium', mitigation: 'Proactive RFI process. Weekly design coordination meetings.' },
  { title: 'Budget Overrun Risk', probability: 'medium', impact: 'high', mitigation: 'Monthly cost reviews. Track change orders closely.' },
];

function addWorkingDays(start: Date, days: number): Date {
  let current = new Date(start);
  let remaining = days;
  while (remaining > 0) {
    current.setDate(current.getDate() + 1);
    const day = current.getDay();
    if (day !== 0 && day !== 6) remaining--;
  }
  return current;
}

function fmt(d: Date): string {
  return d.toISOString().split('T')[0];
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** POST /api/timeline/seed — Generate demo timeline data for a project */
export async function POST(request: NextRequest) {
  const { projectId } = await request.json();
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

  const supabase = await createClient();

  // Get project start date
  const { data: project } = await supabase
    .from('projects')
    .select('start_date, name')
    .eq('id', projectId)
    .single();

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  // Clear existing timeline data for this project
  await Promise.all([
    supabase.from('project_milestones').delete().eq('project_id', projectId),
    supabase.from('weather_delays').delete().eq('project_id', projectId),
    supabase.from('project_risks').delete().eq('project_id', projectId),
    supabase.from('project_updates').delete().eq('project_id', projectId),
    supabase.from('notifications').delete().eq('project_id', projectId),
    supabase.from('project_calendar').delete().eq('project_id', projectId),
  ]);

  // Delete tasks & phases (need to delete deps/assignments first)
  const { data: existingTasks } = await supabase.from('project_tasks').select('id').eq('project_id', projectId);
  if (existingTasks && existingTasks.length > 0) {
    const taskIds = existingTasks.map(t => t.id);
    await supabase.from('task_dependencies').delete().in('predecessor_id', taskIds);
    await supabase.from('task_dependencies').delete().in('successor_id', taskIds);
    await supabase.from('task_assignments').delete().in('task_id', taskIds);
    await supabase.from('task_comments').delete().in('task_id', taskIds);
    await supabase.from('task_checklists').delete().in('task_id', taskIds);
    await supabase.from('task_status_history').delete().in('task_id', taskIds);
  }
  await supabase.from('project_tasks').delete().eq('project_id', projectId);
  await supabase.from('project_phases').delete().eq('project_id', projectId);

  // Seed employees (global, only if empty)
  const { data: existingEmps } = await supabase.from('employees').select('id');
  let employeeIds: string[] = [];
  if (!existingEmps || existingEmps.length === 0) {
    const { data: emps } = await supabase
      .from('employees')
      .insert(EMPLOYEES.map(e => ({
        ...e,
        email: `${e.first_name.toLowerCase()}.${e.last_name.toLowerCase()}@consestimate.com`,
        is_active: true,
      })))
      .select('id');
    employeeIds = emps?.map(e => e.id) || [];
  } else {
    employeeIds = existingEmps.map(e => e.id);
  }

  // Seed subcontractors (global, only if empty)
  const { data: existingSubs } = await supabase.from('subcontractors').select('id');
  let subIds: string[] = [];
  if (!existingSubs || existingSubs.length === 0) {
    const { data: subs } = await supabase
      .from('subcontractors')
      .insert(SUBCONTRACTORS.map(s => ({
        ...s,
        email: `info@${s.company_name.toLowerCase().replace(/[^a-z]/g, '')}.com`,
        is_active: true,
        rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
      })))
      .select('id');
    subIds = subs?.map(s => s.id) || [];
  } else {
    subIds = existingSubs.map(s => s.id);
  }

  // Seed equipment (global, only if empty)
  const { data: existingEquip } = await supabase.from('equipment').select('id');
  let equipIds: string[] = [];
  if (!existingEquip || existingEquip.length === 0) {
    const { data: equip } = await supabase
      .from('equipment')
      .insert(EQUIPMENT_LIST.map(e => ({
        ...e,
        serial_number: `SN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        status: 'available',
      })))
      .select('id');
    equipIds = equip?.map(e => e.id) || [];
  } else {
    equipIds = existingEquip.map(e => e.id);
  }

  // Create project calendar
  await supabase.from('project_calendar').insert({
    project_id: projectId,
    work_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    work_start_time: '07:00',
    work_end_time: '17:00',
  });

  // Build phases and tasks
  let currentDate = new Date(project.start_date + 'T00:00:00');
  while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const today = new Date();
  const allPhaseIds: string[] = [];
  const allTaskIds: string[] = [];
  const dependencyPairs: { pred: string; succ: string }[] = [];
  const milestoneData: Array<{ project_id: string; task_id: string; name: string; target_date: string; status: string }> = [];

  for (let pi = 0; pi < PHASES_WITH_TASKS.length; pi++) {
    const phaseDef = PHASES_WITH_TASKS[pi];
    const phaseStart = new Date(currentDate);

    // Insert phase
    const { data: phase } = await supabase
      .from('project_phases')
      .insert({
        project_id: projectId,
        name: phaseDef.name,
        color: phaseDef.color,
        sort_order: pi,
        start_date: fmt(phaseStart),
        status: 'not_started',
        progress: 0,
      })
      .select()
      .single();

    if (!phase) continue;
    allPhaseIds.push(phase.id);

    let prevTaskId: string | null = null;
    const phaseTaskIds: string[] = [];

    for (let ti = 0; ti < phaseDef.tasks.length; ti++) {
      const taskDef = phaseDef.tasks[ti];
      const taskStart = new Date(currentDate);
      const taskEnd = addWorkingDays(taskStart, taskDef.dur - 1);

      // Determine status based on timeline position
      let status: string = 'not_started';
      let progress = 0;

      if (taskEnd < today) {
        status = 'completed';
        progress = 100;
      } else if (taskStart <= today && taskEnd >= today) {
        status = 'in_progress';
        const totalDays = taskDef.dur;
        let elapsed = 0;
        const c = new Date(taskStart);
        while (c <= today) {
          if (c.getDay() !== 0 && c.getDay() !== 6) elapsed++;
          c.setDate(c.getDate() + 1);
        }
        progress = Math.min(95, Math.round((elapsed / totalDays) * 100));
        // Some tasks might be delayed
        if (Math.random() < 0.15) {
          status = 'delayed';
          progress = Math.max(10, progress - 20);
        }
      }

      // Assigned to
      const assignedTo = employeeIds.length > 0
        ? EMPLOYEES[Math.floor(Math.random() * EMPLOYEES.length)]
        : null;

      // Randomly add weather delay to past outdoor tasks
      const weatherDelay = (pi <= 3 && status === 'completed' && Math.random() < 0.2)
        ? Math.floor(Math.random() * 3) + 1
        : 0;

      // Budget with some variance
      const actualCost = status === 'completed'
        ? Math.round(taskDef.budget * (0.85 + Math.random() * 0.3))
        : status === 'in_progress'
          ? Math.round(taskDef.budget * progress / 100 * (0.9 + Math.random() * 0.2))
          : 0;

      const { data: task } = await supabase
        .from('project_tasks')
        .insert({
          project_id: projectId,
          phase_id: phase.id,
          name: taskDef.name,
          start_date: fmt(taskStart),
          end_date: fmt(taskEnd),
          duration: taskDef.dur,
          working_days: taskDef.dur,
          baseline_start: fmt(taskStart),
          baseline_end: fmt(taskEnd),
          status,
          priority: taskDef.priority || 'medium',
          progress,
          is_milestone: false,
          is_critical: taskDef.priority === 'critical',
          sort_order: ti,
          budget: taskDef.budget,
          actual_cost: actualCost,
          estimated_cost: taskDef.budget,
          weather_delay_days: weatherDelay,
          inspection_required: taskDef.inspection || false,
          inspection_passed: taskDef.inspection && status === 'completed' ? true : null,
          assigned_to: assignedTo ? `${assignedTo.first_name} ${assignedTo.last_name}` : null,
          department: assignedTo?.department || null,
          completion_date: status === 'completed' ? fmt(taskEnd) : null,
          color: phaseDef.color,
        })
        .select()
        .single();

      if (!task) continue;
      allTaskIds.push(task.id);
      phaseTaskIds.push(task.id);

      // Create FS dependency from previous task
      if (prevTaskId) {
        dependencyPairs.push({ pred: prevTaskId, succ: task.id });
      }

      // Task assignment (employee or subcontractor)
      if (employeeIds.length > 0) {
        await supabase.from('task_assignments').insert({
          task_id: task.id,
          resource_type: 'employee',
          resource_id: randomPick(employeeIds),
          allocation_pct: 100,
        });
      }

      // Some tasks get subcontractor assignments
      if (subIds.length > 0 && (phaseDef.name.includes('MEP') || phaseDef.name.includes('Roofing') || phaseDef.name.includes('Drywall') || Math.random() < 0.3)) {
        await supabase.from('task_assignments').insert({
          task_id: task.id,
          resource_type: 'subcontractor',
          resource_id: randomPick(subIds),
          allocation_pct: 100,
        });
      }

      // Weather delays
      if (weatherDelay > 0) {
        await supabase.from('weather_delays').insert({
          project_id: projectId,
          task_id: task.id,
          delay_date: fmt(addWorkingDays(taskStart, Math.floor(taskDef.dur / 2))),
          delay_days: weatherDelay,
          weather_type: randomPick([...WEATHER_TYPES]),
          description: `${randomPick([...WEATHER_TYPES])} caused ${weatherDelay} day delay`,
        });
      }

      // Add comments to some completed/in-progress tasks
      if ((status === 'completed' || status === 'in_progress') && Math.random() < 0.4) {
        const commentAuthors = EMPLOYEES.slice(0, 3);
        const comments = [
          'Progress looking good. On track for schedule.',
          'Material delivery confirmed for next week.',
          'Crew is performing well. Quality checks passed.',
          'Minor issue with alignment — corrected same day.',
          'Inspection scheduled for end of week.',
          'Subcontractor mobilized. Work beginning tomorrow.',
          'Weather may impact schedule — monitoring forecast.',
        ];
        await supabase.from('task_comments').insert({
          task_id: task.id,
          author: `${randomPick(commentAuthors).first_name} ${randomPick(commentAuthors).last_name}`,
          content: randomPick(comments),
        });
      }

      // Milestone at end of certain phases
      if (ti === phaseDef.tasks.length - 1 && (pi === 0 || pi === 2 || pi === 3 || pi === 6 || pi === 12 || pi === 14)) {
        milestoneData.push({
          project_id: projectId,
          task_id: task.id,
          name: `${phaseDef.name} Complete`,
          target_date: fmt(taskEnd),
          status: status === 'completed' ? 'completed' : taskEnd < today ? 'missed' : 'pending',
        });
      }

      prevTaskId = task.id;

      // Advance date — sequential within phase with some overlap
      if (ti < phaseDef.tasks.length - 1) {
        const overlap = Math.random() < 0.4;
        if (overlap) {
          const advance = Math.max(1, Math.floor(taskDef.dur * 0.5));
          currentDate = addWorkingDays(currentDate, advance);
        } else {
          currentDate = addWorkingDays(taskEnd, 1);
        }
      } else {
        currentDate = addWorkingDays(taskEnd, 1);
      }
    }

    // Cross-phase dependency (last task of this phase → first task of next)
    if (pi > 0 && allTaskIds.length > phaseTaskIds.length) {
      // Already handled by prevTaskId carrying over
    }

    // Update phase dates and progress
    const phaseEnd = new Date(currentDate);
    const phaseProgress = phaseEnd < today ? 100 :
      phaseStart > today ? 0 :
      Math.round(((today.getTime() - phaseStart.getTime()) / (phaseEnd.getTime() - phaseStart.getTime())) * 100);

    await supabase.from('project_phases').update({
      end_date: fmt(phaseEnd),
      baseline_end: fmt(phaseEnd),
      progress: Math.min(100, phaseProgress),
      status: phaseProgress >= 100 ? 'completed' : phaseProgress > 0 ? 'in_progress' : 'not_started',
    }).eq('id', phase.id);

    // Small gap between phases
    currentDate = addWorkingDays(currentDate, 1);
  }

  // Insert dependencies
  for (const dp of dependencyPairs) {
    await supabase.from('task_dependencies').insert({
      predecessor_id: dp.pred,
      successor_id: dp.succ,
      dependency_type: 'FS',
      lag_days: 0,
    });
  }

  // Insert milestones
  for (const m of milestoneData) {
    await supabase.from('project_milestones').insert(m);
  }

  // Add "Key Turnover" milestone
  milestoneData.push({
    project_id: projectId,
    task_id: allTaskIds[allTaskIds.length - 1] || null as unknown as string,
    name: 'Substantial Completion',
    target_date: fmt(currentDate),
    status: 'pending',
  });
  await supabase.from('project_milestones').insert({
    project_id: projectId,
    name: 'Substantial Completion',
    target_date: fmt(currentDate),
    status: 'pending',
    is_key_milestone: true,
  });

  // Insert risks
  for (const risk of RISK_ITEMS) {
    await supabase.from('project_risks').insert({
      project_id: projectId,
      title: risk.title,
      probability: risk.probability,
      impact: risk.impact,
      mitigation_plan: risk.mitigation,
      status: Math.random() < 0.3 ? 'mitigated' : 'open',
      owner: `${randomPick(EMPLOYEES).first_name} ${randomPick(EMPLOYEES).last_name}`,
    });
  }

  // Insert project updates
  const updateTitles = [
    { title: 'Project Kickoff Complete', type: 'milestone' },
    { title: 'Foundation Phase Progress Update', type: 'schedule' },
    { title: 'Weather Delay Notification', type: 'delay' },
    { title: 'Monthly Budget Review', type: 'budget' },
    { title: 'Safety Audit Passed', type: 'general' },
    { title: 'Material Delivery Confirmed', type: 'general' },
    { title: 'Schedule Update — Week 8', type: 'schedule' },
  ];

  for (const upd of updateTitles) {
    await supabase.from('project_updates').insert({
      project_id: projectId,
      title: upd.title,
      content: `Update for ${project.name}: ${upd.title}. Project proceeding as planned.`,
      update_type: upd.type,
      author: `${randomPick(EMPLOYEES).first_name} ${randomPick(EMPLOYEES).last_name}`,
    });
  }

  // Notifications
  const notifications = [
    { title: 'Permit approval received', type: 'success', category: 'general' },
    { title: 'Foundation inspection due in 3 days', type: 'warning', category: 'inspection' },
    { title: 'Steel delivery arriving Monday', type: 'info', category: 'material' },
    { title: 'MEP coordination meeting scheduled', type: 'info', category: 'general' },
    { title: 'Weather alert — rain expected Thursday', type: 'warning', category: 'weather' },
  ];

  for (const n of notifications) {
    await supabase.from('notifications').insert({
      project_id: projectId,
      ...n,
      is_read: Math.random() < 0.5,
    });
  }

  return NextResponse.json({
    success: true,
    stats: {
      phases: allPhaseIds.length,
      tasks: allTaskIds.length,
      dependencies: dependencyPairs.length,
      milestones: milestoneData.length,
      employees: employeeIds.length,
      subcontractors: subIds.length,
      equipment: equipIds.length,
    },
  });
}
