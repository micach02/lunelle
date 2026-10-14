import type { ShareScopes } from './services/partnerService';

/** "Cycle phases & periods, symptoms & mood and intimacy records, including notes." */
export function describeScopes(scopes: ShareScopes): string {
  const parts = ['cycle phases & periods'];
  if (scopes.symptoms) parts.push('symptoms & mood');
  if (scopes.intimacy) parts.push('intimacy records');
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0];
  const hasNotes = scopes.notes && (scopes.symptoms || scopes.intimacy);
  const editing = scopes.canEdit ? ' Can add and edit (not delete) records.' : '';
  return `${list[0].toUpperCase()}${list.slice(1)}${hasNotes ? ', including notes' : ''}.${editing}`;
}
