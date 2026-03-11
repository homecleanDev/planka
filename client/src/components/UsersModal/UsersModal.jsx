import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Button, Form, Icon, Modal, Tab, Table } from 'semantic-ui-react';
import { usePopup } from '../../lib/popup';

import UserAddStepContainer from '../../containers/UserAddStepContainer';
import Item from './Item';
import User from '../User';
import GroupUsersAddStep from './GroupUsersAddStep';

const GROUP_USERS_ADD_POPUP_PROPS = {
  position: 'left center',
};

const UsersModal = React.memo(
  ({
    items,
    groups,
    canAdd,
    onUpdate,
    onUsernameUpdate,
    onUsernameUpdateMessageDismiss,
    onEmailUpdate,
    onEmailUpdateMessageDismiss,
    onPasswordUpdate,
    onPasswordUpdateMessageDismiss,
    onDelete,
    onGroupCreate,
    onClose,
  }) => {
    const [t] = useTranslation();
    const [groupName, setGroupName] = useState('');
    const [expandedGroupIds, setExpandedGroupIds] = useState([]);

    const handleUpdate = useCallback(
      (id, data) => {
        onUpdate(id, data);
      },
      [onUpdate],
    );

    const handleUsernameUpdate = useCallback(
      (id, data) => {
        onUsernameUpdate(id, data);
      },
      [onUsernameUpdate],
    );

    const handleUsernameUpdateMessageDismiss = useCallback(
      (id) => {
        onUsernameUpdateMessageDismiss(id);
      },
      [onUsernameUpdateMessageDismiss],
    );

    const handleEmailUpdate = useCallback(
      (id, data) => {
        onEmailUpdate(id, data);
      },
      [onEmailUpdate],
    );

    const handleEmailUpdateMessageDismiss = useCallback(
      (id) => {
        onEmailUpdateMessageDismiss(id);
      },
      [onEmailUpdateMessageDismiss],
    );

    const handlePasswordUpdate = useCallback(
      (id, data) => {
        onPasswordUpdate(id, data);
      },
      [onPasswordUpdate],
    );

    const handlePasswordUpdateMessageDismiss = useCallback(
      (id) => {
        onPasswordUpdateMessageDismiss(id);
      },
      [onPasswordUpdateMessageDismiss],
    );

    const handleDelete = useCallback(
      (id) => {
        onDelete(id);
      },
      [onDelete],
    );

    const handleGroupNameChange = useCallback((_, { value }) => {
      setGroupName(value);
    }, []);

    const handleGroupCreate = useCallback(() => {
      const cleanName = groupName.trim();

      if (!cleanName) {
        return;
      }

      onGroupCreate({
        name: cleanName,
      });
      setGroupName('');
    }, [groupName, onGroupCreate]);

    const handleGroupToggle = useCallback((groupId) => {
      setExpandedGroupIds((prevGroupIds) =>
        prevGroupIds.includes(groupId)
          ? prevGroupIds.filter((id) => id !== groupId)
          : [...prevGroupIds, groupId],
      );
    }, []);
    const handleGroupUserAdd = useCallback(
      (groupId, userId) => {
        const user = items.find((item) => item.id === userId);

        if (!user || user.groupIds.includes(groupId)) {
          return;
        }

        onUpdate(userId, {
          groupIds: [...user.groupIds, groupId],
        });
      },
      [items, onUpdate],
    );

    const UserAddPopupContainer = usePopup(UserAddStepContainer);
    const GroupUsersAddPopup = usePopup(GroupUsersAddStep, GROUP_USERS_ADD_POPUP_PROPS);
    const groupUsersById = useMemo(() => {
      const map = {};

      groups.forEach((group) => {
        map[group.id] = items.filter((item) => item.groupIds.includes(group.id));
      });

      return map;
    }, [groups, items]);

    const panes = useMemo(
      () => [
        {
          menuItem: t('common.users', {
            context: 'title',
          }),
          render: () => (
            <>
              <Table unstackable basic="very">
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell />
                    <Table.HeaderCell width={4}>{t('common.name')}</Table.HeaderCell>
                    <Table.HeaderCell width={4}>{t('common.username')}</Table.HeaderCell>
                    <Table.HeaderCell width={4}>{t('common.email')}</Table.HeaderCell>
                    <Table.HeaderCell>{t('common.administrator')}</Table.HeaderCell>
                    <Table.HeaderCell />
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {items.map((item) => (
                    <Item
                      key={item.id}
                      email={item.email}
                      username={item.username}
                      name={item.name}
                      avatarUrl={item.avatarUrl}
                      organization={item.organization}
                      phone={item.phone}
                      isAdmin={item.isAdmin}
                      isLocked={item.isLocked}
                      isRoleLocked={item.isRoleLocked}
                      isUsernameLocked={item.isUsernameLocked}
                      isDeletionLocked={item.isDeletionLocked}
                      groups={item.groups}
                      groupIds={item.groupIds}
                      allGroups={groups}
                      emailUpdateForm={item.emailUpdateForm}
                      passwordUpdateForm={item.passwordUpdateForm}
                      usernameUpdateForm={item.usernameUpdateForm}
                      onUpdate={(data) => handleUpdate(item.id, data)}
                      onUsernameUpdate={(data) => handleUsernameUpdate(item.id, data)}
                      onUsernameUpdateMessageDismiss={() =>
                        handleUsernameUpdateMessageDismiss(item.id)
                      }
                      onEmailUpdate={(data) => handleEmailUpdate(item.id, data)}
                      onEmailUpdateMessageDismiss={() => handleEmailUpdateMessageDismiss(item.id)}
                      onPasswordUpdate={(data) => handlePasswordUpdate(item.id, data)}
                      onPasswordUpdateMessageDismiss={() =>
                        handlePasswordUpdateMessageDismiss(item.id)
                      }
                      onDelete={() => handleDelete(item.id)}
                    />
                  ))}
                </Table.Body>
              </Table>
            </>
          ),
        },
        {
          menuItem: t('common.groups'),
          render: () => (
            <>
              <Form onSubmit={handleGroupCreate}>
                <Form.Input
                  placeholder={t('common.name')}
                  value={groupName}
                  onChange={handleGroupNameChange}
                  action={{
                    content: t('action.addGroup'),
                    positive: true,
                    disabled: !groupName.trim(),
                  }}
                />
              </Form>
              <Table unstackable basic="very">
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell />
                    <Table.HeaderCell>{t('common.name')}</Table.HeaderCell>
                    <Table.HeaderCell>{t('common.users')}</Table.HeaderCell>
                    <Table.HeaderCell />
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {groups.map((group) => (
                    <React.Fragment key={group.id}>
                      <Table.Row>
                        <Table.Cell>
                          <User name={group.name} size="tiny" />
                        </Table.Cell>
                        <Table.Cell>{group.name}</Table.Cell>
                        <Table.Cell>{groupUsersById[group.id]?.length || 0}</Table.Cell>
                        <Table.Cell textAlign="right">
                          <GroupUsersAddPopup
                            groupName={group.name}
                            users={items}
                            currentUserIds={(groupUsersById[group.id] || []).map((user) => user.id)}
                            onUserAdd={(userId) => handleGroupUserAdd(group.id, userId)}
                          >
                            <Button basic size="tiny">
                              <Icon name="plus" />
                            </Button>
                          </GroupUsersAddPopup>
                          <Button basic size="tiny" onClick={() => handleGroupToggle(group.id)}>
                            <Icon
                              name={
                                expandedGroupIds.includes(group.id) ? 'chevron up' : 'chevron down'
                              }
                            />
                          </Button>
                        </Table.Cell>
                      </Table.Row>
                      {expandedGroupIds.includes(group.id) && (
                        <Table.Row>
                          <Table.Cell colSpan={4}>
                            <Table unstackable basic="very">
                              <Table.Header>
                                <Table.Row>
                                  <Table.HeaderCell>{t('common.name')}</Table.HeaderCell>
                                  <Table.HeaderCell>{t('common.username')}</Table.HeaderCell>
                                  <Table.HeaderCell>{t('common.email')}</Table.HeaderCell>
                                </Table.Row>
                              </Table.Header>
                              <Table.Body>
                                {groupUsersById[group.id]?.length ? (
                                  groupUsersById[group.id].map((user) => (
                                    <Table.Row key={user.id}>
                                      <Table.Cell>{user.name}</Table.Cell>
                                      <Table.Cell>{user.username || '-'}</Table.Cell>
                                      <Table.Cell>{user.email}</Table.Cell>
                                    </Table.Row>
                                  ))
                                ) : (
                                  <Table.Row>
                                    <Table.Cell colSpan={3}>-</Table.Cell>
                                  </Table.Row>
                                )}
                              </Table.Body>
                            </Table>
                          </Table.Cell>
                        </Table.Row>
                      )}
                    </React.Fragment>
                  ))}
                </Table.Body>
              </Table>
            </>
          ),
        },
      ],
      [
        t,
        items,
        groups,
        groupUsersById,
        expandedGroupIds,
        groupName,
        handleUpdate,
        handleUsernameUpdate,
        handleUsernameUpdateMessageDismiss,
        handleEmailUpdate,
        handleEmailUpdateMessageDismiss,
        handlePasswordUpdate,
        handlePasswordUpdateMessageDismiss,
        handleDelete,
        handleGroupCreate,
        handleGroupToggle,
        handleGroupUserAdd,
        handleGroupNameChange,
        GroupUsersAddPopup,
      ],
    );

    return (
      <Modal open closeIcon size="large" centered={false} onClose={onClose}>
        <Modal.Header>
          {t('common.users', {
            context: 'title',
          })}
        </Modal.Header>
        <Modal.Content scrolling>
          <Tab
            menu={{
              secondary: true,
              pointing: true,
            }}
            panes={panes}
          />
        </Modal.Content>
        {canAdd && (
          <Modal.Actions>
            <UserAddPopupContainer>
              <Button positive content={t('action.addUser')} />
            </UserAddPopupContainer>
          </Modal.Actions>
        )}
      </Modal>
    );
  },
);

UsersModal.propTypes = {
  items: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  groups: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  canAdd: PropTypes.bool.isRequired,
  onUpdate: PropTypes.func.isRequired,
  onUsernameUpdate: PropTypes.func.isRequired,
  onUsernameUpdateMessageDismiss: PropTypes.func.isRequired,
  onEmailUpdate: PropTypes.func.isRequired,
  onEmailUpdateMessageDismiss: PropTypes.func.isRequired,
  onPasswordUpdate: PropTypes.func.isRequired,
  onPasswordUpdateMessageDismiss: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onGroupCreate: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default UsersModal;
