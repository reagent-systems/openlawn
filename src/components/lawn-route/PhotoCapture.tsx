"use client";

import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  uploadMultiplePhotos,
  validateImageFile,
  fileToBase64,
  type PhotoType,
  type PhotoMetadata,
} from '@/lib/photo-service';

interface PhotoCaptureProps {
  customerId: string;
  serviceId: string;
  photoType: PhotoType;
  onPhotosUploaded: (photos: PhotoMetadata[]) => void;
  maxPhotos?: number;
  disabled?: boolean;
}

interface PreviewPhoto {
  file: File;
  preview: string;
  uploading: boolean;
  error?: string;
}

export const PhotoCapture: React.FC<PhotoCaptureProps> = ({
  customerId,
  serviceId,
  photoType,
  onPhotosUploaded,
  maxPhotos = 10,
  disabled = false,
}) => {
  const [photos, setPhotos] = useState<PreviewPhoto[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newPhotos: PreviewPhoto[] = [];

    // Validate and process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validation = validateImageFile(file);

      if (!validation.valid) {
        toast({
          variant: 'destructive',
          title: 'Invalid file',
          description: validation.error,
        });
        continue;
      }

      // Check if we've reached max photos
      if (photos.length + newPhotos.length >= maxPhotos) {
        toast({
          variant: 'destructive',
          title: 'Maximum photos reached',
          description: `You can only upload up to ${maxPhotos} photos.`,
        });
        break;
      }

      try {
        const preview = await fileToBase64(file);
        newPhotos.push({
          file,
          preview,
          uploading: false,
        });
      } catch (error) {
        console.error('Error creating preview:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to create image preview',
        });
      }
    }

    setPhotos((prev) => [...prev, ...newPhotos]);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadAll = async () => {
    if (photos.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No photos',
        description: 'Please add photos before uploading.',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Mark all photos as uploading
      setPhotos((prev) =>
        prev.map((photo) => ({ ...photo, uploading: true }))
      );

      // Upload all photos
      const files = photos.map((p) => p.file);
      const uploadedPhotos = await uploadMultiplePhotos(
        customerId,
        serviceId,
        photoType,
        files
      );

      toast({
        title: 'Success!',
        description: `Uploaded ${uploadedPhotos.length} ${photoType} photo(s)`,
      });

      // Notify parent component
      onPhotosUploaded(uploadedPhotos);

      // Clear photos
      setPhotos([]);
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description:
          error instanceof Error ? error.message : 'Failed to upload photos',
      });

      // Mark photos as not uploading
      setPhotos((prev) =>
        prev.map((photo) => ({ ...photo, uploading: false }))
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={handleCameraCapture}
          disabled={disabled || isUploading || photos.length >= maxPhotos}
          variant="outline"
        >
          <Camera className="w-4 h-4 mr-2" />
          Camera
        </Button>

        <Button
          onClick={handleFileUpload}
          disabled={disabled || isUploading || photos.length >= maxPhotos}
          variant="outline"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload
        </Button>

        {photos.length > 0 && (
          <Button
            onClick={handleUploadAll}
            disabled={disabled || isUploading}
            className="ml-auto"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload {photos.length} Photo{photos.length > 1 ? 's' : ''}
              </>
            )}
          </Button>
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />

      {/* Photo Previews */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo, index) => (
            <Card
              key={index}
              className="relative group overflow-hidden aspect-square"
            >
              <img
                src={photo.preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Remove button */}
              {!photo.uploading && (
                <button
                  onClick={() => handleRemovePhoto(index)}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={isUploading}
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Upload overlay */}
              {photo.uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {photos.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No {photoType} photos added yet</p>
          <p className="text-sm mt-1">
            Take a photo with your camera or upload from your device
          </p>
        </Card>
      )}
    </div>
  );
};
