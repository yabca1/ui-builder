import { NextResponse } from "next/server";
import { getProjectsCollection } from "@/lib/mongodb";
import { validateProjectObject } from "@/mini-app/schema/mini-app.validator";

export async function GET() {
  try {
    const collection = await getProjectsCollection();
    const cursor = collection.find({}).sort({ updatedAt: -1 });
    const docs = await cursor.toArray();

    // Map _id to id for the frontend
    const projects = docs.map((doc) => {
      const { _id, ...rest } = doc;
      return {
        id: _id,
        ...rest,
      };
    });

    return NextResponse.json(projects);
  } catch (error: any) {
    console.error("Failed to fetch projects:", error);
    return NextResponse.json(
      { error: "Database connection failed", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Allow empty bodies, fall back to defaults
    }

    const id = body.id || crypto.randomUUID().slice(0, 8);
    const schemaVersion = body.schemaVersion || 1;
    const name = body.name || "Untitled Project";
    const entryScreenId = body.entryScreenId || "";
    const screens = body.screens || [];
    const theme = body.theme || {};
    const version = body.version || "1.0.0";
    const ownerId = body.ownerId !== undefined ? body.ownerId : null;

    const projectData = {
      id,
      schemaVersion,
      name,
      entryScreenId,
      screens,
      theme,
      version,
      ownerId,
    };

    // Validate and normalize
    const validationResult = validateProjectObject(projectData);
    if (!validationResult.isValid) {
      return NextResponse.json(
        { error: "Validation failed", errors: validationResult.errors },
        { status: 400 }
      );
    }

    const validatedProject = validationResult.data;

    const collection = await getProjectsCollection();
    const now = new Date().toISOString();

    const newDoc = {
      _id: validatedProject.id,
      schemaVersion: validatedProject.schemaVersion || 1,
      name: validatedProject.name,
      entryScreenId: validatedProject.entryScreenId,
      theme: validatedProject.theme || {},
      screens: validatedProject.screens,
      version: validatedProject.version,
      ownerId: validatedProject.ownerId !== undefined ? validatedProject.ownerId : null,
      createdAt: now,
      updatedAt: now,
    };

    await collection.insertOne(newDoc);

    const { _id, ...createdProject } = newDoc;
    return NextResponse.json(
      { id: _id, ...createdProject },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Failed to create project:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
