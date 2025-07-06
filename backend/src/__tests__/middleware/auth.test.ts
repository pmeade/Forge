import { Request, Response, NextFunction } from 'express'
import { authMiddleware } from '../../middleware/auth'

describe('Auth Middleware', () => {
  let req: Partial<Request>
  let res: Partial<Response>
  let next: NextFunction
  
  beforeEach(() => {
    req = {
      headers: {}
    }
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    }
    next = jest.fn()
    
    // Set auth token in env
    process.env.AUTH_TOKEN = 'test-token-123'
  })
  
  it('should allow requests with valid token', () => {
    req.headers = {
      authorization: 'Bearer test-token-123'
    }
    
    authMiddleware(req as any, res as any, next)
    
    expect(next).toHaveBeenCalled()
    expect((req as any).authenticated).toBe(true)
  })
  
  it('should reject requests without token', () => {
    authMiddleware(req as any, res as any, next)
    
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' })
    expect(next).not.toHaveBeenCalled()
  })
  
  it('should reject requests with invalid token', () => {
    req.headers = {
      authorization: 'Bearer wrong-token'
    }
    
    authMiddleware(req as any, res as any, next)
    
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' })
    expect(next).not.toHaveBeenCalled()
  })
})