export interface LogFoodInput {
    description: string;
    date?: string; // YYYY-MM-DD; defaults to today (user tz). Supports past-day logging.
}

export interface EditFoodInput {
    description: string;
}

export interface HistoryRange {
    from?: Date;
    to?: Date;
}

export interface SummaryRange {
    from: string; // YYYY-MM-DD
    to: string;   // YYYY-MM-DD
}
