import { dequal } from 'dequal';
import pickBy from 'lodash/pickBy';
import React, { useCallback, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Button, Form, Input, Checkbox } from 'semantic-ui-react';

import { useForm } from '../../../hooks';

import styles from './InformationEdit.module.scss';

const InformationEdit = React.memo(({ defaultData, onUpdate }) => {
  const [t] = useTranslation();

  const [data, handleFieldChange] = useForm(() => ({
    name: '',
    member_card_deletion_enabled: false,
    ...pickBy(defaultData),
  }));

  const handleCheckboxChange = useCallback((e, { checked }) => {
    console.log('checked', checked);
    handleFieldChange(e, { name: 'member_card_deletion_enabled', value: checked });
  }, [handleFieldChange]);

  const cleanData = useMemo(
    () => ({
      ...data,
      name: data.name.trim(),
    }),
    [data],
  );

  const nameField = useRef(null);

  const handleSubmit = useCallback(() => {
    if (!cleanData.name) {
      nameField.current.select();
      return;
    }

    onUpdate(cleanData);
  }, [onUpdate, cleanData]);

  return (
    <Form onSubmit={handleSubmit}>
      <div className={styles.text}>{t('common.title')}</div>
      <Input
        fluid
        ref={nameField}
        name="name"
        value={data.name}
        className={styles.field}
        onChange={handleFieldChange}
      />
      <div className={styles.checkbox}>
        <Checkbox
          label="Allow member to delete card or list"
          name="member_card_deletion_enabled"
          checked={data.member_card_deletion_enabled}
          onChange={handleCheckboxChange}
        />
      </div>
      <Button positive disabled={dequal(cleanData, defaultData)} content={t('action.save')} />
    </Form>
  );
});

InformationEdit.propTypes = {
  defaultData: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  onUpdate: PropTypes.func.isRequired,
};

export default InformationEdit;
