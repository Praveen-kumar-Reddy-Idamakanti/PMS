import React, { useEffect, useState } from 'react';
import { useAttendance } from '../../hooks/useAttendance';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Loader2, MapPin, Clock, Calendar, Clock3 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../ui/use-toast';
import { debug } from '../../utils/debug';

export const AttendanceWidget = () => {
  const { 
    todaysStatus, 
    loading, 
    checkIn, 
    checkOut, 
    fetchTodaysStatus 
  } = useAttendance();
  
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [location, setLocation] = useState<{latitude: number; longitude: number; address: string} | null>(null);
  const [notes, setNotes] = useState('');
  const { toast } = useToast();

  // Log component mount and initial state
  useEffect(() => {
    debug('AttendanceWidget', 'Component mounted', { 
      todaysStatus,
      loading,
      location: location ? 'Location available' : 'No location',
      notes: notes ? 'Notes present' : 'No notes'
    });
    
    return () => {
      debug('AttendanceWidget', 'Component unmounted');
    };
  }, []);

  // Get user's current location
  useEffect(() => {
    debug('AttendanceWidget', 'Getting user location');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          debug('AttendanceWidget', 'Got geolocation position', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
          try {
            debug('AttendanceWidget', 'Reverse geocoding coordinates');
            // Reverse geocoding to get address from coordinates
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`
            );
            const data = await response.json();
            
            setLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              address: data.display_name || 'Location not available'
            });
          } catch (error) {
            console.error('Error getting address:', error);
            setLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              address: 'Location services enabled'
            });
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          toast({
            title: 'Location Error',
            description: 'Unable to retrieve your location. Some features may be limited.',
            variant: 'destructive',
          });
        }
      );
    }
  }, [toast]);

  // Fetch today's status on component mount
  useEffect(() => {
    fetchTodaysStatus();
  }, [fetchTodaysStatus]);

  const handleCheckIn = async () => {
    debug('AttendanceWidget', 'Check-in initiated', { location, notes });
    
    if (!location) {
      const errorMsg = 'Could not determine your location. Please enable location services.';
      debug('AttendanceWidget', 'Check-in error - no location', { error: errorMsg });
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
      return;
    }

    setIsCheckingIn(true);
    try {
      const checkInData = {
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address,
        },
        notes,
      };
      debug('AttendanceWidget', 'Sending check-in request', checkInData);
      
      await checkIn(checkInData);
      
      debug('AttendanceWidget', 'Check-in successful');
      setNotes('');
      toast({
        title: 'Success',
        description: 'Checked in successfully!',
      });
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to check in';
      debug('AttendanceWidget', 'Check-in error', { 
        error: errorMsg,
        fullError: error 
      });
      
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    debug('AttendanceWidget', 'Check-out initiated', { location, notes });
    
    if (!location) {
      const errorMsg = 'Could not determine your location. Please enable location services.';
      debug('AttendanceWidget', 'Check-out error - no location', { error: errorMsg });
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
      return;
    }

    setIsCheckingOut(true);
    try {
      const checkOutData = {
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address,
        },
        notes: notes.trim() || undefined,
      };
      debug('AttendanceWidget', 'Sending check-out request', checkOutData);
      
      await checkOut(checkOutData);
      
      debug('AttendanceWidget', 'Check-out successful');
      setNotes('');
      toast({
        title: 'Success',
        description: 'Checked out successfully!',
      });
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to check out';
      debug('AttendanceWidget', 'Check-out error', { 
        error: errorMsg,
        fullError: error 
      });
      
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const isCheckedIn = todaysStatus?.type === 'checkin';
  const isCheckedOut = todaysStatus?.type === 'checkout';

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock3 className="h-6 w-6" />
          <span>Attendance</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${isCheckedIn ? 'bg-yellow-500' : isCheckedOut ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="font-medium">
                {isCheckedIn 
                  ? 'Checked In' 
                  : isCheckedOut 
                    ? 'Checked Out' 
                    : 'Not Checked In'}
              </span>
            </div>
            {todaysStatus?.timestamp && (
              <span className="text-sm text-muted-foreground">
                {format(new Date(todaysStatus.timestamp), 'h:mm a')}
              </span>
            )}
          </div>

          {/* Location */}
          {location && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span className="truncate">{location.address}</span>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1">
            <label htmlFor="notes" className="text-sm font-medium">
              Notes (optional)
            </label>
            <textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Add any notes about your check-in/out..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {!isCheckedIn && !isCheckedOut && (
              <Button
                onClick={handleCheckIn}
                disabled={loading || isCheckingIn}
                className="flex-1"
              >
                {isCheckingIn ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking In...
                  </>
                ) : (
                  'Check In'
                )}
              </Button>
            )}

            {isCheckedIn && !isCheckedOut && (
              <Button
                variant="outline"
                onClick={handleCheckOut}
                disabled={loading || isCheckingOut}
                className="flex-1"
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking Out...
                  </>
                ) : (
                  'Check Out'
                )}
              </Button>
            )}

            {isCheckedOut && (
              <div className="text-sm text-muted-foreground text-center w-full py-2">
                You've completed your attendance for today.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
