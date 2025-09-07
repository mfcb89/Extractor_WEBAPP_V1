
import React from 'react';

interface JsonDisplayProps {
  jsonString: string;
}

export const JsonDisplay: React.FC<JsonDisplayProps> = ({ jsonString }) => {
  return (
    <pre className="bg-slate-900 text-sm text-slate-200 p-4 rounded-md overflow-x-auto border border-slate-700">
      <code>{jsonString}</code>
    </pre>
  );
};
