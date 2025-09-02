import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Loader2, MapPin, X, Clock, Home } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

export type CheckInOutType = 'checkin' | 'checkout' | 'remote';

interface CheckInOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: CheckInOutType;
  onSubmit: (data: any) => void;
  isLoading?: boolean;
  title?: string;
  description?: string;
  showRemoteOption?: boolean;
  // When true and type is 'checkout', allow skipping location (remote users)
  isRemoteCheckoutMode?: boolean;
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

export function CheckInOutModal({ 
  isOpen, 
  onClose, 
  type, 
  onSubmit, 
  isLoading = false, 
  title,
  description,
  showRemoteOption = false,
  isRemoteCheckoutMode = false
}: CheckInOutModalProps) {
  const [isRemoteWork, setIsRemoteWork] = useState(false);
  // Checkout mode selection (office vs remote), defaults from isRemoteCheckoutMode
  const [checkoutIsRemote, setCheckoutIsRemote] = useState<boolean>(isRemoteCheckoutMode);
  const [location, setLocation] = useState<CheckInOutData['location'] | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // For check-in, we need either location or remote work with a reason
    if (type === 'checkin') {
      if (!isRemoteWork && !location) {
        setLocationError('Please allow location access to continue');
        return;
      }

      if (isRemoteWork && !reason.trim()) {
        toast({
          title: 'Reason Required',
          description: 'Please provide a reason for working remotely',
          variant: 'destructive'
        });
        return;
      }
    }
    
    // For check-out, require location only if NOT remote (based on toggle)
    if (type === 'checkout' && !checkoutIsRemote && !location) {
      setLocationError('Please allow location access to continue');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const data: CheckInOutData & { isRemote?: boolean; reason?: string } = {
        ...(location && { 
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            address: location.address
          } 
        }),
        notes: isRemoteWork && type === 'checkin' ? reason : notes,
        timestamp: new Date().toISOString(),
        type,
        // For check-in remote request
        ...(isRemoteWork && type === 'checkin' && { 
          isRemote: true,
          reason 
        }),
        // For check-out, pass the chosen mode
        ...(type === 'checkout' && { isRemote: checkoutIsRemote })
      };
      
      await onSubmit(data);
      
      const successMessage = type === 'checkin' 
        ? isRemoteWork 
          ? 'Your remote work request has been submitted for approval.'
          : 'Welcome! Your office check-in has been recorded.'
        : 'Goodbye! Your check-out has been recorded.';
      
      toast({
        title: `Successfully ${type === 'checkin' ? 'checked in' : 'checked out'}`,
        description: successMessage,
      });
      
      handleClose();
    } catch (error) {
      console.error(`Error during ${type}:`, error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred';
      
      toast({
        title: `Error during ${type === 'checkin' ? 'check-in' : 'check-out'}`,
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetModal = () => {
    setLocation(null);
    setLocationError(null);
    setNotes('');
    setReason('');
    setIsSubmitting(false);
    setIsRemoteWork(false);
  };

  useEffect(() => {
    return () => {
      resetModal();
    };
  }, []);

  // Keep checkout toggle in sync with prop on open
  useEffect(() => {
    if (isOpen) {
      setCheckoutIsRemote(!!isRemoteCheckoutMode);
    }
  }, [isOpen, isRemoteCheckoutMode]);

  const isReadyToSubmit = 
    (type === 'checkin' && ((!isRemoteWork && location) || (isRemoteWork && reason.trim().length > 0))) ||
    (type === 'checkout' && (checkoutIsRemote || !!location));

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === 'checkin' ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                {isRemoteWork ? 'Request Remote Work' : 'Check In'}
              </>
            ) : (
              <>
                <X className="h-5 w-5 text-red-500" />
                {title || 'Check Out'}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {description || (
              type === 'checkin' 
                ? 'Record your check-in location and notes'
                : type === 'checkout'
                ? 'Record your check-out location and notes'
                : 'Submit a request to work remotely'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {type === 'checkout' && (
            <div className="grid grid-cols-2 gap-2 mb-2">
              <Button
                type="button"
                variant={!checkoutIsRemote ? 'default' : 'outline'}
                onClick={() => setCheckoutIsRemote(false)}
                className="flex-1"
                disabled={isLoading || isSubmitting}
              >
                <MapPin className="w-4 h-4 mr-2" />
                Office Checkout
              </Button>
              <Button
                type="button"
                variant={checkoutIsRemote ? 'default' : 'outline'}
                onClick={() => {
                  if (!isRemoteCheckoutMode) {
                    toast({
                      title: 'Remote checkout not allowed',
                      description: 'Today\'s attendance mode is Office. Location is required to check out.',
                      variant: 'destructive'
                    });
                    setCheckoutIsRemote(false);
                    return;
                  }
                  setCheckoutIsRemote(true);
                }}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                disabled={isLoading || isSubmitting}
              >
                <Home className="w-4 h-4 mr-2" />
                Remote Checkout
              </Button>
            </div>
          )}
          {showRemoteOption && type === 'checkin' && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Button
                type="button"
                variant={!isRemoteWork ? 'default' : 'outline'}
                onClick={() => setIsRemoteWork(false)}
                className="flex-1"
              >
                <MapPin className="w-4 h-4 mr-2" />
                Office Work
              </Button>
              <Button
                type="button"
                variant={isRemoteWork ? 'default' : 'outline'}
                onClick={() => setIsRemoteWork(true)}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Home className="w-4 h-4 mr-2" />
                Remote Work
              </Button>
            </div>
          )}

          {/* Content for check-in vs checkout */}
          {type === 'checkin' ? (
            isRemoteWork ? (
              <Card>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium flex items-center space-x-2 text-orange-500">
                      <Home className="w-4 h-4" />
                      <span>Reason for Remote Work</span>
                    </h4>
                  </div>
                  <textarea
                    placeholder="Please provide a reason for working remotely (required)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="min-h-[100px] w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                  />
                </div>
              </CardContent>
              </Card>
            ) : (
              <Card>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium flex items-center space-x-2 text-blue-500">
                      <MapPin className="w-4 h-4" />
                      <span>Office Location</span>
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
                      We need your location to record your attendance
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
                  </div>
                )}
                {locationError && (
                  <p className="text-sm text-destructive mt-2">{locationError}</p>
                )}

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
              </CardContent>
              </Card>
            )
          ) : (
            // Checkout content
            checkoutIsRemote ? (
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center space-x-2 text-orange-500">
                      <Home className="w-4 h-4" />
                      <span>Remote Checkout Notes (Optional)</span>
                    </h4>
                    <textarea
                      id="notes"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={'Add any notes about your check-out...'}
                      className="w-full p-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium flex items-center space-x-2 text-blue-500">
                        <MapPin className="w-4 h-4" />
                        <span>Office Location</span>
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
                        We need your location to record your attendance
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
                          {'Get My Location'}
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
                    </div>
                  )}
                  {locationError && (
                    <p className="text-sm text-destructive mt-2">{locationError}</p>
                  )}

                  <div className="space-y-2">
                    <label htmlFor="notes" className="text-sm font-medium">
                      {'Check-out Notes (Optional)'}
                    </label>
                    <textarea
                      id="notes"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={'Add any notes about your check-out...'}
                      className="w-full p-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </CardContent>
              </Card>
            )
          )}
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
              disabled={!isReadyToSubmit || isSubmitting}
              className={`w-full ${
                isRemoteWork 
                  ? 'bg-orange-600 hover:bg-orange-700' 
                  : type === 'checkin' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isRemoteWork ? 'Submitting...' : 'Processing...'}
                </>
              ) : (
                <>
                  {isRemoteWork ? (
                    <Home className="w-4 h-4 mr-2" />
                  ) : type === 'checkin' ? (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  ) : (
                    <Clock className="w-4 h-4 mr-2" />
                  )}
                  {isRemoteWork ? 'Submit Request' : type === 'checkin' ? 'Check In' : 'Check Out'}
                </>
              )}
            </Button>
          </div>
          
          {type === 'checkin' && location && !isRemoteWork && (
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
