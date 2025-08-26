import React, { useState } from 'react';

interface LoadingGifProps {
  text?: string; // Optional loading text to display
}

export const LoadingGif: React.FC<LoadingGifProps> = ({ 
  text = 'Loading...'
}) => {
  const [showFallback, setShowFallback] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
      {showFallback ? (
        <div>
          <div 
            className="animate-spin rounded-full border-t-4 border-primary" 
            style={{
              width: '200px', 
              height: '200px',
              animationDuration: '1.5s',
              borderTopColor: 'hsl(var(--primary))',
            }}
          />
          <div className="loading-text">{text}</div>
        </div>
      ) : (
        <img
          src="/loading.gif"
          alt="Loading..."
          className="w-48 h-48 object-contain"
          onError={() => setShowFallback(true)}
        />
      )}
    </div>
  );
};