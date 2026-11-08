declare global {
  namespace Express {
    interface Request {
      user?: {
        sub: number;
        username: string;
      };
      imageUrl?: string;
    }
  }
}

export {};