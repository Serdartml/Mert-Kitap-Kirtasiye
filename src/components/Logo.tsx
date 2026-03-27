import React from 'react';

interface LogoProps {
  isDark: boolean;
  className?: string;
  onClick?: () => void;
}

const Logo: React.FC<LogoProps> = ({ isDark, className = "", onClick }) => {
  return (
    <div onClick={onClick} className={`flex items-center gap-3 md:gap-4 ${className}`}>
      {/* 3-Book Stack Icon */}
      <div className="flex flex-col gap-[3px] md:gap-[4px] shrink-0">
        <div className="w-8 h-2.5 md:w-10 md:h-3 bg-[#42a2d4] rounded-sm shadow-sm" style={{ borderLeft: '3px solid rgba(255,255,255,0.4)' }}></div>
        <div className="w-9 h-2.5 md:w-11 md:h-3 bg-[#d43a3a] rounded-sm shadow-sm" style={{ borderLeft: '3px solid rgba(255,255,255,0.4)' }}></div>
        <div className="w-10 h-2.5 md:w-12 md:h-3 bg-[#f5b31d] rounded-sm shadow-sm" style={{ borderLeft: '3px solid rgba(255,255,255,0.4)' }}></div>
      </div>

      {/* Text Logo */}
      <div className="flex flex-col leading-none">
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl md:text-4xl font-black tracking-tighter text-[#f5b31d]`} style={{ fontFamily: 'system-ui' }}>
            MERT
          </span>
          <span className={`text-[10px] md:text-xs font-black tracking-[0.2em] text-[#f5b31d] uppercase`}>
            KİTAP & KIRTASİYE
          </span>
        </div>
        <div className="h-[2px] w-full bg-gradient-to-r from-[#f5b31d] to-transparent opacity-50 mt-1"></div>
      </div>
    </div>
  );
};

export default Logo;
