"use client";

import React from "react";

interface SystemActionCardProps {
  message: string;
  actionText: string;
  onAction: () => void;
}

export function SystemActionCard({ message, actionText, onAction }: SystemActionCardProps) {
  return (
    <div className="group relative bg-[#171717] border border-dashed border-[#262626] rounded-xl p-4 sm:p-5 flex flex-col items-center justify-center text-center hover:border-[#3F3F46] transition-colors duration-normal min-h-[160px]">
      <p className="text-[14px] text-[#A1A1AA] font-medium mb-4 max-w-[240px]">
        {message}
      </p>
      <button
        onClick={onAction}
        className="px-4 py-1.5 text-[12px] font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors duration-fast"
      >
        {actionText}
      </button>
    </div>
  );
}
