// Augment the Express namespace to include our custom Request properties
declare namespace Express {
    interface Request {
        user?: {
            id: string;
            email: string;
            roles?: string[];
            [key: string]: any;
        };
    }
}
