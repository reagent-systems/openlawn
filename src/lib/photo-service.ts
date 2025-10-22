import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
  StorageReference
} from 'firebase/storage';
import { getFirebaseStorage } from './firebase';

/**
 * Photo service for handling image uploads, downloads, and management
 * Follows the storage structure: /customers/{customerId}/services/{serviceId}/{photoType}/{photoId}
 */

export type PhotoType = 'before' | 'after';

export interface PhotoUploadOptions {
  customerId: string;
  serviceId: string;
  photoType: PhotoType;
  file: File | Blob;
  photoId?: string; // Optional, will generate if not provided
}

export interface PhotoMetadata {
  url: string;
  path: string;
  photoId: string;
  uploadedAt: number;
}

/**
 * Compress image before upload to reduce storage costs and improve performance
 */
export const compressImage = async (
  file: File | Blob,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.8
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
      let { width, height } = img;

      // Calculate new dimensions while maintaining aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Generate a unique photo ID
 */
const generatePhotoId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Upload a photo to Firebase Storage
 */
export const uploadPhoto = async (
  options: PhotoUploadOptions
): Promise<PhotoMetadata> => {
  const storage = getFirebaseStorage();
  if (!storage) {
    throw new Error('Firebase Storage is not initialized');
  }

  const { customerId, serviceId, photoType, file } = options;
  const photoId = options.photoId || generatePhotoId();

  // Compress image before upload
  console.log(`Compressing image (original size: ${file.size} bytes)...`);
  const compressedBlob = await compressImage(file);
  console.log(`Image compressed (new size: ${compressedBlob.size} bytes)`);

  // Create storage path
  const path = `customers/${customerId}/services/${serviceId}/${photoType}/${photoId}.jpg`;
  const storageRef = ref(storage, path);

  // Upload file
  console.log(`Uploading photo to ${path}...`);
  const snapshot = await uploadBytes(storageRef, compressedBlob, {
    contentType: 'image/jpeg',
    customMetadata: {
      uploadedAt: Date.now().toString(),
      photoType,
      customerId,
      serviceId,
    },
  });

  // Get download URL
  const url = await getDownloadURL(snapshot.ref);

  return {
    url,
    path,
    photoId,
    uploadedAt: Date.now(),
  };
};

/**
 * Upload multiple photos
 */
export const uploadMultiplePhotos = async (
  customerId: string,
  serviceId: string,
  photoType: PhotoType,
  files: (File | Blob)[]
): Promise<PhotoMetadata[]> => {
  const uploadPromises = files.map((file) =>
    uploadPhoto({ customerId, serviceId, photoType, file })
  );

  return Promise.all(uploadPromises);
};

/**
 * Get download URL for a photo
 */
export const getPhotoUrl = async (path: string): Promise<string> => {
  const storage = getFirebaseStorage();
  if (!storage) {
    throw new Error('Firebase Storage is not initialized');
  }

  const storageRef = ref(storage, path);
  return getDownloadURL(storageRef);
};

/**
 * Delete a photo from Firebase Storage
 */
export const deletePhoto = async (path: string): Promise<void> => {
  const storage = getFirebaseStorage();
  if (!storage) {
    throw new Error('Firebase Storage is not initialized');
  }

  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
  console.log(`Deleted photo at ${path}`);
};

/**
 * Delete multiple photos
 */
export const deleteMultiplePhotos = async (paths: string[]): Promise<void> => {
  const deletePromises = paths.map((path) => deletePhoto(path));
  await Promise.all(deletePromises);
};

/**
 * List all photos for a service
 */
export const listServicePhotos = async (
  customerId: string,
  serviceId: string,
  photoType?: PhotoType
): Promise<PhotoMetadata[]> => {
  const storage = getFirebaseStorage();
  if (!storage) {
    throw new Error('Firebase Storage is not initialized');
  }

  // If photoType is specified, list that specific folder
  if (photoType) {
    const basePath = `customers/${customerId}/services/${serviceId}/${photoType}`;
    const storageRef = ref(storage, basePath);

    try {
      const result = await listAll(storageRef);

      const photoPromises = result.items.map(async (itemRef) => {
        const url = await getDownloadURL(itemRef);
        const pathParts = itemRef.fullPath.split('/');
        const photoId = pathParts[pathParts.length - 1].replace('.jpg', '');

        return {
          url,
          path: itemRef.fullPath,
          photoId,
          uploadedAt: Date.now(),
        };
      });

      return Promise.all(photoPromises);
    } catch (error) {
      console.error(`Error listing ${photoType} photos:`, error);
      return []; // Return empty array if folder doesn't exist yet
    }
  }

  // If no photoType specified, list both before and after photos
  const allPhotos: PhotoMetadata[] = [];

  // List before photos
  try {
    const beforePhotos = await listServicePhotos(customerId, serviceId, 'before');
    allPhotos.push(...beforePhotos);
  } catch (error) {
    console.error('Error listing before photos:', error);
  }

  // List after photos
  try {
    const afterPhotos = await listServicePhotos(customerId, serviceId, 'after');
    allPhotos.push(...afterPhotos);
  } catch (error) {
    console.error('Error listing after photos:', error);
  }

  return allPhotos;
};

/**
 * Delete all photos for a service
 */
export const deleteServicePhotos = async (
  customerId: string,
  serviceId: string,
  photoType?: PhotoType
): Promise<void> => {
  const photos = await listServicePhotos(customerId, serviceId, photoType);
  const paths = photos.map((photo) => photo.path);
  await deleteMultiplePhotos(paths);
  console.log(`Deleted ${paths.length} photos for service ${serviceId}`);
};

/**
 * Convert File to base64 for preview purposes
 */
export const fileToBase64 = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Validate image file
 */
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File is too large. Maximum size is 10MB.',
    };
  }

  return { valid: true };
};
