import pinoHttp from 'pino-http'
import { logger } from '../../infra/logger'

const isDev = process.env.NODE_ENV !== 'production'

export const requestLogger = pinoHttp({
  logger,
  customLogLevel(_req, res) {
    if (res.statusCode >= 500) return 'error'
    if (res.statusCode >= 400) return 'warn'
    return 'info'
  },
  customSuccessMessage(req, res) {
    return `${req.method} ${req.url} ${res.statusCode}`
  },
  customErrorMessage(req, res) {
    return `${req.method} ${req.url} ${res.statusCode}`
  },
  serializers: {
    req(req) {
      return {
        method: req.method,
        url: req.url,
        remoteAddress: req.remoteAddress,
      }
    },
    res(res) {
      return { statusCode: res.statusCode }
    },
  },
  ...(isDev && { quietReqLogger: true }),
})
