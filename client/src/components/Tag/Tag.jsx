import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import styles from './Tag.module.scss';
import UserItem from '../Memberships/AddStep/UserItem';

export const TagRegex = /(^|\s)@/gi;

export const filterTagUsers = (boardMemberships, search) => {
  const cleanSearch = search.trim().toLowerCase();

  return boardMemberships.filter(
    (member) =>
      member.user.email.toLowerCase().includes(cleanSearch) ||
      member.user.name.toLowerCase().includes(cleanSearch) ||
      (member.user.username && member.user.username.toLowerCase().includes(cleanSearch)),
  );
};

const Tag = React.memo(({ search, boardMemberships, activeIndex, handleUserSelect }) => {
  const filteredUsers = useMemo(
    () => filterTagUsers(boardMemberships, search),
    [boardMemberships, search],
  );

  return (
    <div className={classNames(styles.container)}>
      {filteredUsers.map((member, index) => {
        const handleMouseDown = (event) => {
          event.preventDefault();
          handleUserSelect(member.user);
        };

        return (
          <UserItem
            isActive={false}
            isHighlighted={index === activeIndex}
            key={member.user.id}
            name={member.user.name}
            avatarUrl={member.user.avatarUrl}
            onMouseDown={handleMouseDown}
            onSelect={() => handleUserSelect(member.user)}
          />
        );
      })}
    </div>
  );
});

Tag.defaultProps = {
  search: '',
  activeIndex: 0,
};

Tag.propTypes = {
  search: PropTypes.string,
  boardMemberships: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  activeIndex: PropTypes.number,
  handleUserSelect: PropTypes.func.isRequired,
};

export default Tag;
