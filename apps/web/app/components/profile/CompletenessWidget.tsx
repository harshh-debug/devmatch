import React from "react";

interface CompletenessWidgetProps {
  completeness: number;
  missingFields: { label: string; pts: number; fieldId: string }[];
}

export function CompletenessWidget({ completeness, missingFields }: CompletenessWidgetProps) {
  return (
    <div className="bg-[#0A0A0A] border border-[#262626] rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-medium text-white">Profile completeness</p>
        <span className="font-mono text-[14px] text-white tabular-nums">
          {completeness}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[#262626] overflow-hidden mb-4">
        <div
          className="h-full rounded-full transition-all duration-500 bg-white"
          style={{ width: `${completeness}%` }}
        />
      </div>
      
      {missingFields.length > 0 && (
        <div className="space-y-2 mt-4 pt-4 border-t border-[#262626]">
          {missingFields.map((field) => (
            <a
              key={field.label}
              href={`/settings#${field.fieldId}`}
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
