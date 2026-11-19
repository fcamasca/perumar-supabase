import { serveExpediente } from '../_shared/expediente/http.ts'
Deno.serve(req => serveExpediente(req, 'cargar'))
