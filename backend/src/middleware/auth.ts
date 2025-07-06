import { Request, Response, NextFunction } from 'express'

export interface AuthRequest extends Request {
  authenticated: boolean
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  
  if (!token || token !== process.env.AUTH_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  req.authenticated = true
  next()
}