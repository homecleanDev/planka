import EntryActionTypes from '../constants/EntryActionTypes';

const createListInCurrentBoard = (data) => ({
  type: EntryActionTypes.LIST_IN_CURRENT_BOARD_CREATE,
  payload: {
    data,
  },
});

const handleListCreate = (list) => ({
  type: EntryActionTypes.LIST_CREATE_HANDLE,
  payload: {
    list,
  },
});

const updateList = (id, data) => ({
  type: EntryActionTypes.LIST_UPDATE,
  payload: {
    id,
    data,
  },
});

const handleListUpdate = (list) => ({
  type: EntryActionTypes.LIST_UPDATE_HANDLE,
  payload: {
    list,
  },
});

const moveList = (id, index) => ({
  type: EntryActionTypes.LIST_MOVE,
  payload: {
    id,
    index,
  },
});

const fetchListCards = (id, cursor, limit, search) => ({
  type: EntryActionTypes.LIST_CARDS_FETCH,
  payload: {
    id,
    cursor,
    limit,
    search,
  },
});

const sortList = (id, data) => {
  return {
    type: EntryActionTypes.LIST_SORT,
    payload: {
      id,
      data,
    },
  };
};

const handleListSort = (list, cards) => ({
  type: EntryActionTypes.LIST_SORT_HANDLE,
  payload: {
    list,
    cards,
  },
});

const deleteList = (id) => ({
  type: EntryActionTypes.LIST_DELETE,
  payload: {
    id,
  },
});

const handleListDelete = (list) => ({
  type: EntryActionTypes.LIST_DELETE_HANDLE,
  payload: {
    list,
  },
});

export default {
  createListInCurrentBoard,
  handleListCreate,
  updateList,
  handleListUpdate,
  moveList,
  fetchListCards,
  sortList,
  handleListSort,
  deleteList,
  handleListDelete,
};
