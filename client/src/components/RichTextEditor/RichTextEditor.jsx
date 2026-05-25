import React, { useCallback, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import SimpleMDE from 'react-simplemde-editor';

import RichTextImageModal from '../RichTextImageModal';
import Tag from '../Tag/Tag';
import formatMarkdownImageUrl from '../../utils/format-markdown-image-url';

import styles from './RichTextEditor.module.scss';

const MENTION_REGEX = /(^|\s)@([^\s@]*)$/;

const RichTextEditor = React.memo(
  ({
    value,
    onChange,
    autofocus,
    boardMemberships,
    className,
    placeholder,
    onKeyDown,
    onImageUpload,
  }) => {
    const [isImageModalOpened, setIsImageModalOpened] = useState(false);
    const [mentionState, setMentionState] = useState(null);

    const activeEditor = useRef(null);
    const codeMirror = useRef(null);
    const blurTimeout = useRef(null);
    const wrapper = useRef(null);

    const clearMentionState = useCallback(() => {
      setMentionState(null);
    }, []);

    const syncMentionState = useCallback(
      (editor) => {
        if (!boardMemberships || boardMemberships.length === 0) {
          clearMentionState();
          return;
        }

        const cursor = editor.getCursor();
        const line = editor.getLine(cursor.line);
        const beforeCursor = line.slice(0, cursor.ch);
        const match = beforeCursor.match(MENTION_REGEX);

        if (!match) {
          clearMentionState();
          return;
        }

        const mentionText = match[2].toLowerCase();
        const from = {
          line: cursor.line,
          ch: cursor.ch - mentionText.length - 1,
        };
        const to = {
          line: cursor.line,
          ch: cursor.ch,
        };
        const coords = editor.cursorCoords(cursor, 'page');
        const wrapperRect = wrapper.current?.getBoundingClientRect();

        setMentionState({
          search: mentionText,
          from,
          to,
          top: coords.top - (wrapperRect?.top ?? 0),
          left: coords.right - (wrapperRect?.left ?? 0) + 12,
        });
      },
      [boardMemberships, clearMentionState],
    );

    const handleCodeMirrorInstance = useCallback((instance) => {
      codeMirror.current = instance;
    }, []);

    const handleImageInsert = useCallback((url) => {
      const editor = activeEditor.current;

      if (!editor || !editor.codemirror) {
        return;
      }

      editor.codemirror.replaceSelection(`![image](${formatMarkdownImageUrl(url)})`);
      editor.codemirror.focus();
    }, []);

    const handleMentionSelect = useCallback(
      (user) => {
        if (!codeMirror.current || !mentionState) {
          return;
        }

        const userTag = user.username ?? user.email;
        const mentionText = `[@${userTag}]`;

        codeMirror.current.replaceRange(mentionText, mentionState.from, mentionState.to);
        codeMirror.current.focus();
        codeMirror.current.setCursor({
          line: mentionState.from.line,
          ch: mentionState.from.ch + mentionText.length,
        });

        clearMentionState();
      },
      [mentionState, clearMentionState],
    );

    const events = useMemo(
      () => ({
        cursorActivity: (editor) => {
          syncMentionState(editor);
        },
        keyup: (editor, event) => {
          if (event.key === 'Escape') {
            clearMentionState();
            return;
          }

          syncMentionState(editor);
        },
        focus: (editor) => {
          if (blurTimeout.current) {
            clearTimeout(blurTimeout.current);
            blurTimeout.current = null;
          }

          syncMentionState(editor);
        },
        blur: () => {
          blurTimeout.current = setTimeout(() => {
            clearMentionState();
            blurTimeout.current = null;
          }, 150);
        },
      }),
      [clearMentionState, syncMentionState],
    );

    const mergedOptions = useMemo(
      () => ({
        spellChecker: false,
        status: false,
        autofocus,
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
      [autofocus],
    );

    return (
      <div ref={wrapper} className={styles.wrapper}>
        <SimpleMDE
          value={value}
          options={mergedOptions}
          events={events}
          placeholder={placeholder}
          className={className}
          onKeyDown={onKeyDown}
          onChange={onChange}
          getCodemirrorInstance={handleCodeMirrorInstance}
        />
        {mentionState && (
          <div
            className={styles.mentions}
            style={{
              top: mentionState.top,
              left: mentionState.left,
            }}
          >
            <Tag
              search={mentionState.search}
              boardMemberships={boardMemberships}
              handleUserSelect={handleMentionSelect}
            />
          </div>
        )}
        <RichTextImageModal
          isOpen={isImageModalOpened}
          onClose={() => setIsImageModalOpened(false)}
          onInsert={handleImageInsert}
          onUpload={onImageUpload}
        />
      </div>
    );
  },
);

RichTextEditor.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  autofocus: PropTypes.bool,
  boardMemberships: PropTypes.array, // eslint-disable-line react/forbid-prop-types
  className: PropTypes.string,
  placeholder: PropTypes.string,
  onKeyDown: PropTypes.func,
  onImageUpload: PropTypes.func,
};

RichTextEditor.defaultProps = {
  autofocus: false,
  boardMemberships: undefined,
  className: undefined,
  placeholder: undefined,
  onKeyDown: undefined,
  onImageUpload: undefined,
};

export default RichTextEditor;
