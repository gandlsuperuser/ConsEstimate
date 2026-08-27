'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { BidPackage, Bid } from '@/types';

export default function BiddingPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [packages, setPackages] = useState<BidPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPkg, setSelectedPkg] = useState<BidPackage | null>(null);
  const [isNewPkgModal, setIsNewPkgModal] = useState(false);
  const [isNewBidModal, setIsNewBidModal] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // New package form state
  const [pkgForm, setPkgForm] = useState({
    title: '',
    trade: 'Mechanical / HVAC',
    division_code: '23',
    scope_description: '',
    estimated_budget: 0,
    due_date: new Date().toISOString().split('T')[0],
  });

  // New bid form state
  const [bidForm, setBidForm] = useState({
    subcontractor_name: '',
    base_bid_amount: 0,
    alternate_amount: 0,
    inclusions: '',
    exclusions: '',
    notes: '',
  });

  const fetchPackages = async () => {
    try {
      const res = await fetch(`/api/bids?projectId=${projectId}`);
      const data = await res.json();
      setPackages(data.packages || []);
      if (data.packages && data.packages.length > 0 && !selectedPkg) {
        setSelectedPkg(data.packages[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, [projectId]);

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...pkgForm, project_id: projectId }),
      });
      if (res.ok) {
        setIsNewPkgModal(false);
        setPkgForm({
          title: '',
          trade: 'Mechanical / HVAC',
          division_code: '23',
          scope_description: '',
          estimated_budget: 0,
          due_date: new Date().toISOString().split('T')[0],
        });
        await fetchPackages();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg) return;
    try {
      const res = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_bid',
          bid_package_id: selectedPkg.id,
          ...bidForm,
        }),
      });
      if (res.ok) {
        setIsNewBidModal(false);
        setBidForm({
          subcontractor_name: '',
          base_bid_amount: 0,
          alternate_amount: 0,
          inclusions: '',
          exclusions: '',
          notes: '',
        });
        await fetchPackages();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAwardBid = async (bid: Bid) => {
    if (!selectedPkg) return;
    if (!confirm(`Award ${selectedPkg.title} to ${bid.subcontractor_name} for $${bid.base_bid_amount.toLocaleString()} and generate Subcontract?`)) {
      return;
    }
    try {
      const res = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'award_bid',
          project_id: projectId,
          package_id: selectedPkg.id,
          bid_id: bid.id,
          subcontractor_name: bid.subcontractor_name,
          contract_amount: bid.base_bid_amount,
          title: `Subcontract - ${selectedPkg.title} (${bid.subcontractor_name})`,
        }),
      });
      if (res.ok) {
        alert('Bid Awarded & Subcontract Generated! Check the Contracts tab.');
        await fetchPackages();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSeedDemo = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch('/api/workflow-seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      if (res.ok) {
        await fetchPackages();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSeeding(false);
    }
  };

  const totalBids = packages.reduce((acc, p) => acc + (p.bids?.length || 0), 0);
  const totalBudget = packages.reduce((acc, p) => acc + (p.estimated_budget || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border border-procore-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-procore-text tracking-tight">Bid Management & Leveling</h1>
            <span className="bg-procore-orange-light text-procore-orange font-bold text-xs px-2 py-0.5 rounded">
              Phase 2: Precon
            </span>
          </div>
          <p className="text-xs text-procore-text-muted mt-0.5">
            Collect trade partner quotes, perform side-by-side bid leveling, and award subcontracts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {packages.length === 0 && (
            <button
              onClick={handleSeedDemo}
              disabled={isSeeding}
              className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-md shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <span>⚡</span> {isSeeding ? 'Seeding...' : 'Seed Rooftop HVAC Scenario'}
            </button>
          )}
          <button
            onClick={() => setIsNewPkgModal(true)}
            className="bg-procore-orange hover:bg-procore-orange-hover text-white text-xs font-bold px-3.5 py-2 rounded-md shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <span>+</span> Create Bid Package
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Bid Packages</p>
          <p className="text-2xl font-bold text-procore-text mt-1">{packages.length}</p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">{packages.filter(p => p.status === 'awarded').length} Awarded</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Total Bids Received</p>
          <p className="text-2xl font-bold text-procore-orange mt-1">{totalBids}</p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">Across trade partners</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Estimated Trade Budget</p>
          <p className="text-2xl font-bold text-procore-text mt-1">${totalBudget.toLocaleString()}</p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">Target pricing</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-procore-border shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-procore-text-muted">Handoff Status</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">Ready</p>
          <p className="text-[11px] text-procore-text-muted mt-0.5">Flows to Contracts</p>
        </div>
      </div>

      {/* Main Content Area */}
      {packages.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-lg border border-procore-border shadow-xs">
          <div className="w-12 h-12 rounded-full bg-procore-orange-light text-procore-orange mx-auto flex items-center justify-center text-xl mb-3">
            📋
          </div>
          <h3 className="text-base font-bold text-procore-text">No Bid Packages Yet</h3>
          <p className="text-sm text-procore-text-muted max-w-md mx-auto mt-1 mb-5">
            Create your first bid package or seed the Rooftop HVAC demo to compare subcontractor quotes and award contracts.
          </p>
          <button
            onClick={handleSeedDemo}
            disabled={isSeeding}
            className="bg-procore-orange text-white text-sm font-bold px-4 py-2 rounded-md shadow-xs hover:bg-procore-orange-hover"
          >
            {isSeeding ? 'Seeding...' : 'Load Complete Demo Scenario'}
          </button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Packages Sidebar */}
          <div className="lg:col-span-4 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-procore-text-muted px-1">
              Active Trade Packages ({packages.length})
            </h2>
            {packages.map((pkg) => {
              const isSelected = selectedPkg?.id === pkg.id;
              return (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPkg(pkg)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-white border-procore-orange shadow-sm ring-1 ring-procore-orange'
                      : 'bg-white border-procore-border hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-procore-text-muted">Div {pkg.division_code || '01'}</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      pkg.status === 'awarded'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {pkg.status}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-procore-text mt-1">{pkg.title}</h3>
                  <p className="text-xs text-procore-text-secondary mt-0.5 line-clamp-2">{pkg.scope_description}</p>
                  <div className="flex items-center justify-between text-xs font-semibold text-procore-text-muted mt-3 pt-2 border-t border-procore-border-light">
                    <span>Target: ${pkg.estimated_budget?.toLocaleString()}</span>
                    <span className="text-procore-orange font-bold">{pkg.bids?.length || 0} Bids</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bid Leveling & Comparison Matrix */}
          <div className="lg:col-span-8 space-y-4">
            {selectedPkg && (
              <div className="bg-white rounded-lg border border-procore-border shadow-xs overflow-hidden">
                <div className="p-4 border-b border-procore-border flex items-center justify-between bg-gray-50/50">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-procore-orange">
                      Bid Leveling Matrix
                    </span>
                    <h2 className="text-base font-bold text-procore-text">{selectedPkg.title}</h2>
                    <p className="text-xs text-procore-text-muted">Target Budget: ${selectedPkg.estimated_budget?.toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => setIsNewBidModal(true)}
                    className="bg-procore-orange text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-procore-orange-hover transition-colors"
                  >
                    + Enter Bidder Quote
                  </button>
                </div>

                {/* Leveling Table */}
                {selectedPkg.bids && selectedPkg.bids.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-100/80 border-b border-procore-border text-procore-text-muted">
                          <th className="p-3 text-left font-bold">Subcontractor</th>
                          <th className="p-3 text-right font-bold">Base Bid</th>
                          <th className="p-3 text-right font-bold">Alternates</th>
                          <th className="p-3 text-right font-bold">Variance to Target</th>
                          <th className="p-3 text-left font-bold">Inclusions / Exclusions</th>
                          <th className="p-3 text-center font-bold">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-procore-border-light">
                        {selectedPkg.bids.map((bid) => {
                          const variance = bid.base_bid_amount - selectedPkg.estimated_budget;
                          const isAwarded = bid.status === 'awarded';
                          return (
                            <tr key={bid.id} className={`hover:bg-gray-50/60 ${isAwarded ? 'bg-emerald-50/40' : ''}`}>
                              <td className="p-3">
                                <div className="font-bold text-procore-text text-sm">{bid.subcontractor_name}</div>
                                <div className="text-[11px] text-procore-text-muted">{bid.contact_email || 'No contact email'}</div>
                              </td>
                              <td className="p-3 text-right font-bold text-sm text-procore-text">
                                ${bid.base_bid_amount.toLocaleString()}
                              </td>
                              <td className="p-3 text-right font-medium text-procore-text-secondary">
                                ${bid.alternate_amount ? bid.alternate_amount.toLocaleString() : '0'}
                              </td>
                              <td className={`p-3 text-right font-bold ${variance <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {variance <= 0 ? `-$${Math.abs(variance).toLocaleString()}` : `+$${variance.toLocaleString()}`}
                              </td>
                              <td className="p-3 max-w-[220px]">
                                {bid.inclusions && (
                                  <div className="text-[11px] text-emerald-800 font-medium truncate" title={bid.inclusions}>
                                    ✓ {bid.inclusions}
                                  </div>
                                )}
                                {bid.exclusions && (
                                  <div className="text-[11px] text-red-800 font-medium truncate" title={bid.exclusions}>
                                    ✗ {bid.exclusions}
                                  </div>
                                )}
                                {bid.notes && <div className="text-[10px] text-procore-text-muted italic mt-0.5">{bid.notes}</div>}
                              </td>
                              <td className="p-3 text-center">
                                {isAwarded ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                                    ✓ Awarded
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleAwardBid(bid)}
                                    className="bg-procore-orange hover:bg-procore-orange-hover text-white font-bold text-[11px] px-3 py-1.5 rounded transition-colors shadow-2xs"
                                  >
                                    Award Contract
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-sm text-procore-text-muted">
                    No subcontractor bids submitted yet for this package.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: New Bid Package */}
      {isNewPkgModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 border border-procore-border">
            <h3 className="font-bold text-base text-procore-text mb-4">Create New Bid Package</h3>
            <form onSubmit={handleCreatePackage} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-procore-text-muted block mb-1">Package Title</label>
                <input
                  required
                  type="text"
                  value={pkgForm.title}
                  onChange={(e) => setPkgForm({ ...pkgForm, title: e.target.value })}
                  placeholder="e.g. Division 23 - Mechanical Rooftop Units"
                  className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Trade</label>
                  <input
                    type="text"
                    value={pkgForm.trade}
                    onChange={(e) => setPkgForm({ ...pkgForm, trade: e.target.value })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  />
                </div>
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Division Code</label>
                  <input
                    type="text"
                    value={pkgForm.division_code}
                    onChange={(e) => setPkgForm({ ...pkgForm, division_code: e.target.value })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-procore-text-muted block mb-1">Estimated Budget ($)</label>
                <input
                  type="number"
                  value={pkgForm.estimated_budget}
                  onChange={(e) => setPkgForm({ ...pkgForm, estimated_budget: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                />
              </div>
              <div>
                <label className="font-bold text-procore-text-muted block mb-1">Scope Description</label>
                <textarea
                  rows={3}
                  value={pkgForm.scope_description}
                  onChange={(e) => setPkgForm({ ...pkgForm, scope_description: e.target.value })}
                  className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-procore-border-light">
                <button
                  type="button"
                  onClick={() => setIsNewPkgModal(false)}
                  className="px-3 py-1.5 border border-procore-border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-procore-orange text-white font-bold rounded hover:bg-procore-orange-hover"
                >
                  Save Package
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Bidder Quote */}
      {isNewBidModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 border border-procore-border">
            <h3 className="font-bold text-base text-procore-text mb-4">Enter Subcontractor Quote</h3>
            <form onSubmit={handleCreateBid} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-procore-text-muted block mb-1">Subcontractor Name</label>
                <input
                  required
                  type="text"
                  value={bidForm.subcontractor_name}
                  onChange={(e) => setBidForm({ ...bidForm, subcontractor_name: e.target.value })}
                  placeholder="e.g. LoneStar Climate Systems"
                  className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Base Bid ($)</label>
                  <input
                    required
                    type="number"
                    value={bidForm.base_bid_amount}
                    onChange={(e) => setBidForm({ ...bidForm, base_bid_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  />
                </div>
                <div>
                  <label className="font-bold text-procore-text-muted block mb-1">Alternates / Extras ($)</label>
                  <input
                    type="number"
                    value={bidForm.alternate_amount}
                    onChange={(e) => setBidForm({ ...bidForm, alternate_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-procore-text-muted block mb-1">Inclusions</label>
                <input
                  type="text"
                  value={bidForm.inclusions}
                  onChange={(e) => setBidForm({ ...bidForm, inclusions: e.target.value })}
                  placeholder="e.g. Crane rental, 1-yr warranty"
                  className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                />
              </div>
              <div>
                <label className="font-bold text-procore-text-muted block mb-1">Exclusions</label>
                <input
                  type="text"
                  value={bidForm.exclusions}
                  onChange={(e) => setBidForm({ ...bidForm, exclusions: e.target.value })}
                  placeholder="e.g. Controls wiring, roofing warranty"
                  className="w-full border border-procore-border p-2 rounded focus:border-procore-orange"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-procore-border-light">
                <button
                  type="button"
                  onClick={() => setIsNewBidModal(false)}
                  className="px-3 py-1.5 border border-procore-border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-procore-orange text-white font-bold rounded hover:bg-procore-orange-hover"
                >
                  Save Quote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
