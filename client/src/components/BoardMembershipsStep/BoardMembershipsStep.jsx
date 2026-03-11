import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Menu } from 'semantic-ui-react';
import { Input, Popup } from '../../lib/custom-ui';
import { usePopup } from '../../lib/popup';

import { useField } from '../../hooks';
import AssignGroupsStep from './AssignGroupsStep';
import Item from './Item';

import styles from './BoardMembershipsStep.module.scss';

const BoardMembershipsStep = React.memo(
  ({ items, currentUserIds, title, showGroups, onUserSelect, onUserDeselect, onBack }) => {
    const [t] = useTranslation();
    const [search, handleSearchChange] = useField('');
    const cleanSearch = useMemo(() => search.trim().toLowerCase(), [search]);

    const filteredItems = useMemo(
      () =>
        items.filter(
          ({ user }) =>
            user.email.includes(cleanSearch) ||
            user.name.toLowerCase().includes(cleanSearch) ||
            (user.username && user.username.includes(cleanSearch)),
        ),
      [items, cleanSearch],
    );
    const groups = useMemo(() => {
      const groupById = {};

      items.forEach(({ user }) => {
        (user.groups || []).forEach((group) => {
          groupById[group.id] = group;
        });
      });

      return Object.values(groupById).sort((a, b) => a.name.localeCompare(b.name));
    }, [items]);

    const searchField = useRef(null);
    const AssignGroupsPopup = usePopup(AssignGroupsStep, {
      position: 'right center',
    });

    const handleUserSelect = useCallback(
      (id) => {
        onUserSelect(id);
      },
      [onUserSelect],
    );

    const handleUserDeselect = useCallback(
      (id) => {
        onUserDeselect(id);
      },
      [onUserDeselect],
    );
    const handleGroupSelect = useCallback(
      (groupId) => {
        const currentUserIdsSet = new Set(currentUserIds.map((id) => `${id}`));
        const normalizedGroupId = `${groupId}`;

        items.forEach(({ user }) => {
          const isInGroup = (user.groupIds || []).some((id) => `${id}` === normalizedGroupId);

          if (isInGroup && !currentUserIdsSet.has(`${user.id}`)) {
            onUserSelect(user.id);
          }
        });
      },
      [items, currentUserIds, onUserSelect],
    );

    useEffect(() => {
      searchField.current.focus({
        preventScroll: true,
      });
    }, []);

    return (
      <>
        <Popup.Header onBack={onBack}>
          {t(title, {
            context: 'title',
          })}
        </Popup.Header>
        <Popup.Content>
          <Input
            fluid
            ref={searchField}
            value={search}
            placeholder={t('common.searchMembers')}
            icon="search"
            onChange={handleSearchChange}
          />
          {showGroups && groups.length > 0 && (
            <div className={styles.assignGroups}>
              <AssignGroupsPopup groups={groups} onGroupSelect={handleGroupSelect}>
                <button type="button" className={styles.assignGroupsButton}>
                  {t('action.assignToGroups', {
                    defaultValue: 'Assign to groups',
                  })}
                </button>
              </AssignGroupsPopup>
            </div>
          )}
          {filteredItems.length > 0 && (
            <Menu secondary vertical className={styles.menu}>
              {filteredItems.map((item) => (
                <Item
                  key={item.id}
                  isPersisted={item.isPersisted}
                  isActive={currentUserIds.includes(item.user.id)}
                  user={item.user}
                  onUserSelect={() => handleUserSelect(item.user.id)}
                  onUserDeselect={() => handleUserDeselect(item.user.id)}
                />
              ))}
            </Menu>
          )}
        </Popup.Content>
      </>
    );
  },
);

BoardMembershipsStep.propTypes = {
  /* eslint-disable react/forbid-prop-types */
  items: PropTypes.array.isRequired,
  currentUserIds: PropTypes.array.isRequired,
  /* eslint-enable react/forbid-prop-types */
  title: PropTypes.string,
  showGroups: PropTypes.bool,
  onUserSelect: PropTypes.func.isRequired,
  onUserDeselect: PropTypes.func.isRequired,
  onBack: PropTypes.func,
};

BoardMembershipsStep.defaultProps = {
  title: 'common.members',
  showGroups: false,
  onBack: undefined,
};

export default BoardMembershipsStep;
