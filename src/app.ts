import taskRoutes from './routes/task.routes';
import express, { Request, Response, NextFunction } from 'express';
import { AppError } from './errors/AppError';

const app = express();
app.use(express.json());

app.use('/v1', taskRoutes);

// global error handler
app.use((
    err: unknown,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            error: err.message
        });
    }

    console.error(err);
    return res.status(500).json({
        error: 'Internal Server Error'
    });
});

export default app;
