import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'

import { storage } from '@/lib/firebase'

export const PHOTO_MAX_BYTES = 5 * 1024 * 1024

export async function uploadGamePhoto(
  file: File,
  leagueId: string,
  gameId: string,
): Promise<string> {
  if (file.size > PHOTO_MAX_BYTES) {
    throw new Error('Photo must be 5 MB or smaller')
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed')
  }
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const r = ref(storage, `games/${leagueId}/${gameId}/photo.${ext}`)
  await uploadBytes(r, file, { contentType: file.type })
  return getDownloadURL(r)
}
