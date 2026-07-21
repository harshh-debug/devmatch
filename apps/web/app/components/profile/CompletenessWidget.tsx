import React from "react";

interface CompletenessWidgetProps {
  completeness: number;
  missingFields: { label: string; pts: number; href: string }[];
}

export function CompletenessWidget({ completeness, missingFields }: CompletenessWidgetProps) {
  return (
    <div className="rounded-[1.35rem] border border-white/12 bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-medium text-white">Profile completeness</p>
        <span className="font-mono text-[14px] text-white tabular-nums">
          {completeness}%
        </span>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${completeness}%` }}
        />
      </div>
      
      {missingFields.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
          {missingFields.map((field) => (
            <a
              key={field.label}
              href={field.href}
              className="block w-full text-left text-[12px] text-[#A1A1AA] hover:text-white transition-colors"
            >
              + {field.label} <span className="text-[#52525B]">(+{field.pts} pts)</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
