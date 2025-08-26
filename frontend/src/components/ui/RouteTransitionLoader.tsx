import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { LoadingGif } from './LoadingGif';

export const RouteTransitionLoader = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const location = useLocation();
  const [prevLocation, setPrevLocation] = useState(location);

  useEffect(() => {
    // Only show loader if the pathname changes (not hash or search)
    if (location.pathname !== prevLocation.pathname) {
      setIsLoading(true);
      setShowLoader(true);
      setPrevLocation(location);
    }
    
    // Hide loader after a short delay
    const timer = setTimeout(() => {
      setIsLoading(false);
      setShowLoader(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [location, prevLocation]);

  if (!showLoader) return null;

  return isLoading ? <LoadingGif /> : null;
};
