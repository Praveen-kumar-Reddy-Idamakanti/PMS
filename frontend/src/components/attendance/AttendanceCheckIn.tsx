import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { attendanceService } from "@/services/attendance.service";
import { toast } from "sonner";
import { Camera, MapPin } from "lucide-react";

export const AttendanceCheckIn = () => {
  const { settings, loading, error } = useAdminSettings();
  const [location, setLocation] = useState<{lat: number; lng: number} | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  // Request location permission and get current position
  const getLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        console.error("Error getting location:", error);
        toast.error("Unable to retrieve your location");
      }
    );
  };

  // Take a photo using device camera
  const takePhoto = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const photoData = canvas.toDataURL('image/jpeg');
        setPhoto(photoData);
      }
      
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.error("Error accessing camera:", err);
      toast.error("Unable to access camera");
    }
  };

  const handleCheckIn = async () => {
    if (!settings) {
      toast.error("Unable to load attendance settings");
      return;
    }

    if (settings.location_check_in && !location) {
      toast.error("Please enable location to check in");
      return;
    }

    if (settings.photo_check_in && !photo) {
      toast.error("Please take a photo to check in");
      return;
    }

    try {
      setIsCheckingIn(true);
      
      // Get address from coordinates (you might want to implement this using a geocoding service)
      let address = '';
      if (location) {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}`
          );
          const data = await response.json();
          address = data.display_name || 'Location captured';
        } catch (err) {
          console.error('Error getting address:', err);
          address = 'Location captured';
        }
      }

      await attendanceService.checkIn({
        location: location ? {
          latitude: location.lat,
          longitude: location.lng,
          address
        } : undefined,
        photo: settings.photo_check_in ? photo : undefined
      });
      
      toast.success("Successfully checked in!");
      
      // Reset form
      setLocation(null);
      setPhoto(null);
    } catch (error) {
      console.error("Check-in failed:", error);
      toast.error(error.response?.data?.message || "Failed to check in. Please try again.");
    } finally {
      setIsCheckingIn(false);
    }
  };

  if (loading) return <div>Loading attendance settings...</div>;
  if (error) return <div>Error loading attendance settings</div>;

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-2xl font-bold">Check In</h2>
      
      {settings.location_check_in && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location
            </span>
            <Button
              variant={location ? "default" : "outline"}
              onClick={getLocation}
              disabled={!!location}
            >
              {location ? "Location Captured" : "Get Location"}
            </Button>
          </div>
          {location && (
            <p className="text-sm text-muted-foreground">
              Location: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
            </p>
          )}
        </div>
      )}

      {settings.photo_check_in && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Photo
            </span>
            <Button
              variant={photo ? "default" : "outline"}
              onClick={takePhoto}
              disabled={!!photo}
            >
              {photo ? "Photo Taken" : "Take Photo"}
            </Button>
          </div>
          {photo && (
            <div className="mt-2">
              <img 
                src={photo} 
                alt="Check-in photo" 
                className="h-32 w-32 rounded-md object-cover"
              />
            </div>
          )}
        </div>
      )}

      <Button 
        className="w-full mt-6"
        onClick={handleCheckIn}
        disabled={isCheckingIn || 
          (settings.location_check_in && !location) || 
          (settings.photo_check_in && !photo)
        }
      >
        {isCheckingIn ? "Checking In..." : "Check In"}
      </Button>
    </div>
  );
};
