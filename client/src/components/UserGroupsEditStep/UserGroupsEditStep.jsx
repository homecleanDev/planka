import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Menu } from 'semantic-ui-react';
import { Input, Popup } from '../../lib/custom-ui';

import { useField } from '../../hooks';
import styles from './UserGroupsEditStep.module.scss';

const UserGroupsEditStep = React.memo(({ groups, currentGroupIds, onUpdate, onBack }) => {
  const [t] = useTranslation();
  const [search, handleSearchChange] = useField('');
  const cleanSearch = useMemo(() => search.trim().toLowerCase(), [search]);

  const filteredGroups = useMemo(
    () => groups.filter((group) => group.name.toLowerCase().includes(cleanSearch)),
    [groups, cleanSearch],
  );

  const searchField = useRef(null);

  const handleToggle = useCallback(
    (groupId) => {
      const nextGroupIds = currentGroupIds.includes(groupId)
        ? currentGroupIds.filter((id) => id !== groupId)
        : [...currentGroupIds, groupId];

      onUpdate({
        groupIds: nextGroupIds,
      });
    },
    [currentGroupIds, onUpdate],
  );

  useEffect(() => {
    searchField.current.focus({
      preventScroll: true,
    });
  }, []);

  return (
    <>
      <Popup.Header onBack={onBack}>
        {t('common.editGroup', {
          context: 'title',
        })}
      </Popup.Header>
      <Popup.Content>
        <Input
          fluid
          ref={searchField}
          value={search}
          placeholder={t('common.groups')}
          icon="search"
          onChange={handleSearchChange}
        />
        {filteredGroups.length > 0 && (
          <Menu secondary vertical className={styles.menu}>
            {filteredGroups.map((group) => (
              <Menu.Item
                key={group.id}
                active={currentGroupIds.includes(group.id)}
                className={styles.menuItem}
                onClick={() => handleToggle(group.id)}
              >
                {group.name}
              </Menu.Item>
            ))}
          </Menu>
        )}
      </Popup.Content>
    </>
  );
});

UserGroupsEditStep.propTypes = {
  groups: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  currentGroupIds: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  onUpdate: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
};

export default UserGroupsEditStep;
