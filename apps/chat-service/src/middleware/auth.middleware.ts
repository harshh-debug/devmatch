import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { Socket } from "socket.io";

export const socketAuthMiddleware = (socket: Socket, next: (err?: Error) => void) => {
  const token = socket.handshake.auth?.token;
  
  if (!token) {
    return next(new Error("Authentication error: No token provided"));
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as any;
    
    // Attach the verified user payload directly to the socket session
    socket.data.userId = payload.id;
    socket.data.email = payload.email;
    socket.data.username = payload.username;
    
    next();
  } catch (err) {
    next(new Error("Authentication error: Invalid token"));
  }
};