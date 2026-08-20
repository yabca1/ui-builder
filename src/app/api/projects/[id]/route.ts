import { NextResponse } from "next/server";
import { getProjectsCollection } from "@/lib/mongodb";
import { validateProjectObject } from "@/mini-app/schema/mini-app.validator";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const collection = await getProjectsCollection();
    const doc = await collection.findOne({ _id: id });

    if (!doc) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const { _id, ...project } = doc;
    return NextResponse.json({ id: _id, ...project });
  } catch (error: any) {
    console.error("Failed to load project:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const projectData = {
      ...body,
      id, // Force ID consistency with URL
    };

    // Validate and normalize
    const validationResult = validateProjectObject(projectData);
    if (!validationResult.isValid) {
      console.warn("Validation failed for project:", id, JSON.stringify(validationResult.errors, null, 2));
      return NextResponse.json(
        { error: "Validation failed", errors: validationResult.errors },
        { status: 400 }
      );
    }

    const validatedProject = validationResult.data;
    const collection = await getProjectsCollection();
    
    // Check if project exists to preserve createdAt, or handle upsert
    const existing = await collection.findOne({ _id: id });
    const now = new Date().toISOString();
    const createdAt = existing ? existing.createdAt : now;

    const updatedDoc = {
      _id: id,
      schemaVersion: validatedProject.schemaVersion || 1,
      name: validatedProject.name,
      entryScreenId: validatedProject.entryScreenId || "",
      theme: validatedProject.theme || {},
      screens: validatedProject.screens || [],
      version: validatedProject.version || "1.0.0",
      ownerId: validatedProject.ownerId !== undefined ? validatedProject.ownerId : null,
      credentials: validatedProject.credentials || [],
      integrations: validatedProject.integrations || [],
      apiPaths: validatedProject.apiPaths || [],
      createdAt,
      updatedAt: now,
    };

    await collection.replaceOne({ _id: id }, updatedDoc, { upsert: true });

    const { _id, ...updatedProject } = updatedDoc;
    return NextResponse.json({ id: _id, ...updatedProject });
  } catch (error: any) {
    console.error("Failed to update project:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const collection = await getProjectsCollection();
    const result = await collection.deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Project deleted successfully" });
  } catch (error: any) {
    console.error("Failed to delete project:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
