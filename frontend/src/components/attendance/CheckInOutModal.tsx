import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Loader2, MapPin, X } from 'lucide-react';

type CheckInOutType = 'checkin' | 'checkout';

interface CheckInOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: CheckInOutType;
  onSubmit: (data: any) => void;
  isLoading?: boolean;
}

interface CheckInOutData {
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  notes?: string;
  timestamp: string;
  type: CheckInOutType;
}

export function CheckInOutModal({ isOpen, onClose, type, onSubmit, isLoading = false }: CheckInOutModalProps) {
  const [location, setLocation] = useState<CheckInOutData['location'] | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const getLocation = () => {
    setIsGettingLocation(true);
    setLocationError(null);
    
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setIsGettingLocation(false);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Reverse geocoding to get address
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          
          const data = await response.json();
          
          setLocation({
            latitude,
            longitude,
            address: data.display_name || 'Location retrieved',
          });
        } catch (error) {
          setLocationError("Could not retrieve address information");
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        setLocationError("Unable to retrieve your location. Please enable location services and try again.");
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleSubmit = () => {
    const data: CheckInOutData = {
      location: location || undefined,
      timestamp: new Date().toISOString(),
      type,
    };
    
    onSubmit(data);
  };

  const resetModal = () => {
    setLocation(null);
    setLocationError(null);
    setIsGettingLocation(false);
  };

  useEffect(() => {
    return () => {
      resetModal();
    };
  }, []);

  const isReadyToSubmit = location && !isLoading;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>
              {type === 'checkin' ? 'Check In' : 'Check Out'}
            </span>
          </DialogTitle>
          <DialogDescription>
            Please confirm your location to complete your {type === 'checkin' ? 'check-in' : 'check-out'}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Location Section */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium flex items-center space-x-2">
                  <MapPin className="w-4 h-4" />
                  <span>Location</span>
                </h4>
                {location && (
                  <Badge variant="outline" className="text-status-excellent border-status-excellent">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Captured
                  </Badge>
                )}
              </div>
              
              {!location && (
                <Button 
                  variant="outline" 
                  onClick={getLocation}
                  disabled={isGettingLocation}
                  className="w-full"
                >
                  {isGettingLocation ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Getting Location...
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4 mr-2" />
                      Get My Location
                    </>
                  )}
                </Button>
              )}
              
              {location && (
                <div className="space-y-2">
                  <div className="p-3 text-sm border rounded-lg bg-muted/50">
                    <p className="font-medium">{location.address}</p>
                    <p className="text-muted-foreground text-xs">
                      Lat: {location.latitude.toFixed(6)}, Long: {location.longitude.toFixed(6)}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={getLocation}
                    disabled={isGettingLocation}
                    className="w-full"
                  >
                    {isGettingLocation ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Location'
                    )}
                  </Button>
                </div>
              )}
              
              {locationError && (
                <p className="text-sm text-destructive mt-2">{locationError}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <div className="flex w-full space-x-2">
            <Button 
              variant="outline" 
              onClick={handleClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              onClick={handleSubmit}
              disabled={!isReadyToSubmit || isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {type === 'checkin' ? 'Checking In...' : 'Checking Out...'}
                </>
              ) : type === 'checkin' ? 'Check In' : 'Check Out'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}