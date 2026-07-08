import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import User from '../../User';

import styles from './UserItem.module.scss';

const UserItem = React.memo(
  ({ name, avatarUrl, isActive, isHighlighted, onMouseDown, onSelect }) => (
    <button
      type="button"
      disabled={isActive}
      className={classNames(styles.menuItem, isHighlighted && styles.menuItemHighlighted)}
      onMouseDown={onMouseDown}
      onClick={onSelect}
    >
      <span className={styles.user}>
        <User name={name} avatarUrl={avatarUrl} />
      </span>
      <div className={classNames(styles.menuItemText, isActive && styles.menuItemTextActive)}>
        {name}
      </div>
    </button>
  ),
);

UserItem.propTypes = {
  name: PropTypes.string.isRequired,
  avatarUrl: PropTypes.string,
  isActive: PropTypes.bool.isRequired,
  isHighlighted: PropTypes.bool,
  onMouseDown: PropTypes.func,
  onSelect: PropTypes.func.isRequired,
};

UserItem.defaultProps = {
  avatarUrl: undefined,
  isHighlighted: false,
  onMouseDown: undefined,
};

export default UserItem;
