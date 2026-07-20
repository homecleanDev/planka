import upperFirst from 'lodash/upperFirst';
import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import differenceInCalendarDays from 'date-fns/differenceInCalendarDays';

import getDateFormat from '../../utils/get-date-format';

import styles from './DueDate.module.scss';

const SIZES = {
  TINY: 'tiny',
  SMALL: 'small',
  MEDIUM: 'medium',
};

const LONG_DATE_FORMAT_BY_SIZE = {
  tiny: 'longDate',
  small: 'longDate',
  medium: 'longDateTime',
};

const FULL_DATE_FORMAT_BY_SIZE = {
  tiny: 'fullDate',
  small: 'fullDate',
  medium: 'fullDateTime',
};

const DueDate = React.memo(({ value, size, isDisabled, onClick }) => {
  const [t] = useTranslation();
  const daysOverdue = differenceInCalendarDays(new Date(), value);

  const dateFormat = getDateFormat(
    value,
    LONG_DATE_FORMAT_BY_SIZE[size],
    FULL_DATE_FORMAT_BY_SIZE[size],
  );

  let content;

  if (daysOverdue === -1) {
    content = t('common.dueTomorrow');
  } else if (daysOverdue >= -5 && daysOverdue < 0) {
    content = t('common.dueInDays', {
      count: Math.abs(daysOverdue),
    });
  } else if (daysOverdue === 0) {
    content = t('common.dueToday');
  } else if (daysOverdue === 1) {
    content = t('common.oneDayOverdue');
  } else if (daysOverdue > 1) {
    content = t('common.daysOverdue', {
      count: daysOverdue,
    });
  } else {
    content = t(`format:${dateFormat}`, {
      value,
      postProcess: 'formatDate',
    });
  }

  const contentNode = (
    <span
      className={classNames(
        styles.wrapper,
        styles[`wrapper${upperFirst(size)}`],
        daysOverdue < 0 && styles.wrapperDueSoon,
        daysOverdue === 0 && styles.wrapperDueToday,
        daysOverdue > 0 && styles.wrapperOverdue,
        onClick && styles.wrapperHoverable,
      )}
    >
      {content}
    </span>
  );

  return onClick ? (
    <button type="button" disabled={isDisabled} className={styles.button} onClick={onClick}>
      {contentNode}
    </button>
  ) : (
    contentNode
  );
});

DueDate.propTypes = {
  value: PropTypes.instanceOf(Date).isRequired,
  size: PropTypes.oneOf(Object.values(SIZES)),
  isDisabled: PropTypes.bool,
  onClick: PropTypes.func,
};

DueDate.defaultProps = {
  size: SIZES.MEDIUM,
  isDisabled: false,
  onClick: undefined,
};

export default DueDate;
