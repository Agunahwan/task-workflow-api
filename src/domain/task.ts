export type TaskState =
    | 'NEW'
    | 'IN_PROGRESS'
    | 'DONE'
    | 'CANCELLED';

export const AllowedTransitions: Record<TaskState, TaskState[]> = {
    NEW: ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS: ['DONE', 'CANCELLED'],
    DONE: [],
    CANCELLED: [],
};

export function canTransition(from: TaskState, to: TaskState) {
    return AllowedTransitions[from].includes(to);
}
