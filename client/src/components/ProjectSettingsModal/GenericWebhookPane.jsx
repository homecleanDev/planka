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
  titleField: '',
  descriptionFields: [''],
});

const normalizeWebhook = (item, currentUserId, listToBoardId) => ({
  id: item.id || nanoid(),
  token: (item.token || '').trim(),
  boardId: item.boardId || listToBoardId[item.listId] || null,
  listId: item.listId || null,
  userIds: [...new Set(item.userIds || [])].filter(Boolean),
  creatorUserId: item.creatorUserId || currentUserId,
  titleField: item.titleField || '',
  descriptionFields:
    Array.isArray(item.descriptionFields) && item.descriptionFields.length > 0
      ? item.descriptionFields
      : [''],
});

const buildWebhookUrl = (token) =>
  token && typeof window !== 'undefined' ? `${window.location.origin}/hook/generic/${token}` : '';

const GenericWebhookPane = React.memo(({ items, boards, users, currentUser, onUpdate }) => {
  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const listToBoardId = useMemo(
    () =>
      boards.reduce((result, board) => {
        return board.lists.reduce(
          (nextResult, list) => ({ ...nextResult, [list.id]: board.id }),
          result,
        );
      }, {}),
    [boards],
  );
  const normalizeItems = useCallback(
    (nextItems) => nextItems.map((item) => normalizeWebhook(item, currentUser.id, listToBoardId)),
    [currentUser.id, listToBoardId],
  );
  const [webhooks, setWebhooks] = useState(() =>
    normalizeItems(safeItems.length > 0 ? safeItems : [createWebhook(currentUser.id)]),
  );

  useEffect(() => {
    setWebhooks(normalizeItems(safeItems.length > 0 ? safeItems : [createWebhook(currentUser.id)]));
  }, [currentUser.id, normalizeItems, safeItems]);

  const normalizedWebhooks = useMemo(() => normalizeItems(webhooks), [normalizeItems, webhooks]);
  const normalizedDefaults = useMemo(
    () => normalizeItems(safeItems.length > 0 ? safeItems : [createWebhook(currentUser.id)]),
    [currentUser.id, normalizeItems, safeItems],
  );
  const persistedWebhookIds = useMemo(
    () => new Set(safeItems.map((item) => item.id).filter(Boolean)),
    [safeItems],
  );
  const boardOptions = useMemo(
    () => boards.map((board) => ({ key: board.id, text: board.name, value: board.id })),
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
          ? { ...item, [name]: value, ...(name === 'boardId' && { listId: null }) }
          : item,
      ),
    );
  }, []);
  const handleDescriptionFieldChange = useCallback((webhookIndex, fieldIndex, value) => {
    setWebhooks((prev) =>
      prev.map((item, currentIndex) =>
        currentIndex === webhookIndex
          ? {
              ...item,
              descriptionFields: item.descriptionFields.map((field, currentFieldIndex) =>
                currentFieldIndex === fieldIndex ? value : field,
              ),
            }
          : item,
      ),
    );
  }, []);
  const handleAddWebhook = useCallback(
    () => setWebhooks((prev) => [...prev, createWebhook(currentUser.id)]),
    [currentUser.id],
  );
  const handleSaveWebhook = useCallback(
    (index) => {
      const selectedWebhook = normalizedWebhooks[index];
      if (!selectedWebhook || !selectedWebhook.listId || !selectedWebhook.titleField.trim()) return;

      const nextWebhooks = normalizedWebhooks
        .filter((item, currentIndex) => currentIndex === index || persistedWebhookIds.has(item.id))
        .filter((item) => item.token && item.listId && item.titleField.trim())
        .map((item) => ({
          ...item,
          titleField: item.titleField.trim(),
          descriptionFields: item.descriptionFields.map((field) => field.trim()).filter(Boolean),
          creatorUserId: item.creatorUserId || currentUser.id,
        }));

      onUpdate({ genericWebhooks: nextWebhooks });
    },
    [currentUser.id, normalizedWebhooks, onUpdate, persistedWebhookIds],
  );
  const isSaveDisabled = useCallback(
    (index) => {
      const webhook = normalizedWebhooks[index];
      if (!webhook || !webhook.listId || !webhook.titleField.trim()) return true;
      const defaultWebhook = normalizedDefaults.find((item) => item.id === webhook.id);
      return defaultWebhook ? dequal(webhook, defaultWebhook) : false;
    },
    [normalizedDefaults, normalizedWebhooks],
  );

  return (
    <Tab.Pane attached={false} className={styles.wrapper}>
      <Form>
        <Message info>
          <Message.Header>Generic webhook mapping</Message.Header>
          <p>Map incoming JSON fields to a card title and description.</p>
          <p>
            Use dot notation for nested values, such as <code>customer.email</code>.
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
                onClick={() => setWebhooks((prev) => prev.filter((_, i) => i !== index))}
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
                  ?.lists.map((list) => ({ key: list.id, text: list.name, value: list.id })) || []
              }
              value={item.listId || undefined}
              placeholder="Select list"
              disabled={!item.boardId}
              onChange={(event, data) => handleFieldChange(index, data)}
            />
            <Form.Input
              required
              name="titleField"
              label="Title field"
              value={item.titleField}
              placeholder="subject"
              onChange={(event, data) => handleFieldChange(index, data)}
            />
            <Form.Field>
              <div className={styles.fieldLabel}>Description fields</div>
              {item.descriptionFields.map((field, fieldIndex) => (
                <div className={styles.descriptionFieldRow} key={`${item.id}-${field || 'empty'}`}>
                  <Form.Input
                    fluid
                    id={`description-field-${item.id}-${fieldIndex}`}
                    value={field}
                    placeholder="concern"
                    onChange={(event) =>
                      handleDescriptionFieldChange(index, fieldIndex, event.target.value)
                    }
                  />
                  <Button
                    type="button"
                    basic
                    icon="trash"
                    disabled={item.descriptionFields.length === 1}
                    onClick={() =>
                      handleFieldChange(index, {
                        name: 'descriptionFields',
                        value: item.descriptionFields.filter((_, i) => i !== fieldIndex),
                      })
                    }
                  />
                </div>
              ))}
              <Button
                type="button"
                size="small"
                onClick={() =>
                  handleFieldChange(index, {
                    name: 'descriptionFields',
                    value: [...item.descriptionFields, ''],
                  })
                }
              >
                Add description field
              </Button>
            </Form.Field>
            <Form.Dropdown
              fluid
              multiple
              selection
              search
              name="userIds"
              label="Assignees"
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
                disabled={isSaveDisabled(index)}
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

GenericWebhookPane.propTypes = {
  items: PropTypes.arrayOf(PropTypes.object).isRequired, // eslint-disable-line react/forbid-prop-types
  boards: PropTypes.arrayOf(PropTypes.object).isRequired, // eslint-disable-line react/forbid-prop-types
  users: PropTypes.arrayOf(PropTypes.object).isRequired, // eslint-disable-line react/forbid-prop-types
  currentUser: PropTypes.shape({ id: PropTypes.string.isRequired }).isRequired,
  onUpdate: PropTypes.func.isRequired,
};

export default GenericWebhookPane;
