import React from "react";

const ResolutionCheck = () => {
  const NocturneIcon = ({ className }) => (
    <svg
      width="457"
      height="452"
      viewBox="0 0 457 452"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        opacity="0.8"
        d="M337.506 24.9087C368.254 85.1957 385.594 153.463 385.594 225.78C385.594 298.098 368.254 366.366 337.506 426.654C408.686 387.945 457 312.505 457 225.781C457 139.057 408.686 63.6173 337.506 24.9087Z"
        fill="#CBCBCB"
      />
      <path
        d="M234.757 20.1171C224.421 5.47596 206.815 -2.40914 189.157 0.65516C81.708 19.3019 0 112.999 0 225.781C0 338.562 81.7075 432.259 189.156 450.906C206.814 453.97 224.42 446.085 234.756 431.444C275.797 373.304 299.906 302.358 299.906 225.78C299.906 149.203 275.797 78.2567 234.757 20.1171Z"
        fill="white"
      />
    </svg>
  );

  return (
    <div className="bg-black min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center max-w-3xl mx-auto text-center p-6">
        <NocturneIcon className="w-20 h-20 mb-4" />
        <div className="space-y-2">
          <h2 className="text-[46px] font-[580] text-white tracking-tight">
            Invalid Resolution
          </h2>
          <h2 className="text-[28px] font-[580] text-white/60 tracking-tight">
            Nocturne is only intended for use on an 800x480 resolution screen.
            Please adjust your browser's resolution to continue.
          </h2>
        </div>
      </div>
    </div>
  );
};

export default ResolutionCheck;
