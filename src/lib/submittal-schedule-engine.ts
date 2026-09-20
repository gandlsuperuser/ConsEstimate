/**
 * Submittal Schedule Engine — Core scheduling business logic
 * Integrates Submittals with Schedule Activities (Timeline tasks).
 * 
 * Works backward from the linked activity's required-on-site date:
 * Required On-Site Date = min(activity.material_delivery_date || activity.start_date)
 * Planned Approval Date = Required On-Site Date - (lead_time_weeks * 7 days)
 * Submit-By Date = Planned Approval Date - review_duration_days
 */

export interface ScheduleActivityRef {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  material_delivery_date?: string | null;
  phase_name?: string | null;
  is_critical?: boolean;
}

export interface ActivityLinkEvaluation {
  activity_id: string;
  activity_name: string;
  phase_name?: string | null;
  activity_start_date: string;
  activity_end_date: string;
  material_delivery_date?: string | null;
  required_on_site_date: string;
  is_controlling: boolean;
  float_days: number; // Days of buffer between arrival and required date
  impact_status: 'on_track' | 'attention_needed' | 'at_risk' | 'critical';
  impact_message: string;
}

export type ScheduleRiskLevel = 'green' | 'yellow' | 'red' | 'gray';

export interface ScheduleCalculationResult {
  has_linked_activities: boolean;
  controlling_activity_id: string | null;
  controlling_activity_name: string | null;
  required_on_site_date: string | null;
  planned_approval_date: string | null;
  submit_by_date: string | null;
  procurement_window_start: string | null;
  procurement_window_end: string | null;
  lead_time_days: number;
  review_duration_days: number;
  float_days: number | null;
  risk_status: ScheduleRiskLevel;
  risk_reasons: string[];
  recommended_actions: string[];
  linked_evaluations: ActivityLinkEvaluation[];
}

export interface SubmittalScheduleInput {
  lead_time_weeks?: number;
  review_duration_days?: number;
  status?: string;
  submitted_date?: string | null;
  approved_date?: string | null;
  required_on_site_override?: string | null;
  linked_activities?: ScheduleActivityRef[];
  current_date?: string; // YYYY-MM-DD, defaults to today
}

/** Helper: Parse YYYY-MM-DD to UTC midnight date */
export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}

/** Helper: Format Date to YYYY-MM-DD */
export function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Helper: Add/subtract calendar days */
export function addDays(dateStr: string, days: number): string {
  const dt = parseDate(dateStr);
  dt.setUTCDate(dt.getUTCDate() + days);
  return formatDate(dt);
}

/** Helper: Day difference (d2 - d1) */
export function diffDays(d1: string, d2: string): number {
  const dt1 = parseDate(d1).getTime();
  const dt2 = parseDate(d2).getTime();
  return Math.round((dt2 - dt1) / (1000 * 60 * 60 * 24));
}

/**
 * Calculates all schedule-driven dates working backward from linked activities
 */
export function calculateSubmittalSchedule(input: SubmittalScheduleInput): ScheduleCalculationResult {
  const todayStr = input.current_date || new Date().toISOString().slice(0, 10);
  const leadWeeks = Math.max(0, input.lead_time_weeks ?? 3);
  const leadDays = leadWeeks * 7;
  const reviewDays = Math.max(1, input.review_duration_days ?? 14);
  const linked = input.linked_activities || [];

  if (linked.length === 0 && !input.required_on_site_override) {
    return {
      has_linked_activities: false,
      controlling_activity_id: null,
      controlling_activity_name: null,
      required_on_site_date: null,
      planned_approval_date: null,
      submit_by_date: null,
      procurement_window_start: null,
      procurement_window_end: null,
      lead_time_days: leadDays,
      review_duration_days: reviewDays,
      float_days: null,
      risk_status: 'gray',
      risk_reasons: ['No schedule activities linked to this submittal.'],
      recommended_actions: ['Link to one or more schedule activities to establish controlling project milestones.'],
      linked_evaluations: [],
    };
  }

  // Determine required dates for each linked activity
  const evaluations: ActivityLinkEvaluation[] = linked.map((act) => {
    const reqDate = act.material_delivery_date || act.start_date;
    return {
      activity_id: act.id,
      activity_name: act.name,
      phase_name: act.phase_name,
      activity_start_date: act.start_date,
      activity_end_date: act.end_date,
      material_delivery_date: act.material_delivery_date || null,
      required_on_site_date: reqDate,
      is_controlling: false,
      float_days: 0,
      impact_status: 'on_track',
      impact_message: '',
    };
  });

  // Sort by required date ascending (earliest first)
  evaluations.sort((a, b) => a.required_on_site_date.localeCompare(b.required_on_site_date));

  let controllingReqDate: string;
  let controllingId: string | null = null;
  let controllingName: string | null = null;

  if (evaluations.length > 0) {
    evaluations[0].is_controlling = true;
    controllingReqDate = evaluations[0].required_on_site_date;
    controllingId = evaluations[0].activity_id;
    controllingName = evaluations[0].activity_name;
  } else {
    controllingReqDate = input.required_on_site_override!;
  }

  // Work backward from controlling date:
  // Required On-Site -> Planned Approval -> Submit-by
  const plannedApprovalDate = addDays(controllingReqDate, -leadDays);
  const submitByDate = addDays(plannedApprovalDate, -reviewDays);
  const procurementWindowStart = plannedApprovalDate;
  const procurementWindowEnd = controllingReqDate;

  // Calculate estimated arrival date based on current status
  let estimatedArrivalDate: string;
  const status = input.status || 'draft';
  const isApproved = status === 'approved' || status === 'approved_as_noted';
  const isUnderReview = status === 'pending' || status === 'under_review';

  if (isApproved) {
    // Approved! Arrival = (approval date || today) + leadDays
    const baseApproval = input.approved_date || todayStr;
    estimatedArrivalDate = addDays(baseApproval, leadDays);
  } else if (isUnderReview) {
    // Under review: Arrival = max(today, plannedApprovalDate) + leadDays
    const effectiveApproval = input.submitted_date
      ? addDays(input.submitted_date, reviewDays)
      : addDays(todayStr, Math.min(reviewDays, 7));
    estimatedArrivalDate = addDays(effectiveApproval, leadDays);
  } else {
    // Not yet submitted (draft, revise_resubmit)
    estimatedArrivalDate = addDays(todayStr, reviewDays + leadDays);
  }

  // Controlling float: days between estimated arrival and required date
  const floatDays = diffDays(estimatedArrivalDate, controllingReqDate);

  // Evaluate impacts for each linked activity
  for (const ev of evaluations) {
    const actFloat = diffDays(estimatedArrivalDate, ev.required_on_site_date);
    ev.float_days = actFloat;

    if (actFloat < 0) {
      ev.impact_status = ev.is_controlling ? 'critical' : 'at_risk';
      ev.impact_message = `${Math.abs(actFloat)} days behind required date (${ev.required_on_site_date}). Schedule impact likely!`;
    } else if (actFloat <= 5) {
      ev.impact_status = 'attention_needed';
      ev.impact_message = `Tight buffer: only ${actFloat} days float before ${ev.required_on_site_date}.`;
    } else {
      ev.impact_status = 'on_track';
      ev.impact_message = ev.is_controlling
        ? `Controlling activity: ${actFloat} days float available.`
        : `Safe: +${actFloat} days buffer ahead of activity start.`;
    }
  }

  // Determine Risk Category & Reasons
  const riskReasons: string[] = [];
  const recommendedActions: string[] = [];
  let riskStatus: ScheduleRiskLevel = 'green';

  const daysToSubmitBy = diffDays(todayStr, submitByDate);
  const daysToApproval = diffDays(todayStr, plannedApprovalDate);
  const daysToOnSite = diffDays(todayStr, controllingReqDate);

  // 1. Check if overdue for submission
  if (!isApproved && !isUnderReview) {
    if (daysToSubmitBy < 0) {
      riskStatus = 'red';
      riskReasons.push(`Submission is ${Math.abs(daysToSubmitBy)} days overdue (Submit-by was ${submitByDate}).`);
      recommendedActions.push('Expedite submittal package immediately to avoid pushing activity start date.');
    } else if (daysToSubmitBy <= 7) {
      riskStatus = 'yellow';
      riskReasons.push(`Submit-by deadline approaching in ${daysToSubmitBy} days (${submitByDate}).`);
      recommendedActions.push('Finalize manufacturer cut sheets and transmit to A/E for review.');
    }
  }

  // 2. Check if review is delayed beyond planned approval date
  if (isUnderReview) {
    if (daysToApproval < 0) {
      riskStatus = 'red';
      riskReasons.push(`Review delayed: Planned approval was ${plannedApprovalDate} (${Math.abs(daysToApproval)} days ago).`);
      recommendedActions.push('Follow up with architect/engineer approver to release submittal approval.');
    } else if (daysToApproval <= 3) {
      riskStatus = 'yellow';
      riskReasons.push(`Awaiting review: Approval needed within ${daysToApproval} days (${plannedApprovalDate}).`);
      recommendedActions.push('Ping reviewer to ensure timely return before fabrication lead-time begins.');
    }
  }

  // 3. Check lead-time fit (negative float)
  if (floatDays < 0) {
    riskStatus = 'red';
    riskReasons.push(`Lead time (${leadWeeks} wks / ${leadDays} days) no longer fits before required on-site date (${controllingReqDate}). Shortfall of ${Math.abs(floatDays)} days.`);
    recommendedActions.push('Request expedited fabrication/freight or adjust downstream activity sequence.');
  } else if (floatDays <= 4 && !riskReasons.some(r => r.includes('Shortfall'))) {
    if ((riskStatus as ScheduleRiskLevel) !== 'red') {
      riskStatus = 'yellow';
    }
    riskReasons.push(`Critical buffer warning: Only ${floatDays} days total float remaining before delivery deadline.`);
    recommendedActions.push('Monitor manufacturer production closely; buffer is nearly depleted.');
  }

  // 4. Overdue on site
  if (daysToOnSite < 0 && !isApproved) {
    riskStatus = 'red';
    riskReasons.push(`Controlling required on-site date (${controllingReqDate}) has passed without approval!`);
    recommendedActions.push('Immediate superintendent and project manager escalation required.');
  }

  if (riskReasons.length === 0) {
    riskReasons.push(`On track: ${floatDays} days float. Controlling activity '${controllingName}' required date is ${controllingReqDate}.`);
    recommendedActions.push('Maintain standard procurement milestone checkpoints.');
  }

  return {
    has_linked_activities: true,
    controlling_activity_id: controllingId,
    controlling_activity_name: controllingName,
    required_on_site_date: controllingReqDate,
    planned_approval_date: plannedApprovalDate,
    submit_by_date: submitByDate,
    procurement_window_start: procurementWindowStart,
    procurement_window_end: procurementWindowEnd,
    lead_time_days: leadDays,
    review_duration_days: reviewDays,
    float_days: floatDays,
    risk_status: riskStatus,
    risk_reasons: riskReasons,
    recommended_actions: recommendedActions,
    linked_evaluations: evaluations,
  };
}
