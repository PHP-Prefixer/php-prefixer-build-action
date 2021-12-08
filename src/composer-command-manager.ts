import * as exec from '@actions/exec'
import * as fshelper from 'github-checkout/lib/fs-helper'
import * as io from '@actions/io'

export interface IComposerCommandManager {
  install(): Promise<void>
  dumpAutoload(): Promise<void>
}

export async function createCommandManager(
  workingDirectory: string
): Promise<IComposerCommandManager> {
  return await ComposerCommandManager.create(workingDirectory)
}

const GLOBAL_OPTIONS = ['--no-interaction', '--no-plugins']

class ComposerCommandManager implements IComposerCommandManager {
  private composerPath = ''
  private workingDirectory = ''

  // Private constructor; use createCommandManager()
  private constructor() {}

  async install(): Promise<void> {
    const args = [
      'install',
      '--classmap-authoritative',
      '--no-dev',
      '--no-scripts',
      '--no-progress',
      '--ignore-platform-reqs',
      '--prefer-dist',
      '-vv',

      ...GLOBAL_OPTIONS,

      `--working-dir=${this.workingDirectory}`
    ]

    await this.execComposer(args)
  }

  async dumpAutoload(): Promise<void> {
    const args = [
      'dump-autoload',
      '--classmap-authoritative',
      '--no-dev',
      '--no-scripts',
      '--ignore-platform-reqs',

      ...GLOBAL_OPTIONS,

      `--working-dir=${this.workingDirectory}`
    ]

    await this.execComposer(args)
  }

  static async create(
    workingDirectory: string
  ): Promise<ComposerCommandManager> {
    const result = new ComposerCommandManager()
    await result.initialize(workingDirectory)
    return result
  }

  private async execComposer(
    args: string[],
    allowAllExitCodes = false,
    silent = false
  ): Promise<ComposerOutput> {
    fshelper.directoryExistsSync(this.workingDirectory, true)

    const result = new ComposerOutput()

    const env = {}
    for (const key of Object.keys(process.env)) {
      env[key] = process.env[key]
    }

    const stdout: string[] = []

    const options = {
      cwd: this.workingDirectory,
      env,
      silent,
      ignoreReturnCode: allowAllExitCodes,
      listeners: {
        stdout: (data: Buffer) => {
          stdout.push(data.toString())
        }
      }
    }

    result.exitCode = await exec.exec(`"${this.composerPath}"`, args, options)
    result.stdout = stdout.join('')
    return result
  }

  private async initialize(workingDirectory: string): Promise<void> {
    this.workingDirectory = workingDirectory
    this.composerPath = await io.which('composer', true)
  }
}

class ComposerOutput {
  stdout = ''
  exitCode = 0
}
