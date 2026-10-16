module.exports = {
  async fn() {
    const { currentUser } = this.req;

    const managerProjectIds = await sails.helpers.users.getManagerProjectIds(currentUser.id);
    const managerProjects = await sails.helpers.projects.getMany(managerProjectIds);

    const currentUserBoardMemberships = await sails.helpers.users.getBoardMemberships(
      currentUser.id,
    );
    const membershipBoardIds = sails.helpers.utils.mapRecords(
      currentUserBoardMemberships,
      'boardId',
    );

    let membershipBoards = await sails.helpers.boards.getMany({
      id: membershipBoardIds,
      projectId: {
        '!=': managerProjectIds,
      },
    });

    let membershipProjectIds = sails.helpers.utils.mapRecords(membershipBoards, 'projectId', true);
    const membershipProjects = await sails.helpers.projects.getMany(membershipProjectIds);

    membershipProjectIds = sails.helpers.utils.mapRecords(membershipProjects);

    const projectIds = [...managerProjectIds, ...membershipProjectIds];
    const projects = [...managerProjects, ...membershipProjects];

    const projectManagers = await sails.helpers.projects.getProjectManagers(projectIds);

    const userIds = sails.helpers.utils.mapRecords(projectManagers, 'userId', true);

    const managerBoards = await sails.helpers.projects.getBoards(managerProjectIds);

    membershipBoards = membershipBoards.filter((membershipBoard) =>
      membershipProjectIds.includes(membershipBoard.projectId),
    );

    const boards = [...managerBoards, ...membershipBoards];
    const boardIds = sails.helpers.utils.mapRecords(boards);

    const boardMemberships = await sails.helpers.boards.getBoardMemberships(boardIds);
    const boardMemberUserIds = sails.helpers.utils.mapRecords(boardMemberships, 'userId', true);
    const labels = await sails.helpers.boards.getLabels(boardIds);

    const allUserIds = [...new Set([...userIds, ...boardMemberUserIds])];
    const allUsers = await sails.helpers.users.getMany(allUserIds);

    const filteredBoardMemberships = boardMemberships.filter((boardMembership) =>
      boardIds.includes(boardMembership.boardId),
    );

    return {
      items: projects,
      included: {
        users: allUsers,
        projectManagers,
        boards,
        boardMemberships: filteredBoardMemberships,
        labels,
      },
    };
  },
};
