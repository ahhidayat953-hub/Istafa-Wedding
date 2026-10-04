import React from 'react';

/**
 * Delicate botanical & floral line-art ornaments in soft gold (#B68D40) and sage (#5B705E)
 * to reinforce the romantic luxury wedding aesthetic without visual clutter.
 */
export const FloralDivider: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center justify-center gap-4 select-none ${className}`} aria-hidden="true">
    <span className="h-px w-16 sm:w-28 bg-gradient-to-r from-transparent via-[#C8B282] to-[#B68D40]/70" />
    <svg
      width="36"
      height="20"
      viewBox="0 0 36 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-[#B68D40]"
    >
      <path
        d="M18 2C15.5 6.5 11 9.5 4 10C11 10.5 15.5 13.5 18 18C20.5 13.5 25 10.5 32 10C25 9.5 20.5 6.5 18 2Z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="18" cy="10" r="1.5" fill="currentColor" />
      <circle cx="2" cy="10" r="1" fill="currentColor" fillOpacity="0.6" />
      <circle cx="34" cy="10" r="1" fill="currentColor" fillOpacity="0.6" />
    </svg>
    <span className="h-px w-16 sm:w-28 bg-gradient-to-l from-transparent via-[#C8B282] to-[#B68D40]/70" />
  </div>
);

export const BotanicalCornerOrnament: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`pointer-events-none select-none ${className}`}
    aria-hidden="true"
  >
    <path
      d="M10 110C15 65 45 25 105 12"
      stroke="#B68D40"
      strokeWidth="1"
      strokeOpacity="0.45"
      strokeLinecap="round"
    />
    <path
      d="M28 82C22 65 30 50 45 48C42 63 35 76 28 82Z"
      stroke="#5B705E"
      strokeWidth="0.9"
      strokeOpacity="0.4"
    />
    <path
      d="M52 54C48 38 58 26 74 26C69 40 60 50 52 54Z"
      stroke="#B68D40"
      strokeWidth="0.9"
      strokeOpacity="0.45"
    />
    <path
      d="M44 68C60 66 72 74 74 88C59 85 48 76 44 68Z"
      stroke="#B87D7B"
      strokeWidth="0.9"
      strokeOpacity="0.35"
    />
    <circle cx="88" cy="20" r="2.5" fill="#B68D40" fillOpacity="0.4" />
    <circle cx="20" cy="95" r="2" fill="#B68D40" fillOpacity="0.4" />
  </svg>
);
