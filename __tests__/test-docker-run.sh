#!/usr/bin/env bash

# @package     PHP Prefixer Build Action
#
# @author      PHP Prefixer <team@php-prefixer.com>
# @copyright   Copyright (c)2019-2021 Desarrollos Inteligentes Virtuales, SL. All rights reserved.
# @license     MIT
#
# @see         https://php-prefixer.com

# GitHub Action Command: /usr/bin/docker run --name b62f8f24a9e2b614e5ba64d4b3eb4a7b86c_917abd --label 905b62 --workdir /github/workspace --rm -e INPUT_PERSONAL_ACCESS_TOKEN -e INPUT_PROJECT_ID -e INPUT_REPOSITORY -e INPUT_TOKEN -e INPUT_REF -e INPUT_SSH-KEY -e INPUT_SSH-KNOWN-HOSTS -e INPUT_SSH-STRICT -e INPUT_PERSIST-CREDENTIALS -e INPUT_LFS -e INPUT_SUBMODULES -e HOME -e GITHUB_JOB -e GITHUB_REF -e GITHUB_SHA -e GITHUB_REPOSITORY -e GITHUB_REPOSITORY_OWNER -e GITHUB_RUN_ID -e GITHUB_RUN_NUMBER -e GITHUB_RETENTION_DAYS -e GITHUB_RUN_ATTEMPT -e GITHUB_ACTOR -e GITHUB_WORKFLOW -e GITHUB_HEAD_REF -e GITHUB_BASE_REF -e GITHUB_EVENT_NAME -e GITHUB_SERVER_URL -e GITHUB_API_URL -e GITHUB_GRAPHQL_URL -e GITHUB_REF_NAME -e GITHUB_REF_PROTECTED -e GITHUB_REF_TYPE -e GITHUB_WORKSPACE -e GITHUB_ACTION -e GITHUB_EVENT_PATH -e GITHUB_ACTION_REPOSITORY -e GITHUB_ACTION_REF -e GITHUB_PATH -e GITHUB_ENV -e RUNNER_OS -e RUNNER_ARCH -e RUNNER_NAME -e RUNNER_TOOL_CACHE -e RUNNER_TEMP -e RUNNER_WORKSPACE -e ACTIONS_RUNTIME_URL -e ACTIONS_RUNTIME_TOKEN -e ACTIONS_CACHE_URL -e GITHUB_ACTIONS=true -e CI=true -v "/var/run/docker.sock":"/var/run/docker.sock" -v "/home/runner/work/_temp/_github_home":"/github/home" -v "/home/runner/work/_temp/_github_workflow":"/github/workflow" -v "/home/runner/work/_temp/_runner_file_commands":"/github/file_commands" -v "/home/runner/work/hello-wp-world/hello-wp-world":"/github/workspace" 905b62:f8f24a9e2b614e5ba64d4b3eb4a7b86c

docker run --rm \
  --workdir /github/workspace \
  --env GITHUB_WORKSPACE=/ \
  --env GITHUB_REPOSITORY='anibalsanchez/hello-wp-world' \
  --env INPUT_PERSONAL_ACCESS_TOKEN=$PHP_PREFIXER_PERSONAL_ACCESS_TOKEN \
  --env INPUT_PROJECT_ID=$PHP_PREFIXER_PROJECT_ID \
  --env INPUT_REPOSITORY=$GITHUB_REPOSITORY \
  --env INPUT_TOKEN=$PHP_PREFIXER_GH_TOKEN \
  php-prefixer-build-action
