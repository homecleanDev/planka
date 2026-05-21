import React, { useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Button, Form } from 'semantic-ui-react';
import SimpleMDE from 'react-simplemde-editor';
import RichTextImageModal from '../../RichTextImageModal';
import formatMarkdownImageUrl from '../../../utils/format-markdown-image-url';

import styles from './NameEdit.module.scss';

const NameEdit = React.forwardRef(({ children, defaultValue, onUpdate, onImageUpload }, ref) => {
  const [t] = useTranslation();
  const [isOpened, setIsOpened] = useState(false);
  const [isImageModalOpened, setIsImageModalOpened] = useState(false);
  const [value, setValue] = useState(null);
  const activeEditor = useRef(null);

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
      autofocus: true,
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

  if (!isOpened) {
    return children;
  }

  return (
    <Form onSubmit={handleSubmit} className={styles.wrapper}>
      <SimpleMDE
        value={value}
        options={mdEditorOptions}
        className={styles.field}
        onKeyDown={handleFieldKeyDown}
        onChange={setValue}
      />
      <div className={styles.controls}>
        <Button positive content={t('action.save')} />
      </div>
      <RichTextImageModal
        isOpen={isImageModalOpened}
        onClose={() => setIsImageModalOpened(false)}
        onInsert={handleImageInsert}
        onUpload={onImageUpload}
      />
    </Form>
  );
});

NameEdit.propTypes = {
  children: PropTypes.element.isRequired,
  defaultValue: PropTypes.string.isRequired,
  onUpdate: PropTypes.func.isRequired,
  onImageUpload: PropTypes.func,
};

NameEdit.defaultProps = {
  onImageUpload: undefined,
};

export default React.memo(NameEdit);
