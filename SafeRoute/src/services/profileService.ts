import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabaseClient';

export async function uploadAvatarToStorage(fileUri: string, userId: string) {
  if (!fileUri) throw new Error('No se proporcionó URI del archivo');
  if (!userId) throw new Error('No se proporcionó ID de usuario');

  try {
    const bucket = 'avatars';
    const extRaw = fileUri.split('.').pop() || 'jpg';
    const ext = extRaw.split(/\#|\?/)[0].toLowerCase();
    
    const fileName = `avatar_${Date.now()}.${ext}`;
    const path = `${userId}/${fileName}`;

    // Usamos el string 'base64' directamente para evitar el error de EncodingType
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: 'base64', 
    });

    // Convertimos base64 a ArrayBuffer
    const arrayBuffer = decode(base64);

    const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';

    // Subir a Supabase
    const { data, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, arrayBuffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);

    return { 
      path, 
      publicUrl: `${urlData.publicUrl}?t=${new Date().getTime()}` 
    };

  } catch (error) {
    console.error("Error crítico subiendo imagen:", error);
    throw error;
  }
}

export async function resolveAvatarPublicUrl(avatarValue: string | null) {
  if (!avatarValue) return null;
  if (avatarValue.startsWith('http') || avatarValue.startsWith('file')) return avatarValue;

  const { data } = supabase.storage.from('avatars').getPublicUrl(avatarValue);
  return data.publicUrl ?? null;
}