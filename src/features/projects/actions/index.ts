"use server"
import { getCurrentUser } from "@/features/auth/actions"

import { MessageRole, MessageType } from "@/generated/prisma/client"
import { generateSlug } from "random-word-slugs"
import { prisma } from "@/lib/db"


export const createProject = async (value: string) => {
  const user = await getCurrentUser();

  if (!user) return { error: "Unauthorized" }

  try {
    const project = await prisma.project.create({
      data: {
        name: generateSlug(2, { format: "kebab" }),
        userId: user.id,
        messages: {
          create: {
            content: value,
            role: MessageRole.USER,
            type: MessageType.RESULT
          }
        }
      }
    })

    // TODO: Send project to inngest

    return project;
  } catch (error) {
    console.error("❌ Error creating project: ", error);
    return {
      error: "Failed to create Project"
    }
  }
}

export const getProjects = async () => {
  const user = await getCurrentUser()

  if (!user) return { error: "Unauthorized" }

  try {
    const projects = await prisma.project.findMany({
      where: {
        userId: user.id
      }, orderBy: {
        createdAt: "desc"
      }
    });

    if (!projects) {
      return { error: "Projects Not Found" }
    }

    return projects
  } catch (error) {
    console.error("❌ Error getting projects: ", error);
    return {
      error: "Failed to get Projects"
    }
  }
}

export const getProjectById = async (id: string) => {
  const user = await getCurrentUser()

  if (!user) return { error: "Unauthorized" }

  try {
    const project = await prisma.project.findUnique({
      where: {
        id, userId: user.id
      }, include: {
        messages: true
      }
    });

    if (!project) {
      return { error: "Project Not Found" }
    }

    return project
  } catch (error) {
    console.error("❌ Error getting project by id: ", error);
    return {
      error: "Failed to get Project by id"
    }
  }
}