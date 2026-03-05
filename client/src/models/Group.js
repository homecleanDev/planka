import { attr } from 'redux-orm';

import BaseModel from './BaseModel';
import ActionTypes from '../constants/ActionTypes';

export default class extends BaseModel {
  static modelName = 'Group';

  static fields = {
    id: attr(),
    name: attr(),
    createdAt: attr({
      getDefault: () => new Date(),
    }),
  };

  static reducer({ type, payload }, Group) {
    switch (type) {
      case ActionTypes.SOCKET_RECONNECT_HANDLE:
        Group.all().delete();

        payload.groups.forEach((group) => {
          Group.upsert(group);
        });

        break;
      case ActionTypes.CORE_INITIALIZE:
        payload.groups.forEach((group) => {
          Group.upsert(group);
        });

        break;
      case ActionTypes.GROUP_CREATE__SUCCESS:
      case ActionTypes.GROUP_CREATE_HANDLE:
        Group.upsert(payload.group);

        break;
      default:
    }
  }

  static getOrderedQuerySet() {
    return this.orderBy('name');
  }
}
