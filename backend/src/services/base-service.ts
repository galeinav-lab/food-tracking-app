import { Document, Model, Types } from "mongoose";
import { ResourceNotFound } from "../models/client-error";

/**
 * The internal `model` field is typed as `Model<any>` on purpose:
 * Mongoose's `Model<T extends Document>` is deeply generic (instance methods,
 * query helpers, virtuals...) and combining it with our own `T extends Document`
 * generic blows past TypeScript's instantiation depth limit (TS2589) in IDEs.
 * Public method signatures still return `T`, so callers keep full type safety.
 */
export abstract class BaseService<T extends Document> {

    protected constructor(protected readonly model: Model<any>) {}

    public async findById(id: string | Types.ObjectId): Promise<T> {
        const doc = await this.model.findById(id).exec();
        if (!doc) throw new ResourceNotFound(0);
        return doc as T;
    }

    public async findByIdOrNull(id: string | Types.ObjectId): Promise<T | null> {
        return this.model.findById(id).exec() as Promise<T | null>;
    }

    public async create(input: Partial<T>): Promise<T> {
        return this.model.create(input) as Promise<T>;
    }

    public async deleteById(id: string | Types.ObjectId): Promise<void> {
        const result = await this.model.findByIdAndDelete(id).exec();
        if (!result) throw new ResourceNotFound(0);
    }

}
