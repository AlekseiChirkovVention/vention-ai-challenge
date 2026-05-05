import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

type AuthPayload = {
  userId: string;
};

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export const requireAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const token = authHeader.split(" ")[1];

    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as AuthPayload;

    req.user = payload;

    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
};
