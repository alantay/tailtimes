import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/auth.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      uid: string;
      email: string;
      name?: string;
      photoURL?: string;
    };
  }
}

export async function authenticateUser(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ 
        error: 'Authentication required. Please provide a valid token.' 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    const user = await AuthService.verifyToken(token);
    request.user = user;
    
  } catch (error) {
    return reply.code(401).send({ 
      error: 'Invalid authentication token' 
    });
  }
}

export async function optionalAuth(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authHeader = request.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const user = await AuthService.verifyToken(token);
      request.user = user;
    }
    // Continue without user if no auth provided
  } catch (error) {
    // Continue without user if auth fails
    request.user = undefined;
  }
}