// ─── Team vertical filtering and helper utilities ─────────────────────────

/**
 * Check if a vertical string represents top leadership / overall coordinator vertical ('All' or 'Overall Coordinators')
 * @param {string} vertical
 * @returns {boolean}
 */
export function isAllVertical(vertical) {
  if (!vertical) return false;
  const v = String(vertical).toLowerCase().trim();
  return v === 'all' || v === 'overall coordinators';
}

/**
 * Derive sorted list of unique active verticals from team members array (excluding 'All')
 * @param {Array} teamMembers
 * @returns {Array<string>}
 */
export function getActiveVerticals(teamMembers = []) {
  const verticals = teamMembers
    .map((m) => m.vertical)
    .filter(Boolean)
    .filter((v) => !isAllVertical(v));

  return [...new Set(verticals)].sort();
}

/**
 * Build option objects for PillFilter component (excluding 'All' from discrete vertical pills)
 * @param {Array} teamMembers
 * @returns {Array<{value: string, label: string}>}
 */
export function getVerticalOptions(teamMembers = []) {
  const activeVerticals = getActiveVerticals(teamMembers);
  return [
    { value: 'all', label: 'All verticals' },
    ...activeVerticals.map((v) => ({ value: v, label: v })),
  ];
}

/**
 * Filter team members by selected vertical
 * @param {Array} members
 * @param {string} verticalFilter
 * @returns {Array}
 */
export function filterMembersByVertical(members = [], verticalFilter = 'all') {
  if (!verticalFilter || verticalFilter.toLowerCase() === 'all') return members;
  return members.filter((m) => {
    const v = (m.vertical || '').toLowerCase();
    const filter = verticalFilter.toLowerCase();
    // Match the vertical or allow 'All' vertical leaders if desired
    return v === filter || isAllVertical(m.vertical);
  });
}

/**
 * Filter team members by search query and vertical filter
 * @param {Array} members
 * @param {Object} options
 * @param {string} options.search
 * @param {string} options.verticalFilter
 * @param {Function} options.getRoleDisplay
 * @returns {Array}
 */
export function filterTeamMembers(members = [], { search = '', verticalFilter = 'all', getRoleDisplay }) {
  return members.filter((m) => {
    // If a specific vertical filter is selected (not 'all'), only match members of that vertical
    if (verticalFilter && verticalFilter.toLowerCase() !== 'all') {
      const v = (m.vertical || '').toLowerCase();
      const targetV = verticalFilter.toLowerCase();
      if (v !== targetV && !isAllVertical(m.vertical)) {
        return false;
      }
    }

    const q = search.toLowerCase().trim();
    if (!q) return true;

    const roleText = getRoleDisplay ? getRoleDisplay(m.role) : (Array.isArray(m.role) ? m.role.join(' ') : m.role || '');

    return (
      m.name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.vertical?.toLowerCase().includes(q) ||
      roleText.toLowerCase().includes(q)
    );
  });
}

/**
 * Partition team members into top members (vertical 'All' or Overall Coordinator role) and vertical members
 * @param {Array} members
 * @param {Function} isTopMemberFn
 * @returns {{ topMembers: Array, verticalMembers: Array }}
 */
export function partitionTopMembers(members = [], isTopMemberFn) {
  const topMembers = [];
  const verticalMembers = [];

  for (const member of members) {
    const isAll = isAllVertical(member.vertical);
    const isTopRole = isTopMemberFn ? isTopMemberFn(member) : false;

    if (isAll || isTopRole) {
      topMembers.push(member);
    } else {
      verticalMembers.push(member);
    }
  }

  return { topMembers, verticalMembers };
}

/**
 * Get numeric hierarchy rank for a role (1: Admin, 2: Overall Coordinator / Co-Overall, 3: Coordinator, 4: Executive, 5: Other)
 * @param {Array|string} role
 * @returns {number}
 */
export function getRoleRank(role) {
  const r = (Array.isArray(role) ? role.join(' ') : role || '').toLowerCase();
  if (r.includes('admin')) return 1;
  if (r.includes('overall_coordinator') || r.includes('co_overall_coordinator') || r.includes('co overall')) return 2;
  if (r.includes('coordinator')) return 3;
  if (r.includes('executive')) return 4;
  return 5;
}

/**
 * Sort array of team members strictly by hierarchy rank (Admin -> Coordinators -> Executives)
 * @param {Array} members
 * @returns {Array}
 */
export function sortMembersByHierarchy(members = []) {
  return [...members].sort((a, b) => {
    const rankA = getRoleRank(a.role);
    const rankB = getRoleRank(b.role);
    if (rankA !== rankB) return rankA - rankB;
    return (a.name || '').localeCompare(b.name || '');
  });
}
