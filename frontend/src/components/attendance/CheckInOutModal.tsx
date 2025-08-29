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
import { CheckCircle, Loader2, MapPin, X, Clock, AlertCircle } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

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
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

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

  const handleSubmit = async () => {
    if (!location) {
      setLocationError('Please enable location to continue');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const data: CheckInOutData = {
        location: location || undefined,
        notes: notes.trim() || undefined,
        timestamp: new Date().toISOString(),
        type,
      };
      
      await onSubmit(data);
      
      toast({
        title: `Successfully ${type === 'checkin' ? 'checked in' : 'checked out'}`,
        description: type === 'checkin' 
          ? 'Welcome! Your check-in has been recorded.' 
          : 'Goodbye! Your check-out has been recorded.',
      });
      
      handleClose();
    } catch (error) {
      console.error(`Error during ${type}:`, error);
      toast({
        title: `Error during ${type === 'checkin' ? 'check-in' : 'check-out'}`,
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetModal = () => {
    setLocation(null);
    setLocationError(null);
    setIsGettingLocation(false);
    setNotes('');
    setIsSubmitting(false);
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
            {type === 'checkin' ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <Clock className="w-5 h-5 text-blue-500" />
            )}
            <span>
              {type === 'checkin' ? 'Check In' : 'Check Out'}
            </span>
          </DialogTitle>
          <DialogDescription>
            {type === 'checkin' 
              ? 'Please confirm your location to check in for the day.'
              : 'Please confirm your location to check out for the day.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
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
                  <p className="text-sm text-muted-foreground">
                    {type === 'checkin' 
                      ? 'Please enable location services to check in.'
                      : 'Please enable location services to check out.'}
                  </p>
                )}
              </div>
              
              {!location ? (
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
                      {type === 'checkin' ? 'Use Current Location' : 'Get My Location'}
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 text-sm border rounded-lg bg-muted/10">
                    <p className="font-medium">{location.address}</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Lat: {location.latitude.toFixed(6)}, Long: {location.longitude.toFixed(6)}
                    </p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={getLocation}
                      disabled={isGettingLocation}
                      className="mt-2 h-8 px-3 text-xs"
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

                  <div className="space-y-2">
                    <label htmlFor="notes" className="text-sm font-medium">
                      {type === 'checkin' ? 'Check-in Notes (Optional)' : 'Check-out Notes (Optional)'}
                    </label>
                    <textarea
                      id="notes"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={type === 'checkin' 
                        ? 'Add any notes about your check-in...' 
                        : 'Add any notes about your check-out...'}
                      className="w-full p-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
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
              className="w-full"
              disabled={isLoading || isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!isReadyToSubmit}
              className={`w-full ${type === 'checkin' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {type === 'checkin' ? (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  ) : (
                    <Clock className="w-4 h-4 mr-2" />
                  )}
                  {type === 'checkin' ? 'Check In' : 'Check Out'}
                </>
              )}
            </Button>
          </div>
          
          {type === 'checkin' && location && (
            <div className="mt-3 flex items-center text-sm text-muted-foreground">
              <Clock className="w-4 h-4 mr-2 text-blue-500 flex-shrink-0" />
              <p>Your check-in time: {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}