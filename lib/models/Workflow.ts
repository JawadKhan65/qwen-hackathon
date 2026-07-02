import mongoose, { Schema, Document, model, models } from "mongoose";

export interface IWorkflow extends Document {
  userId: string;
  name: string;
  nodes: Array<any>;
  edges: Array<any>;
  createdAt: Date;
  updatedAt: Date;
}

const WorkflowSchema = new Schema<IWorkflow>({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true, default: "Untitled Canvas" },
  nodes: { type: Schema.Types.Mixed, default: [] },
  edges: { type: Schema.Types.Mixed, default: [] },
}, {
  timestamps: true,
});

export const Workflow = models.Workflow || model<IWorkflow>("Workflow", WorkflowSchema);
