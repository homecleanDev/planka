import { createSelector } from 'redux-orm';

import orm from '../orm';

export const selectGroups = createSelector(orm, ({ Group }) =>
  Group.getOrderedQuerySet().toRefArray(),
);

export default {
  selectGroups,
};
