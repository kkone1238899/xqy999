
import React from 'react';
import { Loader2, Sparkles, BrainCircuit, PenTool } from 'lucide-react';
import { translations } from '../constants/translations';

interface LoadingOverlayProps {
  lang: 'zh' | 'en';
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ lang }) => {
  const t = translations[lang];

  return (
    <div className="fixed inset-0 z-50 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
        <div className="relative w-24 h-24 bg-white rounded-3xl shadow-xl border border-orange-100 flex items-center justify-center">
           <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
           <div className="absolute -top-2 -right-2 bg-orange-100 p-2 rounded-full text-orange-600 animate-bounce">
             <Sparkles size={16} />
           </div>
        </div>
      </div>
      
      <h3 className="mt-8 text-xl font-bold text-gray-900">{t.analyzing}</h3>
      <p className="text-gray-500 mt-2 text-sm max-w-xs text-center leading-relaxed">
        {t.analyzingDesc}
      </p>

      <div className="mt-8 flex gap-8 text-gray-400">
         <div className="flex flex-col items-center gap-2 animate-pulse" style={{ animationDelay: '0s' }}>
            <BrainCircuit size={20} />
            <span className="text-[10px] font-medium uppercase tracking-wider">Reasoning</span>
         </div>
         <div className="flex flex-col items-center gap-2 animate-pulse" style={{ animationDelay: '0.3s' }}>
            <PenTool size={20} />
            <span className="text-[10px] font-medium uppercase tracking-wider">Writing</span>
         </div>
         <div className="flex flex-col items-center gap-2 animate-pulse" style={{ animationDelay: '0.6s' }}>
            <Sparkles size={20} />
            <span className="text-[10px] font-medium uppercase tracking-wider">Designing</span>
         </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
