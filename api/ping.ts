import { Request, Response } from 'express';

// Standalone serverless function to verify Vercel infrastructure
export default function handler(req: Request, res: Response) {
  res.status(200).json({ 
    message: 'Pong!', 
    time: new Date().toISOString(),
    env: process.env.NODE_ENV 
  });
}
