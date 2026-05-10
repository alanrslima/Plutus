import { Request, Response, NextFunction } from 'express'
import { AppError } from '../../application/errors/AppError'
import { createLogger } from '../../infra/logger'

const log = createLogger('errorHandler')

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.status).json({ message: err.message })
    return
  }
  log.error({ err, method: req.method, url: req.url }, 'Unhandled error')
  res.status(500).json({ message: 'Internal server error' })
}
