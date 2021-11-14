#!/usr/bin/env bash

# @package     PHP Prefixer Build Action
#
# @author      PHP Prefixer <team@php-prefixer.com>
# @copyright   Copyright (c)2019-2021 Desarrollos Inteligentes Virtuales, SL. All rights reserved.
# @license     MIT
#
# @see         https://php-prefixer.com

set -eu

readonly baseDirPath=$(pwd)
if [[ -z "$INPUT_SOURCE_DIR_PATH" ]]; then
    readonly sourceDirPath=$(pwd)
else
    if [[ "$INPUT_SOURCE_DIR_PATH" = /* ]]; then # absolute path given?
        readonly sourceDirPath="$INPUT_SOURCE_DIR_PATH"
    else
        readonly sourceDirPath="$baseDirPath/$INPUT_SOURCE_DIR_PATH"
    fi
fi
readonly baseComposerFilePath="$baseDirPath/composer.json"

echo ------------------------
set -x
ls -al
git checkout "$INPUT_TARGET_BRANCH"
git branch
exit 1
ehco -----------------------

# Writes to stdout current revision stored in the $composerFilePath by ['extra']['php-prefixer'][$revKey] or `unknown` string if such element does not exist.
# $composerFilePath
# $revKey
previousRev() {
    pushd "$baseDirPath" > /dev/null
    local -r currentBranch=$(git rev-parse --abbrev-ref HEAD)
    git checkout "$INPUT_TARGET_BRANCH" &> /dev/null || {
        git checkout $currentBranch &> /dev/null || true
        popd > /dev/null
        echo unknown
        return
    }
    php -- "$1" "$2" <<'OUT'
<?php
// Convert all errors to exceptions.
error_reporting(E_ALL | E_STRICT);
ini_set('display_errors', '1');
set_error_handler(
    function ($severity, $message, $filePath, $lineNo) {
        if (!(error_reporting() & $severity)) {
            return;
        }
        throw new ErrorException($message, 0, $severity, $filePath, $lineNo);
    }
);

$composerFilePath = $argv[1];
$revKey = $argv[2];
$projectMeta = json_decode(file_get_contents($composerFilePath), true);
echo $projectMeta['extra']['php-prefixer'][$revKey] ?? 'unknown';
OUT
    git checkout $currentBranch &> /dev/null
    popd > /dev/null
}

readonly currentRev=$(cd "$sourceDirPath" && git rev-parse HEAD)
readonly previousRev=$(previousRev "$baseComposerFilePath" "$INPUT_TARGET_BRANCH")

echo --------------------------
echo $currentRev
echo $previousRev
echo --------------------------
exit 1

if [[ "$currentRev" == "$previousRev" ]]; then
    echo The source directory does not have any changes, exiting...
    exit 0
fi

readonly targetDirPath=$(mktemp -d '/tmp.XXXXXXXXXX')
readonly remote=tmp$(($(date +%s%N)/1000000))

initTargetDirGitRepo() {
    rsync -avq "$baseDirPath/.git" "$targetDirPath"

    pushd "$targetDirPath" > /dev/null

    git remote add "$remote" "https://x-access-token:$GH_TOKEN@github.com/$GITHUB_REPOSITORY"

    git fetch "$remote"
    git checkout "$INPUT_TARGET_BRANCH" || git checkout -b "$INPUT_TARGET_BRANCH"

    git config --local user.name "$GITHUB_ACTOR"
    git config --local user.email "$GITHUB_ACTOR@users.noreply.github.com"
    git config --local --unset-all "http.https://github.com/.extraheader" || true

    # Delete everything in the $targetDirPath except the .git/
    find "$targetDirPath" -mindepth 1 -name ".git" -type d -prune -o -print0 | xargs -0 rm -rf

    popd > /dev/null # $targetDirPath
}

copyFilesFromSourceDirToTargetDir() {
    rsync -avq \
        --exclude=/.git/ \
        --exclude=vendor/ \
        --exclude=vendor_prefixed/ \
        "$sourceDirPath"/ \
        "$targetDirPath"/
}

initComposerPackages() {
    pushd "$1" > /dev/null
    composer update --no-dev --no-interaction
    composer dump-autoload --classmap-authoritative --no-interaction
    popd > /dev/null
}

prepareTheTargetDir() {
    # Remove the source composer.json, composer.lock, vendor, and vendor_prefixed to avoid collisions when receiving the prefixed results:
    # the prefixed composer.json, composer.lock and vendor folders are included in the prefixed results and they must replace the files copied from source.
    find "$targetDirPath" \( \( -name composer.json -o -name composer.lock \) -type f \) -print0 | xargs -0 rm -rf
    find "$targetDirPath" \( \( -name vendor -o -name vendor_prefixed \) -type d \) -print0 | xargs -0 rm -rf
}

pushd "$sourceDirPath" > /dev/null

# Create the target directory where the prefixed results will be stored
initTargetDirGitRepo

# Composer update & dump-autoload to check everything is Ok
initComposerPackages "$sourceDirPath"

# Copy everything from source to target to have the complete project on the target directory
copyFilesFromSourceDirToTargetDir

# Composer update & dump-autoload to check everything is Ok
initComposerPackages "$targetDirPath"

# Clean the composer-related files from target directory before prefixing
prepareTheTargetDir

# Copies php-prefixer meta information from the $sourceComposerFilePath into $targetComposerFilePath.
# $sourceComposerFilePath
# $targetComposerFilePath
addPhpPrefixerMeta() {
    php -- "$1" "$2" <<'OUT'
<?php
$sourceComposerFilePath = $argv[1];
$targetComposerFilePath = $argv[2];

// Convert all errors to exceptions.
error_reporting(E_ALL | E_STRICT);
ini_set('display_errors', '1');
set_error_handler(
    function ($severity, $message, $filePath, $lineNo) {
        if (!(error_reporting() & $severity)) {
            return;
        }
        throw new ErrorException($message, 0, $severity, $filePath, $lineNo);
    }
);

$sourceProjectMeta = json_decode(file_get_contents($sourceComposerFilePath), true);
$targetProjectMeta = json_decode(file_get_contents($targetComposerFilePath), true);

if (!isset($targetProjectMeta['extra']['php-prefixer'])) {
    $targetProjectMeta['extra']['php-prefixer'] = $sourceProjectMeta['extra']['php-prefixer'];
    file_put_contents($targetComposerFilePath, json_encode($targetProjectMeta, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
}
OUT
}

# $composerFilePath like /path/to/composer.json
# $revKey like 7.x-prefixed
# $revision like a29b7a1987f5a2c82f6f8730b4dde76ed14ec36a
addRevision() {
    php -- "$1" "$2" "$3" <<'OUT'
<?php
$composerFilePath = $argv[1];
$revKey = $argv[2];
$rev = $argv[3];

// Convert all errors to exceptions.
error_reporting(E_ALL | E_STRICT);
ini_set('display_errors', '1');
set_error_handler(
    function ($severity, $message, $filePath, $lineNo) {
        if (!(error_reporting() & $severity)) {
            return;
        }
        throw new ErrorException($message, 0, $severity, $filePath, $lineNo);
    }
);

$projectMeta = json_decode(file_get_contents($composerFilePath), true);

$projectMeta['extra']['php-prefixer'][$revKey] = $rev;
file_put_contents($composerFilePath, json_encode($projectMeta, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
OUT
}

addPhpPrefixerMeta "$baseComposerFilePath" "$sourceDirPath/composer.json"

# Let's go!
pushd "$targetDirPath" > /dev/null
cat > /.env <<OUT
# Note: the .env file must be located in the php-prefixer-cli.phar directory

# Source Directory: The project source directory
SOURCE_DIRECTORY="$sourceDirPath"

# Target Directory: The target directory where the results are stored
TARGET_DIRECTORY="$targetDirPath"

# Personal Access Token: The personal access token, generated on PHP-Prefixer Settings
PERSONAL_ACCESS_TOKEN="$INPUT_PERSONAL_ACCESS_TOKEN"

# Project ID: The identification of the configured project on PHP-Prefixer Projects
PROJECT_ID="$INPUT_PROJECT_ID"

# GitHub Access Token:  An optional GitHub token to access composer.json dependencies that are managed in private repositories.
GITHUB_ACCESS_TOKEN="$INPUT_GH_PERSONAL_ACCESS_TOKEN"
OUT
/php-prefixer-cli.phar prefix --delete-build

readonly anyChangesDone=$(git status --porcelain)
if [ -n "${anyChangesDone}" ]; then
    # If there're changes, commit them
    addRevision "$targetDirPath/composer.json" "$INPUT_TARGET_BRANCH" "$currentRev"
    git add --all .
    git commit --all -m "Publish prefixed build $(date '+%Y-%m-%d %H:%M:%S')"
    git pull -s ours $remote "$INPUT_TARGET_BRANCH" || true # remote may not exist
    git push "$remote" "$INPUT_TARGET_BRANCH":"$INPUT_TARGET_BRANCH"
fi

popd > /dev/null # $targetDirPath

popd > /dev/null # $sourceDirPath