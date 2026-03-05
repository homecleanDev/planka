import EntryActionTypes from '../constants/EntryActionTypes';

const createGroup = (data) => ({
  type: EntryActionTypes.GROUP_CREATE,
  payload: {
    data,
  },
});

const handleGroupCreate = (group) => ({
  type: EntryActionTypes.GROUP_CREATE_HANDLE,
  payload: {
    group,
  },
});

export default {
  createGroup,
  handleGroupCreate,
};
