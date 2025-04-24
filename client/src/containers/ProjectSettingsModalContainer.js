import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import selectors from '../selectors';
import entryActions from '../entry-actions';
import ProjectSettingsModal from '../components/ProjectSettingsModal';

const mapStateToProps = (state) => {
  const users = selectors.selectUsers(state);

  const { name, background, backgroundImage, isBackgroundImageUpdating, member_card_deletion_enabled } =
    selectors.selectCurrentProject(state);

  const managers = selectors.selectManagersForCurrentProject(state);

  return {
    name,
    member_card_deletion_enabled,
    background,
    backgroundImage,
    isBackgroundImageUpdating,
    managers,
    allUsers: users,
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
