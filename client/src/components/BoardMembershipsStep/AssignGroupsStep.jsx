import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Menu } from 'semantic-ui-react';
import { Popup } from '../../lib/custom-ui';

import User from '../User';

import styles from './AssignGroupsStep.module.scss';

const AssignGroupsStep = React.memo(({ groups, onGroupSelect }) => {
  const [t] = useTranslation();
  const handleContentMouseDown = React.useCallback((event) => {
    event.stopPropagation();
  }, []);

  const handleItemMouseDown = React.useCallback(
    (event, groupId) => {
      event.preventDefault();
      event.stopPropagation();
      onGroupSelect(groupId);
    },
    [onGroupSelect],
  );

  const handleItemClick = React.useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  return (
    <>
      <Popup.Header>
        {t('action.assignToGroups', {
          defaultValue: 'Assign to groups',
        })}
      </Popup.Header>
      <Popup.Content onMouseDown={handleContentMouseDown}>
        <Menu secondary vertical className={styles.menu}>
          {groups.map((group) => (
            <Menu.Item
              key={group.id}
              className={styles.menuItem}
              onMouseDown={(event) => handleItemMouseDown(event, group.id)}
              onClick={handleItemClick}
            >
              <span className={styles.user}>
                <User name={group.name} size="small" />
              </span>
              <span className={styles.menuItemText}>{group.name}</span>
            </Menu.Item>
          ))}
        </Menu>
      </Popup.Content>
    </>
  );
});

AssignGroupsStep.propTypes = {
  groups: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  onGroupSelect: PropTypes.func.isRequired,
};

export default AssignGroupsStep;
