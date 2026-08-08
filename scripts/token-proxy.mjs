import { createServer } from 'http'
import { request as httpsRequest } from 'https'

const TOKEN_PATH = '/common/oauth2/v2.0/token'

createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  let body = ''
  req.on('data', (c) => (body += c))
  req.on('end', () => {
    const urlPath = req.url || '/'
    const isToken = urlPath === '/' || urlPath === ''

    const headers = {}

    if (isToken) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded'
      if (body) headers['Content-Length'] = String(Buffer.byteLength(body))
    } else {
      const auth = req.headers.authorization
      if (auth) headers['Authorization'] = auth
    }

    const targetHost = isToken ? 'login.microsoftonline.com' : 'graph.microsoft.com'
    const targetPath = isToken ? TOKEN_PATH : urlPath

    const mReq = httpsRequest(
      {
        hostname: targetHost,
        path: targetPath,
        method: req.method,
        headers
      },
      (mRes) => {
        let data = ''
        mRes.on('data', (c) => (data += c))
        mRes.on('end', () => {
          res.writeHead(mRes.statusCode || 200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          })
          res.end(data)
        })
      }
    )

    mReq.on('error', (err) => {
      res.writeHead(502, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      })
      res.end(JSON.stringify({ error: err.message }))
    })

    if (body) mReq.write(body)
    mReq.end()
  })
}).listen(5199, () => console.log('[proxy] ready on http://localhost:5199'))
