import { all, takeEvery } from 'redux-saga/effects';

import services from '../services';
import EntryActionTypes from '../../../constants/EntryActionTypes';

export default function* groupsWatchers() {
  yield all([
    takeEvery(EntryActionTypes.GROUP_CREATE, ({ payload: { data } }) => services.createGroup(data)),
    takeEvery(EntryActionTypes.GROUP_CREATE_HANDLE, ({ payload: { group } }) =>
      services.handleGroupCreate(group),
    ),
  ]);
}
