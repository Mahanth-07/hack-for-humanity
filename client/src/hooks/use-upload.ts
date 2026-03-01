import { useState, useCallback } from "react";
import { storage } from "../lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

interface UploadMetadata {
  name: string;
  size: number;
  contentType: string;
}

interface UploadResponse {
  uploadURL?: string;
  objectPath: string;
  metadata: UploadMetadata;
}

interface UseUploadOptions {
  onSuccess?: (response: UploadResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * React hook for handling file uploads to Firebase Storage.
 */
export function useUpload(options: UseUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);

  /**
   * Upload a file directly to Firebase Storage.
   */
  const uploadFile = useCallback(
    async (file: File): Promise<UploadResponse | null> => {
      setIsUploading(true);
      setError(null);
      setProgress(0);

      try {
        const fileExtension = file.name.split('.').pop() || 'mp4';
        const uniqueFilename = `videos/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
        const storageRef = ref(storage, uniqueFilename);

        const uploadTask = uploadBytesResumable(storageRef, file);

        return new Promise((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const prog = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setProgress(Math.round(prog));
            },
            (err) => {
              const error = new Error("Upload failed: " + err.message);
              setError(error);
              options.onError?.(error);
              setIsUploading(false);
              reject(error);
            },
            async () => {
              // Upload completed successfully
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              const response: UploadResponse = {
                objectPath: downloadURL,
                metadata: {
                  name: file.name,
                  size: file.size,
                  contentType: file.type || "video/mp4",
                }
              };
              options.onSuccess?.(response);
              setIsUploading(false);
              resolve(response);
            }
          );
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Upload failed");
        setError(error);
        options.onError?.(error);
        setIsUploading(false);
        return null;
      }
    },
    [options]
  );

  return {
    uploadFile,
    isUploading,
    error,
    progress,
  };
}

