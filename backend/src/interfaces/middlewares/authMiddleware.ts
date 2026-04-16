import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  userId?: string
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing token' })
  }

  const token = authHeader.split(' ')[1]
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string }
    req.userId = payload.sub
    next()
  } catch {
    return res.status(401).json({ message: 'Invalid token' })
  }
}
