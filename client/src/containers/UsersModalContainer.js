import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import selectors from '../selectors';
import entryActions from '../entry-actions';
import UsersModal from '../components/UsersModal';

const mapStateToProps = (state) => {
  const oidcConfig = selectors.selectOidcConfig(state);
  const users = selectors.selectUsersExceptCurrent(state);
  const groups = selectors.selectGroups(state);

  return {
    items: users,
    groups,
    canAdd: !oidcConfig || !oidcConfig.isEnforced,
  };
};

const mapDispatchToProps = (dispatch) =>
  bindActionCreators(
    {
      onUpdate: entryActions.updateUser,
      onUsernameUpdate: entryActions.updateUserUsername,
      onUsernameUpdateMessageDismiss: entryActions.clearUserUsernameUpdateError,
      onEmailUpdate: entryActions.updateUserEmail,
      onEmailUpdateMessageDismiss: entryActions.clearUserEmailUpdateError,
      onPasswordUpdate: entryActions.updateUserPassword,
      onPasswordUpdateMessageDismiss: entryActions.clearUserPasswordUpdateError,
      onDelete: entryActions.deleteUser,
      onGroupCreate: entryActions.createGroup,
      onClose: entryActions.closeModal,
    },
    dispatch,
  );

export default connect(mapStateToProps, mapDispatchToProps)(UsersModal);
