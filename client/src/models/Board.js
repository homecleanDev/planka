import { attr, fk, many } from 'redux-orm';

import BaseModel from './BaseModel';
import ActionTypes from '../constants/ActionTypes';
import { saveBoardFilters, loadBoardFilters } from '../lib/boardFilters';

import User from './User';
import Label from './Label';

export default class extends BaseModel {
  static modelName = 'Board';

  static fields = {
    id: attr(),
    position: attr(),
    name: attr(),
    isFetching: attr({
      getDefault: () => null,
    }),
    projectId: fk({
      to: 'Project',
      as: 'project',
      relatedName: 'boards',
    }),
    memberUsers: many({
      to: 'User',
      through: 'BoardMembership',
      relatedName: 'boards',
    }),
    filterUsers: many('User', 'filterBoards'),
    filterLabels: many('Label', 'filterBoards'),
    filterText: attr({
      getDefault: () => '',
    }),
    isUnreadFilterEnabled: attr({
      getDefault: () => false,
    }),
  };

  static applySavedFilters(board, savedFilters) {
    if (!savedFilters) {
      return;
    }

    if (savedFilters.filterUsers) {
      savedFilters.filterUsers.forEach((userId) => {
        board.filterUsers.add(userId);
      });
    }

    if (savedFilters.filterLabels) {
      savedFilters.filterLabels.forEach((labelId) => {
        board.filterLabels.add(labelId);
      });
    }

    board.update({
      filterText: savedFilters.filterText || '',
      isUnreadFilterEnabled: !!savedFilters.isUnreadFilterEnabled,
    });
  }

  static saveFilters(board) {
    saveBoardFilters(board.id, {
      filterUsers: board.filterUsers.toRefArray().map((user) => user.id),
      filterLabels: board.filterLabels.toRefArray().map((label) => label.id),
      filterText: board.filterText,
      isUnreadFilterEnabled: board.isUnreadFilterEnabled,
    });
  }

  static reducer({ type, payload }, Board) {
    switch (type) {
      case ActionTypes.LOCATION_CHANGE_HANDLE:
        if (payload.board) {
          const board = Board.upsert({
            ...payload.board,
            isFetching: false,
          });

          this.applySavedFilters(board, loadBoardFilters(payload.board.id));
        }

        break;
      case ActionTypes.LOCATION_CHANGE_HANDLE__BOARD_FETCH:
      case ActionTypes.BOARD_FETCH:
        Board.withId(payload.id).update({
          isFetching: true,
        });

        break;
      case ActionTypes.SOCKET_RECONNECT_HANDLE:
        Board.all().delete();

        if (payload.board) {
          Board.upsert({
            ...payload.board,
            isFetching: false,
          });
        }

        payload.boards.forEach((board) => {
          Board.upsert(board);
        });

        break;
      case ActionTypes.SOCKET_RECONNECT_HANDLE__CORE_FETCH:
        Board.all()
          .toModelArray()
          .forEach((boardModel) => {
            if (boardModel.id !== payload.currentBoardId) {
              boardModel.update({
                isFetching: null,
              });

              boardModel.deleteRelated(payload.currentUserId);
            }
          });

        break;
      case ActionTypes.CORE_INITIALIZE:
        if (payload.board) {
          const initializedBoard = Board.upsert({
            ...payload.board,
            isFetching: false,
          });

          this.applySavedFilters(initializedBoard, loadBoardFilters(payload.board.id));
        }

        payload.boards.forEach((board) => {
          Board.upsert(board);
        });

        break;
      case ActionTypes.USER_TO_BOARD_FILTER_ADD: {
        const boardWithAddedUser = Board.withId(payload.boardId);
        boardWithAddedUser.filterUsers.add(payload.id);
        this.saveFilters(boardWithAddedUser);
        break;
      }

      case ActionTypes.USER_FROM_BOARD_FILTER_REMOVE: {
        const boardWithRemovedUser = Board.withId(payload.boardId);
        boardWithRemovedUser.filterUsers.remove(payload.id);
        this.saveFilters(boardWithRemovedUser);
        break;
      }

      case ActionTypes.PROJECT_CREATE_HANDLE:
        payload.boards.forEach((board) => {
          Board.upsert(board);
        });

        break;
      case ActionTypes.PROJECT_MANAGER_CREATE_HANDLE:
      case ActionTypes.BOARD_MEMBERSHIP_CREATE_HANDLE:
        if (payload.boards) {
          payload.boards.forEach((board) => {
            Board.upsert({
              ...board,
              ...(payload.board &&
                payload.board.id === board.id && {
                  isFetching: false,
                }),
            });
          });
        }

        break;
      case ActionTypes.BOARD_CREATE:
      case ActionTypes.BOARD_CREATE_HANDLE:
      case ActionTypes.BOARD_UPDATE__SUCCESS:
      case ActionTypes.BOARD_UPDATE_HANDLE:
        Board.upsert(payload.board);

        break;
      case ActionTypes.BOARD_CREATE__SUCCESS:
        Board.withId(payload.localId).delete();
        Board.upsert(payload.board);

        break;
      case ActionTypes.BOARD_FETCH__SUCCESS: {
        const fetchedBoard = Board.upsert({
          ...payload.board,
          isFetching: false,
        });

        this.applySavedFilters(fetchedBoard, loadBoardFilters(payload.board.id));

        break;
      }
      case ActionTypes.BOARD_FETCH__FAILURE:
        Board.withId(payload.id).update({
          isFetching: null,
        });

        break;
      case ActionTypes.BOARD_UPDATE:
        Board.withId(payload.id).update(payload.data);

        break;
      case ActionTypes.BOARD_DELETE:
        Board.withId(payload.id).deleteWithRelated();

        break;
      case ActionTypes.BOARD_DELETE__SUCCESS:
      case ActionTypes.BOARD_DELETE_HANDLE: {
        const boardModel = Board.withId(payload.board.id);

        if (boardModel) {
          boardModel.deleteWithRelated();
        }

        break;
      }
      case ActionTypes.LABEL_TO_BOARD_FILTER_ADD: {
        const boardWithAddedLabel = Board.withId(payload.boardId);
        boardWithAddedLabel.filterLabels.add(payload.id);
        this.saveFilters(boardWithAddedLabel);

        break;
      }
      case ActionTypes.LABEL_FROM_BOARD_FILTER_REMOVE: {
        const boardWithRemovedLabel = Board.withId(payload.boardId);
        boardWithRemovedLabel.filterLabels.remove(payload.id);
        this.saveFilters(boardWithRemovedLabel);

        break;
      }
      case ActionTypes.UNREAD_FILTER_IN_CURRENT_BOARD_UPDATE: {
        const board = Board.withId(payload.boardId);

        board.update({
          isUnreadFilterEnabled: payload.isEnabled,
        });

        this.saveFilters(board);

        break;
      }
      case ActionTypes.TEXT_FILTER_IN_CURRENT_BOARD: {
        const board = Board.withId(payload.boardId);
        let filterText = payload.text;
        const posSpace = filterText.indexOf(' ');

        // Shortcut to user filters
        const posAT = filterText.indexOf('@');
        if (posAT >= 0 && posSpace > 0 && posAT < posSpace) {
          const userId = User.findUsersFromText(
            filterText.substring(posAT + 1, posSpace),
            board.memberships.toModelArray().map((membership) => membership.user),
          );
          if (
            userId &&
            board.filterUsers.toModelArray().filter((user) => user.id === userId).length === 0
          ) {
            board.filterUsers.add(userId);
            filterText = filterText.substring(0, posAT);
          }
        }

        // Shortcut to label filters
        const posSharp = filterText.indexOf('#');
        if (posSharp >= 0 && posSpace > 0 && posSharp < posSpace) {
          const labelId = Label.findLabelsFromText(
            filterText.substring(posSharp + 1, posSpace),
            board.labels.toModelArray(),
          );
          if (
            labelId &&
            board.filterLabels.toModelArray().filter((label) => label.id === labelId).length === 0
          ) {
            board.filterLabels.add(labelId);
            filterText = filterText.substring(0, posSharp);
          }
        }

        board.update({ filterText });
        this.saveFilters(board);

        break;
      }
      default:
    }
  }

  getOrderedMembershipsQuerySet() {
    return this.memberships.orderBy('createdAt');
  }

  getOrderedLabelsQuerySet() {
    return this.labels.orderBy('position');
  }

  getOrderedListsQuerySet() {
    return this.lists.orderBy('position');
  }

  getMembershipModelForUser(userId) {
    return this.memberships
      .filter({
        userId,
      })
      .first();
  }

  hasMembershipForUser(userId) {
    return this.memberships
      .filter({
        userId,
      })
      .exists();
  }

  isAvailableForUser(userId) {
    return (
      this.project && (this.project.hasManagerForUser(userId) || this.hasMembershipForUser(userId))
    );
  }

  deleteRelated(exceptMemberUserId) {
    this.memberships.toModelArray().forEach((boardMembershipModel) => {
      if (boardMembershipModel.userId !== exceptMemberUserId) {
        boardMembershipModel.deleteWithRelated();
      }
    });

    this.labels.delete();

    this.lists.toModelArray().forEach((listModel) => {
      listModel.deleteWithRelated();
    });
  }

  deleteWithRelated() {
    this.deleteRelated();
    this.delete();
  }
}
