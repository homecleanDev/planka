import React, { useCallback, useImperativeHandle, useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Button, Form } from 'semantic-ui-react';
import RichTextEditor from '../../RichTextEditor';

import styles from './NameEdit.module.scss';

const NameEdit = React.forwardRef(
  ({ children, defaultValue, onUpdate, boardMemberships, onImageUpload }, ref) => {
    const [t] = useTranslation();
    const [isOpened, setIsOpened] = useState(false);
    const [value, setValue] = useState(null);

    const open = useCallback(() => {
      setIsOpened(true);
      setValue(defaultValue);
    }, [defaultValue, setValue]);

    const close = useCallback(() => {
      setIsOpened(false);
      setValue(null);
    }, [setValue]);

    const submit = useCallback(() => {
      const cleanValue = value.trim();

      if (cleanValue && cleanValue !== defaultValue) {
        onUpdate(cleanValue);
      }

      close();
    }, [defaultValue, onUpdate, value, close]);

    useImperativeHandle(
      ref,
      () => ({
        open,
        close,
      }),
      [open, close],
    );

    const handleFieldKeyDown = useCallback(
      (event) => {
        if (event.ctrlKey && event.key === 'Enter') {
          submit();
        }
      },
      [submit],
    );

    const handleSubmit = useCallback(() => {
      submit();
    }, [submit]);

    if (!isOpened) {
      return children;
    }

    return (
      <Form onSubmit={handleSubmit} className={styles.wrapper}>
        <RichTextEditor
          value={value}
          autofocus
          boardMemberships={boardMemberships}
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

NameEdit.propTypes = {
  children: PropTypes.element.isRequired,
  defaultValue: PropTypes.string.isRequired,
  onUpdate: PropTypes.func.isRequired,
  boardMemberships: PropTypes.array, // eslint-disable-line react/forbid-prop-types
  onImageUpload: PropTypes.func,
};

NameEdit.defaultProps = {
  boardMemberships: undefined,
  onImageUpload: undefined,
};

export default React.memo(NameEdit);
