import React from "react";
import { Plus } from "lucide-react";

const QuickTripButton = ({ onClick }) => {
  return (
    <div className="w-full">
      <button
        onClick={onClick}
        className="
          group
          w-full
          bg-gradient-to-r from-[#c5f0a4] to-[#a9e978]
          active:from-[#a9e978] active:to-[#c5f0a4]
          rounded-xl
          shadow-md active:shadow-lg
          transition-all duration-200
          border border-[#a9e978]/30
          backdrop-blur-sm
          transform active:scale-[0.98]
          py-4 px-4
          relative overflow-hidden
        "
      >
        {/* Animated background overlay */}
        <div
          className="
          absolute inset-0 
          bg-gradient-to-r from-transparent via-white/10 to-transparent
          transform -translate-x-full group-active:translate-x-full
          transition-transform duration-500
        "
        />

        <div className="flex items-center justify-center gap-3 relative z-10">
          <div
            className="
            w-10 h-10
            bg-white/20
            rounded-full
            flex items-center justify-center
            group-active:bg-white/30
            transition-all duration-200
            group-active:scale-110
          "
          >
            <Plus
              className="
                w-5 h-5 
                text-[#2a2a2a] 
                group-active:rotate-90 
                transition-transform duration-200
              "
            />
          </div>
          <div className="text-left flex-1">
            <h3 className="text-lg font-semibold text-[#2a2a2a] mb-0.5">
              Viaje Rápido
            </h3>
            <p className="text-[#2a2a2a]/70 text-xs">
              Crear un nuevo viaje ahora
            </p>
          </div>
        </div>
      </button>
    </div>
  );
};

export default QuickTripButton;
