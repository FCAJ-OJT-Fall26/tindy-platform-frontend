import React, { useRef, useState, useLayoutEffect, useEffect } from 'react';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  sublabel?: string;
}

interface DiscoverySegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'default' | 'compact';
  ariaLabel?: string;
  className?: string;
}

export default function DiscoverySegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'default',
  ariaLabel = 'Discovery Mode',
  className = '',
}: DiscoverySegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    width: number;
    height: number;
    top: number;
  }>({ left: 4, width: 0, height: 0, top: 4 });
  const [isReady, setIsReady] = useState(false);

  const activeIndex = options.findIndex((opt) => opt.value === value);

  const updateIndicator = () => {
    const container = containerRef.current;
    const activeButton = buttonRefs.current[activeIndex >= 0 ? activeIndex : 0];
    if (container && activeButton) {
      const left = activeButton.offsetLeft;
      const width = activeButton.offsetWidth;
      const height = activeButton.offsetHeight;
      const top = activeButton.offsetTop;
      setIndicatorStyle({ left, width, height, top });
    }
  };

  useLayoutEffect(() => {
    updateIndicator();
  }, [value, options]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      updateIndicator();
      setIsReady(true);
    });

    const handleResize = () => updateIndicator();
    window.addEventListener('resize', handleResize, { passive: true });

    let ro: ResizeObserver | null = null;
    if (containerRef.current && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => updateIndicator());
      ro.observe(containerRef.current);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleResize);
      ro?.disconnect();
    };
  }, [activeIndex]);

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label={ariaLabel}
      className={`discovery-segmented-control ${className}`}
    >
      {/* Sliding Active Pill Indicator */}
      <div
        className={`discovery-segmented-indicator ${isReady ? 'ready' : ''}`}
        style={{
          transform: `translateX(${indicatorStyle.left}px) translateY(${indicatorStyle.top}px)`,
          width: `${indicatorStyle.width}px`,
          height: `${indicatorStyle.height}px`,
        }}
        aria-hidden="true"
      />

      {/* Segmented Option Buttons */}
      {options.map((opt, idx) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            ref={(el) => (buttonRefs.current[idx] = el)}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`discovery-segmented-btn ${
              size === 'compact'
                ? 'py-2 px-2.5 rounded-md text-xs font-bold flex flex-col items-center gap-0.5 flex-1'
                : 'py-2 px-3.5 sm:px-4 rounded-md text-xs font-bold flex items-center justify-center gap-1.5'
            } ${
              isActive
                ? 'text-white'
                : 'text-slate-700 hover:text-black'
            }`}
          >
            <span>{opt.label}</span>
            {opt.sublabel && (
              <span
                className={`text-[9px] font-medium transition-colors ${
                  isActive ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                {opt.sublabel}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
