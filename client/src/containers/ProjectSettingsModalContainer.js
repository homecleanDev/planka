import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import selectors from '../selectors';
import entryActions from '../entry-actions';
import ProjectSettingsModal from '../components/ProjectSettingsModal';

const selectListById = selectors.makeSelectListById();

const mapStateToProps = (state) => {
  const users = selectors.selectUsers(state);
  const currentUser = selectors.selectCurrentUser(state);
  const currentBoard = selectors.selectCurrentBoard(state);
  const boardMemberships = selectors.selectMembershipsForCurrentBoard(state) || [];
  const listIds = selectors.selectListIdsForCurrentBoard(state) || [];

  const {
    name,
    background,
    backgroundImage,
    isBackgroundImageUpdating,
    member_card_deletion_enabled: memberCardDeletionEnabled,
    cardFields,
    zohoWebhookToken,
    zohoWebhookListId,
    zohoWebhookUserIds,
  } = selectors.selectCurrentProject(state);

  const managers = selectors.selectManagersForCurrentProject(state);

  return {
    name,
    memberCardDeletionEnabled,
    background,
    backgroundImage,
    isBackgroundImageUpdating,
    cardFields: cardFields || [],
    zohoWebhookToken,
    zohoWebhookListId,
    zohoWebhookUserIds: zohoWebhookUserIds || [],
    managers,
    allUsers: users,
    currentUser,
    currentBoard,
    currentBoardLists: listIds.map((id) => selectListById(state, id)).filter(Boolean),
    currentBoardUsers: boardMemberships.map((membership) => membership.user),
  };
};

const mapDispatchToProps = (dispatch) =>
  bindActionCreators(
    {
      onUpdate: entryActions.updateCurrentProject,
      onBackgroundImageUpdate: entryActions.updateCurrentProjectBackgroundImage,
      onDelete: entryActions.deleteCurrentProject,
      onManagerCreate: entryActions.createManagerInCurrentProject,
      onManagerDelete: entryActions.deleteProjectManager,
      onClose: entryActions.closeModal,
    },
    dispatch,
  );

export default connect(mapStateToProps, mapDispatchToProps)(ProjectSettingsModal);
