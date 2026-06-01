import { connect } from 'react-redux';

import selectors from '../selectors';
import Static from '../components/Static';

const mapStateToProps = (state) => {
  const { cardId, projectId } = selectors.selectPath(state);
  const currentBoard = selectors.selectCurrentBoard(state);
  const isCardResolving = selectors.selectIsCardPathResolving(state);

  return {
    projectId,
    cardId,
    board: currentBoard,
    isCardResolving,
  };
};

export default connect(mapStateToProps)(Static);
