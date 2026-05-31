export type ProjectType = 'commercial' | 'residential';
export type ProjectStatus = 'active' | 'bidding' | 'complete';

export const RESIDENTIAL_CATEGORIES = [
  'Demo',
  'Foundation',
  'Framing',
  'Roofing',
  'Electrical',
  'Plumbing',
  'HVAC',
  'Insulation',
  'Drywall',
  'Flooring',
  'Cabinets/Millwork',
  'Paint',
  'Exterior',
  'Landscaping',
  'Overhead',
  'Equipment',
  'Permits',
  'Other',
] as const;

export const COMMERCIAL_DIVISIONS = [
  { code: '01', name: 'General Requirements' },
  { code: '02', name: 'Existing Conditions' },
  { code: '03', name: 'Concrete' },
  { code: '04', name: 'Masonry' },
  { code: '05', name: 'Metals' },
  { code: '06', name: 'Wood, Plastics, and Composites' },
  { code: '07', name: 'Thermal and Moisture Protection' },
  { code: '08', name: 'Openings' },
  { code: '09', name: 'Finishes' },
  { code: '10', name: 'Specialties' },
  { code: '11', name: 'Equipment' },
  { code: '12', name: 'Furnishings' },
  { code: '13', name: 'Special Construction' },
  { code: '14', name: 'Conveying Equipment' },
  { code: '15', name: 'Mechanical' },
  { code: '16', name: 'Electrical' },
] as const;

export type ResidentialCategory = typeof RESIDENTIAL_CATEGORIES[number];
export type CommercialDivision = typeof COMMERCIAL_DIVISIONS[number]['code'];

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  client_name: string;
  address: string;
  start_date: string;
  status: ProjectStatus;
  overhead_pct: number;
  profit_pct: number;
  created_at: string;
}

export interface EstimateLine {
  id: string;
  project_id: string;
  category: string;
  division_code: string | null;
  description: string;
  quantity: number;
  unit: string;
  labor_unit_cost: number;
  material_unit_cost: number;
  sub_cost: number;
  estimated_total: number;
  actual_total: number;
  notes: string;
}

export interface Expense {
  id: string;
  project_id: string;
  category: string;
  vendor: string;
  expense_date: string;
  amount: number;
  receipt_url: string | null;
  scan_confidence: 'high' | 'medium' | 'low';
  notes: string;
  created_at: string;
}

export interface ReceiptScanResult {
  vendor: string;
  date: string | null;
  total: number;
  currency: string;
  items: { description: string; amount: number }[];
  suggested_category: string;
  confidence: 'high' | 'medium' | 'low';
  notes: string;
}
