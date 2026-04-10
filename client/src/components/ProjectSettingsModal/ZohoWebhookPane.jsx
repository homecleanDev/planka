import { dequal } from 'dequal';
import { nanoid } from 'nanoid';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Form, Icon, Message, Segment, Tab } from 'semantic-ui-react';

import styles from './ZohoWebhookPane.module.scss';

const createWebhook = (currentUserId) => ({
  id: nanoid(),
  token: nanoid(32),
  listId: '',
  userIds: [],
  creatorUserId: currentUserId,
});

const normalizeWebhook = (item, currentUserId) => ({
  id: item.id || nanoid(),
  token: (item.token || '').trim(),
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

const ZohoWebhookPane = React.memo(({ items, lists, users, currentUser, onUpdate }) => {
  const [webhooks, setWebhooks] = useState(() =>
    (items.length > 0 ? items : [createWebhook(currentUser.id)]).map((item) =>
      normalizeWebhook(item, currentUser.id),
    ),
  );

  useEffect(() => {
    setWebhooks(
      (items.length > 0 ? items : [createWebhook(currentUser.id)]).map((item) =>
        normalizeWebhook(item, currentUser.id),
      ),
    );
  }, [items, currentUser.id]);

  const normalizedWebhooks = useMemo(
    () => webhooks.map((item) => normalizeWebhook(item, currentUser.id)),
    [webhooks, currentUser.id],
  );

  const normalizedDefaults = useMemo(
    () =>
      (items.length > 0 ? items : [createWebhook(currentUser.id)]).map((item) =>
        normalizeWebhook(item, currentUser.id),
      ),
    [items, currentUser.id],
  );

  const persistedWebhookIds = useMemo(
    () => new Set(items.map((item) => item.id).filter(Boolean)),
    [items],
  );

  const listOptions = useMemo(
    () =>
      lists.map((item) => ({
        key: item.id,
        text: item.name,
        value: item.id,
      })),
    [lists],
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

  const handleSubmit = useCallback(() => {
    onUpdate({
      zohoWebhooks: normalizedWebhooks
        .filter((item) => item.token && item.listId)
        .map((item) => ({
          ...item,
          creatorUserId: item.creatorUserId || currentUser.id,
        })),
    });
  }, [currentUser.id, normalizedWebhooks, onUpdate]);

  const hasInvalidWebhook = normalizedWebhooks.some((item) => !item.token || !item.listId);
  const isSaveDisabled =
    hasInvalidWebhook ||
    dequal(normalizedWebhooks, normalizedDefaults) ||
    normalizedWebhooks.length === 0;

  return (
    <Tab.Pane attached={false} className={styles.wrapper}>
      <Form onSubmit={handleSubmit}>
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
              name="listId"
              label="Target list"
              options={listOptions}
              value={item.listId || undefined}
              placeholder="Select list"
              disabled={listOptions.length === 0}
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
          </Segment>
        ))}

        <div className={styles.actions}>
          <Button type="button" onClick={handleAddWebhook}>
            Add webhook
          </Button>
          <Button positive content="Save" disabled={isSaveDisabled} />
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
      listId: PropTypes.string,
      userIds: PropTypes.arrayOf(PropTypes.string),
      creatorUserId: PropTypes.string,
    }),
  ).isRequired,
  lists: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
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
