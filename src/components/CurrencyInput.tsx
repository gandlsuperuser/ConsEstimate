'use client';

import React, { useState, useRef, useEffect } from 'react';

/* ------------------------------------------------------------------ */
/*  US Currency Formatter                                              */
/* ------------------------------------------------------------------ */
export function formatCurrencyUSD(val: number, showDollarSign = true, allowEmpty = false): string {
  if (!val && allowEmpty) return '';
  const num = Number(val) || 0;
  const formatted = Math.abs(num).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (num < 0) {
    return showDollarSign ? `-$${formatted}` : `-${formatted}`;
  }
  return showDollarSign ? `$${formatted}` : formatted;
}

export interface FormulaSuggestionItem {
  label: string;
  formula: string;
  description: string;
  previewValue?: number;
}

export interface CurrencyInputProps {
  value: number;
  onChange: (val: number) => void;
  formula?: string;
  onFormulaChange?: (formula: string | undefined, calculatedValue: number) => void;
  onEvaluateFormula?: (formulaText: string) => { value: number; normalizedFormula: string } | null;
  getSuggestions?: (query: string) => FormulaSuggestionItem[];
  className?: string;
  placeholder?: string;
  allowEmpty?: boolean;
  showDollarSign?: boolean;
  disabled?: boolean;
  title?: string;
  cellReference?: string;
}

export default function CurrencyInput({
  value,
  onChange,
  formula,
  onFormulaChange,
  onEvaluateFormula,
  getSuggestions,
  className = '',
  placeholder = '',
  allowEmpty = true,
  showDollarSign = true,
  disabled = false,
  title,
  cellReference,
}: CurrencyInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [tempText, setTempText] = useState('');
  const [suggestions, setSuggestions] = useState<FormulaSuggestionItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayValue = isFocused
    ? tempText
    : formatCurrencyUSD(value, showDollarSign, allowEmpty);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    if (formula) {
      setTempText(formula);
      if (getSuggestions) {
        const list = getSuggestions(formula);
        setSuggestions(list);
        setShowSuggestions(list.length > 0);
      }
    } else {
      setTempText(value ? String(value) : allowEmpty ? '' : '0');
    }
    e.target.select();
  };

  const updateSuggestionsForText = (text: string) => {
    if (!getSuggestions) {
      setShowSuggestions(false);
      return;
    }
    const isFormulaInput = text.startsWith('/') || text.startsWith('=') || /sum/i.test(text);
    if (isFormulaInput) {
      const list = getSuggestions(text);
      setSuggestions(list);
      setShowSuggestions(list.length > 0);
      setSelectedSuggestionIdx(0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTempText(val);
    updateSuggestionsForText(val);
  };

  const applyFormulaText = (formulaToApply: string) => {
    if (onEvaluateFormula) {
      const evalResult = onEvaluateFormula(formulaToApply);
      if (evalResult) {
        if (onFormulaChange) {
          onFormulaChange(evalResult.normalizedFormula, evalResult.value);
        }
        onChange(evalResult.value);
        setShowSuggestions(false);
        setIsFocused(false);
        return;
      }
    }
    // Fallback if formula not recognized as math
    const cleaned = formulaToApply.replace(/[^0-9.-]/g, '');
    const parsed = cleaned === '' ? 0 : parseFloat(cleaned) || 0;
    if (onFormulaChange) onFormulaChange(undefined, parsed);
    onChange(parsed);
    setShowSuggestions(false);
    setIsFocused(false);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // If clicking inside suggestions dropdown, ignore immediate blur
    if (containerRef.current?.contains(e.relatedTarget as Node)) {
      return;
    }

    const trimmed = tempText.trim();
    const isFormula = trimmed.startsWith('/') || trimmed.startsWith('=') || /sum/i.test(trimmed);

    if (isFormula && onEvaluateFormula) {
      const evalResult = onEvaluateFormula(trimmed);
      if (evalResult) {
        if (onFormulaChange) {
          onFormulaChange(evalResult.normalizedFormula, evalResult.value);
        }
        onChange(evalResult.value);
        setIsFocused(false);
        setShowSuggestions(false);
        return;
      }
    }

    // Regular number input
    setIsFocused(false);
    setShowSuggestions(false);
    const cleaned = trimmed.replace(/[^0-9.-]/g, '');
    const parsed = cleaned === '' ? 0 : parseFloat(cleaned) || 0;
    if (onFormulaChange) {
      onFormulaChange(undefined, parsed);
    }
    onChange(parsed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIdx((prev) => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIdx((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const chosen = suggestions[selectedSuggestionIdx];
        if (chosen) {
          applyFormulaText(chosen.formula);
        } else {
          applyFormulaText(tempText);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestions(false);
        return;
      }
    }

    if (e.key === 'Enter') {
      applyFormulaText(tempText);
      inputRef.current?.blur();
    }
  };

  const hasFormula = Boolean(formula);

  return (
    <div ref={containerRef} className="relative w-full inline-block">
      <div className="relative flex items-center w-full">
        <input
          ref={inputRef}
          type="text"
          inputMode={isFocused && hasFormula ? 'text' : 'decimal'}
          draggable={false}
          onDragStart={(e) => e.stopPropagation()}
          disabled={disabled}
          value={displayValue}
          placeholder={placeholder}
          onFocus={handleFocus}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          title={title || (hasFormula ? `Formula: ${formula} = ${formatCurrencyUSD(value)}` : undefined)}
          className={`${className} ${hasFormula && !isFocused ? 'font-bold' : ''}`}
        />

        {/* Subtle fx badge indicator when a cell has an active formula */}
        {hasFormula && !isFocused && (
          <span
            className="text-[8px] font-black text-blue-600 bg-blue-50 px-1 py-0.2 rounded border border-blue-200 select-none ml-1 cursor-help print:hidden"
            title={`Active formula: ${formula}`}
          >
            fx
          </span>
        )}
      </div>

      {/* Suggestion Dropdown Popover */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-300 rounded-md shadow-lg w-64 text-left overflow-hidden text-xs py-1"
          style={{ minWidth: '220px' }}
        >
          <div className="px-2 py-1 bg-gray-100 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
            <span>Formulas {cellReference ? `(${cellReference})` : ''}</span>
            <span className="text-[9px] lowercase font-normal text-gray-400">tab / enter</span>
          </div>

          <div className="max-h-48 overflow-y-auto">
            {suggestions.map((s, idx) => {
              const isSelected = idx === selectedSuggestionIdx;
              return (
                <button
                  key={s.formula + idx}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyFormulaText(s.formula);
                  }}
                  onMouseEnter={() => setSelectedSuggestionIdx(idx)}
                  className={`w-full text-left px-2.5 py-1.5 flex flex-col gap-0.5 cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono font-bold text-[11px]">
                    <span>{s.label}</span>
                    {s.previewValue !== undefined && (
                      <span className={isSelected ? 'text-blue-100' : 'text-emerald-600'}>
                        {formatCurrencyUSD(s.previewValue)}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>
                    {s.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
