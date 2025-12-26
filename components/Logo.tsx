import React from 'react';

const Logo: React.FC = () => {
  return (
    <div className="flex items-center justify-center pointer-events-none py-2">
      <div className="flex items-center gap-2">
        <div className="relative w-2.5 h-2.5">
          <div className="absolute inset-0 bg-gradient-to-tr from-sky-400 to-fuchsia-500 rounded-full animate-pulse blur-[1px]" />
          <div className="absolute inset-0.5 bg-gradient-to-br from-emerald-400 via-indigo-500 to-rose-500 rounded-full animate-spin duration-[3s]" />
        </div>
        <h2 className="logo-text text-[8px] font-black tracking-[0.4em] uppercase whitespace-nowrap">
          DeeJay Labs
        </h2>
      </div>
      
      <style>{`
        .logo-text {
          background: linear-gradient(
            to right, 
            #38bdf8, 
            #818cf8, 
            #c084fc, 
            #fb7185, 
            #facc15,
            #4ade80,
            #38bdf8
          );
          background-size: 300% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: logo-color-shift 6s linear infinite;
        }

        @keyframes logo-color-shift {
          0% { background-position: 0% center; }
          100% { background-position: 300% center; }
        }
      `}</style>
    </div>
  );
};

export default Logo;