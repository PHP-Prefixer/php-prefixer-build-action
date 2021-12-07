import * as fs from 'fs'
import {IPhpPrefixerSettings} from './php-prefixer-settings'

export async function generateDotEnv(
  targetDirPath: string,
  config: IPhpPrefixerSettings
): Promise<boolean> {
  const content = `
# Note: the .env file must be located in the php-prefixer-cli.phar directory

# Source Directory: The project source directory
SOURCE_DIRECTORY="${config.sourceDirPath}"

# Target Directory: The target directory where the results are stored
TARGET_DIRECTORY="${targetDirPath}"

# Personal Access Token: The personal access token, generated on PHP-Prefixer Settings
PERSONAL_ACCESS_TOKEN="${config.personalAccessToken}"

# Project ID: The identification of the configured project on PHP-Prefixer Projects
PROJECT_ID="${config.projectId}"

# GitHub Access Token:  An optional GitHub token to access composer.json dependencies that are managed in private repositories.
GITHUB_ACCESS_TOKEN="${config.ghPersonalAccessToken}"
`
  await fs.promises.writeFile(`${targetDirPath}/.env`, content)

  return true
}

export async function rmDotEnv(targetDirPath: string): Promise<void> {
  await fs.promises.rm(`${targetDirPath}/.env`)
}
