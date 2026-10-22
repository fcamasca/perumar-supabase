import { spawnSync } from 'node:child_process'

// Only the explicit workflow_dispatch trial sets this flag. No change to candidate code.
const env = { ...process.env }
if (env.H0_CONFIG_FAILURE === 'true') env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_secret_CONTROLLED_INVALID_CONFIGURATION'
const result = spawnSync(process.execPath, [process.env.npm_execpath ?? 'node_modules/vite/bin/vite.js', ...(process.env.npm_execpath ? ['run', 'build'] : ['build'])], {
  env, stdio: 'inherit', windowsHide: true,
})
process.exitCode = result.status ?? 1
