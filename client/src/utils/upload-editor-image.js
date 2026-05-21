import api from '../api';
import { getAccessToken } from './access-token-storage';

export default async (cardId, file) => {
  const accessToken = getAccessToken();
  const headers = accessToken
    ? {
        Authorization: `Bearer ${accessToken}`,
      }
    : undefined;

  const { item: uploadData } = await api.getUploadUrl(
    cardId,
    {
      filename: file.name,
      contentType: file.type,
    },
    headers,
  );

  const response = await fetch(uploadData.presignedUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
    mode: 'cors',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed with status ${response.status}: ${errorText}`);
  }

  const requestId = `${Date.now()}-${Math.random()}`;
  const { item: attachment } = await api.create(
    cardId,
    {
      key: uploadData.key,
      dirname: uploadData.dirname,
      filename: uploadData.filename,
      name: file.name,
    },
    requestId,
    headers,
  );

  return attachment.url;
};
