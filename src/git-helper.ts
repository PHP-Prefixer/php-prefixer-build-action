import * as github from '@actions/github'
import {IGitCommandManager, createCommandManager} from './git-command-manager'
import {IGitSourceSettings} from 'github-checkout/lib/git-source-settings'

export interface IGitHelper {
  branchContainsTag(tag: string): Promise<string>
  branchExists(remote: boolean, pattern: string): Promise<boolean>
  checkout(ref: string, startPoint: string): Promise<void>
  checkoutToBranch(remote: boolean, branch: string): Promise<boolean>
  commitAll(): Promise<void>
  currentBranch(): Promise<string>
  currentRevision(): Promise<string>
  currentTag(): Promise<string | undefined>
  hasChanges(): Promise<boolean>
  init(): Promise<void>
  lastMatchingTag(pattern: string): Promise<string | undefined>
  pull(remote: boolean, branch: string): Promise<void>
  push(remote: string, branch: string): Promise<void>
  remoteAdd(isRemote: boolean, remoteName: string): Promise<void>
  remoteExists(remote: string): Promise<boolean>
  revisionDate(ref: string): Promise<Date>
  tag(tag: string): Promise<void>
  tagExists(pattern: string): Promise<boolean>
}

export async function createGitHelper(
  settings: IGitSourceSettings
): Promise<IGitHelper> {
  return await GitHelper.create(settings)
}

export class GitHelper implements IGitHelper {
  // Private constructor; use create()
  private constructor(private gitCommandManager: IGitCommandManager) {}

  private settings: IGitSourceSettings = {
    authToken: '',
    clean: true,
    commit: '',
    fetchDepth: 1,
    lfs: false,
    submodules: false,
    nestedSubmodules: false,
    persistCredentials: false,
    ref: 'refs/heads/main',
    repositoryName: '',
    repositoryOwner: '',
    repositoryPath: '',
    sshKey: '',
    sshKnownHosts: '',
    sshStrict: true
  }

  private adviced = false

  async branchContainsTag(tag: string): Promise<string> {
    try {
      const result = await this.gitCommandManager.branchContainsTag(tag)
      const lines = result.split('\n')
      const branch = lines.shift() || ''

      return branch.replace('* ', '')
    } catch (error) {
      throw new Error('No branch found')
    }
  }

  async branchExists(remote: boolean, pattern: string): Promise<boolean> {
    if (remote) {
      return await this.gitCommandManager.branchExists(
        remote,
        `origin/${pattern}`
      )
    }

    return await this.gitCommandManager.branchExists(remote, pattern)
  }

  async checkout(ref: string, startPoint: string): Promise<void> {
    if (!this.adviced) {
      await this.gitCommandManager.config('advice.detachedHead', 'false')
      this.adviced = true
    }

    return await this.gitCommandManager.checkout(ref, startPoint)
  }

  async checkoutToBranch(remote: boolean, branch: string): Promise<boolean> {
    let branchExists: boolean

    if (remote) {
      branchExists = await this.gitCommandManager.branchExists(
        true,
        `origin/${branch}`
      )
    } else {
      branchExists = await this.gitCommandManager.branchExists(false, branch)
    }

    if (branchExists) {
      await this.gitCommandManager.checkout(branch, '')
      return false
    }

    await this.gitCommandManager.checkoutNewBranch(branch)
    return true
  }

  async commitAll(): Promise<void> {
    await this.gitCommandManager.addAll()

    const now = new Date()
    const message = `Publish prefixed build ${now.toISOString()}`
    await this.gitCommandManager.commit(message)
  }

  async currentBranch(): Promise<string> {
    return this.gitCommandManager.branchShowCurrent()
  }

  async currentRevision(): Promise<string> {
    return this.gitCommandManager.revParse('HEAD')
  }

  async currentTag(): Promise<string | undefined> {
    try {
      return await this.gitCommandManager.describeTags()
    } catch (error) {
      return undefined
    }
  }

  async hasChanges(): Promise<boolean> {
    const result = await this.gitCommandManager.statusPorcelain()

    const resultLines = result
      .trim()
      .split('\n')
      .filter(word => {
        if (word.endsWith('vendor/autoload.php')) {
          return false
        }

        if (word.endsWith('vendor/composer/autoload_real.php')) {
          return false
        }

        if (word.endsWith('vendor/composer/autoload_static.php')) {
          return false
        }

        if (word.endsWith('vendor/composer/installed.php')) {
          return false
        }

        return true
      })

    return resultLines.length > 0
  }

  async init(): Promise<void> {
    return this.gitCommandManager.init()
  }

  async lastMatchingTag(pattern: string): Promise<string | undefined> {
    const result = await this.gitCommandManager.tagSearch(pattern)
    const tag = result.pop()

    if (tag) {
      return tag
    }

    return undefined
  }

  async pull(remote: boolean, branch: string): Promise<void> {
    if (remote) {
      return this.gitCommandManager.pull('origin', branch)
    }

    return this.gitCommandManager.pull('', branch)
  }

  async push(remote: string, branch: string): Promise<void> {
    return this.gitCommandManager.push(remote, branch)
  }

  async remoteAdd(isRemote: boolean, remoteName: string): Promise<void> {
    const qualifiedRepository = this.qualifiedRepository()
    let fetchUri = await this.gitCommandManager.tryGetFetchUrl()

    if (isRemote && fetchUri && !fetchUri.endsWith(qualifiedRepository)) {
      const baseUrl = fetchUri.split(this.settings.repositoryOwner)[0]
      fetchUri = `${baseUrl}/${qualifiedRepository}.git`
    }

    return this.gitCommandManager.remoteAdd(remoteName, fetchUri)
  }

  async remoteExists(remote: string): Promise<boolean> {
    return this.gitCommandManager.remoteExists(remote)
  }

  async revisionDate(ref: string): Promise<Date> {
    return await this.gitCommandManager.date(ref)
  }

  async tag(tag: string): Promise<void> {
    return this.gitCommandManager.tag(tag)
  }

  async tagExists(pattern: string): Promise<boolean> {
    return this.gitCommandManager.tagExists(pattern)
  }

  static async create(settings: IGitSourceSettings): Promise<IGitHelper> {
    const gitCommandManager = await createCommandManager(
      settings.repositoryPath,
      settings.lfs
    )

    const gitHelper = new GitHelper(gitCommandManager)
    gitHelper.settings = settings

    return gitHelper
  }

  private qualifiedRepository(): string {
    return `${github.context.repo.owner}/${github.context.repo.repo}`
  }
}
