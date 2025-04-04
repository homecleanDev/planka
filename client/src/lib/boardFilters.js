const STORAGE_KEY_PREFIX = 'planka_board_filters_';

export const saveBoardFilters = (boardId, filterUsers) => {
  try {
    const storageKey = `${STORAGE_KEY_PREFIX}${boardId}`;
    localStorage.setItem(storageKey, JSON.stringify({
      filterUsers: filterUsers.map(user => user.id),
    }));
  } catch (error) {
    console.error('Failed to save board filters to localStorage:', error);
  }
};

export const loadBoardFilters = (boardId) => {
  try {
    const storageKey = `${STORAGE_KEY_PREFIX}${boardId}`;
    const savedFilters = localStorage.getItem(storageKey);
    return savedFilters ? JSON.parse(savedFilters) : null;
  } catch (error) {
    console.error('Failed to load board filters from localStorage:', error);
    return null;
  }
};
