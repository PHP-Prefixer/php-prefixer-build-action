import * as core from '@actions/core'
import * as fs from 'fs'
import {IGitHelper, createGitHelper} from './git-helper'
import {copyFilesFromSourceDirToTargetDir, makeTempPath} from './fs-helper'
import {generateDotEnv, rmDotEnv} from './env-helper'
import {IGitSourceSettings} from 'github-checkout/lib/git-source-settings'
import {IPhpPrefixerSettings} from './php-prefixer-settings'
import {createComposerHelper} from './composer-helper'
import {create as createFindCommand} from './find-command-manager'
import {create as createPhpPrefixerCommandManager} from './php-prefixer-command-manager'

function generatePrefixedRef(ref: string): string {
  if (!ref || ref === 'main' || ref === 'master') {
    return 'prefixed'
  }

  return `prefixed-${ref}`
}

export interface IPhpPrefixerHelperOptions {
  prepareRepositories: boolean
}

interface IComposerSchema {
  composerSchema: object
  phpPrefixerSchema?: object
}

export class PhpPrefixerHelper {
  private sourceBranch = ''
  private sourceTag = ''

  targetPrefixedBranch = ''
  targetPrefixedTag = ''

  private isRemote = true

  constructor(
    private sourceSettings: IGitSourceSettings,
    private phpPrefixerSettings: IPhpPrefixerSettings,
    private sourceGitHelper: IGitHelper,
    private targetPath: string,
    private targetGitHelper: IGitHelper
  ) {}

  async waitingJob(): Promise<boolean> {
    core.debug('Checking waiting job')

    // Never prefixed
    const branchExists = await this.sourceGitHelper.branchExists(
      this.isRemote,
      this.isRemote ? 'origin' : '',
      this.targetPrefixedBranch
    )
    if (!branchExists) {
      return true
    }

    // Prefixing tagged releases
    if (this.targetPrefixedTag) {
      // If prefixed tag exits, it is already processed. Otherwise, it has to be prefixed
      const tagExists = await this.sourceGitHelper.tagExists(
        this.targetPrefixedTag
      )

      return !tagExists
    }

    // There is a prefixed branch (no tag), let's compare dates

    const sourceCurrentRevision = await this.sourceGitHelper.currentRevision()
    const sourceRevisionDate = await this.sourceGitHelper.revisionDate(
      sourceCurrentRevision
    )

    await this.sourceGitHelper.checkout(this.targetPrefixedBranch, '')

    const lastPrefixedRevision = await this.sourceGitHelper.currentRevision()
    const lastPrefixedRevisionDate = await this.sourceGitHelper.revisionDate(
      lastPrefixedRevision
    )

    // Go back to the current revision
    await this.sourceGitHelper.checkout(sourceCurrentRevision, '')

    const elapsed =
      sourceRevisionDate.getTime() - lastPrefixedRevisionDate.getTime()

    // The last prefixed commit is behind
    return elapsed > 0
  }

  async prefix(
    options: IPhpPrefixerHelperOptions = {prepareRepositories: true}
  ): Promise<boolean> {
    if (options.prepareRepositories) {
      await this.prepareRepositories()
    }

    core.debug('Validating')
    const composerSchema = await this.validate()

    core.debug('Prefixing')

    const phpPrefixerSettings: IPhpPrefixerSettings = {
      sourceDirPath: this.sourceSettings.repositoryPath,
      targetDirPath: this.targetPath,
      personalAccessToken: this.phpPrefixerSettings.personalAccessToken,
      projectId: this.phpPrefixerSettings.projectId,
      ghPersonalAccessToken: this.sourceSettings.authToken,
      schema: this.phpPrefixerSettings.schema
    }
    await generateDotEnv(this.targetPath, phpPrefixerSettings)

    if (phpPrefixerSettings.schema) {
      await this.applySchema(composerSchema)
    }

    const phpPrefixerCommandManager = await createPhpPrefixerCommandManager(
      this.targetPath
    )
    await phpPrefixerCommandManager.prefix(
      phpPrefixerSettings.sourceDirPath,
      phpPrefixerSettings.targetDirPath,
      phpPrefixerSettings.personalAccessToken,
      phpPrefixerSettings.projectId,
      phpPrefixerSettings.ghPersonalAccessToken
    )

    await rmDotEnv(this.targetPath)
    const targetComposerHelper = await createComposerHelper(this.targetPath)
    await targetComposerHelper.installAndOptimize()

    const hasChanges = await this.targetGitHelper.hasChanges()

    if (!hasChanges) {
      return false
    }

    await this.targetGitHelper.commitAll()

    if (this.targetPrefixedTag) {
      await this.targetGitHelper.tag(this.targetPrefixedTag)
    }

    await this.targetGitHelper.push('prefixed', this.targetPrefixedBranch)

    return true
  }

  async cleanup(): Promise<void> {
    core.debug('Cleaning up')

    if (this.targetPath && fs.existsSync(this.targetPath)) {
      await fs.promises.rm(this.targetPath, {
        recursive: true
      })
    }

    this.targetPath = ''
  }

  // ref: '', branch, tag or SHA to prefix => 'prefixed', prefixed-branch, prefixed-tag or prefixed-SHA
  // branch 'master' || 'main' => 'prefixed'
  // branch '7.1' => 'prefixed-7.1'
  // tag '7.1.1' => branch 'prefixed' tag 'prefixed-7.1.1'
  private async retrieveReferences(): Promise<void> {
    core.debug('Retrieving references')

    this.isRemote = await this.sourceGitHelper.remoteExists('origin')

    this.sourceBranch = await this.sourceGitHelper.currentBranch()
    this.targetPrefixedBranch = generatePrefixedRef(this.sourceBranch)

    const lastMatchingTag = await this.sourceGitHelper.lastMatchingTag(
      this.sourceSettings.ref
    )
    this.sourceTag = lastMatchingTag || ''

    if (!this.sourceTag) {
      return
    }

    // Prefixing the tag
    this.sourceBranch = await this.sourceGitHelper.branchContainsTag(
      this.sourceTag
    )
    this.targetPrefixedBranch = 'prefixed'
    this.targetPrefixedTag = generatePrefixedRef(this.sourceTag)
  }

  private async prepareRepositories(): Promise<void> {
    core.debug('Preparing source and target repositories')

    // Initialize the target composer project with the source project files
    await copyFilesFromSourceDirToTargetDir(
      this.sourceSettings.repositoryPath,
      this.targetPath
    )

    await this.targetGitHelper.remoteAdd(this.isRemote, 'prefixed')
    await this.targetGitHelper.fetchRemote('prefixed')

    const branchCreated = await this.targetGitHelper.checkoutToBranch(
      this.isRemote,
      'prefixed',
      this.targetPrefixedBranch
    )

    if (!branchCreated) {
      core.debug('Pulling remote branch')
      await this.targetGitHelper.pull('prefixed', this.targetPrefixedBranch)
    }

    // Initialize the source composer project
    const sourceComposerHelper = await createComposerHelper(
      this.sourceSettings.repositoryPath
    )
    await sourceComposerHelper.installAndOptimize()

    // Refresh the latest changes from the source to the prefixed branch
    await copyFilesFromSourceDirToTargetDir(
      this.sourceSettings.repositoryPath,
      this.targetPath
    )

    const findCommand = await createFindCommand(this.targetPath)
    await findCommand.deleteFileRecursively('composer.json')
    await findCommand.deleteFileRecursively('composer.lock')
    await findCommand.deleteFolderRecursively('vendor')
    await findCommand.deleteFolderRecursively('vendor_prefixed')
  }

  private async validate(): Promise<IComposerSchema> {
    const sourceComposerJson = this.sourceComposerJsonFile()

    if (!fs.existsSync(sourceComposerJson)) {
      throw new Error('composer.json not found')
    }

    if (!fs.existsSync(`${this.sourceSettings.repositoryPath}/composer.lock`)) {
      throw new Error('composer.lock not found')
    }

    try {
      const buffer = await fs.promises.readFile(sourceComposerJson)
      const composerSchema = JSON.parse(buffer.toString())

      if (this.phpPrefixerSettings.schema) {
        const phpPrefixerSchema = JSON.parse(this.phpPrefixerSettings.schema)
        return {composerSchema, phpPrefixerSchema}
      }

      if (!composerSchema['extra']) {
        throw new Error(
          'SchemaReader: prefixer configuration not found (extra)'
        )
      }

      if (!composerSchema['extra']['php-prefixer']) {
        throw new Error(
          'SchemaReader: prefixer configuration not found (php-prefixer)'
        )
      }

      return {composerSchema}
    } catch (error) {
      throw new Error('Unable to parse composer.json')
    }
  }

  private async applySchema(validatedSchema: IComposerSchema): Promise<void> {
    if (!validatedSchema.composerSchema['extra']) {
      validatedSchema.composerSchema['extra'] = {}
    }

    if (!validatedSchema.composerSchema['extra']['php-prefixer']) {
      validatedSchema.composerSchema['extra']['php-prefixer'] = {}
    }

    const generatedSchema = {...validatedSchema.composerSchema}

    generatedSchema['extra']['php-prefixer'] = {
      ...validatedSchema.composerSchema['extra']['php-prefixer'],
      ...validatedSchema.phpPrefixerSchema
    }

    const sourceComposerJson = this.sourceComposerJsonFile()
    await fs.promises.writeFile(
      sourceComposerJson,
      JSON.stringify(generatedSchema, null, 2)
    )
  }

  private sourceComposerJsonFile(): string {
    return `${this.sourceSettings.repositoryPath}/composer.json`
  }

  static async create(
    sourceSettings: IGitSourceSettings,
    phpPrefixerSettings: IPhpPrefixerSettings,
    sourceGitHelper?: IGitHelper,
    targetPath?: string,
    targetGitHelper?: IGitHelper
  ): Promise<PhpPrefixerHelper> {
    if (!sourceGitHelper) {
      sourceGitHelper = await createGitHelper(sourceSettings)
    }

    if (!targetPath) {
      targetPath = await makeTempPath()
      phpPrefixerSettings.targetDirPath = targetPath
    }

    core.debug(`target path param = '${targetPath}'`)
    await fs.promises.access(targetPath, fs.constants.W_OK)

    if (!targetGitHelper) {
      const targetSettings = {...sourceSettings, repositoryPath: targetPath}
      targetGitHelper = await createGitHelper(targetSettings)
    }

    const phpPrefixerHelper = new PhpPrefixerHelper(
      sourceSettings,
      phpPrefixerSettings,
      sourceGitHelper,
      targetPath,
      targetGitHelper
    )

    await phpPrefixerHelper.retrieveReferences()

    return phpPrefixerHelper
  }
}
