import * as fs from 'fs'
import * as gitSourceProvider from 'github-checkout/lib/git-source-provider'
import {create as createRsync} from '../src/rsync-command-manager'
import {env} from 'process'
import {expect, test, beforeEach, xtest} from '@jest/globals'
import {getExecOutput} from '@actions/exec'
import {IGitHelper, createGitHelper} from '../src/git-helper'
import {IGitSourceSettings} from 'github-checkout/lib/git-source-settings'
import {IPhpPrefixerSettings} from '../src/php-prefixer-settings'
import {makeTempPath} from '../src/fs-helper'
import {PhpPrefixerHelper} from '../src/php-prefixer-helper'
import InputHelper from '../src/input-helper'
import {createCommandManager} from '../src/git-command-manager'

let srcTmpPath: string | undefined
let sourceSettings: IGitSourceSettings
let phpPrefixerSettings: IPhpPrefixerSettings

async function createTmpRepo(): Promise<IGitHelper> {
  const inputHelper = new InputHelper()
  const composerJson =
    inputHelper.baseDirPath + '/__tests__/Mock-Composer/composer.json'

  srcTmpPath = await makeTempPath()
  const settings = {...sourceSettings, repositoryPath: srcTmpPath}
  const gitHelper = await createGitHelper(settings)
  await gitHelper.init()

  await getExecOutput(`cp ${composerJson} ${srcTmpPath}/composer.json`)
  await gitHelper.addAllAndCommit()

  return gitHelper
}

async function destroyTmpRepo() {
  if (!srcTmpPath) {
    return
  }

  if (fs.existsSync(srcTmpPath)) {
    await fs.promises.rm(srcTmpPath, {recursive: true})
  }

  srcTmpPath = undefined
}

beforeEach(() => {
  sourceSettings = {
    repositoryPath: '',
    repositoryOwner: '',
    repositoryName: '',
    ref: '',
    commit: '',
    clean: true,
    fetchDepth: 0,
    lfs: false,
    submodules: false,
    nestedSubmodules: false,
    authToken: env.PHP_PREFIXER_GH_TOKEN || '',
    sshKey: '',
    sshKnownHosts: '',
    sshStrict: true,
    persistCredentials: true
  }

  phpPrefixerSettings = {
    sourceDirPath: '',
    targetDirPath: '',
    personalAccessToken: env.PHP_PREFIXER_PERSONAL_ACCESS_TOKEN || '',
    projectId: env.PHP_PREFIXER_PROJECT_ID || '',
    ghPersonalAccessToken: env.PHP_PREFIXER_GH_TOKEN || '',
    schema:
      '{"project-name": "Prefixed Project","namespaces-prefix": "PPP","global-scope-prefix": "PPP_"}'
  }

  env.GITHUB_REPOSITORY = 'anibalsanchez/hello-wp-world'
})

test('waiting job false - psr/container master branch / prefixed', async () => {
  const sourcePath = await makeTempPath()
  sourceSettings.repositoryPath = sourcePath
  sourceSettings.repositoryName = 'container'
  sourceSettings.repositoryOwner = 'php-fig'

  // Download source
  await gitSourceProvider.getSource(sourceSettings)

  const phpPrefixerHelper = await PhpPrefixerHelper.create(
    sourceSettings,
    phpPrefixerSettings
  )
  const result = await phpPrefixerHelper.waitingJob()

  expect(result).toBeFalsy()
  expect(phpPrefixerHelper.targetPrefixedBranch).toBe('prefixed')
  expect(phpPrefixerHelper.targetPrefixedTag).toBeFalsy()

  await phpPrefixerHelper.cleanup()
  await gitSourceProvider.cleanup(sourcePath)
  await fs.promises.rm(sourcePath, {recursive: true})
})

test('waiting job false - psr/container 1.x branch / prefixed-1.x', async () => {
  const sourcePath = await makeTempPath()
  sourceSettings.repositoryPath = sourcePath
  sourceSettings.repositoryName = 'container'
  sourceSettings.repositoryOwner = 'php-fig'
  sourceSettings.ref = '1.x'

  // Download source
  await gitSourceProvider.getSource(sourceSettings)

  const phpPrefixerHelper = await PhpPrefixerHelper.create(
    sourceSettings,
    phpPrefixerSettings
  )
  const result = await phpPrefixerHelper.waitingJob()

  expect(result).toBeFalsy()
  expect(phpPrefixerHelper.targetPrefixedBranch).toBe('prefixed-1.x')
  expect(phpPrefixerHelper.targetPrefixedTag).toBeFalsy()

  await phpPrefixerHelper.cleanup()
  await gitSourceProvider.cleanup(sourcePath)
  await fs.promises.rm(sourcePath, {recursive: true})
})

test('waiting job false - psr/container master 1.1.1 / prefixed prefixed-1.1.1', async () => {
  const sourcePath = await makeTempPath()
  sourceSettings.repositoryPath = sourcePath
  sourceSettings.repositoryName = 'container'
  sourceSettings.repositoryOwner = 'php-fig'
  sourceSettings.ref = '1.1.1'

  // Download source
  await gitSourceProvider.getSource(sourceSettings)

  const phpPrefixerHelper = await PhpPrefixerHelper.create(
    sourceSettings,
    phpPrefixerSettings
  )
  const result = await phpPrefixerHelper.waitingJob()

  expect(result).toBeTruthy()
  expect(phpPrefixerHelper.targetPrefixedBranch).toBe('prefixed')
  expect(phpPrefixerHelper.targetPrefixedTag).toBe('prefixed-1.1.1')

  await phpPrefixerHelper.cleanup()
  await gitSourceProvider.cleanup(sourcePath)
  await fs.promises.rm(sourcePath, {recursive: true})
})

test('waiting job false - local master / prefixed', async () => {
  const gitHelper = await createTmpRepo()
  gitHelper.checkoutToBranch('', 'prefixed')
  await getExecOutput(`touch ${srcTmpPath}/license.txt`)
  await gitHelper.addAllAndCommit()
  gitHelper.checkoutToBranch('', 'master')

  // Download source
  sourceSettings.ref = 'refs/heads/master'
  sourceSettings.repositoryPath = srcTmpPath || '/undefined-path'

  const phpPrefixerHelper = await PhpPrefixerHelper.create(
    sourceSettings,
    phpPrefixerSettings,
    gitHelper
  )
  const result = await phpPrefixerHelper.waitingJob()
  expect(result).toBeFalsy()

  await phpPrefixerHelper.cleanup()
  await destroyTmpRepo()
})

test('waiting job false - local 1.1 / prefixed-1.1', async () => {
  const gitHelper = await createTmpRepo()
  gitHelper.checkoutToBranch('', '1.1')
  await getExecOutput(`touch ${srcTmpPath}/license-time1.txt`)
  await gitHelper.addAllAndCommit()
  gitHelper.checkoutToBranch('', 'prefixed-1.1')
  await getExecOutput(`touch ${srcTmpPath}/license-time2.txt`)
  await gitHelper.addAllAndCommit()
  gitHelper.checkoutToBranch('', '1.1')

  // Download source
  sourceSettings.ref = '1.1'
  sourceSettings.repositoryPath = srcTmpPath || '/undefined-path'

  const phpPrefixerHelper = await PhpPrefixerHelper.create(
    sourceSettings,
    phpPrefixerSettings,
    gitHelper
  )
  const result = await phpPrefixerHelper.waitingJob()
  expect(result).toBeFalsy()

  await destroyTmpRepo()
  await phpPrefixerHelper.cleanup()
})

test('waiting job false - local master 1.1.1 / prefixed prefixed-1.1.1', async () => {
  const gitHelper = await createTmpRepo()
  gitHelper.tag('1.1.1')

  gitHelper.checkoutToBranch('', 'prefixed')
  await getExecOutput(`touch ${srcTmpPath}/license.txt`)
  await gitHelper.addAllAndCommit()
  gitHelper.tag('prefixed-1.1.1')

  gitHelper.checkoutToBranch('', 'master')

  // Download source
  sourceSettings.ref = '1.1.1'
  sourceSettings.repositoryPath = srcTmpPath || '/undefined-path'

  const phpPrefixerHelper = await PhpPrefixerHelper.create(
    sourceSettings,
    phpPrefixerSettings,
    gitHelper
  )
  const result = await phpPrefixerHelper.waitingJob()
  expect(result).toBeFalsy()

  await destroyTmpRepo()
  await phpPrefixerHelper.cleanup()
})

test('prefix - local master / prefixed', async () => {
  const inputHelper = new InputHelper()
  const mockedProject = inputHelper.baseDirPath + '/__tests__/Mock-PhpPrefixer'

  const srcTmpPath = await makeTempPath()
  const settings = {...sourceSettings, repositoryPath: srcTmpPath}
  const gitHelper = await createGitHelper(settings)
  await gitHelper.init()
  const rsync = await createRsync()
  await rsync.copyProjectFiles(mockedProject, srcTmpPath)
  await gitHelper.addAllAndCommit()

  const upstreamTmpPath = await makeTempPath()
  await getExecOutput(`git clone --bare ${srcTmpPath} ${upstreamTmpPath}`)

  // Download source
  sourceSettings.repositoryPath = srcTmpPath
  sourceSettings.ref = 'refs/heads/master'

  const targetTmpPath = await makeTempPath()
  await getExecOutput(`git clone ${upstreamTmpPath} ${targetTmpPath}`)

  const phpPrefixerHelper = await PhpPrefixerHelper.create(
    sourceSettings,
    phpPrefixerSettings,
    undefined,
    targetTmpPath
  )
  const resultWaitingJob = await phpPrefixerHelper.waitingJob()
  expect(resultWaitingJob).toBeTruthy()

  const resultPrefix1 = await phpPrefixerHelper.prefix()
  expect(resultPrefix1).toBeTruthy()

  const branchExists = await gitHelper.branchExists(false, '', 'prefixed')
  expect(branchExists).toBeTruthy()

  // Prefix again, to check that there are "No Changes"
  const resultPrefix2 = await phpPrefixerHelper.prefix()
  expect(resultPrefix2).toBeFalsy()

  await phpPrefixerHelper.cleanup()
  await fs.promises.rm(srcTmpPath, {recursive: true})
  await fs.promises.rm(upstreamTmpPath, {recursive: true})
})

test('prefix - local master 1.1.1 / prefixed prefixed-1.1.1', async () => {
  const inputHelper = new InputHelper()
  const mockedProject = inputHelper.baseDirPath + '/__tests__/Mock-PhpPrefixer'

  const srcTmpPath = await makeTempPath()
  const settings = {...sourceSettings, repositoryPath: srcTmpPath}
  const gitHelper = await createGitHelper(settings)
  await gitHelper.init()
  const rsync = await createRsync()
  await rsync.copyProjectFiles(mockedProject, srcTmpPath)
  await gitHelper.addAllAndCommit()
  await gitHelper.tag('1.1.1')

  const upstreamTmpPath = await makeTempPath()
  await getExecOutput(`git clone --bare ${srcTmpPath} ${upstreamTmpPath}`)

  // Download source
  sourceSettings.repositoryPath = srcTmpPath
  sourceSettings.ref = '1.1.1'

  const targetTmpPath = await makeTempPath()
  await getExecOutput(`git clone ${upstreamTmpPath} ${targetTmpPath}`)

  const phpPrefixerHelper = await PhpPrefixerHelper.create(
    sourceSettings,
    phpPrefixerSettings,
    undefined,
    targetTmpPath
  )
  const resultWaitingJob1 = await phpPrefixerHelper.waitingJob()
  expect(resultWaitingJob1).toBeTruthy()

  await phpPrefixerHelper.prefix()

  const branchExists = await gitHelper.branchExists(false, '', 'prefixed')
  expect(branchExists).toBeTruthy()
  const tagExists = await gitHelper.tagExists('prefixed-1.1.1')
  expect(tagExists).toBeTruthy()

  await phpPrefixerHelper.cleanup()
  await fs.promises.rm(srcTmpPath, {recursive: true})
  await fs.promises.rm(upstreamTmpPath, {recursive: true})
})
