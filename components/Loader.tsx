
import React from 'react';

export const Loader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-4">
      <div className="w-12 h-12 border-4 border-t-4 border-slate-600 border-t-cyan-400 rounded-full animate-spin"></div>
      <p className="text-slate-400">Gemini is analyzing your document...</p>
    </div>
  );
};
