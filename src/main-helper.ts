/* Based on GitHub/ 'github-checkout' */

import * as checkoutInputHelper from 'github-checkout/lib/input-helper'
import * as core from '@actions/core'
import * as coreCommand from '@actions/core/lib/command'
import * as fs from 'fs'
import * as gitSourceProvider from 'github-checkout/lib/git-source-provider'
import * as path from 'path'
import * as phpPrefixerInputHelper from './input-helper'
import {PhpPrefixerHelper} from './php-prefixer-helper'
import {makeTempPath} from './fs-helper'

let sourcePath: string

function registerProblemMatcherSync(): void {
  const candidates: string[] = []

  if (process.env['GITHUB_WORKSPACE']) {
    candidates.push(
      path.join(process.env['GITHUB_WORKSPACE'], 'problem-matcher.json')
    )
  }

  candidates.push(path.join(__dirname, 'problem-matcher.json'))
  // candidates.push('/dist/problem-matcher.json')

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      core.info('[php-prefixer-build-action] problem-matcher.json found.')

      coreCommand.issueCommand('add-matcher', {}, candidate)
      return
    }
  }

  throw new Error('Could not find problem-matcher.json')
}

export async function run(): Promise<number> {
  try {
    const sourceSettings = checkoutInputHelper.getInputs()
    sourceSettings.persistCredentials = true
    sourceSettings.fetchDepth = 0

    const phpPrefixerSettings = phpPrefixerInputHelper.getInputs()
    phpPrefixerSettings.ghPersonalAccessToken = sourceSettings.authToken

    try {
      registerProblemMatcherSync()

      sourcePath = await makeTempPath()
      sourceSettings.repositoryPath = sourcePath
      core.debug(`source path = '${sourcePath}'`)

      // Download source
      await gitSourceProvider.getSource(sourceSettings)

      const phpPrefixerHelper = await PhpPrefixerHelper.create(
        sourceSettings,
        phpPrefixerSettings
      )

      const waitingJob = await phpPrefixerHelper.waitingJob()
      if (!waitingJob) {
        core.info(
          '[php-prefixer-build-action] The project is already prefixed. ✅'
        )
        await phpPrefixerHelper.cleanup()
        return 0
      }

      core.info('[php-prefixer-build-action] Prefixing ...')
      await phpPrefixerHelper.prefix()
      await phpPrefixerHelper.cleanup()

      core.info('[php-prefixer-build-action] Project prefixed. 🚀')
      return 0
    } finally {
      // Unregister problem matcher
      coreCommand.issueCommand('remove-matcher', {owner: 'PHP-Prefixer'}, '')
    }
  } catch (error) {
    /* istanbul ignore next */
    core.setFailed(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      `[php-prefixer-build-action] ERROR: ${(error as any)?.message ?? error}`
    )
  }

  /* istanbul ignore next */
  return 1
}

export async function cleanup(): Promise<void> {
  if (sourcePath) {
    core.debug('Main cleanup')
    await gitSourceProvider.cleanup(sourcePath)
    await fs.promises.rm(sourcePath, {recursive: true})
    sourcePath = ''
  }
}
