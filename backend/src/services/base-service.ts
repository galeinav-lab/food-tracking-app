// ── BaseService ────────────────────────────────────────────────────────────
// A generic, ABSTRACT base class that every data service extends (AuthService,
// FoodService, ...). This is the "repository pattern": the shared database CRUD
// lives here once, and each subclass inherits it by calling super(SomeModel).
// The `<T extends Document>` generic means each subclass is strongly typed to its
// OWN Mongoose document type while reusing this exact code — that's inheritance +
// generics working together to avoid copy-pasting findById/create/delete per model.
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

    // `abstract` + `protected constructor` => you can't `new BaseService()` directly;
    // only a subclass can call this via super(). Each subclass passes its own Mongoose
    // model, which gets stored once and reused by all the methods below.
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
