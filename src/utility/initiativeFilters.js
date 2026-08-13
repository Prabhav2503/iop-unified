// ─── Initiative filtering and classification utilities ─────────────────────

/**
 * Get list of possible ID string values for the logged in user
 * @param {Object} user
 * @returns {Array<string>}
 */
export function getPossibleUserIds(user) {
  if (!user) return [];
  return [
    user.profile_id,
    user.id,
    user.user_id,
    user.team_id,
    user.member_id,
    user.uuid,
    user.email,
    user.username,
  ]
    .filter(Boolean)
    .map((id) => String(id).toLowerCase().trim());
}

/**
 * Check if a task or resource creator ID matches the logged in user
 * @param {string} creatorId
 * @param {Object} user
 * @returns {boolean}
 */
export function isMyCreator(creatorId, user) {
  if (!creatorId || !user) return false;
  const creatorStr = String(creatorId).toLowerCase().trim();
  const userIds = getPossibleUserIds(user);
  return userIds.includes(creatorStr);
}

/**
 * Check if an initiative belongs to (was created by) the logged-in user
 * @param {Object} initiative
 * @param {Object} user
 * @returns {boolean}
 */
export function isMyInitiative(initiative, user) {
  if (!initiative || !initiative.created_by || !user) return false;
  return isMyCreator(initiative.created_by, user);
}

/**
 * Filter initiatives by status, search query, and classification scope ('all' | 'my' | 'others')
 * @param {Array} initiatives
 * @param {Object} filters
 * @param {string} filters.statusFilter - 'all', 'planning', 'active', etc.
 * @param {string} filters.search - Search string
 * @param {string} filters.classificationFilter - 'all', 'my', 'others'
 * @param {Object} filters.user - Logged in user context object
 * @returns {Array}
 */
export function filterInitiatives(initiatives = [], { statusFilter = 'all', search = '', classificationFilter = 'all', user }) {
  return initiatives.filter((init) => {
    // 1. Status Filter
    const matchesStatus =
      statusFilter === 'all' ||
      (init.status || '').toLowerCase() === statusFilter.toLowerCase();

    // 2. Search Query
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      init.name?.toLowerCase().includes(q) ||
      init.description?.toLowerCase().includes(q) ||
      init.impact?.toLowerCase().includes(q);

    // 3. Classification Scope Filter ('all', 'my', 'others')
    let matchesClassification = true;
    if (classificationFilter === 'my') {
      matchesClassification = isMyInitiative(init, user);
    } else if (classificationFilter === 'others') {
      matchesClassification = !isMyInitiative(init, user);
    }

    return matchesStatus && matchesSearch && matchesClassification;
  });
}

/**
 * Partition filtered initiatives into { myInitiatives, otherInitiatives }
 * @param {Array} initiatives
 * @param {Object} user
 * @returns {{ myInitiatives: Array, otherInitiatives: Array }}
 */
export function partitionInitiatives(initiatives = [], user) {
  const myInitiatives = [];
  const otherInitiatives = [];

  for (const init of initiatives) {
    if (isMyInitiative(init, user)) {
      myInitiatives.push(init);
    } else {
      otherInitiatives.push(init);
    }
  }

  return { myInitiatives, otherInitiatives };
}

/**
 * Check if an initiative or task deadline has passed
 * @param {string|Date} deadlineStr
 * @returns {boolean}
 */
export function isDeadlinePassed(deadlineStr) {
  if (!deadlineStr) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(deadlineStr);
  due.setHours(0, 0, 0, 0);
  return due < now;
}
