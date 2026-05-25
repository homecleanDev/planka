import React, { useCallback, useImperativeHandle, useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Button, Form } from 'semantic-ui-react';
import RichTextEditor from '../RichTextEditor';
import styles from './DescriptionEdit.module.scss';

const DescriptionEdit = React.forwardRef(
  ({ children, defaultValue, onUpdate, placeholder, boardMemberships, onImageUpload }, ref) => {
    const [t] = useTranslation();
    const [isOpened, setIsOpened] = useState(false);
    const [value, setValue] = useState(null);

    const open = useCallback(() => {
      setIsOpened(true);
      setValue(defaultValue || '');
    }, [defaultValue]);

    const close = useCallback(() => {
      const cleanValue = value.trim() || null;

      if (cleanValue !== defaultValue) {
        onUpdate(cleanValue);
      }

      setIsOpened(false);
      setValue(null);
    }, [defaultValue, onUpdate, value]);

    useImperativeHandle(
      ref,
      () => ({
        open,
        close,
      }),
      [open, close],
    );

    const handleChildrenClick = useCallback(() => {
      if (!getSelection().toString()) {
        open();
      }
    }, [open]);

    const handleFieldKeyDown = useCallback(
      (event) => {
        if (event.ctrlKey && event.key === 'Enter') {
          close();
        }
      },
      [close],
    );

    const handleSubmit = useCallback(() => {
      close();
    }, [close]);

    if (!isOpened) {
      return React.cloneElement(children, {
        onClick: handleChildrenClick,
      });
    }

    return (
      <Form onSubmit={handleSubmit}>
        <RichTextEditor
          value={value}
          autofocus
          boardMemberships={boardMemberships}
          placeholder={placeholder || t('common.enterDescription')}
          className={styles.field}
          onKeyDown={handleFieldKeyDown}
          onChange={setValue}
          onImageUpload={onImageUpload}
        />
        <div className={styles.controls}>
          <Button positive content={t('action.save')} />
        </div>
      </Form>
    );
  },
);

DescriptionEdit.propTypes = {
  children: PropTypes.element.isRequired,
  defaultValue: PropTypes.string,
  onUpdate: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  boardMemberships: PropTypes.array, // eslint-disable-line react/forbid-prop-types
  onImageUpload: PropTypes.func,
};

DescriptionEdit.defaultProps = {
  defaultValue: undefined,
  placeholder: undefined,
  boardMemberships: undefined,
  onImageUpload: undefined,
};

export default React.memo(DescriptionEdit);
