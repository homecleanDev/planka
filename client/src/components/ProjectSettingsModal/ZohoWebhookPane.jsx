import { dequal } from 'dequal';
import { nanoid } from 'nanoid';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Form, Message, Tab } from 'semantic-ui-react';

import styles from './ZohoWebhookPane.module.scss';

const buildWebhookUrl = (token) => {
  if (!token || typeof window === 'undefined') {
    return '';
  }

  return `${window.location.origin}/hook/zoho/${token}`;
};

const ZohoWebhookPane = React.memo(
  ({ token, listId, userIds, board, lists, users, currentUser, onUpdate }) => {
    const [data, setData] = useState(() => ({
      token: token || '',
      listId: listId || '',
      userIds: userIds || [],
    }));

    useEffect(() => {
      setData({
        token: token || '',
        listId: listId || '',
        userIds: userIds || [],
      });
    }, [token, listId, userIds]);

    const normalizedData = useMemo(
      () => ({
        token: data.token.trim(),
        listId: data.listId || null,
        userIds: [...new Set(data.userIds)].filter(Boolean),
      }),
      [data],
    );

    const normalizedDefaults = useMemo(
      () => ({
        token: (token || '').trim(),
        listId: listId || null,
        userIds: [...new Set(userIds || [])].filter(Boolean),
      }),
      [token, listId, userIds],
    );

    const webhookUrl = useMemo(() => buildWebhookUrl(normalizedData.token), [normalizedData.token]);

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

    const listOptions = useMemo(
      () =>
        lists.map((item) => ({
          key: item.id,
          text: item.name,
          value: item.id,
        })),
      [lists],
    );

    const handleFieldChange = useCallback((event, { name, value }) => {
      setData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }, []);

    const handleTokenGenerate = useCallback(() => {
      setData((prev) => ({
        ...prev,
        token: nanoid(32),
      }));
    }, []);

    const handleSubmit = useCallback(() => {
      onUpdate({
        zohoWebhookToken: normalizedData.token || null,
        zohoWebhookListId: normalizedData.listId,
        zohoWebhookUserIds: normalizedData.userIds,
        zohoWebhookCreatorUserId: currentUser.id,
      });
    }, [currentUser.id, normalizedData, onUpdate]);

    const isSaveDisabled =
      !normalizedData.token || !normalizedData.listId || dequal(normalizedData, normalizedDefaults);

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

          <Form.Input label="Board" value={board ? board.name : 'No board selected'} readOnly />

          <Form.Dropdown
            fluid
            selection
            required
            name="listId"
            label="Target list"
            options={listOptions}
            value={normalizedData.listId || undefined}
            placeholder="Select list"
            disabled={listOptions.length === 0}
            onChange={handleFieldChange}
          />

          <Form.Dropdown
            fluid
            multiple
            selection
            search
            name="userIds"
            label="Additional assignees"
            options={userOptions}
            value={normalizedData.userIds}
            placeholder="Select users"
            onChange={handleFieldChange}
          />

          <div className={styles.tokenRow}>
            <Form.Input
              fluid
              required
              name="token"
              label="Verification token"
              value={normalizedData.token}
              placeholder="Generate a token"
              onChange={handleFieldChange}
            />
            <Button type="button" className={styles.generateButton} onClick={handleTokenGenerate}>
              Generate token
            </Button>
          </div>

          <Form.TextArea label="Webhook URL" value={webhookUrl} rows={3} readOnly />

          <Button positive content="Save" disabled={isSaveDisabled} />
        </Form>
      </Tab.Pane>
    );
  },
);

ZohoWebhookPane.propTypes = {
  token: PropTypes.string,
  listId: PropTypes.string,
  userIds: PropTypes.arrayOf(PropTypes.string),
  board: PropTypes.shape({
    name: PropTypes.string,
  }),
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

ZohoWebhookPane.defaultProps = {
  token: '',
  listId: null,
  userIds: [],
  board: undefined,
};

export default ZohoWebhookPane;
