import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Input } from '../../lib/custom-ui';

import api from '../../api';
import Paths from '../../constants/Paths';
import { getAccessToken } from '../../utils/access-token-storage';

import styles from './Search.module.scss';

const SEARCH_DELAY = 250;

const Search = React.memo(({ projectId }) => {
  const [t] = useTranslation();
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [items, setItems] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const blurTimeout = useRef(null);
  const latestRequestId = useRef(0);

  const closeResults = useCallback(() => {
    setIsFocused(false);
  }, []);

  const openResults = useCallback(() => {
    if (blurTimeout.current) {
      clearTimeout(blurTimeout.current);
      blurTimeout.current = null;
    }
    setIsFocused(true);
  }, []);

  // Reset when navigating to a different project
  useEffect(() => {
    setValue('');
    setItems([]);
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      setItems([]);
      setIsLoading(false);
      return undefined;
    }

    const searchText = value.trim();

    if (!searchText) {
      setItems([]);
      setIsLoading(false);
      return undefined;
    }

    const requestId = latestRequestId.current + 1;
    latestRequestId.current = requestId;

    const timeout = setTimeout(async () => {
      setIsLoading(true);

      try {
        console.log('[Search] Searching project', projectId, 'for:', searchText); // eslint-disable-line no-console
        const accessToken = getAccessToken();
        const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
        const { items: nextItems } = await api.searchProjectCards(projectId, searchText, headers);
        console.log('[Search] Results:', nextItems); // eslint-disable-line no-console

        if (latestRequestId.current === requestId) {
          setItems(nextItems);
        }
      } catch (err) {
        console.error('[Search] Error:', err); // eslint-disable-line no-console
        if (latestRequestId.current === requestId) {
          setItems([]);
        }
      } finally {
        if (latestRequestId.current === requestId) {
          setIsLoading(false);
        }
      }
    }, SEARCH_DELAY);

    return () => {
      clearTimeout(timeout);
    };
  }, [projectId, value]);

  const handleChange = useCallback((_, { value: nextValue }) => {
    setValue(nextValue);
  }, []);

  const handleFocus = useCallback(() => {
    openResults();
  }, [openResults]);

  const handleBlur = useCallback(() => {
    blurTimeout.current = setTimeout(() => {
      closeResults();
      blurTimeout.current = null;
    }, 150);
  }, [closeResults]);

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      setValue('');
      setItems([]);
      // Don't close (set isFocused=false) — the dropdown hides because hasQuery
      // becomes false, and isFocused stays true so typing again works immediately.
    }
  }, []);

  const handleResultClick = useCallback(
    (cardId) => {
      setValue('');
      setItems([]);
      closeResults();
      navigate(Paths.CARDS.replace(':id', cardId));
    },
    [closeResults, navigate],
  );

  const hasQuery = value.trim().length > 0;
  const isResultsVisible = isFocused && hasQuery;

  return (
    <div className={styles.wrapper}>
      <Input
        value={value}
        placeholder={t('common.searchCards')}
        icon={isLoading ? { name: 'spinner', loading: true } : 'search'}
        iconPosition="left"
        className={styles.input}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
      {isResultsVisible && (
        <div className={styles.results}>
          {items.length > 0
            ? items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={styles.result}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    handleResultClick(item.id);
                  }}
                >
                  <span className={styles.resultTitle}>{item.name}</span>
                  <span className={styles.resultMeta}>
                    {item.boardName}
                    {item.listName ? ` • ${item.listName}` : ''}
                  </span>
                </button>
              ))
            : !isLoading && <div className={styles.empty}>No cards found.</div>}
        </div>
      )}
    </div>
  );
});

Search.propTypes = {
  projectId: PropTypes.string.isRequired,
};

export default Search;
