import { useId } from 'react'
import approvedMark from './assets/brand/perumar-isotipo.svg?raw'

export function BrandMark() {
  const prefix = `pm-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}-`
  // Trusted, checked-in SVG only. Never accept user HTML here. Keep clip IDs local
  // because the same approved geometry appears in both header and login.
  const svg = approvedMark
    .replace(/id="([^"]+)"/g, (_match, id: string) => `id="${prefix}${id}"`)
    .replace(/url\(#([^)]*)\)/g, (_match, id: string) => `url(#${prefix}${id})`)
    .replace(/ role="img"| aria-labelledby="[^"]+"/g, '')
    .replace(/<title[^>]*>.*?<\/title>|<desc[^>]*>.*?<\/desc>/gs, '')
    .replace('<svg ', '<svg aria-hidden="true" focusable="false" ')
  return <span className="brand-mark" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />
}
