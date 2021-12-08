/* Based on GitHub/ 'github-checkout' */

import {cleanup, run} from './main-helper'

// Main
// eslint-disable-next-line github/no-then
run().then(async errorCode => {
  await cleanup()
  process.exit(errorCode)
})
