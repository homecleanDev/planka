import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import TextareaAutosize from 'react-textarea-autosize';
import { Button, Form, TextArea } from 'semantic-ui-react';
import RichTextEditor from '../../RichTextEditor';

import styles from './CommentAdd.module.scss';

const DEFAULT_TEXT = '';

const CommentAdd = React.memo(({ onCreate, boardMemberships, onImageUpload }) => {
  const [t] = useTranslation();
  const [isOpened, setIsOpened] = useState(false);
  const [text, setText] = useState(DEFAULT_TEXT);

  const close = useCallback(() => {
    setIsOpened(false);
  }, []);

  const submit = useCallback(() => {
    const cleanText = text.trim();

    if (!cleanText) {
      return;
    }

    onCreate({
      text: cleanText,
    });

    setText(DEFAULT_TEXT);
    close();
  }, [onCreate, text, close]);

  const handleFieldFocus = useCallback(() => {
    setIsOpened(true);
  }, []);

  const handleFieldKeyDown = useCallback(
    (ev) => {
      if (ev.ctrlKey && ev.key === 'Enter') {
        submit();
      }
    },
    [submit],
  );

  const handleSubmit = useCallback(() => {
    submit();
  }, [submit]);

  return (
    <Form onSubmit={handleSubmit}>
      {isOpened ? (
        <RichTextEditor
          value={text}
          autofocus={false}
          boardMemberships={boardMemberships}
          placeholder={t('common.writeComment')}
          className={styles.field}
          onKeyDown={handleFieldKeyDown}
          onChange={setText}
          onImageUpload={onImageUpload}
        />
      ) : (
        <TextArea
          as={TextareaAutosize}
          value={text}
          placeholder={t('common.writeComment')}
          minRows={1}
          spellCheck={false}
          className={styles.field}
          onFocus={handleFieldFocus}
          onChange={(_, { value }) => setText(value)}
        />
      )}
      {isOpened && (
        <div className={styles.controls}>
          <Button positive content={t('action.addComment')} onClick={submit} />
          <Button type="button" content="Cancel" onClick={close} />
        </div>
      )}
    </Form>
  );
});

CommentAdd.propTypes = {
  onCreate: PropTypes.func.isRequired,
  boardMemberships: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  onImageUpload: PropTypes.func,
};

CommentAdd.defaultProps = {
  onImageUpload: undefined,
};

export default CommentAdd;
