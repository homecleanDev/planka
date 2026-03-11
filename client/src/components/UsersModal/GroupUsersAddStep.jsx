import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { Icon, Menu } from 'semantic-ui-react';
import { Input, Popup } from '../../lib/custom-ui';

import { useField } from '../../hooks';
import User from '../User';

import styles from './GroupUsersAddStep.module.scss';

const GroupUsersAddStep = React.memo(({ groupName, users, currentUserIds, onUserAdd }) => {
  const [t] = useTranslation();
  const [search, handleSearchChange] = useField('');
  const cleanSearch = useMemo(() => search.trim().toLowerCase(), [search]);
  const searchField = useRef(null);
  const handleContentMouseDown = useCallback((event) => {
    event.stopPropagation();
  }, []);

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (user) =>
          user.email.includes(cleanSearch) ||
          user.name.toLowerCase().includes(cleanSearch) ||
          (user.username && user.username.includes(cleanSearch)),
      ),
    [users, cleanSearch],
  );

  const handleUserMouseDown = useCallback(
    (event, userId) => {
      event.preventDefault();
      event.stopPropagation();

      if (!currentUserIds.includes(userId)) {
        onUserAdd(userId);
      }
    },
    [currentUserIds, onUserAdd],
  );
  const handleUserClick = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  useEffect(() => {
    searchField.current.focus({
      preventScroll: true,
    });
  }, []);

  return (
    <>
      <Popup.Header>
        {t('action.addUser')} {groupName}
      </Popup.Header>
      <Popup.Content onMouseDown={handleContentMouseDown}>
        <Input
          fluid
          ref={searchField}
          value={search}
          placeholder={t('common.searchUsers')}
          icon="search"
          onChange={handleSearchChange}
        />
        {filteredUsers.length > 0 && (
          <Menu secondary vertical className={styles.menu}>
            {filteredUsers.map((user) => {
              const isActive = currentUserIds.includes(user.id);

              return (
                <Menu.Item
                  key={user.id}
                  className={classNames(styles.menuItem, isActive && styles.menuItemActive)}
                  onMouseDown={(event) => handleUserMouseDown(event, user.id)}
                  onClick={handleUserClick}
                >
                  <span className={styles.user}>
                    <User name={user.name} avatarUrl={user.avatarUrl} />
                  </span>
                  <span className={styles.menuItemText}>{user.name}</span>
                  {isActive && <Icon name="check" className={styles.check} />}
                </Menu.Item>
              );
            })}
          </Menu>
        )}
      </Popup.Content>
    </>
  );
});

GroupUsersAddStep.propTypes = {
  groupName: PropTypes.string.isRequired,
  users: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  currentUserIds: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  onUserAdd: PropTypes.func.isRequired,
};

export default GroupUsersAddStep;
