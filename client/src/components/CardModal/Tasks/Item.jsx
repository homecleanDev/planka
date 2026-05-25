import React, { useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Draggable } from 'react-beautiful-dnd';
import { Button, Checkbox, Icon } from 'semantic-ui-react';
import { usePopup } from '../../../lib/popup';
import { Markdown } from '../../../lib/custom-ui';

import NameEdit from './NameEdit';
import ActionsStep from './ActionsStep';

import styles from './Item.module.scss';
import replaceMentionsWithName from '../../../utils/replace-mentions-with-name';

const Item = React.memo(
  ({
    id,
    index,
    name,
    isCompleted,
    isPersisted,
    canEdit,
    onUpdate,
    onDelete,
    boardMemberships,
    onImageUpload,
  }) => {
    const nameEdit = useRef(null);
    const taskName = replaceMentionsWithName(name, boardMemberships);

    const handleClick = useCallback(() => {
      if (isPersisted && canEdit) {
        nameEdit.current.open();
      }
    }, [isPersisted, canEdit]);

    const handleNameUpdate = useCallback(
      (newName) => {
        onUpdate({
          name: newName,
        });
      },
      [onUpdate],
    );

    const handleToggleChange = useCallback(() => {
      onUpdate({
        isCompleted: !isCompleted,
      });
    }, [isCompleted, onUpdate]);

    const handleNameEdit = useCallback(() => {
      nameEdit.current.open();
    }, []);

    const ActionsPopup = usePopup(ActionsStep);

    return (
      <Draggable draggableId={id} index={index} isDragDisabled={!isPersisted || !canEdit}>
        {({ innerRef, draggableProps, dragHandleProps }, { isDragging }) => {
          const contentNode = (
            // eslint-disable-next-line react/jsx-props-no-spreading
            <div {...draggableProps} {...dragHandleProps} ref={innerRef} className={styles.wrapper}>
              <span className={styles.checkboxWrapper}>
                <Checkbox
                  checked={isCompleted}
                  disabled={!isPersisted || !canEdit}
                  className={styles.checkbox}
                  onChange={handleToggleChange}
                />
              </span>
              <NameEdit
                ref={nameEdit}
                defaultValue={name}
                onUpdate={handleNameUpdate}
                boardMemberships={boardMemberships}
                onImageUpload={onImageUpload}
              >
                <div className={classNames(canEdit && styles.contentHoverable)}>
                  {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,
                                               jsx-a11y/no-static-element-interactions */}
                  <span
                    className={classNames(styles.text, canEdit && styles.textEditable)}
                    onClick={handleClick}
                  >
                    <span className={classNames(styles.task, isCompleted && styles.taskCompleted)}>
                      <Markdown linkStopPropagation linkTarget="_blank">
                        {taskName}
                      </Markdown>
                    </span>
                  </span>
                  {isPersisted && canEdit && (
                    <ActionsPopup onNameEdit={handleNameEdit} onDelete={onDelete}>
                      <Button className={classNames(styles.button, styles.target)}>
                        <Icon fitted name="pencil" size="small" />
                      </Button>
                    </ActionsPopup>
                  )}
                </div>
              </NameEdit>
            </div>
          );

          return isDragging ? ReactDOM.createPortal(contentNode, document.body) : contentNode;
        }}
      </Draggable>
    );
  },
);

Item.propTypes = {
  id: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
  isCompleted: PropTypes.bool.isRequired,
  isPersisted: PropTypes.bool.isRequired,
  canEdit: PropTypes.bool.isRequired,
  onUpdate: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  boardMemberships: PropTypes.array, // eslint-disable-line react/forbid-prop-types
  onImageUpload: PropTypes.func,
};

Item.defaultProps = {
  boardMemberships: undefined,
  onImageUpload: undefined,
};

export default Item;
