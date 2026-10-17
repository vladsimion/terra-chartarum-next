/*
 * `astro:content` is a virtual module that Astro generates into .astro/ during a build, and that
 * folder is not in this project's type-check (TypeScript 7, no @astrojs/check). This declares the
 * part the project's own .ts files use; the .astro pages that read the collection are checked by
 * the build itself.
 */
declare module 'astro:content' {
  export function defineCollection<T>(config: T): T;
}
