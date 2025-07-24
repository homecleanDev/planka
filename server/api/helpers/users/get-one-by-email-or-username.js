module.exports = {
  inputs: {
    emailOrUsername: {
      type: 'string',
      required: true,
    },
  },

  async fn(inputs) {
    const { emailOrUsername } = inputs;

    return sails.helpers.users.getOne.with({
      criteria: {
        or: [{ email: emailOrUsername.toLowerCase() }, { username: emailOrUsername }],
      },
    });
  },
};
