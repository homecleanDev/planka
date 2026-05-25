import { dequal } from 'dequal';
import React, { useCallback, useImperativeHandle, useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Button, Form } from 'semantic-ui-react';
import RichTextEditor from '../../RichTextEditor';

import { useForm } from '../../../hooks';

import styles from './CommentEdit.module.scss';

const CommentEdit = React.forwardRef(
  ({ children, defaultData, onUpdate, boardMemberships, onImageUpload }, ref) => {
    const [t] = useTranslation();
    const [isOpened, setIsOpened] = useState(false);
    const [data, handleFieldChange, setData] = useForm(null);

    const open = useCallback(() => {
      setIsOpened(true);
      setData({
        text: '',
        ...defaultData,
      });
    }, [defaultData, setData]);

    const close = useCallback(() => {
      setIsOpened(false);
      setData(null);
    }, [setData]);

    const submit = useCallback(() => {
      const cleanData = {
        ...data,
        text: data.text.trim(),
      };

      if (cleanData.text && !dequal(cleanData, defaultData)) {
        onUpdate(cleanData);
      }

      close();
    }, [defaultData, onUpdate, data, close]);

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
      <Form onSubmit={handleSubmit}>
        <RichTextEditor
          value={data.text}
          autofocus
          boardMemberships={boardMemberships}
          className={styles.field}
          onKeyDown={handleFieldKeyDown}
          onChange={(value) => handleFieldChange(null, { name: 'text', value })}
          onImageUpload={onImageUpload}
        />
        <div className={styles.controls}>
          <Button positive content={t('action.save')} />
          <Button type="button" content="Cancel" onClick={close} />
        </div>
      </Form>
    );
  },
);

CommentEdit.propTypes = {
  children: PropTypes.element.isRequired,
  defaultData: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  onUpdate: PropTypes.func.isRequired,
  boardMemberships: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  onImageUpload: PropTypes.func,
};

CommentEdit.defaultProps = {
  onImageUpload: undefined,
};

export default React.memo(CommentEdit);
