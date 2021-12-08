import * as exec from '@actions/exec'
import * as fs from 'fs'
import * as fshelper from 'github-checkout/lib/fs-helper'
import * as io from '@actions/io'
import {cwd} from 'process'

export interface IPhpPrefixerCommandManager {
  prefix(
    sourceDir: string,
    targetDir: string,
    phpPrefixerPersonalAccessToken: string,
    phpPrefixerProjectId: string,
    phpPrefixerGhToken?: string
  ): Promise<PhpPrefixerOutput>
}

export async function create(
  workingDirectory: string
): Promise<IPhpPrefixerCommandManager> {
  return await PhpPrefixerCommandManager.create(workingDirectory)
}

class PhpPrefixerCommandManager implements IPhpPrefixerCommandManager {
  private phpPrefixerPath = ''
  private workingDirectory = ''

  // Private constructor; use createCommandManager()
  private constructor() {}

  async prefix(
    sourceDir: string,
    targetDir: string,
    phpPrefixerPersonalAccessToken: string,
    phpPrefixerProjectId: string,
    phpPrefixerGhToken?: string
  ): Promise<PhpPrefixerOutput> {
    const args = [
      'prefix',
      sourceDir,
      targetDir,
      phpPrefixerPersonalAccessToken,
      phpPrefixerProjectId
    ]

    if (phpPrefixerGhToken) {
      args.push(`--github-access-token=${phpPrefixerGhToken}`)
    }

    args.push('--delete-build')

    return this.execPhpPrefixer(args)
  }

  static async create(
    workingDirectory: string
  ): Promise<PhpPrefixerCommandManager> {
    const result = new PhpPrefixerCommandManager()
    await result.initialize(workingDirectory)
    return result
  }

  private async execPhpPrefixer(
    args: string[],
    allowAllExitCodes = false,
    silent = false
  ): Promise<PhpPrefixerOutput> {
    fshelper.directoryExistsSync(this.workingDirectory, true)

    const result = new PhpPrefixerOutput()

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

    result.exitCode = await exec.exec(
      `"${this.phpPrefixerPath}"`,
      args,
      options
    )
    result.stdout = stdout.join('')
    return result
  }

  /* istanbul ignore next */
  private async initialize(workingDirectory: string): Promise<void> {
    this.workingDirectory = workingDirectory
    this.phpPrefixerPath = `${cwd()}/php-prefixer-cli.phar`

    if (fs.existsSync(this.phpPrefixerPath)) {
      return
    }

    if (process.env['PHP_PREFIXER_CLI_PHAR']) {
      this.phpPrefixerPath = process.env['PHP_PREFIXER_CLI_PHAR']

      if (fs.existsSync(this.phpPrefixerPath)) {
        return
      }
    }

    this.phpPrefixerPath = await io.which('php-prefixer-cli.phar', true)
  }
}

class PhpPrefixerOutput {
  stdout = ''
  exitCode = 0
}
