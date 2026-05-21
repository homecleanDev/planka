import React, { useCallback, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import TextareaAutosize from 'react-textarea-autosize';
import { Button, Form, TextArea } from 'semantic-ui-react';
import SimpleMDE from 'react-simplemde-editor';
import RichTextImageModal from '../../RichTextImageModal';
import formatMarkdownImageUrl from '../../../utils/format-markdown-image-url';

import styles from './CommentAdd.module.scss';

const DEFAULT_TEXT = '';

const CommentAdd = React.memo(({ onCreate, onImageUpload }) => {
  const [t] = useTranslation();
  const [isOpened, setIsOpened] = useState(false);
  const [isImageModalOpened, setIsImageModalOpened] = useState(false);
  const [text, setText] = useState(DEFAULT_TEXT);
  const activeEditor = useRef(null);

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

  const handleImageInsert = useCallback((url) => {
    const editor = activeEditor.current;
    if (!editor || !editor.codemirror) {
      return;
    }

    editor.codemirror.replaceSelection(`![image](${formatMarkdownImageUrl(url)})`);
    editor.codemirror.focus();
  }, []);

  const mdEditorOptions = useMemo(
    () => ({
      autofocus: false,
      spellChecker: false,
      status: false,
      toolbar: [
        'bold',
        'italic',
        'heading',
        'strikethrough',
        '|',
        'quote',
        'unordered-list',
        'ordered-list',
        'table',
        '|',
        'link',
        {
          name: 'image',
          action: (editor) => {
            activeEditor.current = editor;
            setIsImageModalOpened(true);
          },
          className: 'fa fa-image',
          title: 'Insert Image',
        },
        '|',
        'undo',
        'redo',
        '|',
        'guide',
      ],
    }),
    [],
  );

  return (
    <Form onSubmit={handleSubmit}>
      {isOpened ? (
        <SimpleMDE
          value={text}
          options={mdEditorOptions}
          placeholder={t('common.writeComment')}
          className={styles.field}
          onKeyDown={handleFieldKeyDown}
          onChange={setText}
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
      <RichTextImageModal
        isOpen={isImageModalOpened}
        onClose={() => setIsImageModalOpened(false)}
        onInsert={handleImageInsert}
        onUpload={onImageUpload}
      />
    </Form>
  );
});

CommentAdd.propTypes = {
  onCreate: PropTypes.func.isRequired,
  onImageUpload: PropTypes.func,
};

CommentAdd.defaultProps = {
  onImageUpload: undefined,
};

export default CommentAdd;
