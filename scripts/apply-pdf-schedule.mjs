import { createClient } from '@supabase/supabase-js';

const PROJECT_ID = '1f2af6f8-7486-486c-b03e-334f6c88ec57';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Master schedule definition from the PDF
const SCHEDULE_DATA = [
  {
    phaseName: 'PHASE 1 / BUILDING 1 — COMPLETE BUILDING PROCESS',
    color: '#2563eb', // Blue
    sortOrder: 0,
    tasks: [
      {
        wbs: 'A.01',
        name: 'Submittals',
        pred: '',
        dur: 15,
        start: '2026-08-03',
        finish: '2026-08-21',
        trade: 'GC / PM',
        notes: '20',
        priority: 'critical',
      },
      {
        wbs: 'A.02',
        name: 'Temp Facilities, clinic storage supplies',
        pred: 'A.01',
        dur: 5,
        start: '2026-08-24',
        finish: '2026-08-28',
        trade: 'GC / Safety',
        notes: '20',
        priority: 'medium',
      },
      {
        wbs: 'A.03',
        name: 'MEP Safe-Off / LOTO / Existing Conditions Verification',
        pred: 'A.02',
        dur: 4,
        start: '2026-08-31',
        finish: '2026-09-03',
        trade: 'Electrical / Plumbing',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.04',
        name: 'Selective Demolition — Walls / Ceiling / Flooring / Fixtures',
        pred: 'A.03',
        dur: 8,
        start: '2026-09-04',
        finish: '2026-09-15',
        trade: 'Demo',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.05',
        name: 'Sawcut / Trench / Underslab Plumbing Prep',
        pred: 'A.04',
        dur: 6,
        start: '2026-09-07',
        finish: '2026-09-14',
        trade: 'Demo / Plumbing',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.06',
        name: 'Install Metal Stud Framing',
        pred: 'A.04',
        dur: 8,
        start: '2026-09-10',
        finish: '2026-09-21',
        trade: 'Framing',
        notes: '20',
        priority: 'critical',
      },
      {
        wbs: 'A.07',
        name: 'Underslab Plumbing Rough-In',
        pred: 'A.05',
        dur: 2,
        start: '2026-09-14',
        finish: '2026-09-15',
        trade: 'Plumbing',
        notes: 'User anchor date',
        priority: 'high',
      },
      {
        wbs: 'A.08',
        name: 'Concrete backfill Underslab Plumbing',
        pred: 'A.07',
        dur: 1,
        start: '2026-09-16',
        finish: '2026-09-16',
        trade: 'GC / Concrete',
        notes: '',
        priority: 'medium',
      },
      {
        wbs: 'A.09',
        name: 'Concrete Pourback / Handicap Ramp / IT Room',
        pred: 'A.07',
        dur: 2,
        start: '2026-09-17',
        finish: '2026-09-18',
        trade: 'GC / Concrete',
        notes: 'User anchor date',
        priority: 'high',
      },
      {
        wbs: 'A.10',
        name: 'HVAC Duct / Exhaust / Equipment Rough-In',
        pred: 'A.06',
        dur: 14,
        start: '2026-09-22',
        finish: '2026-10-09',
        trade: 'HVAC',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.11',
        name: 'Plumbing In-Wall / Above-Ceiling Rough-In',
        pred: 'A.08,A.06',
        dur: 12,
        start: '2026-09-21',
        finish: '2026-10-06',
        trade: 'Plumbing',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.12',
        name: 'Electrical In-Wall / Above-Ceiling Rough-In',
        pred: 'A.06',
        dur: 14,
        start: '2026-09-22',
        finish: '2026-10-09',
        trade: 'Electrical',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.14',
        name: 'Blocking / Backing / Door Frame Coordination',
        pred: 'A.06',
        dur: 10,
        start: '2026-09-24',
        finish: '2026-10-07',
        trade: 'Carpentry / Framing',
        notes: '20',
        priority: 'medium',
      },
      {
        wbs: 'A.15',
        name: 'In-Wall / Above-Ceiling MEP Inspection',
        pred: 'A.09,A.10,A.11,A.12',
        dur: 1,
        start: '2026-10-12',
        finish: '2026-10-12',
        trade: 'GC / AHJ',
        notes: '20',
        priority: 'critical',
        inspection: true,
      },
      {
        wbs: 'A.16',
        name: 'Insulation / Sound Attenuation',
        pred: 'A.14',
        dur: 3,
        start: '2026-10-15',
        finish: '2026-10-19',
        trade: 'Insulation',
        notes: '20',
        priority: 'medium',
      },
      {
        wbs: 'A.17',
        name: 'Drywall Hang / Tape / Float / Finish',
        pred: 'A.15',
        dur: 6,
        start: '2026-10-21',
        finish: '2026-10-28',
        trade: 'Drywall',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.18',
        name: 'Prime / First Coat Paint',
        pred: 'A.16',
        dur: 5,
        start: '2026-11-06',
        finish: '2026-11-12',
        trade: 'Painting',
        notes: '20',
        priority: 'medium',
      },
      {
        wbs: 'A.19',
        name: 'Acoustical Ceiling Grid',
        pred: 'A.16',
        dur: 6,
        start: '2026-11-06',
        finish: '2026-11-13',
        trade: 'Ceiling',
        notes: '20',
        priority: 'medium',
      },
      {
        wbs: 'A.20',
        name: 'Floor Prep / Sheet Vinyl / LVT / Cove Base',
        pred: 'A.17',
        dur: 8,
        start: '2026-11-13',
        finish: '2026-11-24',
        trade: 'Flooring',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.21',
        name: 'Casework / Countertops / Millwork/Owner',
        pred: 'A.19',
        dur: 7,
        start: '2026-11-25',
        finish: '2026-12-07',
        trade: 'Millwork',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.22',
        name: 'Doors / Hardware / Accessories',
        pred: 'A.19',
        dur: 6,
        start: '2026-11-25',
        finish: '2026-12-04',
        trade: 'Finish Carpentry',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.23',
        name: 'Electrical Trim / Lighting / Devices',
        pred: 'A.17,A.18',
        dur: 7,
        start: '2026-11-16',
        finish: '2026-11-24',
        trade: 'Electrical',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.24',
        name: 'Plumbing Fixtures / Clinical Sink Trim',
        pred: 'A.20',
        dur: 5,
        start: '2026-12-08',
        finish: '2026-12-14',
        trade: 'Plumbing',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.25',
        name: 'HVAC Grilles / Diffusers / Controls',
        pred: 'A.18,A.09',
        dur: 3,
        start: '2026-11-16',
        finish: '2026-11-18',
        trade: 'HVAC',
        notes: '20',
        priority: 'medium',
      },
      {
        wbs: 'A.26',
        name: 'Ceiling Tile / Final Device Trim',
        pred: 'A.22,A.24',
        dur: 3,
        start: '2026-11-25',
        finish: '2026-12-01',
        trade: 'Ceiling / MEP',
        notes: '20',
        priority: 'medium',
      },
      {
        wbs: 'A.28',
        name: 'Final Paint / Touch-Up / Wall Protection',
        pred: 'A.20,A.21',
        dur: 2,
        start: '2026-12-08',
        finish: '2026-12-09',
        trade: 'Painting',
        notes: '20',
        priority: 'medium',
      },
      {
        wbs: 'A.29',
        name: 'Final Clean / ICRA Terminal Clean',
        pred: 'A.25,A.26',
        dur: 1,
        start: '2026-12-10',
        finish: '2026-12-10',
        trade: 'Cleaning',
        notes: '20',
        priority: 'medium',
      },
      {
        wbs: 'A.30',
        name: 'Owner / Architect Punch List',
        pred: 'A.23,A.28,A.29',
        dur: 2,
        start: '2026-12-15',
        finish: '2026-12-16',
        trade: 'GC / Architect',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.31',
        name: 'Punch Corrections / Owner Training / O&M Closeout',
        pred: 'A.30',
        dur: 1,
        start: '2026-12-17',
        finish: '2026-12-17',
        trade: 'GC / All Trades',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.32',
        name: 'FINAL INSPECTION / CO / TURNOVER',
        pred: 'A.31',
        dur: 1,
        start: '2026-12-18',
        finish: '2026-12-18',
        trade: 'GC / AHJ / Owner',
        notes: '20',
        priority: 'critical',
        isMilestone: true,
      },
    ],
  },
  {
    phaseName: 'PHASE 2 / BUILDING 2 — COMPLETE BUILDING PROCESS',
    color: '#059669', // Emerald
    sortOrder: 1,
    tasks: [
      {
        wbs: 'A.01',
        name: 'Selective Demolition — Walls / Ceiling / Flooring / Fixtures',
        pred: 'A.03',
        dur: 8,
        start: '2026-12-21',
        finish: '2026-12-30',
        trade: 'Demo',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.02',
        name: 'Sawcut / Trench / Underslab Plumbing Prep',
        pred: 'A.04',
        dur: 6,
        start: '2026-12-22',
        finish: '2026-12-29',
        trade: 'Demo / Plumbing',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.03',
        name: 'Install Metal Stud Framing',
        pred: 'A.04',
        dur: 10,
        start: '2026-12-25',
        finish: '2027-01-07',
        trade: 'Framing',
        notes: '20',
        priority: 'critical',
      },
      {
        wbs: 'A.04',
        name: 'Underslab Plumbing Rough-In/por/back',
        pred: 'A.05',
        dur: 8,
        start: '2026-12-29',
        finish: '2027-01-07',
        trade: 'Plumbing',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.06',
        name: 'HVAC Duct / Exhaust / Equipment Rough-In',
        pred: 'A.06',
        dur: 14,
        start: '2027-01-06',
        finish: '2027-01-25',
        trade: 'HVAC',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.07',
        name: 'Plumbing In-Wall / Above-Ceiling Rough-In',
        pred: 'A.08,A.06',
        dur: 12,
        start: '2027-01-01',
        finish: '2027-01-18',
        trade: 'Plumbing',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.08',
        name: 'Electrical In-Wall / Above-Ceiling Rough-In',
        pred: 'A.06',
        dur: 14,
        start: '2027-01-06',
        finish: '2027-01-25',
        trade: 'Electrical',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.09',
        name: 'Low Voltage / Data / Nurse Call / Security Rough-In',
        pred: 'A.11',
        dur: 8,
        start: '2027-01-19',
        finish: '2027-01-28',
        trade: 'Low Voltage',
        notes: '20',
        priority: 'medium',
      },
      {
        wbs: 'A.10',
        name: 'Blocking / Backing / Door Frame Coordination',
        pred: 'A.06',
        dur: 7,
        start: '2027-01-08',
        finish: '2027-01-18',
        trade: 'Carpentry / Framing',
        notes: '20',
        priority: 'medium',
      },
      {
        wbs: 'A.11',
        name: 'In-Wall / Above-Ceiling MEP Inspection',
        pred: 'A.09,A.10,A.11,A.13',
        dur: 3,
        start: '2027-01-26',
        finish: '2027-01-28',
        trade: 'GC / AHJ',
        notes: '20',
        priority: 'critical',
        inspection: true,
      },
      {
        wbs: 'A.12',
        name: 'Insulation / Sound Attenuation',
        pred: 'A.14',
        dur: 2,
        start: '2027-01-29',
        finish: '2027-02-01',
        trade: 'Insulation',
        notes: '20',
        priority: 'medium',
      },
      {
        wbs: 'A.13',
        name: 'Drywall Hang / Tape / Float / Finish',
        pred: 'A.15',
        dur: 8,
        start: '2027-02-04',
        finish: '2027-02-15',
        trade: 'Drywall',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.14',
        name: 'Prime / First Coat Paint',
        pred: 'A.16',
        dur: 5,
        start: '2027-02-22',
        finish: '2027-02-26',
        trade: 'Painting',
        notes: '20',
        priority: 'medium',
      },
      {
        wbs: 'A.15',
        name: 'Acoustical Ceiling Grid',
        pred: 'A.16',
        dur: 6,
        start: '2027-02-22',
        finish: '2027-03-01',
        trade: 'Ceiling',
        notes: '20',
        priority: 'medium',
      },
      {
        wbs: 'A.16',
        name: 'Floor Prep / Sheet Vinyl / LVT / Cove Base',
        pred: 'A.17',
        dur: 8,
        start: '2027-03-01',
        finish: '2027-03-10',
        trade: 'Flooring',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.17',
        name: 'Casework / Countertops / Millwork/ Owner',
        pred: 'A.19',
        dur: 7,
        start: '2027-03-11',
        finish: '2027-03-19',
        trade: 'Millwork',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.18',
        name: 'Doors / Hardware / Accessories',
        pred: 'A.19',
        dur: 6,
        start: '2027-03-11',
        finish: '2027-03-18',
        trade: 'Finish Carpentry',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.19',
        name: 'Electrical Trim / Lighting / Devices',
        pred: 'A.17,A.18',
        dur: 7,
        start: '2027-03-02',
        finish: '2027-03-10',
        trade: 'Electrical',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.20',
        name: 'Plumbing Fixtures / Clinical Sink Trim',
        pred: 'A.20',
        dur: 5,
        start: '2027-03-22',
        finish: '2027-03-26',
        trade: 'Plumbing',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.21',
        name: 'HVAC Grilles / Diffusers / Controls',
        pred: 'A.18,A.09',
        dur: 6,
        start: '2027-03-02',
        finish: '2027-03-09',
        trade: 'HVAC',
        notes: '20',
        priority: 'medium',
      },
      {
        wbs: 'A.22',
        name: 'Ceiling Tile / Final Device Trim',
        pred: 'A.22,A.24',
        dur: 5,
        start: '2027-03-11',
        finish: '2027-03-17',
        trade: 'Ceiling / MEP',
        notes: '20',
        priority: 'medium',
      },
      {
        wbs: 'A.23',
        name: 'Final Paint / Touch-Up / Wall Protection',
        pred: 'A.20,A.21',
        dur: 2,
        start: '2027-03-22',
        finish: '2027-03-23',
        trade: 'Painting',
        notes: '20',
        priority: 'medium',
      },
      {
        wbs: 'A.25',
        name: 'Final Clean / ICRA Terminal Clean',
        pred: 'A.25,A.26',
        dur: 2,
        start: '2027-03-29',
        finish: '2027-03-30',
        trade: 'Cleaning',
        notes: '20',
        priority: 'medium',
      },
      {
        wbs: 'A.26',
        name: 'Owner / Architect Punch List',
        pred: 'A.23,A.28,A.29',
        dur: 2,
        start: '2027-04-01',
        finish: '2027-04-02',
        trade: 'GC / Architect',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.27',
        name: 'Punch Corrections / Owner Training / O&M Closeout',
        pred: 'A.30',
        dur: 2,
        start: '2027-04-06',
        finish: '2027-04-07',
        trade: 'GC / All Trades',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.28',
        name: 'FINAL INSPECTION / CO / TURNOVER',
        pred: 'A.31',
        dur: 1,
        start: '2027-04-13',
        finish: '2027-04-13',
        trade: 'GC / AHJ / Owner',
        notes: '20',
        priority: 'critical',
        isMilestone: true,
      },
    ],
  },
  {
    phaseName: 'PHASE 3 / BUILDING 3 — COMPLETE BUILDING PROCESS',
    color: '#d97706', // Amber
    sortOrder: 2,
    tasks: [
      {
        wbs: 'A.01',
        name: 'Selective Demolition — Walls / Ceiling / Flooring / Fixtures',
        pred: 'A.03',
        dur: 8,
        start: '2027-04-14',
        finish: '2027-04-23',
        trade: 'Demo',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.02',
        name: 'Sawcut / Trench / Underslab Plumbing Prep',
        pred: 'A.04',
        dur: 6,
        start: '2027-04-15',
        finish: '2027-04-22',
        trade: 'Demo / Plumbing',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.03',
        name: 'Install Metal Stud Framing',
        pred: 'A.04',
        dur: 10,
        start: '2027-04-20',
        finish: '2027-05-03',
        trade: 'Framing',
        notes: '20',
        priority: 'critical',
      },
      {
        wbs: 'A.06',
        name: 'HVAC Duct / Exhaust / Equipment Rough-In',
        pred: 'A.06',
        dur: 14,
        start: '2027-04-30',
        finish: '2027-05-19',
        trade: 'HVAC',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.07',
        name: 'Plumbing In-Wall / Above-Ceiling Rough-In',
        pred: 'A.08,A.06',
        dur: 12,
        start: '2027-04-27',
        finish: '2027-05-12',
        trade: 'Plumbing',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.08',
        name: 'Electrical In-Wall / Above-Ceiling Rough-In',
        pred: 'A.06',
        dur: 10,
        start: '2027-04-30',
        finish: '2027-05-13',
        trade: 'Electrical',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.09',
        name: 'Low Voltage / Data / Security Rough-In',
        pred: 'A.11',
        dur: 4,
        start: '2027-05-13',
        finish: '2027-05-18',
        trade: 'Low Voltage',
        notes: '20',
        priority: 'medium',
      },
      {
        wbs: 'A.10',
        name: 'Blocking / Backing / Door Frame Coordination',
        pred: 'A.06',
        dur: 5,
        start: '2027-05-04',
        finish: '2027-05-10',
        trade: 'Carpentry / Framing',
        notes: '20',
        priority: 'medium',
      },
      {
        wbs: 'A.11',
        name: 'In-Wall / Above-Ceiling MEP Inspection',
        pred: 'A.09,A.10,A.11,A.13',
        dur: 1,
        start: '2027-05-20',
        finish: '2027-05-20',
        trade: 'GC / AHJ',
        notes: '20',
        priority: 'critical',
        inspection: true,
      },
      {
        wbs: 'A.12',
        name: 'Insulation / Sound Attenuation',
        pred: 'A.14',
        dur: 2,
        start: '2027-05-25',
        finish: '2027-05-26',
        trade: 'Insulation',
        notes: '20',
        priority: 'medium',
      },
      {
        wbs: 'A.13',
        name: 'Drywall Hang / Tape / Float / Finish',
        pred: 'A.15',
        dur: 5,
        start: '2027-05-31',
        finish: '2027-06-04',
        trade: 'Drywall',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.14',
        name: 'Prime / First Coat Paint',
        pred: 'A.16',
        dur: 5,
        start: '2027-06-16',
        finish: '2027-06-22',
        trade: 'Painting',
        notes: '20',
        priority: 'medium',
      },
      {
        wbs: 'A.15',
        name: 'Acoustical Ceiling Grid',
        pred: 'A.16',
        dur: 6,
        start: '2027-06-16',
        finish: '2027-06-23',
        trade: 'Ceiling',
        notes: '20',
        priority: 'medium',
      },
      {
        wbs: 'A.16',
        name: 'Floor Prep / Sheet Vinyl / LVT / Cove Base',
        pred: 'A.17',
        dur: 8,
        start: '2027-06-23',
        finish: '2027-07-02',
        trade: 'Flooring',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.17',
        name: 'Casework / Countertops / Millwork/Owner',
        pred: 'A.19',
        dur: 7,
        start: '2027-07-05',
        finish: '2027-07-13',
        trade: 'Millwork',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.18',
        name: 'Doors / Hardware / Accessories',
        pred: 'A.19',
        dur: 6,
        start: '2027-07-05',
        finish: '2027-07-12',
        trade: 'Finish Carpentry',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.19',
        name: 'Electrical Trim / Lighting / Devices',
        pred: 'A.17,A.18',
        dur: 7,
        start: '2027-06-24',
        finish: '2027-07-02',
        trade: 'Electrical',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.20',
        name: 'Plumbing Fixtures / Clinical Sink Trim',
        pred: 'A.20',
        dur: 5,
        start: '2027-07-14',
        finish: '2027-07-20',
        trade: 'Plumbing',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.21',
        name: 'HVAC Grilles / Diffusers / Controls',
        pred: 'A.18,A.09',
        dur: 4,
        start: '2027-06-24',
        finish: '2027-06-29',
        trade: 'HVAC',
        notes: '20',
        priority: 'medium',
      },
      {
        wbs: 'A.22',
        name: 'Ceiling Tile / Final Device Trim',
        pred: 'A.22,A.24',
        dur: 5,
        start: '2027-07-05',
        finish: '2027-07-09',
        trade: 'Ceiling / MEP',
        notes: '20',
        priority: 'medium',
      },
      {
        wbs: 'A.23',
        name: 'Final Paint / Touch-Up / Wall Protection',
        pred: 'A.20,A.21',
        dur: 2,
        start: '2027-07-14',
        finish: '2027-07-15',
        trade: 'Painting',
        notes: '20',
        priority: 'medium',
      },
      {
        wbs: 'A.25',
        name: 'Final Clean / ICRA Terminal Clean',
        pred: 'A.25,A.26',
        dur: 2,
        start: '2027-07-21',
        finish: '2027-07-22',
        trade: 'Cleaning',
        notes: '20',
        priority: 'medium',
      },
      {
        wbs: 'A.26',
        name: 'Owner / Architect Punch List',
        pred: 'A.23,A.28,A.29',
        dur: 1,
        start: '2027-07-26',
        finish: '2027-07-26',
        trade: 'GC / Architect',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.27',
        name: 'Punch Corrections / Owner Training / O&M Closeout',
        pred: 'A.30',
        dur: 1,
        start: '2027-07-29',
        finish: '2027-07-29',
        trade: 'GC / All Trades',
        notes: '20',
        priority: 'high',
      },
      {
        wbs: 'A.28',
        name: 'FINAL INSPECTION / CO / TURNOVER',
        pred: 'A.31',
        dur: 1,
        start: '2027-08-05',
        finish: '2027-08-05',
        trade: 'GC / AHJ / Owner',
        notes: '20',
        priority: 'critical',
        isMilestone: true,
      },
    ],
  },
];

async function applySchedule() {
  console.log('--- Cleaning Current Schedule for Conviva Jourdanton ---');

  // 1. Get existing task IDs for cleanup
  const { data: existingTasks } = await supabase
    .from('project_tasks')
    .select('id')
    .eq('project_id', PROJECT_ID);

  if (existingTasks && existingTasks.length > 0) {
    const taskIds = existingTasks.map((t) => t.id);
    console.log(`Found ${taskIds.length} existing tasks to clean up.`);

    await supabase.from('task_dependencies').delete().in('predecessor_id', taskIds);
    await supabase.from('task_dependencies').delete().in('successor_id', taskIds);
    await supabase.from('task_assignments').delete().in('task_id', taskIds);
    await supabase.from('task_comments').delete().in('task_id', taskIds);
    await supabase.from('task_checklists').delete().in('task_id', taskIds);
    await supabase.from('task_status_history').delete().in('task_id', taskIds);
  }

  // 2. Delete project-level schedule records
  await supabase.from('project_milestones').delete().eq('project_id', PROJECT_ID);
  await supabase.from('weather_delays').delete().eq('project_id', PROJECT_ID);
  await supabase.from('project_risks').delete().eq('project_id', PROJECT_ID);
  await supabase.from('project_tasks').delete().eq('project_id', PROJECT_ID);
  await supabase.from('project_phases').delete().eq('project_id', PROJECT_ID);

  console.log('Cleaned old schedule data successfully.');

  // 3. Update project start date
  await supabase.from('projects').update({
    start_date: '2026-08-01',
  }).eq('id', PROJECT_ID);

  // Set today for status computation (Sep 20, 2026)
  const today = new Date('2026-09-20T23:59:59');

  const allInsertedTasks = [];
  const taskMapByPhaseAndWbs = new Map(); // `${phaseIndex}_${wbs}` -> task.id
  const dependenciesToInsert = [];
  const milestonesToInsert = [];

  let lastPhaseFinishTaskId = null;

  for (let pIdx = 0; pIdx < SCHEDULE_DATA.length; pIdx++) {
    const p = SCHEDULE_DATA[pIdx];
    const phaseStart = p.tasks[0].start;
    const phaseEnd = p.tasks[p.tasks.length - 1].finish;

    // Calculate phase status & progress
    const allDone = p.tasks.every((t) => new Date(t.finish) < today);
    const anyStarted = p.tasks.some((t) => new Date(t.start) <= today);
    const phaseStatus = allDone ? 'completed' : anyStarted ? 'in_progress' : 'not_started';

    // Insert Phase
    const { data: insertedPhase, error: phaseErr } = await supabase
      .from('project_phases')
      .insert({
        project_id: PROJECT_ID,
        name: p.phaseName,
        sort_order: pIdx,
        color: p.color,
        start_date: phaseStart,
        end_date: phaseEnd,
        baseline_start: phaseStart,
        baseline_end: phaseEnd,
        status: phaseStatus,
        progress: 0, // will compute below
      })
      .select()
      .single();

    if (phaseErr || !insertedPhase) {
      console.error(`Error inserting phase ${p.phaseName}:`, phaseErr);
      continue;
    }

    console.log(`Inserted Phase: ${p.phaseName} (ID: ${insertedPhase.id})`);

    let totalTasksProgress = 0;

    for (let tIdx = 0; tIdx < p.tasks.length; tIdx++) {
      const t = p.tasks[tIdx];
      const taskStart = new Date(t.start);
      const taskEnd = new Date(t.finish);

      let status = 'not_started';
      let progress = 0;

      if (taskEnd < today) {
        status = 'completed';
        progress = 100;
      } else if (taskStart <= today && taskEnd >= today) {
        status = 'in_progress';
        // Active task on Sep 20, 2026
        progress = Math.min(90, Math.max(10, Math.round((t.dur > 1 ? 7 / t.dur : 0.8) * 100)));
      }

      totalTasksProgress += progress;

      // Task name with clean WBS prefix
      const taskFullName = `${t.wbs} — ${t.name}`;

      const { data: insertedTask, error: taskErr } = await supabase
        .from('project_tasks')
        .insert({
          project_id: PROJECT_ID,
          phase_id: insertedPhase.id,
          name: taskFullName,
          description: `WBS: ${t.wbs} | Trade: ${t.trade}${t.notes ? ` | Notes: ${t.notes}` : ''}`,
          department: t.trade,
          assigned_to: t.trade,
          start_date: t.start,
          end_date: t.finish,
          duration: t.dur,
          working_days: t.dur,
          baseline_start: t.start,
          baseline_end: t.finish,
          status,
          priority: t.priority || 'medium',
          progress,
          is_milestone: !!t.isMilestone,
          is_critical: t.priority === 'critical',
          sort_order: tIdx,
          inspection_required: !!t.inspection,
          inspection_passed: t.inspection && status === 'completed' ? true : null,
          color: p.color,
          notes: t.notes || null,
        })
        .select()
        .single();

      if (taskErr || !insertedTask) {
        console.error(`Error inserting task ${taskFullName}:`, taskErr);
        continue;
      }

      allInsertedTasks.push(insertedTask);
      taskMapByPhaseAndWbs.set(`${pIdx}_${t.wbs}`, insertedTask.id);

      // Milestone
      if (t.isMilestone) {
        milestonesToInsert.push({
          project_id: PROJECT_ID,
          task_id: insertedTask.id,
          name: `${p.phaseName} — Turnover & CO`,
          target_date: t.finish,
          status: status === 'completed' ? 'completed' : 'pending',
          is_key_milestone: pIdx === SCHEDULE_DATA.length - 1,
          sort_order: pIdx,
        });
      }

      // Collect predecessor dependencies
      if (t.pred && t.pred.trim()) {
        const predCodes = t.pred.split(',').map((c) => c.trim()).filter(Boolean);
        for (const predCode of predCodes) {
          const predId = taskMapByPhaseAndWbs.get(`${pIdx}_${predCode}`);
          if (predId) {
            dependenciesToInsert.push({
              predecessor_id: predId,
              successor_id: insertedTask.id,
              dependency_type: 'FS',
              lag_days: 0,
            });
          }
        }
      }
    }

    // Connect last phase turnover -> current phase selective demo
    if (lastPhaseFinishTaskId && p.tasks.length > 0) {
      const firstTaskId = taskMapByPhaseAndWbs.get(`${pIdx}_${p.tasks[0].wbs}`);
      if (firstTaskId) {
        dependenciesToInsert.push({
          predecessor_id: lastPhaseFinishTaskId,
          successor_id: firstTaskId,
          dependency_type: 'FS',
          lag_days: 0,
        });
      }
    }

    // Track last task for inter-phase connection
    const lastTaskWbs = p.tasks[p.tasks.length - 1].wbs;
    lastPhaseFinishTaskId = taskMapByPhaseAndWbs.get(`${pIdx}_${lastTaskWbs}`);

    // Update phase progress
    const avgProgress = Math.round(totalTasksProgress / p.tasks.length);
    await supabase.from('project_phases').update({ progress: avgProgress }).eq('id', insertedPhase.id);
  }

  // 4. Insert task dependencies
  console.log(`Inserting ${dependenciesToInsert.length} task dependencies...`);
  if (dependenciesToInsert.length > 0) {
    const { error: depErr } = await supabase.from('task_dependencies').insert(dependenciesToInsert);
    if (depErr) {
      console.error('Error inserting dependencies:', depErr);
    } else {
      console.log('Dependencies inserted successfully.');
    }
  }

  // 5. Insert milestones
  console.log(`Inserting ${milestonesToInsert.length} milestones...`);
  if (milestonesToInsert.length > 0) {
    const { error: msErr } = await supabase.from('project_milestones').insert(milestonesToInsert);
    if (msErr) {
      console.error('Error inserting milestones:', msErr);
    } else {
      console.log('Milestones inserted successfully.');
    }
  }

  // 6. Ensure project calendar exists
  await supabase.from('project_calendar').delete().eq('project_id', PROJECT_ID);
  await supabase.from('project_calendar').insert({
    project_id: PROJECT_ID,
    work_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    work_start_time: '07:00',
    work_end_time: '17:00',
  });

  console.log(`--- Finished! Inserted ${allInsertedTasks.length} tasks across ${SCHEDULE_DATA.length} phases ---`);
}

applySchedule().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
