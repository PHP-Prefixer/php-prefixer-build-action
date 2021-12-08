#!/usr/bin/env bash

# @package     PHP Prefixer Build Action
#
# @author      PHP Prefixer <team@php-prefixer.com>
# @copyright   Copyright (c)2019-2021 Desarrollos Inteligentes Virtuales, SL. All rights reserved.
# @license     MIT
#
# @see         https://php-prefixer.com

set -eu

git config --global user.name github-actions
git config --global user.email github-actions@github.com

echo 'Running action...'
cd /github/workspace
node dist/index.js
echo 'Action finished.'
