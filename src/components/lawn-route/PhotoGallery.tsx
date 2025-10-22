"use client";

import React, { useState, useEffect } from 'react';
import { X, Trash2, Loader2, Image as ImageIcon, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import { useToast } from '@/hooks/use-toast';
import {
  listServicePhotos,
  deletePhoto,
  type PhotoType,
  type PhotoMetadata,
} from '@/lib/photo-service';

interface PhotoGalleryProps {
  customerId: string;
  serviceId: string;
  photoType?: PhotoType;
  showPhotoType?: boolean;
  canDelete?: boolean;
  onPhotoDeleted?: (photoPath: string) => void;
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  customerId,
  serviceId,
  photoType,
  showPhotoType = true,
  canDelete = true,
  onPhotoDeleted,
}) => {
  const [photos, setPhotos] = useState<PhotoMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoMetadata | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<PhotoMetadata | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  // Load photos
  useEffect(() => {
    loadPhotos();
  }, [customerId, serviceId, photoType]);

  const loadPhotos = async () => {
    setLoading(true);
    try {
      const loadedPhotos = await listServicePhotos(
        customerId,
        serviceId,
        photoType
      );
      setPhotos(loadedPhotos);
    } catch (error) {
      console.error('Error loading photos:', error);
      toast({
        variant: 'destructive',
        title: 'Error loading photos',
        description:
          error instanceof Error ? error.message : 'Failed to load photos',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!photoToDelete) return;

    setDeleting(true);
    try {
      await deletePhoto(photoToDelete.path);

      toast({
        title: 'Photo deleted',
        description: 'The photo has been successfully deleted.',
      });

      // Remove from local state
      setPhotos((prev) => prev.filter((p) => p.path !== photoToDelete.path));

      // Notify parent
      onPhotoDeleted?.(photoToDelete.path);

      // Close dialog
      setPhotoToDelete(null);
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description:
          error instanceof Error ? error.message : 'Failed to delete photo',
      });
    } finally {
      setDeleting(false);
    }
  };

  const getPhotoTypeFromPath = (path: string): PhotoType | undefined => {
    if (path.includes('/before/')) return 'before';
    if (path.includes('/after/')) return 'after';
    return undefined;
  };

  // Loading state
  if (loading) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  // Empty state
  if (photos.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>
          No {photoType ? `${photoType} ` : ''}photos for this service
        </p>
      </Card>
    );
  }

  // Group photos by type if showing both
  const beforePhotos = photos.filter((p) => getPhotoTypeFromPath(p.path) === 'before');
  const afterPhotos = photos.filter((p) => getPhotoTypeFromPath(p.path) === 'after');
  const shouldGroupByType = !photoType && showPhotoType && (beforePhotos.length > 0 || afterPhotos.length > 0);

  return (
    <div className="space-y-6">
      {shouldGroupByType ? (
        <>
          {/* Before Photos Section */}
          {beforePhotos.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Before Photos</h3>
              <PhotoGrid
                photos={beforePhotos}
                onPhotoClick={setSelectedPhoto}
                onDeleteClick={canDelete ? setPhotoToDelete : undefined}
              />
            </div>
          )}

          {/* After Photos Section */}
          {afterPhotos.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">After Photos</h3>
              <PhotoGrid
                photos={afterPhotos}
                onPhotoClick={setSelectedPhoto}
                onDeleteClick={canDelete ? setPhotoToDelete : undefined}
              />
            </div>
          )}
        </>
      ) : (
        <PhotoGrid
          photos={photos}
          onPhotoClick={setSelectedPhoto}
          onDeleteClick={canDelete ? setPhotoToDelete : undefined}
        />
      )}

      {/* Lightbox Modal */}
      <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl">
          <VisuallyHidden>
            <DialogTitle>
              {selectedPhoto && getPhotoTypeFromPath(selectedPhoto.path)
                ? `${getPhotoTypeFromPath(selectedPhoto.path)} photo`
                : 'Service photo'}
            </DialogTitle>
          </VisuallyHidden>
          {selectedPhoto && (
            <div className="relative">
              <img
                src={selectedPhoto.url}
                alt="Full size"
                className="w-full h-auto max-h-[80vh] object-contain"
              />
              {showPhotoType && (
                <div className="absolute top-2 left-2 bg-black/70 text-white px-3 py-1 rounded-full text-sm capitalize">
                  {getPhotoTypeFromPath(selectedPhoto.path)}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!photoToDelete} onOpenChange={(open) => !open && setPhotoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Photo</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this photo? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePhoto}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Photo Grid Component
interface PhotoGridProps {
  photos: PhotoMetadata[];
  onPhotoClick: (photo: PhotoMetadata) => void;
  onDeleteClick?: (photo: PhotoMetadata) => void;
}

const PhotoGrid: React.FC<PhotoGridProps> = ({
  photos,
  onPhotoClick,
  onDeleteClick,
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {photos.map((photo) => (
        <Card
          key={photo.path}
          className="relative group overflow-hidden aspect-square cursor-pointer"
          onClick={() => onPhotoClick(photo)}
        >
          <img
            src={photo.url}
            alt={`Photo ${photo.photoId}`}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Delete button */}
          {onDeleteClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteClick(photo);
              }}
              className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </Card>
      ))}
    </div>
  );
};
