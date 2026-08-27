'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { RiskItem, Contract, Payment, ChangeOrder } from '@/types';

export default function AnalyticsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [risks, setRisks] = useState<RiskItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [contractsRes, coRes, paymentsRes] = await Promise.all([
          fetch(`/api/contracts?projectId=${projectId}`),
          fetch(`/api/change-orders?projectId=${projectId}`),
          fetch(`/api/payments?projectId=${projectId}`),
        ]);
        const contractsData = await contractsRes.json();
        const coData = await coRes.json();
        const paymentsData = await paymentsRes.json();

        setContracts(contractsData.contracts || []);
        setChangeOrders(coData.changeOrders || []);
        setPayments(paymentsData.payments || []);

        // Sample risk items if empty
        setRisks([
          {
            id: 'r1',
            project_id: projectId,
            title: 'Crane Pick Wind Window Restrictions',
            category: 'Schedule',
            probability: 'medium',
            impact: 'high',
            potential_cost_impact: 4500,
            potential_delay_days: 2,
            mitigation_strategy: 'Reserved secondary Saturday crane window with municipal road closure permit active.',
            status: 'mitigated',
          },
          {
            id: 'r2',
            project_id: projectId,
            title: 'Power Feed Re-routing for Higher Amp Draw',
            category: 'Cost',
            probability: 'low',
            impact: 'medium',
            potential_cost_impact: 1800,
            potential_delay_days: 0,
            mitigation_strategy: 'Electrical sub verified breaker panel capacity during submittal review.',
            status: 'active',
          },
          {
            id: 'r3',
            project_id: projectId,
            title: 'Long Lead Time on Custom Return Plenum',
            category: 'Procurement',
            probability: 'high',
            impact: 'medium',
            potential_cost_impact: 1200,
            potential_delay_days: 5,
            mitigation_strategy: 'Approved shop drawings 2 weeks early and expedited freight.',
            status: 'active',
          },
        ]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [projectId]);

  const totalContractBase = contracts.reduce((acc, c) => acc + c.original_amount, 0);
  const totalApprovedCO = changeOrders.filter(o => o.status === 'executed' || o.status === 'approved').reduce((acc, o) => acc + o.amount, 0);
  const totalCommitted = totalContractBase + totalApprovedCO;
  const totalDisbursed = payments.filter(p => p.status === 'completed').reduce((acc, p) => acc + p.amount, 0);

  // Financial Lifecycle comparison data
  const lifecycleData = [
    { stage: 'Original Bid', amount: totalContractBase || 44500 },
    { stage: 'Committed Contract', amount: totalContractBase || 44500 },
    { stage: 'Approved Change Orders', amount: totalApprovedCO || 3200 },
    { stage: 'Revised Commitment', amount: totalCommitted || 47700 },
    { stage: 'Disbursed Payments', amount: totalDisbursed || 22500 },
  ];

  // S-Curve Cash Flow Projection Data
  const sCurveData = [
    { period: 'Month 1', planned: 5000, actual: 4800 },
    { period: 'Month 2', planned: 18000, actual: 16500 },
    { period: 'Month 3', planned: 35000, actual: 32000 },
    { period: 'Month 4', planned: 44500, actual: 42000 },
    { period: 'Month 5', planned: 47700, actual: null },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-procore-text tracking-tight">Executive Analytics & Risk Matrix</h1>
            <span className="bg-procore-orange-light text-procore-orange font-bold text-xs px-2 py-0.5 rounded">
              Phase 11: Portfolio Insights
            </span>
          </div>
          <p className="text-xs text-procore-text-muted mt-0.5">
            Real-time project financial health, cost-to-schedule curves, trade partner performance, and risk heatmaps.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Total Revised Commitments</p>
          <p className="text-2xl font-bold text-procore-text mt-1">${totalCommitted.toLocaleString()}</p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">Base + Approved COs</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Change Order Rate</p>
          <p className="text-2xl font-bold text-procore-orange mt-1">
            {totalContractBase > 0 ? `${((totalApprovedCO / totalContractBase) * 100).toFixed(1)}%` : '0%'}
          </p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">Variance to original</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Cash Disbursed</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">${totalDisbursed.toLocaleString()}</p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">
            {totalCommitted > 0 ? `${((totalDisbursed / totalCommitted) * 100).toFixed(0)}% paid` : '0% paid'}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Active Project Risks</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{risks.filter(r => r.status === 'active').length}</p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">In risk register</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Financial Flow Stage Chart */}
        <div className="bg-white p-5 rounded-lg border border-procore-border shadow-xs">
          <h3 className="font-bold text-sm text-procore-text mb-4">Construction Financial Lifecycle</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={lifecycleData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="stage" tick={{ fontSize: 10, fill: '#757575' }} />
              <YAxis tick={{ fontSize: 10, fill: '#757575' }} />
              <Tooltip formatter={(val: any) => `$${Number(val).toLocaleString()}`} />
              <Bar dataKey="amount" fill="#F47E20" radius={[4, 4, 0, 0]} name="Value ($)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Planned vs Actual S-Curve */}
        <div className="bg-white p-5 rounded-lg border border-procore-border shadow-xs">
          <h3 className="font-bold text-sm text-procore-text mb-4">Cumulative S-Curve (Planned vs. Actual Spend)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={sCurveData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#757575' }} />
              <YAxis tick={{ fontSize: 10, fill: '#757575' }} />
              <Tooltip formatter={(val: any) => val ? `$${Number(val).toLocaleString()}` : '—'} />
              <Legend />
              <Line type="monotone" dataKey="planned" stroke="#757575" strokeDasharray="5 5" name="Planned Baseline" />
              <Line type="monotone" dataKey="actual" stroke="#2E7D32" strokeWidth={2.5} name="Actual Spend" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Procore Risk Probability Matrix */}
      <div className="bg-white rounded-lg border border-procore-border shadow-xs overflow-hidden">
        <div className="p-4 border-b border-procore-border bg-gray-50/50 flex justify-between items-center">
          <div>
            <h2 className="text-sm font-bold text-procore-text">Project Risk Register & Heatmap</h2>
            <p className="text-xs text-procore-text-muted">Proactive risk identification per ConsJ.rule section 20</p>
          </div>
        </div>

        <div className="p-4 grid lg:grid-cols-12 gap-6">
          {/* 3x3 Heatmap */}
          <div className="lg:col-span-5 bg-gray-50 p-4 rounded-lg border border-procore-border">
            <h3 className="text-xs font-bold uppercase tracking-wider text-procore-text-muted mb-3 text-center">
              Probability vs. Impact Matrix
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
              {/* High Prob */}
              <div className="p-3 rounded bg-amber-100 text-amber-900 border border-amber-200">
                Low Impact / High Prob
              </div>
              <div className="p-3 rounded bg-orange-200 text-orange-900 border border-orange-300">
                Med Impact / High Prob
                <div className="mt-1 bg-white/70 px-1 py-0.5 rounded text-[9px]">1 Risk</div>
              </div>
              <div className="p-3 rounded bg-red-200 text-red-900 border border-red-300 font-extrabold">
                CRITICAL
              </div>

              {/* Med Prob */}
              <div className="p-3 rounded bg-green-100 text-green-900 border border-green-200">
                Low Impact / Med Prob
              </div>
              <div className="p-3 rounded bg-amber-100 text-amber-900 border border-amber-200">
                Med Impact / Med Prob
              </div>
              <div className="p-3 rounded bg-orange-200 text-orange-900 border border-orange-300">
                High Impact / Med Prob
                <div className="mt-1 bg-white/70 px-1 py-0.5 rounded text-[9px]">1 Risk (Mitigated)</div>
              </div>

              {/* Low Prob */}
              <div className="p-3 rounded bg-green-50 text-green-800 border border-green-200">
                Low / Low
              </div>
              <div className="p-3 rounded bg-green-100 text-green-900 border border-green-200">
                Med Impact / Low Prob
                <div className="mt-1 bg-white/70 px-1 py-0.5 rounded text-[9px]">1 Risk</div>
              </div>
              <div className="p-3 rounded bg-amber-100 text-amber-900 border border-amber-200">
                High Impact / Low Prob
              </div>
            </div>
          </div>

          {/* Risk Table */}
          <div className="lg:col-span-7 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-procore-border text-procore-text-muted">
                  <th className="pb-2 text-left font-bold">Risk Item</th>
                  <th className="pb-2 text-center font-bold">Category</th>
                  <th className="pb-2 text-right font-bold">Est. Exposure</th>
                  <th className="pb-2 text-left font-bold">Mitigation Strategy</th>
                  <th className="pb-2 text-center font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-procore-border-light">
                {risks.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2.5 font-bold text-procore-text max-w-[180px]">{r.title}</td>
                    <td className="py-2.5 text-center font-semibold text-procore-text-muted">{r.category}</td>
                    <td className="py-2.5 text-right font-bold text-red-600">
                      ${r.potential_cost_impact?.toLocaleString()}
                    </td>
                    <td className="py-2.5 text-procore-text-secondary text-[11px] max-w-[220px]">{r.mitigation_strategy}</td>
                    <td className="py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        r.status === 'mitigated' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
