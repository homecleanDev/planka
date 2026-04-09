import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Modal, Tab } from 'semantic-ui-react';

import ManagersPane from './ManagersPane';
import BackgroundPane from './BackgroundPane';
import GeneralPane from './GeneralPane';
import CardPane from './CardPane';
import ZohoWebhookPane from './ZohoWebhookPane';

const ProjectSettingsModal = React.memo(
  ({
    name,
    memberCardDeletionEnabled,
    background,
    backgroundImage,
    isBackgroundImageUpdating,
    cardFields,
    zohoWebhookToken,
    zohoWebhookListId,
    zohoWebhookUserIds,
    managers,
    allUsers,
    currentUser,
    currentBoard,
    currentBoardLists,
    currentBoardUsers,
    onUpdate,
    onBackgroundImageUpdate,
    onDelete,
    onManagerCreate,
    onManagerDelete,
    onClose,
  }) => {
    const [t] = useTranslation();

    const handleBackgroundUpdate = useCallback(
      (newBackground) => {
        onUpdate({
          background: newBackground,
        });
      },
      [onUpdate],
    );

    const handleBackgroundImageDelete = useCallback(() => {
      onUpdate({
        backgroundImage: null,
      });
    }, [onUpdate]);

    const panes = [
      {
        menuItem: t('common.general', {
          context: 'title',
        }),
        render: () => (
          <GeneralPane
            name={name}
            onUpdate={onUpdate}
            onDelete={onDelete}
            memberCardDeletionEnabled={memberCardDeletionEnabled}
          />
        ),
      },
      {
        menuItem: t('common.card', {
          context: 'title',
        }),
        render: () => <CardPane defaultFields={cardFields} onUpdate={onUpdate} />,
      },
      {
        menuItem: t('common.managers', {
          context: 'title',
        }),
        render: () => (
          <ManagersPane
            items={managers}
            allUsers={allUsers}
            onCreate={onManagerCreate}
            onDelete={onManagerDelete}
          />
        ),
      },
      {
        menuItem: t('common.background', {
          context: 'title',
        }),
        render: () => (
          <BackgroundPane
            item={background}
            imageCoverUrl={backgroundImage && backgroundImage.coverUrl}
            isImageUpdating={isBackgroundImageUpdating}
            onUpdate={handleBackgroundUpdate}
            onImageUpdate={onBackgroundImageUpdate}
            onImageDelete={handleBackgroundImageDelete}
          />
        ),
      },
    ];

    if (currentUser?.isAdmin) {
      panes.splice(3, 0, {
        menuItem: 'Zoho Webhook',
        render: () => (
          <ZohoWebhookPane
            token={zohoWebhookToken}
            listId={zohoWebhookListId}
            userIds={zohoWebhookUserIds}
            board={currentBoard}
            lists={currentBoardLists}
            users={currentBoardUsers}
            currentUser={currentUser}
            onUpdate={onUpdate}
          />
        ),
      });
    }

    return (
      <Modal open closeIcon size="small" centered={false} onClose={onClose}>
        <Modal.Content>
          <Tab
            menu={{
              secondary: true,
              pointing: true,
            }}
            panes={panes}
          />
        </Modal.Content>
      </Modal>
    );
  },
);

ProjectSettingsModal.propTypes = {
  name: PropTypes.string.isRequired,
  memberCardDeletionEnabled: PropTypes.bool.isRequired,
  /* eslint-disable react/forbid-prop-types */
  background: PropTypes.object,
  backgroundImage: PropTypes.object,
  cardFields: PropTypes.array.isRequired,
  zohoWebhookToken: PropTypes.string,
  zohoWebhookListId: PropTypes.string,
  zohoWebhookUserIds: PropTypes.arrayOf(PropTypes.string),
  /* eslint-enable react/forbid-prop-types */
  isBackgroundImageUpdating: PropTypes.bool.isRequired,
  /* eslint-disable react/forbid-prop-types */
  managers: PropTypes.array.isRequired,
  allUsers: PropTypes.array.isRequired,
  currentUser: PropTypes.object,
  currentBoard: PropTypes.object,
  currentBoardLists: PropTypes.array.isRequired,
  currentBoardUsers: PropTypes.array.isRequired,
  /* eslint-enable react/forbid-prop-types */
  onUpdate: PropTypes.func.isRequired,
  onBackgroundImageUpdate: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onManagerCreate: PropTypes.func.isRequired,
  onManagerDelete: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

ProjectSettingsModal.defaultProps = {
  background: undefined,
  backgroundImage: undefined,
  zohoWebhookToken: '',
  zohoWebhookListId: null,
  zohoWebhookUserIds: [],
  currentUser: undefined,
  currentBoard: undefined,
};

export default ProjectSettingsModal;
