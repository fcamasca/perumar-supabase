import { serveOrderFile } from '../_shared/os-files/http.ts'
Deno.serve(req => serveOrderFile(req, 'descargar'))
