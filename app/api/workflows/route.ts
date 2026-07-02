import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { Workflow } from "@/lib/models/Workflow";

export async function GET() {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workflows = await Workflow.find({ userId: session.user.email }).sort({ updatedAt: -1 });
    return NextResponse.json({ workflows });
  } catch (error: any) {
    console.error("GET Workflows Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { name, nodes, edges } = body;

    const newWorkflow = await Workflow.create({
      userId: session.user.email,
      name: name || "Untitled Canvas",
      nodes: nodes || [],
      edges: edges || [],
    });

    return NextResponse.json({ workflow: newWorkflow }, { status: 201 });
  } catch (error: any) {
    console.error("POST Workflow Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
