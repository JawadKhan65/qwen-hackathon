import mongoose, { Schema, Document, model, models } from "mongoose";

export interface IUser extends Document {
  email: string;
  name?: string;
  image?: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  name: { type: String },
  image: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export const User = models.User || model<IUser>("User", UserSchema);
