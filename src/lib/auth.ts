/**
 * Server-only tenant boundary. Replace this resolver with the established
 * session provider when authentication is integrated; repositories must always
 * scope reads and writes with the returned organisation id.
 */
export type OrganisationContext = { organisationId: string; userId: string; role: 'owner'|'analyst' };
export function getDemoOrganisationContext(): OrganisationContext { return { organisationId: 'org_demo', userId: 'user_demo', role: 'owner' }; }
export function assertOrganisationRequest(request:Request){ const requested=request.headers.get('x-organisation-id'); const context=getDemoOrganisationContext(); if(requested && requested!==context.organisationId) throw new Error('FORBIDDEN_ORGANISATION'); return context; }
