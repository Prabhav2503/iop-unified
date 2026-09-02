// ─── Role Helpers & Permission Check Functions ──────────────────────────────

export function getRoleStr(role) {
  if (!role) return '';
  if (typeof role === 'object' && !Array.isArray(role)) {
    const r = role.role || role.roles || role.user_role || '';
    return (Array.isArray(r) ? r.join(' ') : String(r)).toLowerCase();
  }
  return (Array.isArray(role) ? role.join(' ') : String(role)).toLowerCase();
}


export function editPrivilegedRole(user) {
  if (!user) return false;
  const r = getRoleStr(user.role || user);
  return (
    r.includes('admin') ||
    r.includes('overall_coordinator') ||
    r.includes('co_overall_coordinator')
  );
}


export function addPrivilegedRole(user) {
  if (!user) return false;
  const r = getRoleStr(user.role || user);
  return (
    r.includes('admin') ||
    r.includes('overall_coordinator') ||
    r.includes('co_overall_coordinator') ||
    r.includes('coordinator')
  );
}
