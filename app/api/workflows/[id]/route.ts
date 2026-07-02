import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { Workflow } from "@/lib/models/Workflow";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const workflow = await Workflow.findOne({ _id: id, userId: session.user.email });
    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    return NextResponse.json({ workflow });
  } catch (error: any) {
    console.error("GET Workflow Detail Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, nodes, edges } = body;

    const updateFields: any = {};
    if (name !== undefined) updateFields.name = name;
    if (nodes !== undefined) updateFields.nodes = nodes;
    if (edges !== undefined) updateFields.edges = edges;

    const updatedWorkflow = await Workflow.findOneAndUpdate(
      { _id: id, userId: session.user.email },
      { $set: updateFields },
      { new: true }
    );

    if (!updatedWorkflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    return NextResponse.json({ workflow: updatedWorkflow });
  } catch (error: any) {
    console.error("PUT Workflow Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const deletedWorkflow = await Workflow.findOneAndDelete({
      _id: id,
      userId: session.user.email,
    });

    if (!deletedWorkflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Workflow deleted successfully" });
  } catch (error: any) {
    console.error("DELETE Workflow Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
