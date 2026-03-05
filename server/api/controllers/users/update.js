const Errors = {
  USER_NOT_FOUND: {
    userNotFound: 'User not found',
  },
  GROUP_NOT_FOUND: {
    groupNotFound: 'Group not found',
  },
};

const avatarUrlValidator = (value) => _.isNull(value);
const groupIdsValidator = (value) => _.isArray(value) && _.every(value, _.isString);

module.exports = {
  inputs: {
    id: {
      type: 'string',
      regex: /^[0-9]+$/,
      required: true,
    },
    isAdmin: {
      type: 'boolean',
    },
    name: {
      type: 'string',
      isNotEmptyString: true,
    },
    avatarUrl: {
      type: 'json',
      custom: avatarUrlValidator,
    },
    phone: {
      type: 'string',
      isNotEmptyString: true,
      allowNull: true,
    },
    organization: {
      type: 'string',
      isNotEmptyString: true,
      allowNull: true,
    },
    language: {
      type: 'string',
      isNotEmptyString: true,
      allowNull: true,
    },
    subscribeToOwnCards: {
      type: 'boolean',
    },
    groupIds: {
      type: 'json',
      custom: groupIdsValidator,
    },
  },

  exits: {
    userNotFound: {
      responseType: 'notFound',
    },
    groupNotFound: {
      responseType: 'notFound',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    if (!currentUser.isAdmin) {
      if (inputs.id !== currentUser.id) {
        throw Errors.USER_NOT_FOUND; // Forbidden
      }

      delete inputs.isAdmin; // eslint-disable-line no-param-reassign
      delete inputs.groupIds; // eslint-disable-line no-param-reassign
    }

    let user = await sails.helpers.users.getOne(inputs.id);

    if (!user) {
      throw Errors.USER_NOT_FOUND;
    }

    if (user.email === sails.config.custom.defaultAdminEmail) {
      /* eslint-disable no-param-reassign */
      delete inputs.isAdmin;
      delete inputs.name;
      /* eslint-enable no-param-reassign */
    } else if (user.isSso) {
      if (!sails.config.custom.oidcIgnoreRoles) {
        delete inputs.isAdmin; // eslint-disable-line no-param-reassign
      }

      delete inputs.name; // eslint-disable-line no-param-reassign
    }

    const values = {
      ..._.pick(inputs, [
        'isAdmin',
        'name',
        'phone',
        'organization',
        'language',
        'subscribeToOwnCards',
      ]),
      avatar: inputs.avatarUrl,
    };

    user = await sails.helpers.users.updateOne.with({
      values,
      record: user,
      user: currentUser,
      request: this.req,
      skipBroadcast: !_.isUndefined(inputs.groupIds),
    });

    if (!user) {
      throw Errors.USER_NOT_FOUND;
    }

    if (!_.isUndefined(inputs.groupIds)) {
      const groupIds = _.uniq(inputs.groupIds);
      const groups = await Group.find({
        id: groupIds,
      });

      if (groups.length !== groupIds.length) {
        throw Errors.GROUP_NOT_FOUND;
      }

      await User.replaceCollection(user.id, 'groups').members(groupIds);

      user = await sails.helpers.users.getOne(user.id);

      const users = await sails.helpers.users.getMany();
      const userIds = sails.helpers.utils.mapRecords(users);

      userIds.forEach((userId) => {
        sails.sockets.broadcast(
          `user:${userId}`,
          'userUpdate',
          {
            item: user,
          },
          this.req,
        );
      });
    }

    return {
      item: user,
    };
  },
};
