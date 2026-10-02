/**
 * Which build is answering. deploy.yml writes `APP_IMAGE` to the server's .env as the
 * immutable `…:sha-<commit>-<environment>` tag, so this shows at a glance which commit each
 * environment runs. Only the tag is parsed — the registry path is never exposed.
 */
export function buildInfo(appImage: string | undefined): { version: string; environment: string } {
  if (!appImage || !appImage.trim()) return { version: 'local', environment: 'local' }
  const tag = appImage.split(':').pop()?.trim()
  const match = tag?.match(/^sha-([0-9a-f]{7,40})-(staging|production)$/)
  // A rollback pins a locally tagged image (`house-rent-rollback:previous`): say so honestly.
  if (!match) return { version: 'unknown', environment: 'unknown' }
  return { version: match[1], environment: match[2] }
}
