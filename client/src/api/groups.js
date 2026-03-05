import socket from './socket';

const getGroups = (headers) => socket.get('/groups', undefined, headers);

const createGroup = (data, headers) => socket.post('/groups', data, headers);

export default {
  getGroups,
  createGroup,
};
