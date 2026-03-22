/**
 * B2B Lead Extractor - Authentication Middleware
 *
 * Simple API key auth. If API_SECRET_KEY is set in env,
 * all extraction endpoints require: Authorization: Bearer <key>
 *
 * If API_SECRET_KEY is not set, endpoints are open (dev mode).
 */

import { Request, Response, NextFunction } from "express";

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const secretKey = process.env.API_SECRET_KEY;

  // If no secret key configured, skip auth (dev mode)
  if (!secretKey) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      error: "Missing or invalid Authorization header. Use: Bearer <api_key>",
    });
    return;
  }

  const token = authHeader.slice(7);
  if (token !== secretKey) {
    res.status(403).json({
      success: false,
      error: "Invalid API key",
    });
    return;
  }

  next();
}
