import { appendFileSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// Allow only clearly non-functional paths. Unknown paths require full regression.
export function quickPath(file) {
  return /^src\/.*\.css$/.test(file)
    || /^(?:src\/assets|public)\/.*\.(?:png|jpe?g|webp|gif|svg|ico|woff2?)$/.test(file)
    || /^docs\/.*\.md$/.test(file)
    || /^(?:README|CHANGELOG)\.md$/.test(file)
}
export function selectScope(eventName, event, files) {
  if (eventName === 'pull_request') return { full: true, reason: 'Pull request: full regression before integration.' }
  if (event.inputs?.['security-failure'] === true || event.inputs?.['security-failure'] === 'true'
      || event.ref === 'refs/heads/feature/h2-academic-privilege-trial') return { full: true, reason: 'Security failure trial requires the full actor matrix.' }
  if (eventName === 'workflow_dispatch') return { full: event.inputs?.suite !== 'quick', reason: 'Manual suite selection (default: full).' }
  if (eventName !== 'push' || !Array.isArray(files)) return { full: true, reason: 'Changes unavailable or unsupported event: full regression.' }
  const functional = files.filter(file => !quickPath(file))
  return functional.length ? { full: true, reason: 'Functional, configuration or unknown paths changed.' }
    : { full: false, reason: files.length ? 'Only CSS, static assets or Markdown documentation changed.' : 'No file changes in this push.' }
}
export function changedFiles(event, git = args => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 })) {
  if (![event.before, event.after].every(sha => typeof sha === 'string' && /^[a-f0-9]{40}$/.test(sha) && !/^0+$/.test(sha))) return null
  try {
    // No rename detection: both old and new paths must pass the allowlist.
    return git(['diff', '--no-renames', '--name-only', '-z', event.before, event.after, '--']).split('\0').filter(Boolean)
  } catch { return null }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const eventName = process.env.GITHUB_EVENT_NAME
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'))
  const files = eventName === 'push' ? changedFiles(event) : null
  const result = selectScope(eventName, event, files)
  const mode = result.full ? 'FULL' : 'QUICK'
  console.log(`${mode}: ${result.reason}`)
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `full=${result.full}\n`)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    `### CI suite: ${mode}\n\n${result.reason}\n\n${files === null ? 'File comparison unavailable or not required.' : `${files.length} changed path(s) compared across the entire push.`}\n`)
}
