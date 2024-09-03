import { defineNuxtModule, addPlugin, createResolver, logger } from "@nuxt/kit";
import { name, version } from "../package.json";
import { dirname } from "node:path";
import { loadCodegenConfig, generate } from "@graphql-codegen/cli";

// Module options TypeScript interface definition
export interface ModuleOptions {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name,
    version,
  },
  // Default configuration options of the Nuxt module
  defaults: {
    devOnly: false,
    extensions: [".graphql", ".gql"],
  },
  // @ts-ignore
  async setup({ devOnly, extensions }, nuxt) {
    const resolver = createResolver(import.meta.url);
    // Run in development mode only
    if (devOnly && !nuxt.options.dev) {
      return;
    }
    // Load GraphQL Code Generator configuration from rootDir
    const { config, filepath } = await loadCodegenConfig({
      configFilePath: nuxt.options.rootDir,
    });
    const cwd = dirname(filepath);

    // Execute GraphQL Code Generator
    async function codegen() {
      try {
        const start = Date.now();
        await generate({ ...config, cwd }, true);
        const time = Date.now() - start;
        logger.success(`GraphQL Code Generator generated code in ${time}ms`);
      } catch (e: unknown) {
        logger.error(`GraphQL Code Generator configuration not found.`);
      }
    }

    // Configure hooks
    nuxt.hook("build:before", codegen);
    nuxt.hook("builder:watch", async (_event, path) => {
      if (extensions.some((ext: string) => path.endsWith(ext))) {
        await codegen();
      }
    });

    // Do not add the extension since the `.ts` will be transpiled to `.mjs` after `npm run prepack`
    addPlugin(resolver.resolve("./runtime/plugin"));
  },
});
