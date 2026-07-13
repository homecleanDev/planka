const { getRemoteAddress } = require('../../../utils/remoteAddress');

const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  USER_NOT_FOUND: {
    userNotFound: 'User not found',
  },
};

module.exports = {
  inputs: {
    id: {
      type: 'string',
      regex: /^[0-9]+$/,
      required: true,
    },
  },

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
    userNotFound: {
      responseType: 'notFound',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    if (inputs.id === currentUser.id) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const user = await sails.helpers.users.getOne(inputs.id);

    if (!user) {
      throw Errors.USER_NOT_FOUND;
    }

    if (user.email === sails.config.custom.defaultAdminEmail) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const remoteAddress = getRemoteAddress(this.req);
    const accessToken = sails.helpers.utils.createToken(user.id);

    await Session.create({
      accessToken,
      remoteAddress,
      userId: user.id,
      userAgent: this.req.headers['user-agent'],
    });

    sails.log.info(
      `User ${currentUser.id} started impersonating user ${user.id}. (IP: ${remoteAddress})`,
    );

    return {
      item: accessToken,
    };
  },
};
