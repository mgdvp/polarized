import { auth } from '../firebase';

export async function uploadImageToCloudinary(file) {
  if (!auth.currentUser) throw new Error("User not authenticated");
  const token = await auth.currentUser.getIdToken();

  // 1. Get signature
  const sigRes = await fetch("https://polarized.polarized.workers.dev/sign-upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  
  if (!sigRes.ok) {
    throw new Error("Failed to get upload signature");
  }

  const sig = await sigRes.json();

  // 2. Upload to Cloudinary
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", sig.apiKey);
  formData.append("timestamp", sig.timestamp);
  formData.append("signature", sig.signature);
  formData.append("folder", sig.folder); // ⚠️ folder mutlaka eklenmeli

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
    {
      method: "POST",
      body: formData
    }
  );

  if (!uploadRes.ok) {
    throw new Error("Failed to upload image to Cloudinary");
  }

  const uploadData = await uploadRes.json();
  const imageUrl = uploadData.secure_url;

  // 3. Moderation
  const modRes = await fetch("https://polarized.polarized.workers.dev/moderate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ imageUrl })
  });

  if (!modRes.ok) {
    throw new Error("Moderation check failed");
  }

  const mod = await modRes.json();

  if (!mod.allowed) {
    throw new Error("NSFW content");
  }

  return imageUrl;
}
