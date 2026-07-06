import axios from "axios";

const BASE = "/api";

export interface Photo {
  id: number;
  s3_url: string;
  caption: string;
  uploaded_at: string;
  reaction_count: number;
}

export interface Reaction {
  emoji: string;
  count: number;
  names: string[];
}

export interface PhotoDetail extends Photo {
  reactions: Reaction[];
}

// Fetch all photos for the gallery page
export async function fetchPhotos(): Promise<Photo[]> {
  const { data } = await axios.get(`${BASE}/photos`);
  return data;
}

// Fetch a single photo with its reactions
export async function fetchPhoto(id: number): Promise<PhotoDetail> {
  const { data } = await axios.get(`${BASE}/photos/${id}`);
  return data;
}

// Upload a new photo (admin only)
export async function uploadPhoto(
  file: File,
  caption: string,
  adminPassword: string
): Promise<Photo> {
  const formData = new FormData();
  formData.append("photo", file);
  formData.append("caption", caption);

  const { data } = await axios.post(`${BASE}/photos`, formData, {
    headers: {
      "x-admin-password": adminPassword,
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
}

// Add a reaction to a photo
export async function addReaction(
  photoId: number,
  emoji: string,
  reactorName: string
): Promise<void> {
  await axios.post(`${BASE}/reactions`, {
    photo_id: photoId,
    emoji,
    reactor_name: reactorName,
  });
}

// Fetch reactions for a photo
export async function fetchReactions(photoId: number): Promise<Reaction[]> {
  const { data } = await axios.get(`${BASE}/reactions/${photoId}`);
  return data;
}