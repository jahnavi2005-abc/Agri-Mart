import { getAuthToken } from "./auth";

type UploadResponse = {
  publicUrl: string;
  key: string;
};

export async function uploadCropImage(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Only JPEG, PNG, and WebP images are allowed.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image must be 5 MB or smaller.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "crop-images");

  const token = getAuthToken();

  const response = await fetch("/api/uploads/image", {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to upload image");
  }

  const data = (await response.json()) as UploadResponse;
  if (!data?.publicUrl) {
    throw new Error("Upload URL was not returned.");
  }

  return data.publicUrl;
}

export async function uploadDocument(file: File) {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Document must be 5 MB or smaller.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "documents");

  const token = getAuthToken();

  const response = await fetch("/api/uploads/image", {
    // Reusing image endpoint for simple file upload
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to upload document");
  }

  const data = (await response.json()) as UploadResponse;
  if (!data?.publicUrl) {
    throw new Error("Upload URL was not returned.");
  }

  return data.publicUrl;
}
