import { call, put } from 'redux-saga/effects';

import request from '../request';
import actions from '../../../actions';
import api from '../../../api';

export function* createGroup(data) {
  yield put(actions.createGroup(data));

  let group;
  try {
    ({ item: group } = yield call(request, api.createGroup, data));
  } catch (error) {
    yield put(actions.createGroup.failure(error));
    return;
  }

  yield put(actions.createGroup.success(group));
}

export function* handleGroupCreate(group) {
  yield put(actions.handleGroupCreate(group));
}

export default {
  createGroup,
  handleGroupCreate,
};
