import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSubmittalSchedule,
  addDays,
  diffDays,
} from '../src/lib/submittal-schedule-engine.ts';

test('Backward schedule calculation from single activity', () => {
  const result = calculateSubmittalSchedule({
    lead_time_weeks: 4, // 28 days
    review_duration_days: 14,
    status: 'draft',
    current_date: '2026-09-01',
    linked_activities: [
      {
        id: 'act-1',
        name: 'HVAC Duct Installation',
        start_date: '2026-11-01',
        end_date: '2026-11-15',
        material_delivery_date: null,
      },
    ],
  });

  assert.equal(result.has_linked_activities, true);
  assert.equal(result.controlling_activity_id, 'act-1');
  assert.equal(result.required_on_site_date, '2026-11-01');
  // Planned approval = 2026-11-01 - 28 days = 2026-10-04
  assert.equal(result.planned_approval_date, '2026-10-04');
  // Submit by = 2026-10-04 - 14 days = 2026-09-20
  assert.equal(result.submit_by_date, '2026-09-20');
  assert.equal(result.risk_status, 'green');
});

test('Multiple linked activities uses earliest required date as controlling', () => {
  const result = calculateSubmittalSchedule({
    lead_time_weeks: 3, // 21 days
    review_duration_days: 14,
    status: 'draft',
    current_date: '2026-09-01',
    linked_activities: [
      {
        id: 'act-late',
        name: 'Late Activity',
        start_date: '2026-12-01',
        end_date: '2026-12-10',
      },
      {
        id: 'act-early',
        name: 'Early Activity',
        start_date: '2026-10-15',
        end_date: '2026-10-25',
      },
      {
        id: 'act-material',
        name: 'Special Delivery Activity',
        start_date: '2026-11-01',
        end_date: '2026-11-10',
        material_delivery_date: '2026-10-10', // Earliest!
      },
    ],
  });

  assert.equal(result.controlling_activity_id, 'act-material');
  assert.equal(result.required_on_site_date, '2026-10-10');
  // Planned approval = 2026-10-10 - 21 days = 2026-09-19
  assert.equal(result.planned_approval_date, '2026-09-19');
  // Submit by = 2026-09-19 - 14 days = 2026-09-05
  assert.equal(result.submit_by_date, '2026-09-05');

  // Check linked evaluations
  assert.equal(result.linked_evaluations.length, 3);
  const controllingEv = result.linked_evaluations.find(e => e.is_controlling);
  assert.equal(controllingEv.activity_id, 'act-material');
});

test('Overdue submission produces Red risk status', () => {
  const result = calculateSubmittalSchedule({
    lead_time_weeks: 6, // 42 days
    review_duration_days: 14,
    status: 'draft',
    current_date: '2026-09-20',
    linked_activities: [
      {
        id: 'act-1',
        name: 'Immediate Wall Framing',
        start_date: '2026-10-01', // Submit by was 2026-08-06
        end_date: '2026-10-10',
      },
    ],
  });

  assert.equal(result.risk_status, 'red');
  assert.ok(result.risk_reasons.some(r => r.includes('overdue') || r.includes('Overdue')));
});

test('Approaching deadline produces Yellow risk status', () => {
  // Submit-by date in 4 days
  const today = '2026-09-20';
  const submitBy = addDays(today, 4); // 2026-09-24
  const plannedApproval = addDays(submitBy, 14); // 2026-10-08
  const reqOnSite = addDays(plannedApproval, 21); // 2026-10-29

  const result = calculateSubmittalSchedule({
    lead_time_weeks: 3,
    review_duration_days: 14,
    status: 'draft',
    current_date: today,
    linked_activities: [
      {
        id: 'act-upcoming',
        name: 'Upcoming Milestone',
        start_date: reqOnSite,
        end_date: addDays(reqOnSite, 5),
      },
    ],
  });

  assert.equal(result.risk_status, 'yellow');
  assert.ok(result.risk_reasons.some(r => r.includes('approaching')));
});

test('Unlinked submittal produces Gray risk status', () => {
  const result = calculateSubmittalSchedule({
    lead_time_weeks: 3,
    status: 'draft',
    linked_activities: [],
  });

  assert.equal(result.risk_status, 'gray');
  assert.equal(result.has_linked_activities, false);
});
