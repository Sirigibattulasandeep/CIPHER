export type ImportedOrigin = 'IMPORTED' | 'DEMO';

/** Only the server marks a live connector as CONNECTED. Client records can be imported or demo. */
export function resolveImportedProvenance(requestedOrigin?: string): {
  origin: ImportedOrigin;
  sourceReliability: number;
} {
  const origin = requestedOrigin?.toLocaleUpperCase() === 'DEMO' ? 'DEMO' : 'IMPORTED';
  return { origin, sourceReliability: origin === 'DEMO' ? 0.6 : 0.75 };
}
