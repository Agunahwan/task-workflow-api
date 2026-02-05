import { Request, Response, NextFunction } from 'express';
import { eventRepo } from '../repositories/event.repo';

export const eventController = {
    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
            const events = await eventRepo.findAll(limit);
            res.json(events);
        } catch (e) {
            next(e);
        }
    }
};
