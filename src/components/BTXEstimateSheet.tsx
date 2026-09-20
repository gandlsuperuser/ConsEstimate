'use client';

import React from 'react';
import Image from 'next/image';
import { BTXEstimate, BTXEstimateItem } from '@/types';

interface BTXEstimateSheetProps {
  estimate: BTXEstimate;
  projectName?: string;
  isEditable?: boolean;
  onEditItem?: (item: BTXEstimateItem) => void;
  onDeleteItem?: (itemId: string) => void;
  onOpenAddItemModal?: () => void;
}

export default function BTXEstimateSheet({
  estimate,
  projectName,
  isEditable = false,
  onEditItem,
  onDeleteItem,
  onOpenAddItemModal,
}: BTXEstimateSheetProps) {
  const formatCurrency = (val: number) => {
    return Number(val || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div
      id="btx-estimate-sheet"
      className="bg-white text-[#111827] max-w-[1020px] mx-auto p-8 sm:p-12 shadow-2xl border border-slate-300 rounded-xs font-sans text-sm sm:text-base print:p-0 print:border-none print:shadow-none"
      style={{ minHeight: '1100px' }}
    >
      {/* ============================================================ */}
      {/* 1. TOP HEADER: LOGO & COMPANY SLOGAN                         */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b-2 border-[#0B2545] gap-4">
        {/* Left Logo & Trades */}
        <div>
          <div className="relative h-14 w-52 mb-1.5">
            <Image
              src="/btx-logo.png"
              alt="BTX Contractors"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
          <p className="text-[11.5px] sm:text-xs font-bold text-[#0B2545] tracking-wider uppercase">
            GENERAL CONSTRUCTION &nbsp;|&nbsp; ROOFING &nbsp;|&nbsp; FRAMING &nbsp;|&nbsp; INSULATION &nbsp;|&nbsp; HVAC &nbsp;|&nbsp; PLUMBING &nbsp;|&nbsp; ELECTRICAL
          </p>
        </div>

        {/* Right Slogan */}
        <div className="flex items-center gap-4 text-right">
          <div>
            <p className="font-extrabold text-[13px] sm:text-sm text-[#0B2545] leading-tight tracking-wide">
              BUILT ON INTEGRITY.
            </p>
            <p className="font-extrabold text-[13px] sm:text-sm text-[#0B2545] leading-tight tracking-wide">
              DELIVERED WITH EXCELLENCE.
            </p>
          </div>
          <div className="h-10 w-[2px] bg-[#0B2545]" />
          <div className="text-left">
            <p className="font-bold text-[11.5px] sm:text-xs text-[#0B2545] leading-tight tracking-wider">PEOPLE.</p>
            <p className="font-bold text-[11.5px] sm:text-xs text-[#0B2545] leading-tight tracking-wider">PROJECTS.</p>
            <p className="font-bold text-[11.5px] sm:text-xs text-[#0B2545] leading-tight tracking-wider">PROGRESS.</p>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. DOCUMENT TITLE & DATE / BID NO                            */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-baseline justify-between mt-5 pb-2">
        <h1 className="text-3xl sm:text-4xl font-black text-[#0B2545] tracking-tight uppercase">
          PROPOSAL / CHANGE ORDER
        </h1>
        <div className="text-right text-sm sm:text-base mt-2 sm:mt-0 font-medium">
          <p>
            <span className="font-bold text-[#0B2545]">Date:</span> {estimate.estimate_date || 'September 12, 2026'}
          </p>
          <p>
            <span className="font-bold text-[#0B2545]">Bid No.:</span> {estimate.bid_number || 'BTX-HC-0926-02'}
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. PROJECT & CLIENT METADATA BOX                             */}
      {/* ============================================================ */}
      <div className="mt-3 bg-[#F3F4F6] border border-slate-300 rounded-xs p-4 text-sm sm:text-[15px] leading-relaxed">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-2">
          <div className="flex">
            <span className="font-bold text-[#0B2545] w-24 shrink-0">Client:</span>
            <span className="font-medium text-slate-800">{estimate.client_name || 'Humana – Conviva'}</span>
          </div>
          <div className="flex">
            <span className="font-bold text-[#0B2545] w-24 shrink-0">Project:</span>
            <span className="font-medium text-slate-800">{projectName || estimate.project_name || 'CONVIVA JOURDANTON'}</span>
          </div>
          <div className="flex">
            <span className="font-bold text-[#0B2545] w-24 shrink-0">Location:</span>
            <span className="font-medium text-slate-800">{estimate.location || 'Jourdanton, TX'}</span>
          </div>
          <div className="flex">
            <span className="font-bold text-[#0B2545] w-24 shrink-0">Scope:</span>
            <span className="font-medium text-slate-800">{estimate.scope || 'Phase 1 – Additional Work / Change Order'}</span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. INTRODUCTORY TEXT                                         */}
      {/* ============================================================ */}
      <p className="mt-4 text-sm sm:text-[15px] text-slate-700 leading-relaxed">
        {estimate.intro_text ||
          "BTX Contractors is pleased to provide the following proposal for the above referenced project. This change order includes labor, materials, and equipment as outlined below, per the Humana engineer's request."}
      </p>

      {/* ============================================================ */}
      {/* 5. ESTIMATE LINE ITEMS TABLE                                 */}
      {/* ============================================================ */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse border border-slate-300 text-sm sm:text-[15px]">
          <thead>
            <tr className="bg-[#0B2545] text-white uppercase tracking-wider font-bold">
              <th className="border border-slate-400 py-2.5 px-3 text-center w-12">#</th>
              <th className="border border-slate-400 py-2.5 px-3.5 text-left w-52">DESCRIPTION</th>
              <th className="border border-slate-400 py-2.5 px-3.5 text-left">DETAILS</th>
              <th className="border border-slate-400 py-2.5 px-3.5 text-right w-36">AMOUNT</th>
              {isEditable && <th className="border border-slate-400 py-2.5 px-2 text-center w-20 print:hidden">ACTION</th>}
            </tr>
          </thead>
          <tbody>
            {estimate.items && estimate.items.length > 0 ? (
              estimate.items.map((item, index) => (
                <tr
                  key={item.id || index}
                  className={`hover:bg-blue-50/40 transition-colors ${index % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}`}
                >
                  <td className="border border-slate-300 py-3 px-3 text-center font-bold text-slate-700">
                    {item.item_number || index + 1}
                  </td>
                  <td className="border border-slate-300 py-3 px-3.5 font-bold text-[#0B2545] align-top">
                    {item.description}
                  </td>
                  <td className="border border-slate-300 py-3 px-3.5 text-slate-700 align-top leading-relaxed">
                    {item.details}
                  </td>
                  <td className="border border-slate-300 py-3 px-3.5 text-right font-black text-slate-900 align-top whitespace-nowrap text-base">
                    ${formatCurrency(item.amount)}
                  </td>
                  {isEditable && (
                    <td className="border border-slate-300 py-3 px-2 text-center align-middle print:hidden whitespace-nowrap">
                      <button
                        onClick={() => onEditItem?.(item)}
                        className="text-indigo-600 hover:text-indigo-800 p-1.5 font-bold text-xs"
                        title="Edit Item"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => onDeleteItem?.(item.id)}
                        className="text-red-500 hover:text-red-700 p-1.5 font-bold text-xs"
                        title="Delete Item"
                      >
                        ✕
                      </button>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={isEditable ? 5 : 4} className="border border-slate-300 py-8 text-center text-slate-400 text-sm">
                  No line items on this proposal. Click &quot;Add Line Item&quot; to pick from catalog.
                </td>
              </tr>
            )}

            {/* Total Change Order Row: Navy bar with Red Amount */}
            <tr className="border-2 border-[#0B2545]">
              <td
                colSpan={3}
                className="bg-[#0B2545] text-white py-3 px-5 text-center sm:text-right font-black tracking-widest text-base sm:text-lg uppercase"
              >
                TOTAL CHANGE ORDER
              </td>
              <td className="bg-[#C62828] text-white py-3 px-4 text-right font-black text-xl sm:text-2xl tracking-tight whitespace-nowrap shadow-inner">
                ${formatCurrency(estimate.total_amount)}
              </td>
              {isEditable && <td className="bg-[#0B2545] border-none print:hidden"></td>}
            </tr>
          </tbody>
        </table>

        {isEditable && onOpenAddItemModal && (
          <div className="mt-3 flex justify-end print:hidden">
            <button
              onClick={onOpenAddItemModal}
              className="text-sm font-bold text-[#0B2545] hover:text-red-700 flex items-center gap-1.5 py-1.5 px-3 rounded hover:bg-slate-100 transition-all cursor-pointer"
            >
              <span>+ Add Line Item from Dropdown Catalog</span>
            </button>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 6. NOTES & CLARIFICATIONS                                    */}
      {/* ============================================================ */}
      <div className="mt-6 pt-3">
        <h2 className="font-black text-[#0B2545] text-sm sm:text-base tracking-wider uppercase mb-2">
          NOTES &amp; CLARIFICATIONS
        </h2>
        <ol className="list-decimal pl-5 space-y-1.5 text-xs sm:text-sm text-slate-700 leading-relaxed">
          {(estimate.notes_and_clarifications || []).map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </ol>

        <p className="mt-3 text-xs sm:text-sm text-slate-700 font-medium italic">
          {estimate.closing_text ||
            'We appreciate the opportunity to work with Humana–Conviva and look forward to a successful project.'}
        </p>
      </div>

      {/* ============================================================ */}
      {/* 7. SIGNATURES SECTION                                        */}
      {/* ============================================================ */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Submitted By */}
        <div className="border border-slate-400 p-4 rounded-xs flex flex-col justify-between">
          <p className="font-black text-xs sm:text-sm text-[#0B2545] uppercase tracking-wider mb-8">
            SUBMITTED BY:
          </p>
          <div>
            <div className="border-b border-slate-700 w-full mb-1.5 flex justify-between text-xs text-slate-500">
              <span>{estimate.submitted_by_name || 'Raul Ayala'}</span>
              <span>Date</span>
            </div>
            <p className="font-bold text-sm sm:text-base text-slate-900">{estimate.submitted_by_name || 'Raul Ayala'}</p>
            <p className="text-xs sm:text-sm text-slate-600">
              {estimate.submitted_by_title || 'Project Manager'}
            </p>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              {estimate.submitted_by_company || 'BTX Contractors'}
            </p>
          </div>
        </div>

        {/* Accepted By */}
        <div className="border border-slate-400 p-4 rounded-xs flex flex-col justify-between">
          <p className="font-black text-xs sm:text-sm text-[#0B2545] uppercase tracking-wider mb-8">
            ACCEPTED BY:
          </p>
          <div>
            <div className="border-b border-slate-700 w-full mb-1.5 flex justify-between text-xs text-slate-500">
              <span>{estimate.accepted_by_name || 'Humana – Conviva'}</span>
              <span>Date</span>
            </div>
            <p className="font-bold text-sm sm:text-base text-slate-900">
              {estimate.accepted_by_name || 'Humana – Conviva'}
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 8. FOOTER: CONTACTS, BADGES & ADDRESS RIBBON                 */}
      {/* ============================================================ */}
      <div className="mt-8 pt-4 border-t-2 border-[#0B2545]">
        {/* Contact info and Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 items-center text-xs sm:text-sm">
          {/* Project Manager */}
          <div className="border-r border-slate-300 pr-3">
            <p className="font-bold text-xs text-red-600 uppercase tracking-wide">PROJECT MANAGER</p>
            <p className="font-extrabold text-base sm:text-lg text-[#0B2545]">Raul Ayala</p>
            <div className="flex items-center gap-1.5 text-slate-700 mt-1">
              <span>📞</span>
              <span>830-879-5474</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700">
              <span>✉️</span>
              <span>Btxsupply@yahoo.com</span>
            </div>
          </div>

          {/* Superintendent */}
          <div className="border-r border-slate-300 pr-3">
            <p className="font-bold text-xs text-red-600 uppercase tracking-wide">SUPERINTENDENT</p>
            <p className="font-extrabold text-base sm:text-lg text-[#0B2545]">Robert Mason</p>
            <div className="flex items-center gap-1.5 text-slate-700 mt-1">
              <span>📞</span>
              <span>210-606-5662</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700">
              <span>✉️</span>
              <span>rwmason3@gmail.com</span>
            </div>
          </div>

          {/* Value Badges */}
          <div className="space-y-1.5 pl-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#0B2545] text-white flex items-center justify-center text-xs font-bold">🛡️</span>
              <span className="font-extrabold text-xs sm:text-sm text-[#0B2545] tracking-wider">SAFETY DRIVEN.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#0B2545] text-white flex items-center justify-center text-xs font-bold">✓</span>
              <span className="font-extrabold text-xs sm:text-sm text-[#0B2545] tracking-wider">QUALITY FOCUSED.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#0B2545] text-white flex items-center justify-center text-xs font-bold">📊</span>
              <span className="font-extrabold text-xs sm:text-sm text-[#0B2545] tracking-wider">RESULTS DELIVERED.</span>
            </div>
          </div>
        </div>

        {/* Bottom Address Ribbon with Red Angle */}
        <div className="relative bg-[#0B2545] text-white py-2.5 px-5 flex items-center justify-between overflow-hidden rounded-xs">
          <div className="flex items-center gap-2 font-bold text-xs sm:text-sm tracking-wide z-10">
            <span>📍</span>
            <span>712 Main St. &nbsp;|&nbsp; Jourdanton, TX 78026</span>
          </div>

          {/* Red stylized corner accent */}
          <div
            className="absolute right-0 top-0 bottom-0 w-20 bg-[#C62828]"
            style={{
              clipPath: 'polygon(35% 0, 100% 0, 100% 100%, 0% 100%)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
