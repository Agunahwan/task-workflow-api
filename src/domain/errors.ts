export class ConflictError extends Error {
    status = 409;
}

export class ForbiddenError extends Error {
    status = 403;
}
