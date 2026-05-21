import React, { useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Button, Form } from 'semantic-ui-react';
import SimpleMDE from 'react-simplemde-editor';
import RichTextImageModal from '../../RichTextImageModal';
import formatMarkdownImageUrl from '../../../utils/format-markdown-image-url';

import styles from './Add.module.scss';

const DEFAULT_DATA = {
  name: '',
};

const Add = React.forwardRef(({ children, onCreate, onImageUpload }, ref) => {
  const [t] = useTranslation();
  const [isOpened, setIsOpened] = useState(false);
  const [isImageModalOpened, setIsImageModalOpened] = useState(false);
  const [data, setData] = useState(DEFAULT_DATA);
  const activeEditor = useRef(null);

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
      <SimpleMDE
        value={data.name}
        options={mdEditorOptions}
        placeholder={t('common.enterTaskDescription')}
        className={styles.field}
        onKeyDown={handleFieldKeyDown}
        onChange={(value) => setData({ name: value })}
      />
      <div className={styles.controls}>
        <Button positive content={t('action.addTask')} />
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

Add.propTypes = {
  children: PropTypes.element.isRequired,
  onCreate: PropTypes.func.isRequired,
  onImageUpload: PropTypes.func,
};

Add.defaultProps = {
  onImageUpload: undefined,
};

export default React.memo(Add);
