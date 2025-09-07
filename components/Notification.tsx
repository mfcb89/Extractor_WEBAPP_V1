import React from 'react';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';

export type NotificationType = 'success' | 'error';

interface NotificationProps {
  message: string;
  type: NotificationType;
  onClose: () => void;
}

export const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
  const isSuccess = type === 'success';

  const bgColor = isSuccess ? 'bg-green-600/90' : 'bg-red-600/90';
  const iconColor = isSuccess ? 'text-green-200' : 'text-red-200';
  const ringColor = isSuccess ? 'ring-green-500' : 'ring-red-500';

  return (
    <div
      role="alert"
      className={`fixed top-5 right-5 z-50 max-w-sm w-full p-4 rounded-lg shadow-lg backdrop-blur-md ring-1 ring-white/10
                  ${bgColor} animate-fade-in-down`}
    >
      <div className="flex items-start">
        <div className={`flex-shrink-0 ${iconColor}`}>
          {isSuccess ? <CheckCircleIcon className="h-6 w-6" /> : <ExclamationTriangleIcon className="h-6 w-6" />}
        </div>
        <div className="ml-3 w-0 flex-1 pt-0.5">
          <p className="text-sm font-medium text-white">{message}</p>
        </div>
        <div className="ml-4 flex-shrink-0 flex">
          <button
            onClick={onClose}
            className="inline-flex rounded-md text-slate-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800"
          >
            <span className="sr-only">Close</span>
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fade-in-down {
          0% {
            opacity: 0;
            transform: translateY(-20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
