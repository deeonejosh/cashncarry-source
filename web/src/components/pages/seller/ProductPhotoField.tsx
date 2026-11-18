import React, { useId, useState } from 'react';
import { api } from '../../../lib/api';

const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];

async function preparePhoto(file: File): Promise<Blob> {
  if (!acceptedTypes.includes(file.type)) throw new Error('Select a JPEG, PNG or WebP photo.');
  if (file.size > 16 * 1024 * 1024) throw new Error('Select a photo smaller than 16 MB.');
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser could not prepare the photo.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const photo = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.76));
    if (!photo || photo.size > 512 * 1024) throw new Error('This photo is too large after resizing. Try a smaller photo.');
    return photo;
  } finally {
    bitmap.close();
  }
}

interface ProductPhotoFieldProps {
  value: string;
  onChange: (url: string) => void;
  uploading: boolean;
  onUploadingChange: (uploading: boolean) => void;
  disabled: boolean;
}

export default function ProductPhotoField({ value, onChange, uploading, onUploadingChange, disabled }: ProductPhotoFieldProps) {
  const inputId = useId();
  const [error, setError] = useState('');

  const uploadPhoto = async (file: File) => {
    setError('');
    onUploadingChange(true);
    try {
      const response = await api.uploadSellerProductPhoto(await preparePhoto(file));
      if (!response.ok || !response.data?.imageUrl) throw new Error(response.error || 'The photo could not be uploaded.');
      onChange(response.data.imageUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The photo could not be uploaded.');
    } finally {
      onUploadingChange(false);
    }
  };

  return (
    <fieldset className="space-y-2" disabled={disabled || uploading}>
      <legend className="font-bold text-slate-700">Product photo (optional)</legend>
      <label htmlFor={inputId} className="block text-slate-700">Upload a photo</label>
      <input id={inputId} type="file" accept={acceptedTypes.join(',')}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (file) void uploadPhoto(file);
        }}
        className="block w-full rounded-xl border border-slate-200 px-3 py-2 file:mr-3 file:font-semibold"
      />
      {uploading && <p role="status">Uploading photo…</p>}
      {error && <p role="alert" className="text-rose-700">{error}</p>}
      {value.startsWith(window.location.origin + '/media/product-photos/') && (
        <img src={value} alt="Uploaded product photo" className="h-20 w-20 rounded-lg border border-slate-200 object-cover" />
      )}
      <label className="block text-slate-700">
        Or enter an HTTPS image URL
        <input type="url" value={value} maxLength={1000} onChange={(event) => onChange(event.target.value)}
          placeholder="https://…" className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3" />
      </label>
    </fieldset>
  );
}
