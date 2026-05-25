import React, { useCallback, useImperativeHandle, useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Button, Form } from 'semantic-ui-react';
import RichTextEditor from '../../RichTextEditor';

import styles from './Add.module.scss';

const DEFAULT_DATA = {
  name: '',
};

const Add = React.forwardRef(({ children, onCreate, boardMemberships, onImageUpload }, ref) => {
  const [t] = useTranslation();
  const [isOpened, setIsOpened] = useState(false);
  const [data, setData] = useState(DEFAULT_DATA);

  const open = useCallback(() => {
    setIsOpened(true);
  }, []);

  const close = useCallback(() => {
    setIsOpened(false);
  }, []);

  const submit = useCallback(() => {
    const cleanData = {
      ...data,
      name: data.name.trim(),
    };

    if (!cleanData.name) {
      return;
    }

    onCreate(cleanData);

    setData(DEFAULT_DATA);
  }, [onCreate, data]);

  useImperativeHandle(
    ref,
    () => ({
      open,
      close,
    }),
    [open, close],
  );

  const handleChildrenClick = useCallback(() => {
    open();
  }, [open]);

  const handleSubmit = useCallback(() => {
    submit();
  }, [submit]);

  const handleFieldKeyDown = useCallback(
    (event) => {
      if (event.ctrlKey && event.key === 'Enter') {
        submit();
      }
    },
    [submit],
  );

  if (!isOpened) {
    return React.cloneElement(children, {
      onClick: handleChildrenClick,
    });
  }

  return (
    <Form className={styles.wrapper} onSubmit={handleSubmit}>
      <RichTextEditor
        value={data.name}
        autofocus
        boardMemberships={boardMemberships}
        placeholder={t('common.enterTaskDescription')}
        className={styles.field}
        onKeyDown={handleFieldKeyDown}
        onChange={(value) => setData({ name: value })}
        onImageUpload={onImageUpload}
      />
      <div className={styles.controls}>
        <Button positive content={t('action.addTask')} />
      </div>
    </Form>
  );
});

Add.propTypes = {
  children: PropTypes.element.isRequired,
  onCreate: PropTypes.func.isRequired,
  boardMemberships: PropTypes.array, // eslint-disable-line react/forbid-prop-types
  onImageUpload: PropTypes.func,
};

Add.defaultProps = {
  boardMemberships: undefined,
  onImageUpload: undefined,
};

export default React.memo(Add);
