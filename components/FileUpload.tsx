
import React, { useState, useCallback } from 'react';
import { UploadIcon } from './icons/UploadIcon';
import { FileIcon } from './icons/FileIcon';

interface FileUploadProps {
  onFileChange: (file: File | null) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileChange }) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File) => {
    if (file && file.type === 'application/pdf') {
      setFileName(file.name);
      onFileChange(file);
    } else {
      setFileName(null);
      onFileChange(null);
      alert('Please upload a valid PDF file.');
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div>
      <label
        htmlFor="pdf-upload"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300
          ${isDragging ? 'border-cyan-400 bg-slate-700/50' : 'border-slate-600 bg-slate-800 hover:bg-slate-700/80'}`}
      >
        {fileName ? (
          <div className="text-center">
            <FileIcon className="w-12 h-12 mx-auto text-green-400 mb-2" />
            <p className="font-semibold text-slate-200">{fileName}</p>
            <p className="text-sm text-slate-400">Click or drag to replace</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadIcon className="w-10 h-10 mb-3 text-slate-400" />
            <p className="mb-2 text-sm text-slate-400">
              <span className="font-semibold text-cyan-400">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-slate-500">PDF only (max 10MB)</p>
          </div>
        )}
        <input id="pdf-upload" type="file" className="hidden" accept="application/pdf" onChange={handleChange} />
      </label>
    </div>
  );
};
