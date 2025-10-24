"use client";

import React, { useState } from 'react';
import { Camera, Images } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { PhotoCapture } from './PhotoCapture';
import { PhotoGallery } from './PhotoGallery';
import type { PhotoMetadata } from '@/lib/photo-service';

interface ServicePhotoManagerProps {
  customerId: string;
  serviceId: string;
  onPhotosChanged?: () => void;
  canEdit?: boolean;
  defaultTab?: 'capture' | 'gallery';
}

/**
 * ServicePhotoManager - Integrated component for managing service photos
 * Combines photo capture and gallery in a tabbed interface
 */
export const ServicePhotoManager: React.FC<ServicePhotoManagerProps> = ({
  customerId,
  serviceId,
  onPhotosChanged,
  canEdit = true,
  defaultTab = 'capture',
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [refreshKey, setRefreshKey] = useState(0);

  const handlePhotosUploaded = (_photos: PhotoMetadata[]) => {
    // Refresh gallery
    setRefreshKey((prev) => prev + 1);

    // Switch to gallery tab to show uploaded photos
    setActiveTab('gallery');

    // Notify parent
    onPhotosChanged?.();
  };

  const handlePhotoDeleted = () => {
    // Refresh gallery
    setRefreshKey((prev) => prev + 1);

    // Notify parent
    onPhotosChanged?.();
  };

  return (
    <Card className="p-4">
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="capture" disabled={!canEdit}>
            <Camera className="w-4 h-4 mr-2" />
            Capture Photos
          </TabsTrigger>
          <TabsTrigger value="gallery">
            <Images className="w-4 h-4 mr-2" />
            View Photos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="capture" className="mt-4">
          <div className="space-y-6">
            {/* Before Photos Section */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Before Photos</h3>
              <PhotoCapture
                customerId={customerId}
                serviceId={serviceId}
                photoType="before"
                onPhotosUploaded={handlePhotosUploaded}
                disabled={!canEdit}
                maxPhotos={10}
              />
            </div>

            {/* After Photos Section */}
            <div>
              <h3 className="text-lg font-semibold mb-3">After Photos</h3>
              <PhotoCapture
                customerId={customerId}
                serviceId={serviceId}
                photoType="after"
                onPhotosUploaded={handlePhotosUploaded}
                disabled={!canEdit}
                maxPhotos={10}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="gallery" className="mt-4" key={refreshKey}>
          <PhotoGallery
            customerId={customerId}
            serviceId={serviceId}
            showPhotoType={true}
            canDelete={canEdit}
            onPhotoDeleted={handlePhotoDeleted}
          />
        </TabsContent>
      </Tabs>
    </Card>
  );
};

/**
 * SimplePhotoCapture - Simplified component for inline photo capture
 * Use this for quick photo capture without the full tabbed interface
 */
interface SimplePhotoCaptureProps {
  customerId: string;
  serviceId: string;
  photoType: 'before' | 'after';
  onPhotosUploaded: (photos: PhotoMetadata[]) => void;
  title?: string;
}

export const SimplePhotoCapture: React.FC<SimplePhotoCaptureProps> = ({
  customerId,
  serviceId,
  photoType,
  onPhotosUploaded,
  title,
}) => {
  return (
    <div className="space-y-3">
      {title && <h4 className="font-medium capitalize">{title}</h4>}
      <PhotoCapture
        customerId={customerId}
        serviceId={serviceId}
        photoType={photoType}
        onPhotosUploaded={onPhotosUploaded}
        maxPhotos={5}
      />
    </div>
  );
};

/**
 * SimplePhotoGallery - Simplified component for inline photo viewing
 * Use this for compact photo displays in cards or lists
 */
interface SimplePhotoGalleryProps {
  customerId: string;
  serviceId: string;
  photoType?: 'before' | 'after';
  canDelete?: boolean;
  onPhotoDeleted?: () => void;
}

export const SimplePhotoGallery: React.FC<SimplePhotoGalleryProps> = ({
  customerId,
  serviceId,
  photoType,
  canDelete = false,
  onPhotoDeleted,
}) => {
  return (
    <PhotoGallery
      customerId={customerId}
      serviceId={serviceId}
      photoType={photoType}
      showPhotoType={!photoType}
      canDelete={canDelete}
      onPhotoDeleted={onPhotoDeleted}
    />
  );
};
