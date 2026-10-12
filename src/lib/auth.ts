/**
 * Server-only tenant boundary. Replace this resolver with the established
 * session provider when authentication is integrated; repositories must always
 * scope reads and writes with the returned organisation id.
 */
export type OrganisationContext = { organisationId: string; userId: string; role: 'owner'|'analyst' };
export function getDemoOrganisationContext(): OrganisationContext { return { organisationId: 'org_demo', userId: 'user_demo', role: 'owner' }; }
