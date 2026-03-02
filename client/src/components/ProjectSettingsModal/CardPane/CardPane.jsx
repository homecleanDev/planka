import { dequal } from 'dequal';
import { nanoid } from 'nanoid';
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Button, Form, Icon, Input } from 'semantic-ui-react';
import { useTranslation } from 'react-i18next';

import styles from './CardPane.module.scss';

const CardPane = React.memo(({ defaultFields, onUpdate }) => {
  const [t] = useTranslation();
  const [fields, setFields] = useState(() => defaultFields || []);
  const [newFieldName, setNewFieldName] = useState('');

  useEffect(() => {
    setFields(defaultFields || []);
  }, [defaultFields]);

  const normalizedFields = useMemo(
    () =>
      fields.map((field) => ({
        ...field,
        name: (field.name || '').trim(),
      })),
    [fields],
  );

  const normalizedDefaultFields = useMemo(
    () =>
      (defaultFields || []).map((field) => ({
        ...field,
        name: (field.name || '').trim(),
      })),
    [defaultFields],
  );

  const handleFieldNameChange = useCallback((id, value) => {
    setFields((prev) =>
      prev.map((field) => (field.id === id ? { ...field, name: value } : field)),
    );
  }, []);

  const handleFieldRemove = useCallback((id) => {
    setFields((prev) => prev.filter((field) => field.id !== id));
  }, []);

  const handleNewFieldChange = useCallback((event) => {
    setNewFieldName(event.target.value);
  }, []);

  const handleAddField = useCallback(() => {
    const trimmed = newFieldName.trim();
    if (!trimmed) {
      return;
    }

    const exists = normalizedFields.some(
      (field) => field.name.toLowerCase() === trimmed.toLowerCase(),
    );

    if (exists) {
      return;
    }

    setFields((prev) => [...prev, { id: nanoid(), name: trimmed }]);
    setNewFieldName('');
  }, [newFieldName, normalizedFields]);

  const handleSubmit = useCallback(() => {
    onUpdate({
      cardFields: normalizedFields.filter((field) => field.name),
    });
  }, [onUpdate, normalizedFields]);

  return (
    <Form onSubmit={handleSubmit}>
      <div className={styles.text}>{t('common.cardFields')}</div>
      {fields.map((field) => (
        <div key={field.id} className={styles.fieldRow}>
          <Input
            fluid
            value={field.name}
            placeholder={t('common.enterFieldName')}
            onChange={(event) => handleFieldNameChange(field.id, event.target.value)}
          />
          <Button
            type="button"
            icon
            basic
            className={styles.removeButton}
            onClick={() => handleFieldRemove(field.id)}
          >
            <Icon name="trash" />
          </Button>
        </div>
      ))}
      <div className={styles.addRow}>
        <Input
          fluid
          value={newFieldName}
          placeholder={t('common.enterFieldName')}
          onChange={handleNewFieldChange}
        />
        <Button type="button" onClick={handleAddField} className={styles.addButton}>
          {t('action.addField')}
        </Button>
      </div>
      <Button
        positive
        disabled={dequal(normalizedFields, normalizedDefaultFields)}
        content={t('action.save')}
      />
    </Form>
  );
});

CardPane.propTypes = {
  defaultFields: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  onUpdate: PropTypes.func.isRequired,
};

export default CardPane;
