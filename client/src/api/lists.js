import socket from './socket';
import { transformCard } from './cards';
import { transformAttachment } from './attachments';

/* Actions */

const createList = (boardId, data, headers) =>
  socket.post(`/boards/${boardId}/lists`, data, headers);

const getListCards = (id, cursor, limit, search, headers) =>
  // Keep `headers` as last arg for API consistency with other modules.
  socket
    .get(
      `/lists/${id}/cards?limit=${limit || 50}${cursor ? `&cursor=${cursor}` : ''}${
        search ? `&search=${encodeURIComponent(search)}` : ''
      }`,
      undefined,
      headers,
    )
    .then((body) => ({
      ...body,
      items: body.items.map(transformCard),
      included: {
        ...body.included,
        attachments: body.included.attachments.map(transformAttachment),
      },
    }));

const updateList = (id, data, headers) => socket.patch(`/lists/${id}`, data, headers);

const sortList = (id, data, headers) =>
  socket.post(`/lists/${id}/sort`, data, headers).then((body) => ({
    ...body,
    included: {
      ...body.included,
      cards: body.included.cards.map(transformCard),
    },
  }));

const deleteList = (id, headers) => socket.delete(`/lists/${id}`, undefined, headers);

/* Event handlers */

const makeHandleListSort = (next) => (body) => {
  next({
    ...body,
    included: {
      ...body.included,
      cards: body.included.cards.map(transformCard),
    },
  });
};

export default {
  createList,
  getListCards,
  updateList,
  sortList,
  deleteList,
  makeHandleListSort,
};
