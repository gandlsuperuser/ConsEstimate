'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { VendorPartner } from '@/types';

export default function DirectoryPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [vendors, setVendors] = useState<VendorPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [form, setForm] = useState({
    company_name: '',
    trade: 'Mechanical / HVAC',
    contact_name: '',
    email: '',
    phone: '',
    safety_emr_rating: 0.82,
    quality_score: 4.9,
    is_prequalified: true,
  });

  const fetchVendors = async () => {
    try {
      const res = await fetch(`/api/directory?projectId=${projectId}`);
      const data = await res.json();
      const list = data.vendors || [];
      if (list.length === 0) {
        // Initial sample directory from ConsJ.rule section 19 & 35
        const defaultVendors: VendorPartner[] = [
          {
            id: 'v1',
            project_id: projectId,
            company_name: 'Apex Mechanical Contractors',
            trade: 'Division 23 - Mechanical / HVAC',
            contact_name: 'David Reynolds',
            email: 'bids@apexmech.com',
            phone: '(210) 555-0144',
            safety_emr_rating: 0.78,
            quality_score: 4.9,
            awarded_contracts_count: 3,
            historical_spend: 142000,
            is_prequalified: true,
            notes: 'Preferred mechanical partner with verified crane pick safety certs.',
          },
          {
            id: 'v2',
            project_id: projectId,
            company_name: 'LoneStar Electrical Group',
            trade: 'Division 26 - Electrical',
            contact_name: 'Sarah Jenkins',
            email: 'contact@lonestarelec.com',
            phone: '(210) 555-0188',
            safety_emr_rating: 0.85,
            quality_score: 4.8,
            awarded_contracts_count: 2,
            historical_spend: 88500,
            is_prequalified: true,
            notes: 'Specializes in high-voltage 480V distribution and transformer disconnects.',
          },
          {
            id: 'v3',
            project_id: projectId,
            company_name: 'SteelCraft Framing LLC',
            trade: 'Division 05 - Metals',
            contact_name: 'Carlos Mendez',
            email: 'carlos@steelcraft.com',
            phone: '(210) 555-0199',
            safety_emr_rating: 0.88,
            quality_score: 4.7,
            awarded_contracts_count: 1,
            historical_spend: 34000,
            is_prequalified: true,
            notes: 'Structural header cross-angles welding and roof penetrations.',
          }
        ];
        setVendors(defaultVendors);
      } else {
        setVendors(list);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [projectId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, project_id: projectId }),
      });
      if (res.ok) {
        setIsModalOpen(false);
        await fetchVendors();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border border-procore-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-procore-text tracking-tight">Trade Partner Directory & Scorecards</h1>
            <span className="bg-procore-orange-light text-procore-orange font-bold text-xs px-2 py-0.5 rounded">
              Phase 19: Partner Network
            </span>
          </div>
          <p className="text-xs text-procore-text-muted mt-0.5">
            Prequalified subcontractor directory, safety EMR ratings, quality scorecards, and spend history per ConsJ.rule.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-procore-orange hover:bg-procore-orange-hover text-white text-xs font-bold px-3.5 py-2 rounded-md shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <span>+</span> Add Trade Partner
        </button>
      </div>

      {/* Directory Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vendors.map((v) => (
          <div key={v.id} className="bg-white rounded-lg border border-procore-border shadow-xs p-4 flex flex-col justify-between hover:border-procore-orange transition-all">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                  {v.trade}
                </span>
                {v.is_prequalified && (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    ✓ Prequalified
                  </span>
                )}
              </div>

              <h3 className="font-bold text-base text-procore-text">{v.company_name}</h3>
              <p className="text-xs text-procore-text-secondary mt-0.5 font-medium">{v.contact_name}</p>

              <div className="grid grid-cols-2 gap-2 mt-3 p-2.5 bg-gray-50 rounded border border-procore-border-light text-center text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted block">Safety EMR</span>
                  <span className="font-extrabold text-emerald-600">{v.safety_emr_rating}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted block">Quality Score</span>
                  <span className="font-extrabold text-procore-orange">{v.quality_score} / 5.0</span>
                </div>
              </div>

              <div className="space-y-1 mt-3 text-xs text-procore-text-muted">
                <div><span className="font-bold text-procore-text">Email: </span>{v.email || '—'}</div>
                <div><span className="font-bold text-procore-text">Phone: </span>{v.phone || '—'}</div>
                {v.notes && <div className="text-[11px] italic text-procore-text-secondary mt-1">{v.notes}</div>}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-procore-border-light flex justify-between items-center text-xs">
              <span className="text-procore-text-muted">{v.awarded_contracts_count} Contracts</span>
              <span className="font-bold text-procore-text">${(v.historical_spend || 0).toLocaleString()} Total Spend</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: New Vendor */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 border border-procore-border">
            <h3 className="font-bold text-base text-procore-text mb-4">Add Trade Partner</h3>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-procore-text-muted block mb-1">Company Name</label>
                <input
                  required
                  type="text"
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Trade</label>
                  <input
                    type="text"
                    value={form.trade}
                    onChange={(e) => setForm({ ...form, trade: e.target.value })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  />
                </div>
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={form.contact_name}
                    onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  />
                </div>
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Phone</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-procore-border-light">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 border border-procore-border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-procore-orange text-white font-bold rounded hover:bg-procore-orange-hover"
                >
                  Save Partner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
