import http from './http';
import socket from './socket';

/* Transformers */

export const transformAttachment = (attachment) => ({
  ...attachment,
  coverUrl: attachment.url,
  createdAt: new Date(attachment.createdAt),
});

/* Actions */

export const getUploadUrl = (cardId, data, headers) =>
  http.post(`/cards/${cardId}/attachments/upload-url`, data, headers).then((body) => ({
    ...body,
  }));

export const create = (cardId, data, requestId, headers) => {
  if (data instanceof FormData) {
    // Legacy file upload through server
    return http.post(`/cards/${cardId}/attachments?requestId=${requestId}`, data, headers).then((body) => ({
      ...body,
      item: transformAttachment(body.item),
    }));
  }

  // Direct S3 upload
  return http.post(`/cards/${cardId}/attachments?requestId=${requestId}`, data, headers).then((body) => ({
    ...body,
    item: transformAttachment(body.item),
  }));
};

export const update = (id, data, headers) =>
  socket.patch(`/attachments/${id}`, data, headers).then((body) => ({
    ...body,
    item: transformAttachment(body.item),
  }));

export const deleteOne = (id, headers) =>
  socket.delete(`/attachments/${id}`, undefined, headers).then((body) => ({
    ...body,
    item: transformAttachment(body.item),
  }));

/* Event handlers */

const makeHandleAttachmentCreate = (next) => (body) => {
  next({
    ...body,
    item: transformAttachment(body.item),
  });
};

const makeHandleAttachmentUpdate = makeHandleAttachmentCreate;

const makeHandleAttachmentDelete = makeHandleAttachmentCreate;

export default {
  getUploadUrl,
  create,
  update,
  deleteOne,
  makeHandleAttachmentCreate,
  makeHandleAttachmentUpdate,
  makeHandleAttachmentDelete,
};
