import * as core from '@actions/core'
import {IPhpPrefixerSettings} from './php-prefixer-settings'
import {cwd} from 'process'

export class InputHelper {
  baseDirPath = cwd()

  sourceDirPath(inputSourceDirPath: string): string {
    if (inputSourceDirPath.length === 0) {
      return this.baseDirPath
    }

    // Absolute path given
    if (inputSourceDirPath.startsWith('/')) {
      return inputSourceDirPath
    }

    return `${this.baseDirPath}/${inputSourceDirPath}`
  }

  baseComposerFilePath(): string {
    return `${this.baseDirPath}/composer.json`
  }
}

export function getInputs(): IPhpPrefixerSettings {
  const result = {} as unknown as IPhpPrefixerSettings

  result.personalAccessToken = core.getInput('personal_access_token')

  if (!result.personalAccessToken) {
    throw new Error('personal_access_token not defined')
  }

  core.setSecret(result.personalAccessToken)

  result.projectId = core.getInput('project_id')

  if (!result.projectId) {
    throw new Error('project_id not defined')
  }

  return result
}

export default InputHelper
