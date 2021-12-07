#!/usr/bin/env bash

# @package     PHP Prefixer Build Action
#
# @author      PHP Prefixer <team@php-prefixer.com>
# @copyright   Copyright (c)2019-2021 Desarrollos Inteligentes Virtuales, SL. All rights reserved.
# @license     MIT
#
# @see         https://php-prefixer.com

export GITHUB_WORKSPACE=$(pwd)
export GITHUB_REPOSITORY='anibalsanchez/hello-wp-world'

# phpPrefixerSettings
export INPUT_PERSONAL_ACCESS_TOKEN=$PHP_PREFIXER_PERSONAL_ACCESS_TOKEN || ''
export INPUT_PROJECT_ID=$PHP_PREFIXER_PROJECT_ID || ''

# sourceSettings

export INPUT_REPOSITORY=$GITHUB_REPOSITORY
export INPUT_REF=''
export INPUT_TOKEN=$PHP_PREFIXER_GH_TOKEN || ''

sh entrypoint.sh
