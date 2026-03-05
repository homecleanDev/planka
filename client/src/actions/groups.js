import ActionTypes from '../constants/ActionTypes';

const createGroup = (data) => ({
  type: ActionTypes.GROUP_CREATE,
  payload: {
    data,
  },
});

createGroup.success = (group) => ({
  type: ActionTypes.GROUP_CREATE__SUCCESS,
  payload: {
    group,
  },
});

createGroup.failure = (error) => ({
  type: ActionTypes.GROUP_CREATE__FAILURE,
  payload: {
    error,
  },
});

const handleGroupCreate = (group) => ({
  type: ActionTypes.GROUP_CREATE_HANDLE,
  payload: {
    group,
  },
});

export default {
  createGroup,
  handleGroupCreate,
};
