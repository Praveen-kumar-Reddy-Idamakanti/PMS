import React from 'react';

export const LoadingSpinner = ({ className = '' }) => (
  <div className={`flex items-center justify-center p-8 ${className}`}>
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    <span className="ml-3">Loading...</span>
  </div>
);
