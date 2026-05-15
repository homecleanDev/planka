import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import selectors from '../selectors';
import entryActions from '../entry-actions';
import { BoardMembershipRoles } from '../constants/Enums';
import List from '../components/List';

const makeMapStateToProps = () => {
  const selectListById = selectors.makeSelectListById();
  const selectCardIdsByListId = selectors.makeSelectCardIdsByListId();
  const selectAllCardIdsByListId = selectors.makeSelectAllCardIdsByListId();
  const selectCardById = selectors.makeSelectCardById();

  return (state, { id, index }) => {
    const { name, isPersisted } = selectListById(state, id);
    const cardIds = selectCardIdsByListId(state, id);
    const allCardIds = selectAllCardIdsByListId(state, id);
    const currentUserMembership = selectors.selectCurrentUserMembershipForCurrentBoard(state);
    const isCurrentUserManager = selectors.selectIsCurrentUserManagerForCurrentProject(state);
    const currentProject = selectors.selectCurrentProject(state);
    const filterText = selectors.selectFilterTextForCurrentBoard(state);
    const lastCardId = allCardIds.length > 0 ? allCardIds[allCardIds.length - 1] : null;
    const lastCard = lastCardId ? selectCardById(state, lastCardId) : null;

    const isCurrentUserEditor =
      !!currentUserMembership && currentUserMembership.role === BoardMembershipRoles.EDITOR;

    return {
      id,
      index,
      name,
      isPersisted,
      cardIds,
      canEdit: isCurrentUserEditor,
      isCurrentUserManager,
      memberCardDeletionEnabled: currentProject?.member_card_deletion_enabled || false,
      lastCardPosition: lastCard ? lastCard.position : null,
      filterText,
    };
  };
};

const mapDispatchToProps = (dispatch, { id }) =>
  bindActionCreators(
    {
      onUpdate: (data) => entryActions.updateList(id, data),
      onSort: (data) => entryActions.sortList(id, data),
      onDelete: () => entryActions.deleteList(id),
      onCardCreate: (data, autoOpen) => entryActions.createCard(id, data, autoOpen),
      onCardsFetch: (cursor, limit) => entryActions.fetchListCards(id, cursor, limit),
    },
    dispatch,
  );

export default connect(makeMapStateToProps, mapDispatchToProps)(List);
