module.exports = {
  tableName: 'zoho_webhook_message',

  attributes: {
    externalMessageId: {
      type: 'string',
      required: true,
      columnName: 'external_message_id',
    },
    projectId: {
      model: 'Project',
      required: true,
      columnName: 'project_id',
    },
    cardId: {
      model: 'Card',
      required: true,
      columnName: 'card_id',
    },
  },
};
