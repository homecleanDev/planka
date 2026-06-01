import { call, put, select, take } from 'redux-saga/effects';
import { push } from '../../../lib/redux-router';

import { logout } from './core';
import request from '../request';
import selectors from '../../../selectors';
import actions from '../../../actions';
import api from '../../../api';
import mergeRecords from '../../../utils/merge-records';
import { getAccessToken } from '../../../utils/access-token-storage';
import ActionTypes from '../../../constants/ActionTypes';
import Paths from '../../../constants/Paths';

const mergeCardMemberships = (target, source) => {
  const nextTarget = [...(target || [])];

  (source || []).forEach((sourceRecord) => {
    const isExisting = nextTarget.some(
      (targetRecord) =>
        targetRecord.cardId === sourceRecord.cardId && targetRecord.userId === sourceRecord.userId,
    );

    if (!isExisting) {
      nextTarget.push(sourceRecord);
    }
  });

  return nextTarget;
};

const mergeCardLabels = (target, source) => {
  const nextTarget = [...(target || [])];

  (source || []).forEach((sourceRecord) => {
    const isExisting = nextTarget.some(
      (targetRecord) =>
        targetRecord.cardId === sourceRecord.cardId &&
        targetRecord.labelId === sourceRecord.labelId,
    );

    if (!isExisting) {
      nextTarget.push(sourceRecord);
    }
  });

  return nextTarget;
};

export function* goToRoot() {
  yield put(push(Paths.ROOT));
}

export function* goToProject(projectId) {
  yield put(push(Paths.PROJECTS.replace(':id', projectId)));
}

export function* goToBoard(boardId) {
  yield put(push(Paths.BOARDS.replace(':id', boardId)));
}

export function* goToCard(cardId) {
  yield put(push(Paths.CARDS.replace(':id', cardId)));
}

export function* handleLocationChange() {
  const accessToken = yield call(getAccessToken);

  if (!accessToken) {
    yield call(logout, false);
    return;
  }

  const pathsMatch = yield select(selectors.selectPathsMatch);

  if (!pathsMatch) {
    return;
  }

  switch (pathsMatch.pattern.path) {
    case Paths.LOGIN:
    case Paths.OIDC_CALLBACK:
      yield call(goToRoot);

      return;
    default:
  }

  const isInitializing = yield select(selectors.selectIsInitializing);

  if (isInitializing) {
    yield take(ActionTypes.CORE_INITIALIZE);
  }

  let board;
  let users;
  let projects;
  let boardMemberships;
  let labels;
  let lists;
  let cards;
  let cardMemberships;
  let cardLabels;
  let tasks;
  let attachments;
  let deletedNotifications;

  switch (pathsMatch.pattern.path) {
    case Paths.BOARDS:
    case Paths.CARDS: {
      let currentBoard = yield select(selectors.selectCurrentBoard);
      let currentCard;
      let currentCardMemberships;
      let currentCardLabels;
      let currentCardTasks;
      let currentCardAttachments;

      if (!currentBoard && pathsMatch.pattern.path === Paths.CARDS) {
        try {
          ({
            item: currentCard,
            included: {
              cardMemberships: currentCardMemberships,
              cardLabels: currentCardLabels,
              tasks: currentCardTasks,
              attachments: currentCardAttachments,
            },
          } = yield call(request, api.getCard, pathsMatch.params.id));

          currentBoard = {
            id: currentCard.boardId,
            isFetching: null,
          };
        } catch (error) {} // eslint-disable-line no-empty
      }

      if (currentBoard && currentBoard.isFetching === null) {
        yield put(actions.handleLocationChange.fetchBoard(currentBoard.id));

        try {
          ({
            item: board,
            included: {
              users,
              projects,
              boardMemberships,
              labels,
              lists,
              cards,
              cardMemberships,
              cardLabels,
              tasks,
              attachments,
            },
          } = yield call(request, api.getBoard, currentBoard.id, true));

          cards = mergeRecords(cards, currentCard ? [currentCard] : []);
          cardMemberships = mergeCardMemberships(cardMemberships, currentCardMemberships);
          cardLabels = mergeCardLabels(cardLabels, currentCardLabels);
          tasks = mergeRecords(tasks, currentCardTasks);
          attachments = mergeRecords(attachments, currentCardAttachments);
        } catch (error) {} // eslint-disable-line no-empty
      }

      if (pathsMatch.pattern.path === Paths.CARDS) {
        const notificationIds = yield select(selectors.selectNotificationIdsForCurrentCard);

        if (notificationIds && notificationIds.length > 0) {
          try {
            ({ items: deletedNotifications } = yield call(
              request,
              api.updateNotifications,
              notificationIds,
              {
                isRead: true,
              },
            ));
          } catch (error) {} // eslint-disable-line no-empty
        }
      }

      break;
    }
    default:
  }

  yield put(
    actions.handleLocationChange(
      board,
      users,
      projects,
      boardMemberships,
      labels,
      lists,
      cards,
      cardMemberships,
      cardLabels,
      tasks,
      attachments,
      deletedNotifications,
    ),
  );
}

export default {
  goToRoot,
  goToProject,
  goToBoard,
  goToCard,
  handleLocationChange,
};
