import { generateId } from '@ai-tester/shared';
import type { Project, CreateProject, UpdateProject } from '../models/index.js';
import type { ProjectRepository } from './repository.js';
import { getPrisma } from './prisma-client.js';

function toProject(row: any): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    environments: JSON.parse(row.environments),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaProjectRepository implements ProjectRepository {
  async create(data: CreateProject): Promise<Project> {
    const row = await getPrisma().project.create({
      data: {
        id: generateId(),
        name: data.name,
        description: data.description,
        environments: JSON.stringify(data.environments ?? []),
      },
    });
    return toProject(row);
  }

  async findById(id: string): Promise<Project | null> {
    const row = await getPrisma().project.findUnique({ where: { id } });
    return row ? toProject(row) : null;
  }

  async findAll(): Promise<Project[]> {
    const rows = await getPrisma().project.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map(toProject);
  }

  async update(id: string, data: UpdateProject): Promise<Project> {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.environments !== undefined)
      updateData.environments = JSON.stringify(data.environments);

    const row = await getPrisma().project.update({
      where: { id },
      data: updateData,
    });
    return toProject(row);
  }

  async delete(id: string): Promise<void> {
    await getPrisma().project.delete({ where: { id } });
  }
}
