import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import selectors from '../selectors';
import entryActions from '../entry-actions';
import ProjectSettingsModal from '../components/ProjectSettingsModal';

const mapStateToProps = (state) => {
  const users = selectors.selectUsers(state);
  const currentUser = selectors.selectCurrentUser(state);
  const boardMemberships = selectors.selectMembershipsForCurrentBoard(state) || [];
  const currentProject = selectors.selectCurrentProject(state);
  const projectsToLists = selectors.selectProjectsToListsForCurrentUser(state) || [];
  const currentProjectToLists =
    currentProject && projectsToLists.find((project) => project.id === currentProject.id);

  const {
    name,
    background,
    backgroundImage,
    isBackgroundImageUpdating,
    member_card_deletion_enabled: memberCardDeletionEnabled,
    cardFields,
    zohoWebhooks,
    zohoConnection,
    zohoWebhookToken,
    zohoWebhookListId,
    zohoWebhookUserIds,
    zohoWebhookCreatorUserId,
  } = selectors.selectCurrentProject(state);

  const managers = selectors.selectManagersForCurrentProject(state);

  return {
    projectId: currentProject?.id,
    name,
    memberCardDeletionEnabled,
    background,
    backgroundImage,
    isBackgroundImageUpdating,
    cardFields: cardFields || [],
    zohoWebhooks:
      zohoWebhooks ||
      (zohoWebhookToken && zohoWebhookListId
        ? [
            {
              id: zohoWebhookToken,
              token: zohoWebhookToken,
              listId: zohoWebhookListId,
              userIds: zohoWebhookUserIds || [],
              creatorUserId: zohoWebhookCreatorUserId || currentUser?.id,
            },
          ]
        : []),
    zohoConnection,
    managers,
    allUsers: users,
    currentUser,
    projectBoards: (currentProjectToLists && currentProjectToLists.boards) || [],
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
