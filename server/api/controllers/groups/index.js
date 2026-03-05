module.exports = {
  async fn() {
    const groups = await Group.find().sort('name');

    return {
      items: groups,
    };
  },
};
