import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Menu } from 'semantic-ui-react';
import { Popup } from '../../lib/custom-ui';
import { DueDateFilterTypes } from '../../constants/Enums';

import styles from './DueDateFilterStep.module.scss';

const DueDateFilterStep = React.memo(({ onSelect, onBack }) => {
  const [t] = useTranslation();

  return (
    <>
      <Popup.Header onBack={onBack}>{t('common.dueDateFilter')}</Popup.Header>
      <Popup.Content>
        <Menu secondary vertical className={styles.menu}>
          <Menu.Item className={styles.menuItem} onClick={() => onSelect(null)}>
            {t('common.all')}
          </Menu.Item>
          <Menu.Item
            className={styles.menuItem}
            onClick={() => onSelect(DueDateFilterTypes.OVERDUE)}
          >
            {t('common.overdue')}
          </Menu.Item>
          <Menu.Item className={styles.menuItem} onClick={() => onSelect(DueDateFilterTypes.TODAY)}>
            {t('common.dueToday')}
          </Menu.Item>
          <Menu.Item
            className={styles.menuItem}
            onClick={() => onSelect(DueDateFilterTypes.ON_TIME)}
          >
            {t('common.onTime')}
          </Menu.Item>
        </Menu>
      </Popup.Content>
    </>
  );
});

DueDateFilterStep.propTypes = {
  onSelect: PropTypes.func.isRequired,
  onBack: PropTypes.func,
};

DueDateFilterStep.defaultProps = {
  onBack: undefined,
};

export default DueDateFilterStep;
