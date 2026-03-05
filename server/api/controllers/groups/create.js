const Errors = {
  NAME_ALREADY_IN_USE: {
    nameAlreadyInUse: 'Name already in use',
  },
};

module.exports = {
  inputs: {
    name: {
      type: 'string',
      required: true,
      isNotEmptyString: true,
    },
  },

  exits: {
    nameAlreadyInUse: {
      responseType: 'conflict',
    },
  },

  async fn(inputs) {
    const cleanName = inputs.name.trim();

    const existingGroup = await Group.findOne({
      name: cleanName,
    });

    if (existingGroup) {
      throw Errors.NAME_ALREADY_IN_USE;
    }

    const group = await Group.create({
      name: cleanName,
    }).fetch();

    const userIds = await sails.helpers.users.getAdminIds();

    userIds.forEach((userId) => {
      sails.sockets.broadcast(
        `user:${userId}`,
        'groupCreate',
        {
          item: group,
        },
        this.req,
      );
    });

    return {
      item: group,
    };
  },
};
