import { dequal } from 'dequal';
import { nanoid } from 'nanoid';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Form, Icon, Message, Segment, Tab } from 'semantic-ui-react';

import styles from './ZohoWebhookPane.module.scss';

const createWebhook = (currentUserId) => ({
  id: nanoid(),
  token: nanoid(32),
  boardId: null,
  listId: '',
  userIds: [],
  creatorUserId: currentUserId,
});

const normalizeWebhook = (item, currentUserId, listToBoardId) => ({
  id: item.id || nanoid(),
  token: (item.token || '').trim(),
  boardId: item.boardId || listToBoardId[item.listId] || null,
  listId: item.listId || null,
  userIds: [...new Set(item.userIds || [])].filter(Boolean),
  creatorUserId: item.creatorUserId || currentUserId,
});

const buildWebhookUrl = (token) => {
  if (!token || typeof window === 'undefined') {
    return '';
  }

  return `${window.location.origin}/hook/zoho/${token}`;
};

const ZohoWebhookPane = React.memo(({ items, boards, users, currentUser, onUpdate }) => {
  const listToBoardId = useMemo(
    () =>
      boards.reduce((result, board) => {
        board.lists.forEach((list) => {
          // eslint-disable-next-line no-param-reassign
          result[list.id] = board.id;
        });

        return result;
      }, {}),
    [boards],
  );

  const normalizeItems = useCallback(
    (nextItems) =>
      nextItems.map((item) => normalizeWebhook(item, currentUser.id, listToBoardId)),
    [currentUser.id, listToBoardId],
  );

  const [webhooks, setWebhooks] = useState(() =>
    normalizeItems(items.length > 0 ? items : [createWebhook(currentUser.id)]),
  );

  useEffect(() => {
    setWebhooks(normalizeItems(items.length > 0 ? items : [createWebhook(currentUser.id)]));
  }, [items, currentUser.id, normalizeItems]);

  const normalizedWebhooks = useMemo(
    () => normalizeItems(webhooks),
    [webhooks, normalizeItems],
  );

  const normalizedDefaults = useMemo(
    () => normalizeItems(items.length > 0 ? items : [createWebhook(currentUser.id)]),
    [items, currentUser.id, normalizeItems],
  );

  const persistedWebhookIds = useMemo(
    () => new Set(items.map((item) => item.id).filter(Boolean)),
    [items],
  );

  const boardOptions = useMemo(
    () =>
      boards.map((item) => ({
        key: item.id,
        text: item.name,
        value: item.id,
      })),
    [boards],
  );

  const userOptions = useMemo(
    () =>
      users.map((user) => ({
        key: user.id,
        text: user.name,
        value: user.id,
        description: user.email,
      })),
    [users],
  );

  const handleFieldChange = useCallback((index, { name, value }) => {
    setWebhooks((prev) =>
      prev.map((item, currentIndex) =>
        currentIndex === index
          ? {
              ...item,
              [name]: value,
              ...(name === 'boardId' && {
                listId: null,
              }),
            }
          : item,
      ),
    );
  }, []);

  const handleAddWebhook = useCallback(() => {
    setWebhooks((prev) => [...prev, createWebhook(currentUser.id)]);
  }, [currentUser.id]);

  const handleRemoveWebhook = useCallback((index) => {
    setWebhooks((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  }, []);

  const handleSaveWebhook = useCallback(
    (index) => {
      const selectedWebhook = normalizedWebhooks[index];
      if (!selectedWebhook || !selectedWebhook.token || !selectedWebhook.listId) {
        return;
      }

      const nextZohoWebhooks = normalizedWebhooks
        .filter((item, currentIndex) =>
          currentIndex === index || persistedWebhookIds.has(item.id),
        )
        .filter((item) => item.token && item.listId)
        .map((item) => ({
          ...item,
          creatorUserId: item.creatorUserId || currentUser.id,
        }));

      onUpdate({
        zohoWebhooks: nextZohoWebhooks,
      });
    },
    [currentUser.id, normalizedWebhooks, onUpdate, persistedWebhookIds],
  );

  const isWebhookSaveDisabled = useCallback(
    (index) => {
      const webhook = normalizedWebhooks[index];
      if (!webhook || !webhook.token || !webhook.listId) {
        return true;
      }

      const defaultWebhook = normalizedDefaults.find((item) => item.id === webhook.id);
      if (!defaultWebhook) {
        return false;
      }

      return dequal(webhook, defaultWebhook);
    },
    [normalizedDefaults, normalizedWebhooks],
  );

  return (
    <Tab.Pane attached={false} className={styles.wrapper}>
      <Form>
        <Message info>
          <Message.Header>Zoho Mail mapping</Message.Header>
          <p>
            Incoming payload uses <code>subject</code> for the card title and <code>summary</code>{' '}
            or <code>html</code> for the description.
          </p>
          <p>
            Card members are matched from Zoho sender and recipient email addresses, then merged
            with the additional assignees you select below.
          </p>
        </Message>

        {normalizedWebhooks.map((item, index) => (
          <Segment key={item.id}>
            <div className={styles.headerRow}>
              <div className={styles.headerText}>Webhook {index + 1}</div>
              <Button
                type="button"
                basic
                icon
                disabled={normalizedWebhooks.length === 1}
                onClick={() => handleRemoveWebhook(index)}
              >
                <Icon name="trash" />
              </Button>
            </div>

            <Form.Dropdown
              fluid
              selection
              required
              name="boardId"
              label="Target tab"
              options={boardOptions}
              value={item.boardId || undefined}
              placeholder="Select tab"
              disabled={boardOptions.length === 0}
              onChange={(event, data) => handleFieldChange(index, data)}
            />

            <Form.Dropdown
              fluid
              selection
              required
              name="listId"
              label="Target list"
              options={
                boards
                  .find((board) => board.id === item.boardId)
                  ?.lists.map((list) => ({
                    key: list.id,
                    text: list.name,
                    value: list.id,
                  })) || []
              }
              value={item.listId || undefined}
              placeholder="Select list"
              disabled={!item.boardId}
              onChange={(event, data) => handleFieldChange(index, data)}
            />

            <Form.Dropdown
              fluid
              multiple
              selection
              search
              name="userIds"
              label="Additional assignees"
              options={userOptions}
              value={item.userIds}
              placeholder="Select users"
              onChange={(event, data) => handleFieldChange(index, data)}
            />

            {persistedWebhookIds.has(item.id) && (
              <Form.TextArea
                label="Webhook URL"
                value={buildWebhookUrl(item.token)}
                rows={3}
                readOnly
              />
            )}

            <div className={styles.webhookActions}>
              <Button
                type="button"
                positive
                content="Save"
                disabled={isWebhookSaveDisabled(index)}
                onClick={() => handleSaveWebhook(index)}
              />
            </div>
          </Segment>
        ))}

        <div className={styles.actions}>
          <Button type="button" onClick={handleAddWebhook}>
            Add webhook
          </Button>
        </div>
      </Form>
    </Tab.Pane>
  );
});

ZohoWebhookPane.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      token: PropTypes.string,
      boardId: PropTypes.string,
      listId: PropTypes.string,
      userIds: PropTypes.arrayOf(PropTypes.string),
      creatorUserId: PropTypes.string,
    }),
  ).isRequired,
  boards: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      lists: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string.isRequired,
          name: PropTypes.string.isRequired,
        }),
      ).isRequired,
    }),
  ).isRequired,
  users: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      email: PropTypes.string.isRequired,
    }),
  ).isRequired,
  currentUser: PropTypes.shape({
    id: PropTypes.string.isRequired,
  }).isRequired,
  onUpdate: PropTypes.func.isRequired,
};

export default ZohoWebhookPane;
