import { attr, fk } from 'redux-orm';
import differenceInCalendarDays from 'date-fns/differenceInCalendarDays';

import BaseModel from './BaseModel';
import User from './User';
import ActionTypes from '../constants/ActionTypes';
import { DueDateFilterTypes } from '../constants/Enums';

export default class extends BaseModel {
  static modelName = 'List';

  static fields = {
    id: attr(),
    position: attr(),
    name: attr(),
    boardId: fk({
      to: 'Board',
      as: 'board',
      relatedName: 'lists',
    }),
  };

  static reducer({ type, payload }, List) {
    switch (type) {
      case ActionTypes.LOCATION_CHANGE_HANDLE:
      case ActionTypes.CORE_INITIALIZE:
      case ActionTypes.PROJECT_MANAGER_CREATE_HANDLE:
      case ActionTypes.BOARD_MEMBERSHIP_CREATE_HANDLE:
        if (payload.lists) {
          payload.lists.forEach((list) => {
            List.upsert(list);
          });
        }

        break;
      case ActionTypes.SOCKET_RECONNECT_HANDLE:
        List.all().delete();

        if (payload.lists) {
          payload.lists.forEach((list) => {
            List.upsert(list);
          });
        }

        break;
      case ActionTypes.BOARD_FETCH__SUCCESS:
        payload.lists.forEach((list) => {
          List.upsert(list);
        });

        break;
      case ActionTypes.LIST_CREATE:
      case ActionTypes.LIST_CREATE_HANDLE:
      case ActionTypes.LIST_UPDATE__SUCCESS:
      case ActionTypes.LIST_UPDATE_HANDLE:
      case ActionTypes.LIST_SORT__SUCCESS:
      case ActionTypes.LIST_SORT_HANDLE:
        List.upsert(payload.list);

        break;
      case ActionTypes.LIST_CREATE__SUCCESS:
        List.withId(payload.localId).delete();
        List.upsert(payload.list);

        break;
      case ActionTypes.LIST_UPDATE:
        List.withId(payload.id).update(payload.data);

        break;
      case ActionTypes.LIST_DELETE:
        List.withId(payload.id).deleteWithRelated();

        break;
      case ActionTypes.LIST_DELETE__SUCCESS:
      case ActionTypes.LIST_DELETE_HANDLE: {
        const listModel = List.withId(payload.list.id);

        if (listModel) {
          listModel.deleteWithRelated();
        }

        break;
      }
      default:
    }
  }

  getOrderedCardsQuerySet() {
    return this.cards.orderBy('position');
  }

  getOrderedListFetchedCardsQuerySet() {
    return this.cards
      .filter({
        isListFetched: true,
      })
      .orderBy('position');
  }

  getFilteredOrderedCardsModelArray() {
    let cardModels = this.getOrderedCardsQuerySet().toModelArray();

    const { filterText } = this.board;

    if (filterText !== '') {
      let re = null;
      const posSpace = filterText.indexOf(' ');

      if (filterText.startsWith('/')) {
        re = new RegExp(filterText.substring(1), 'i');
      }
      let doRegularSearch = true;
      if (re) {
        cardModels = cardModels.filter((cardModel) => re.test(cardModel.name));
        doRegularSearch = false;
      } else if (filterText.startsWith('!') && posSpace > 0) {
        const creatorUserId = User.findUsersFromText(
          filterText.substring(1, posSpace),
          this.board.memberships.toModelArray().map((membership) => membership.user),
        );
        if (creatorUserId != null) {
          doRegularSearch = false;
          cardModels = cardModels.filter((cardModel) => cardModel.creatorUser.id === creatorUserId);
        }
      }
      if (doRegularSearch) {
        const lowerCasedFilter = filterText.toLocaleLowerCase();
        cardModels = cardModels.filter(
          (cardModel) => cardModel.name.toLocaleLowerCase().indexOf(lowerCasedFilter) >= 0,
        );
      }
    }

    const filterUserIds = this.board.filterUsers.toRefArray().map((user) => user.id);
    const filterLabelIds = this.board.filterLabels.toRefArray().map((label) => label.id);
    const { dueDateFilter, isUnreadFilterEnabled } = this.board;

    if (filterUserIds.length > 0) {
      cardModels = cardModels.filter((cardModel) => {
        const users = cardModel.users.toRefArray();

        return users.some((user) => filterUserIds.includes(user.id));
      });
    }

    if (filterLabelIds.length > 0) {
      cardModels = cardModels.filter((cardModel) => {
        const labels = cardModel.labels.toRefArray();

        return labels.some((label) => filterLabelIds.includes(label.id));
      });
    }

    if (isUnreadFilterEnabled) {
      cardModels = cardModels.filter(
        (cardModel) => cardModel.getUnreadNotificationsQuerySet().count() > 0,
      );
    }

    if (dueDateFilter) {
      cardModels = cardModels.filter((cardModel) => {
        if (!cardModel.dueDate) {
          return false;
        }

        const daysOverdue = differenceInCalendarDays(new Date(), cardModel.dueDate);

        switch (dueDateFilter) {
          case DueDateFilterTypes.OVERDUE:
            return daysOverdue > 0;
          case DueDateFilterTypes.TODAY:
            return daysOverdue === 0;
          case DueDateFilterTypes.ON_TIME:
            return daysOverdue < 0;
          default:
            return true;
        }
      });
    }

    return cardModels;
  }

  deleteRelated() {
    this.cards.toModelArray().forEach((cardModel) => {
      cardModel.deleteWithRelated();
    });
  }

  deleteWithRelated() {
    this.deleteRelated();
    this.delete();
  }
}
