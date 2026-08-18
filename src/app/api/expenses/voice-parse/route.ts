import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import Anthropic from '@anthropic-ai/sdk';
import { RESIDENTIAL_CATEGORIES } from '@/types';

interface ProjectOption {
  id: string;
  name: string;
  client_name?: string;
  address?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { transcript, defaultProjectId } = await request.json();

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json({ error: 'Transcript is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch projects for matching
    const { data: projectsData } = await supabase
      .from('projects')
      .select('id, name, client_name, address')
      .order('created_at', { ascending: false });

    const projects: ProjectOption[] = projectsData || [];

    let parsedResult = {
      project_id: defaultProjectId || (projects[0]?.id ?? ''),
      project_name: projects.find((p) => p.id === defaultProjectId)?.name || (projects[0]?.name ?? ''),
      vendor: '',
      amount: 0,
      category: 'Other',
      expense_date: new Date().toISOString().split('T')[0],
      notes: transcript,
      confidence: 'medium' as 'high' | 'medium' | 'low',
    };

    // If Anthropic API Key is available, use Claude for high-accuracy NLP parsing
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const projectListStr = projects.map((p) => `- ID: ${p.id}, Name: "${p.name}", Address: "${p.address || ''}"`).join('\n');

        const prompt = `You are an AI assistant that parses construction voice transcripts into structured expense data.
Today's date is: ${new Date().toISOString().split('T')[0]}

Available Projects in Database:
${projectListStr}

Valid Categories:
${RESIDENTIAL_CATEGORIES.join(', ')}

Transcript to parse:
"${transcript}"

Extract the following JSON object:
{
  "project_id": "<Matching project ID or empty string>",
  "project_name": "<Matching project name>",
  "vendor": "<Vendor or payee name, e.g. Zachary Barksdale, Home Depot>",
  "amount": <number, e.g. 250.00>,
  "category": "<best matching category from valid categories list>",
  "expense_date": "<YYYY-MM-DD format>",
  "notes": "<clean summary description of what was purchased or done>",
  "confidence": "<high|medium|low>"
}
Return ONLY the raw JSON object.`;

        const response = await anthropic.messages.create({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }],
        });

        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
        if (parsed) {
          parsedResult = {
            ...parsedResult,
            ...parsed,
          };
        }
      } catch (aiErr) {
        console.warn('AI Parsing failed, falling back to rule-based heuristics:', aiErr);
      }
    }

    // Fallback or heuristic enhancement if AI is missing or fields incomplete
    if (!parsedResult.vendor || parsedResult.amount === 0) {
      const heuristic = parseTranscriptHeuristics(transcript, projects, defaultProjectId);
      parsedResult = {
        ...parsedResult,
        ...heuristic,
      };
    }

    return NextResponse.json({
      success: true,
      data: parsedResult,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function parseTranscriptHeuristics(transcript: string, projects: ProjectOption[], defaultProjectId?: string) {
  const text = transcript.trim();
  const lower = text.toLowerCase();

  // 1. Match Project
  let matchedProjectId = defaultProjectId || '';
  let matchedProjectName = '';

  for (const proj of projects) {
    const pName = proj.name.toLowerCase();
    const pParts = pName.split(/[\s/-]+/);
    if (lower.includes(pName) || pParts.some((part) => part.length > 3 && lower.includes(part))) {
      matchedProjectId = proj.id;
      matchedProjectName = proj.name;
      break;
    }
  }

  if (!matchedProjectId && projects.length > 0) {
    matchedProjectId = projects[0].id;
    matchedProjectName = projects[0].name;
  }

  // 2. Match Amount ($250, 250.00, 250 dollars, two hundred fifty)
  let amount = 0;
  const moneyMatch = text.match(/\$\s*(\d+(?:\.\d{1,2})?)/) ||
                     text.match(/(\d+(?:\.\d{1,2})?)\s*(?:dollars|bucks|usd)/i) ||
                     text.match(/\b(\d+(?:\.\d{2}))\b/) ||
                     text.match(/\b(\d{2,6})\b/);

  if (moneyMatch) {
    amount = parseFloat(moneyMatch[1]);
  }

  // 3. Match Category
  let category = 'Other';
  const categoryKeywords: Record<string, string[]> = {
    'Openings': ['lock', 'locks', 'door', 'doors', 'window', 'windows', 'hardware', 'key', 'keys'],
    'Equipment': ['dumpster', 'rental', 'trailer', 'generator', 'lift', 'scaffold', 'tool', 'tools'],
    'Permits': ['permit', 'inspection', 'fees', 'plans', 'porta potty', 'toilet'],
    'Demo': ['demo', 'demolition', 'tear out', 'trash out'],
    'Plumbing': ['plumbing', 'pipe', 'leak', 'drain', 'toilet install', 'water line'],
    'Electrical': ['electric', 'electrical', 'wire', 'panel', 'breaker', 'lighting'],
    'HVAC': ['hvac', 'ac', 'heating', 'duct', 'ahu', 'condenser'],
    'Drywall': ['sheetrock', 'drywall', 'tape', 'float', 'mud'],
    'Paint': ['paint', 'painting', 'primer', 'painter'],
    'Flooring': ['floor', 'flooring', 'tile', 'carpet', 'vinyl'],
    'Roofing': ['roof', 'roofing', 'shingles'],
    'Framing': ['framing', 'studs', 'lumber'],
    'Foundation': ['concrete', 'slab', 'foundation'],
    'Overhead': ['gas', 'fuel', 'lunch', 'supplies', 'office'],
  };

  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      category = cat;
      break;
    }
  }

  // 4. Match Vendor
  let vendor = '';
  const vendorMatch = text.match(/(?:paid|to|from|by|vendor|store)\s+([A-Z][a-zA-Z0-9\s'&]+?)(?:\s+(?:for|\$|\d|on|today|yesterday|\.|$))/i) ||
                      text.match(/(?:at|from)\s+([A-Za-z0-9\s'&]+?)(?:\s+(?:for|\$|\d|\.|$))/i);

  if (vendorMatch && vendorMatch[1]) {
    vendor = vendorMatch[1].trim();
  } else if (lower.includes('home depot')) {
    vendor = 'Home Depot';
  } else if (lower.includes('lowes') || lower.includes("lowe's")) {
    vendor = "Lowe's";
  } else if (lower.includes('cross a rentals')) {
    vendor = 'Cross A Rentals';
  } else if (lower.includes('barksdale')) {
    vendor = 'Zachary Barksdale';
  } else {
    vendor = 'Miscellaneous Vendor';
  }

  // 5. Date
  let expenseDate = new Date().toISOString().split('T')[0];
  if (lower.includes('yesterday')) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    expenseDate = d.toISOString().split('T')[0];
  }

  return {
    project_id: matchedProjectId,
    project_name: matchedProjectName,
    vendor,
    amount,
    category,
    expense_date: expenseDate,
    notes: text,
    confidence: 'high' as const,
  };
}
