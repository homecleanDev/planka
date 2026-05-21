import React, { useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Button, Form } from 'semantic-ui-react';
import SimpleMDE from 'react-simplemde-editor';

import RichTextImageModal from '../RichTextImageModal';
import formatMarkdownImageUrl from '../../utils/format-markdown-image-url';
import styles from './DescriptionEdit.module.scss';

const DescriptionEdit = React.forwardRef(
  ({ children, defaultValue, onUpdate, placeholder, onImageUpload }, ref) => {
    const [t] = useTranslation();
    const [isOpened, setIsOpened] = useState(false);
    const [isImageModalOpened, setIsImageModalOpened] = useState(false);
    const [value, setValue] = useState(null);

    const activeEditor = useRef(null);

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
      return React.cloneElement(children, {
        onClick: handleChildrenClick,
      });
    }

    return (
      <Form onSubmit={handleSubmit}>
        <SimpleMDE
          value={value}
          options={mdEditorOptions}
          placeholder={placeholder || t('common.enterDescription')}
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
  },
);

DescriptionEdit.propTypes = {
  children: PropTypes.element.isRequired,
  defaultValue: PropTypes.string,
  onUpdate: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  onImageUpload: PropTypes.func,
};

DescriptionEdit.defaultProps = {
  defaultValue: undefined,
  placeholder: undefined,
  onImageUpload: undefined,
};

export default React.memo(DescriptionEdit);
