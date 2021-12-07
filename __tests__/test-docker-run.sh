#!/usr/bin/env bash

# @package     PHP Prefixer Build Action
#
# @author      PHP Prefixer <team@php-prefixer.com>
# @copyright   Copyright (c)2019-2021 Desarrollos Inteligentes Virtuales, SL. All rights reserved.
# @license     MIT
#
# @see         https://php-prefixer.com

docker run --rm \
  --env GITHUB_WORKSPACE=/ \
  --env GITHUB_REPOSITORY='anibalsanchez/hello-wp-world' \
  --env INPUT_PERSONAL_ACCESS_TOKEN=$PHP_PREFIXER_PERSONAL_ACCESS_TOKEN \
  --env INPUT_PROJECT_ID=$PHP_PREFIXER_PROJECT_ID \
  --env INPUT_REPOSITORY=$GITHUB_REPOSITORY \
  --env INPUT_TOKEN=$PHP_PREFIXER_GH_TOKEN \
  php-prefixer-build-action
