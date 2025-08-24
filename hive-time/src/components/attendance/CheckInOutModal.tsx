import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Camera, 
  MapPin, 
  Clock, 
  CheckCircle, 
  XCircle,
  Loader2 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CheckInOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'checkin' | 'checkout';
  onSubmit: (data: CheckInOutData) => void;
  isLoading?: boolean;
}

interface CheckInOutData {
  photo?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  timestamp: string;
  type: 'checkin' | 'checkout';
}

export function CheckInOutModal({ isOpen, onClose, type, onSubmit, isLoading = false }: CheckInOutModalProps) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<CheckInOutData['location'] | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const startCamera = async () => {
    try {
      setIsCapturingPhoto(true);
      setPhotoError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user' 
        } 
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      setPhotoError("Unable to access camera. Please check permissions.");
      setIsCapturingPhoto(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setPhoto(photoDataUrl);
    
    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturingPhoto(false);
  };

  const retakePhoto = () => {
    setPhoto(null);
    startCamera();
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser.");
      return;
    }

    setIsGettingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // In a real app, you'd use a geocoding service here
          const mockAddress = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          
          setLocation({
            latitude,
            longitude,
            address: mockAddress,
          });
          setIsGettingLocation(false);
          
          toast({
            title: "Location captured",
            description: "Your location has been recorded successfully.",
          });
        } catch (error) {
          setLocation({ latitude, longitude });
          setIsGettingLocation(false);
        }
      },
      (error) => {
        setLocationError(`Location error: ${error.message}`);
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleSubmit = () => {
    const data: CheckInOutData = {
      photo: photo || undefined,
      location: location || undefined,
      timestamp: new Date().toISOString(),
      type,
    };

    onSubmit(data);
  };

  const resetModal = () => {
    setPhoto(null);
    setLocation(null);
    setLocationError(null);
    setPhotoError(null);
    setIsCapturingPhoto(false);
    setIsGettingLocation(false);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const isReadyToSubmit = photo && location && !isLoading;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-primary" />
            <span>
              {type === 'checkin' ? 'Check In' : 'Check Out'}
            </span>
          </DialogTitle>
          <DialogDescription>
            Please capture your photo and location to complete your {type === 'checkin' ? 'check-in' : 'check-out'}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Photo Section */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium flex items-center space-x-2">
                  <Camera className="w-4 h-4" />
                  <span>Photo Verification</span>
                </h4>
                {photo && (
                  <Badge variant="outline" className="text-status-excellent border-status-excellent">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Captured
                  </Badge>
                )}
              </div>

              {!photo && !isCapturingPhoto && (
                <Button 
                  variant="outline" 
                  onClick={startCamera}
                  className="w-full"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Take Photo
                </Button>
              )}

              {isCapturingPhoto && (
                <div className="space-y-2">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full rounded-lg bg-black"
                  />
                  <div className="flex space-x-2">
                    <Button onClick={capturePhoto} variant="default" className="flex-1">
                      Capture
                    </Button>
                    <Button 
                      onClick={() => {
                        if (streamRef.current) {
                          streamRef.current.getTracks().forEach(track => track.stop());
                        }
                        setIsCapturingPhoto(false);
                      }} 
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {photo && (
                <div className="space-y-2">
                  <img
                    src={photo}
                    alt="Captured photo"
                    className="w-full rounded-lg"
                  />
                  <Button onClick={retakePhoto} variant="outline" size="sm" className="w-full">
                    Retake Photo
                  </Button>
                </div>
              )}

              {photoError && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{photoError}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

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
                  onClick={getCurrentLocation}
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
                      Get Current Location
                    </>
                  )}
                </Button>
              )}

              {location && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-sm font-medium mb-1">Location Captured</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Lat: {location.latitude.toFixed(6)}</div>
                    <div>Lng: {location.longitude.toFixed(6)}</div>
                    {location.address && (
                      <div className="pt-1">
                        <strong>Address:</strong> {location.address}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {locationError && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{locationError}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            variant="hero"
            onClick={handleSubmit}
            disabled={!isReadyToSubmit}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                {type === 'checkin' ? 'Check In' : 'Check Out'}
              </>
            )}
          </Button>
        </DialogFooter>

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </DialogContent>
    </Dialog>
  );
}