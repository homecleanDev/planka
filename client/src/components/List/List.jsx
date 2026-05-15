import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { Draggable, Droppable } from 'react-beautiful-dnd';
import { Button, Icon } from 'semantic-ui-react';
import { usePopup } from '../../lib/popup';

import DroppableTypes from '../../constants/DroppableTypes';
import NameEdit from './NameEdit';
import CardAdd from './CardAdd';
import ActionsStep from './ActionsStep';
import VirtualCard from './VirtualCard';
import { ReactComponent as PlusMathIcon } from '../../assets/images/plus-math-icon.svg';

import styles from './List.module.scss';

const List = React.memo(
  ({
    id,
    index,
    name,
    isPersisted,
    cardIds,
    canEdit,
    onUpdate,
    onDelete,
    onSort,
    onCardCreate,
    onCardsFetch,
    isCurrentUserManager,
    memberCardDeletionEnabled,
    lastCardPosition,
    filterText,
  }) => {
    const [t] = useTranslation();
    const [isAddCardOpened, setIsAddCardOpened] = useState(false);
    const [isFetchingCards, setIsFetchingCards] = useState(false);
    const [hasMoreCards, setHasMoreCards] = useState(true);
    const requestedCardsCount = useRef(null);
    const paginationCursorRef = useRef(lastCardPosition);
    const preSearchCursorRef = useRef(null);
    const wasSearchActiveRef = useRef(false);

    const nameEdit = useRef(null);
    const listWrapper = useRef(null);

    // Memoize the cards rendering to prevent unnecessary re-renders
    const renderedCards = useMemo(() => {
      return cardIds.map((cardId, cardIndex) => (
        <VirtualCard key={cardId} id={cardId} index={cardIndex} />
      ));
    }, [cardIds]);

    const handleHeaderClick = useCallback(() => {
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

    const handleAddCardClick = useCallback(() => {
      setIsAddCardOpened(true);
    }, []);

    const handleAddCardClose = useCallback(() => {
      setIsAddCardOpened(false);
    }, []);

    const handleNameEdit = useCallback(() => {
      nameEdit.current.open();
    }, []);

    const handleCardAdd = useCallback(() => {
      setIsAddCardOpened(true);
    }, []);

    useEffect(() => {
      if (isAddCardOpened) {
        listWrapper.current.scrollTop = listWrapper.current.scrollHeight;
      }
    }, [cardIds, isAddCardOpened]);

    useEffect(() => {
      if (!isFetchingCards || requestedCardsCount.current === null) {
        return undefined;
      }

      if (cardIds.length > requestedCardsCount.current) {
        setIsFetchingCards(false);
        requestedCardsCount.current = null;
        if (!filterText) {
          paginationCursorRef.current = lastCardPosition;
        }
        return undefined;
      }

      const timeout = setTimeout(() => {
        if (cardIds.length === requestedCardsCount.current) {
          setHasMoreCards(false);
          setIsFetchingCards(false);
          requestedCardsCount.current = null;
        }
      }, 700);

      return () => clearTimeout(timeout);
    }, [cardIds.length, filterText, hasMoreCards, id, isFetchingCards, lastCardPosition]);

    useEffect(() => {
      const isSearchActive = !!(filterText && filterText.trim() !== '');

      if (isSearchActive && !wasSearchActiveRef.current) {
        preSearchCursorRef.current = paginationCursorRef.current;
      }

      if (!isSearchActive && wasSearchActiveRef.current) {
        paginationCursorRef.current = preSearchCursorRef.current;
        preSearchCursorRef.current = null;
        setHasMoreCards(true);
        setIsFetchingCards(false);
        requestedCardsCount.current = null;
      }

      wasSearchActiveRef.current = isSearchActive;
    }, [filterText]);

    const handleCardsFetch = useCallback(() => {
      if (!onCardsFetch || isFetchingCards || !hasMoreCards) {
        return;
      }

      if (filterText && filterText.trim() !== '') {
        return;
      }

      requestedCardsCount.current = cardIds.length;
      setIsFetchingCards(true);
      onCardsFetch(paginationCursorRef.current, 50);
    }, [onCardsFetch, isFetchingCards, hasMoreCards, cardIds.length, filterText]);

    const handleCardsScroll = useCallback(() => {
      if (!listWrapper.current) {
        return;
      }

      const { scrollTop, scrollHeight, clientHeight } = listWrapper.current;
      if (scrollHeight - scrollTop - clientHeight < 200) {
        handleCardsFetch();
      }
    }, [handleCardsFetch]);

    const ActionsPopup = usePopup(ActionsStep);

    const cardsNode = (
      <Droppable
        droppableId={`list:${id}`}
        type={DroppableTypes.CARD}
        isDropDisabled={!isPersisted}
      >
        {({ innerRef, droppableProps, placeholder }) => (
          <>
            {/* eslint-disable-next-line react/jsx-props-no-spreading */}
            <div {...droppableProps} ref={innerRef}>
              <div className={styles.cards}>
                {renderedCards}
                {placeholder}
                {canEdit && (
                  <CardAdd
                    isOpened={isAddCardOpened}
                    onCreate={onCardCreate}
                    onClose={handleAddCardClose}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </Droppable>
    );

    return (
      <Draggable draggableId={`list:${id}`} index={index} isDragDisabled={!isPersisted || !canEdit}>
        {({ innerRef, draggableProps, dragHandleProps }) => (
          <div
            {...draggableProps} // eslint-disable-line react/jsx-props-no-spreading
            data-drag-scroller
            ref={innerRef}
            className={styles.innerWrapper}
          >
            <div className={styles.outerWrapper}>
              {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,
                                           jsx-a11y/no-static-element-interactions */}
              <div
                {...dragHandleProps} // eslint-disable-line react/jsx-props-no-spreading
                className={classNames(styles.header, canEdit && styles.headerEditable)}
                onClick={handleHeaderClick}
              >
                <NameEdit ref={nameEdit} defaultValue={name} onUpdate={handleNameUpdate}>
                  <div className={styles.headerName}>{name}</div>
                </NameEdit>
                {isPersisted && canEdit && (
                  <ActionsPopup
                    onNameEdit={handleNameEdit}
                    onCardAdd={handleCardAdd}
                    onDelete={onDelete}
                    onSort={onSort}
                    isCurrentUserManager={isCurrentUserManager}
                    member_card_deletion_enabled={memberCardDeletionEnabled}
                  >
                    <Button className={classNames(styles.headerButton, styles.target)}>
                      <Icon fitted name="pencil" size="small" />
                    </Button>
                  </ActionsPopup>
                )}
              </div>
              <div
                ref={listWrapper}
                className={classNames(
                  styles.cardsInnerWrapper,
                  (isAddCardOpened || !canEdit) && styles.cardsInnerWrapperFull,
                )}
                onScroll={handleCardsScroll}
              >
                <div className={styles.cardsOuterWrapper}>{cardsNode}</div>
              </div>
              {!isAddCardOpened && canEdit && (
                <button
                  type="button"
                  disabled={!isPersisted}
                  className={classNames(styles.addCardButton)}
                  onClick={handleAddCardClick}
                >
                  <PlusMathIcon className={styles.addCardButtonIcon} />
                  <span className={styles.addCardButtonText}>
                    {cardIds.length > 0 ? t('action.addAnotherCard') : t('action.addCard')}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}
      </Draggable>
    );
  },
);

List.propTypes = {
  id: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
  isPersisted: PropTypes.bool.isRequired,
  cardIds: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  canEdit: PropTypes.bool.isRequired,
  onUpdate: PropTypes.func.isRequired,
  onSort: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onCardCreate: PropTypes.func.isRequired,
  onCardsFetch: PropTypes.func,
  isCurrentUserManager: PropTypes.bool.isRequired,
  memberCardDeletionEnabled: PropTypes.bool.isRequired,
  lastCardPosition: PropTypes.number,
  filterText: PropTypes.string.isRequired,
};

List.defaultProps = {
  onCardsFetch: null,
  lastCardPosition: null,
};

export default List;
