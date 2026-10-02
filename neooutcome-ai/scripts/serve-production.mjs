import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer, request } from 'node:http'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../dist', import.meta.url))
const port = Number(process.env.PORT ?? 8023)
const host = process.env.HOST ?? '0.0.0.0'
const apiBase = new URL(process.env.API_BASE_URL ?? 'http://127.0.0.1:8000')

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.pdf', 'application/pdf'],
])

function sendFile(response, path) {
  const type = mimeTypes.get(extname(path).toLowerCase()) ?? 'application/octet-stream'
  response.writeHead(200, { 'Content-Type': type })
  createReadStream(path).pipe(response)
}

function serveStatic(requestUrl, response) {
  const url = new URL(requestUrl, 'http://localhost')
  const safePath = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '')
  const candidate = join(root, safePath)
  const filePath = existsSync(candidate) && statSync(candidate).isFile()
    ? candidate
    : join(root, 'index.html')

  sendFile(response, filePath)
}

function proxyApi(clientRequest, clientResponse) {
  const target = new URL(clientRequest.url.replace(/^\/api/, '') || '/', apiBase)
  const proxyRequest = request(
    target,
    {
      method: clientRequest.method,
      headers: {
        ...clientRequest.headers,
        host: apiBase.host,
      },
    },
    (proxyResponse) => {
      clientResponse.writeHead(proxyResponse.statusCode ?? 502, proxyResponse.headers)
      proxyResponse.pipe(clientResponse)
    },
  )

  proxyRequest.on('error', (error) => {
    clientResponse.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' })
    clientResponse.end(JSON.stringify({ error: `API proxy failed: ${error.message}` }))
  })

  clientRequest.pipe(proxyRequest)
}

createServer((clientRequest, clientResponse) => {
  if (clientRequest.url?.startsWith('/api')) {
    proxyApi(clientRequest, clientResponse)
    return
  }

  serveStatic(clientRequest.url ?? '/', clientResponse)
}).listen(port, host, () => {
  console.log(`NeoOutcome frontend listening on http://${host}:${port}`)
  console.log(`Proxying /api to ${apiBase}`)
})
