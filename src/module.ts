import { dirname } from 'node:path'
import { defineNuxtModule, addPlugin, createResolver, logger } from '@nuxt/kit'
import { loadCodegenConfig, generate } from '@graphql-codegen/cli'
import { name, version } from '../package.json'

// Module options TypeScript interface definition
export type ModuleOptions = object

export type Config = {
  devOnly: boolean
  extensions: string[]
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name,
    version,
  },
  // Default configuration options of the Nuxt module
  defaults: {
    devOnly: false,
    extensions: ['.graphql', '.gql'],
  },
  setup(options, nuxt) {
    const opt: Config = options as Config
    const resolver = createResolver(import.meta.url)
    // Run in development mode only
    if (opt.devOnly && !nuxt.options.dev) {
      return
    }

    // Execute GraphQL Code Generator
    async function codegen() {
      try {
        // Load GraphQL Code Generator configuration from rootDir
        const { config, filepath } = await loadCodegenConfig({
          configFilePath: nuxt.options.rootDir,
        })
        const cwd = dirname(filepath)
        const start = Date.now()
        await generate({ ...config, cwd, silent: true }, true)
        const time = Date.now() - start
        logger.success(`${name} generated code in ${time}ms`)
      }
      catch (error) {
        logger.warn(`${name} - Please check your config file: codegen.ts or codegen.yaml`)
        logger.error(`${name} - ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    // Configure hooks
    nuxt.hook('build:before', codegen)
    nuxt.hook('builder:watch', async (_event, path) => {
      if (opt.extensions.some((ext: string) => path.endsWith(ext))) {
        await codegen()
      }
    })

    // Do not add the extension since the `.ts` will be transpiled to `.mjs` after `npm run prepack`
    addPlugin(resolver.resolve('./runtime/plugin'))
  },
})
