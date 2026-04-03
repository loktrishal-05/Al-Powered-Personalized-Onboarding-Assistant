import React, { useEffect, useRef } from 'react';

export default function ProgressRing({ progress = 0, size = 120, strokeWidth = 8, color = '#2563EB', label = '', sublabel = '' }) {
  const circleRef = useRef(null);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.style.strokeDashoffset = circumference;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          circleRef.current.style.transition = 'stroke-dashoffset 1.5s ease-out';
          circleRef.current.style.strokeDashoffset = offset;
        });
      });
    }
  }, [circumference, offset]);

  return (
    <div className="flex flex-col items-center gap-2" data-testid={`progress-ring-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <circle
            ref={circleRef}
            cx={size / 2} cy={size / 2} r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{Math.round(progress)}%</span>
        </div>
      </div>
      {label && <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#A1A1AA]">{label}</span>}
      {sublabel && <span className="text-xs text-[#71717A]">{sublabel}</span>}
    </div>
  );
}
