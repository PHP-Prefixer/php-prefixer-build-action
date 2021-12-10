import * as github from '@actions/github'
import {IGitCommandManager, createCommandManager} from './git-command-manager'
import {IGitSourceSettings} from 'github-checkout/lib/git-source-settings'

export interface IGitHelper {
  branchContainsTag(tag: string): Promise<string>
  branchExists(
    remote: boolean,
    remoteName: string,
    pattern: string
  ): Promise<boolean>
  checkout(ref: string, startPoint: string): Promise<void>
  checkoutToBranch(remoteName: string, branch: string): Promise<boolean>
  addAllAndCommit(): Promise<void>
  currentBranch(): Promise<string>
  currentRevision(): Promise<string>
  fetchRemote(remoteName: string, fetchDepth?: number): Promise<void>
  hasChanges(): Promise<boolean>
  init(): Promise<void>
  lastMatchingTag(pattern: string): Promise<string | undefined>
  pull(remoteName: string, branch: string): Promise<void>
  push(remote: string, refSpec?: string): Promise<void>
  remoteAddLocalPath(remoteName: string, path: string): Promise<void>
  remoteAddUrl(remoteName: string): Promise<void>
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

  async branchExists(
    remote: boolean,
    remoteName: string,
    pattern: string
  ): Promise<boolean> {
    return await this.gitCommandManager.branchExists(
      remote,
      remoteName ? `${remoteName}/${pattern}` : pattern
    )
  }

  async checkout(ref: string, startPoint: string): Promise<void> {
    if (!this.adviced) {
      await this.gitCommandManager.config('advice.detachedHead', 'false')
      this.adviced = true
    }

    return await this.gitCommandManager.checkout(ref, startPoint)
  }

  async checkoutToBranch(remoteName: string, branch: string): Promise<boolean> {
    const remoteNameBranch = remoteName ? `${remoteName}/${branch}` : branch
    const branchExists = await this.gitCommandManager.branchExists(
      !!remoteName,
      remoteNameBranch
    )

    if (branchExists) {
      await this.gitCommandManager.checkout(remoteNameBranch)
      return false
    }

    await this.gitCommandManager.checkoutNewBranch(branch)

    if (remoteName) {
      await this.gitCommandManager.push(remoteName, branch)
    }

    return true
  }

  async addAllAndCommit(): Promise<void> {
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

  async fetchRemote(remoteName: string, fetchDepth?: number): Promise<void> {
    return this.gitCommandManager.fetchRemote(remoteName, fetchDepth)
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

  async pull(remoteName: string, branch: string): Promise<void> {
    // await this.gitCommandManager.stash()
    await this.gitCommandManager.pull(remoteName, branch)
    // return this.gitCommandManager.stashPop()
  }

  async push(remote: string, refSpec?: string): Promise<void> {
    return this.gitCommandManager.push(remote, refSpec)
  }

  async remoteAddLocalPath(remoteName: string, path: string): Promise<void> {
    return this.gitCommandManager.remoteAdd(remoteName, path)
  }

  async remoteAddUrl(remoteName: string): Promise<void> {
    const qualifiedRepository = this.qualifiedRepository()
    let fetchUri = await this.gitCommandManager.tryGetFetchUrl()

    if (fetchUri && !fetchUri.endsWith(qualifiedRepository)) {
      const baseUrl = fetchUri.split(this.settings.repositoryOwner)[0]
      fetchUri = `${baseUrl}${qualifiedRepository}.git`
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
