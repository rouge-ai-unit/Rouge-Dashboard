declare module "@neondatabase/serverless" {
  /**
   * Minimal type shim for the Neon HTTP client. Returns a tagged template function
   * compatible with drizzle-orm's neon-http driver. Typed as any for simplicity.
   */
  export function neon(connectionString: string): any;
}
