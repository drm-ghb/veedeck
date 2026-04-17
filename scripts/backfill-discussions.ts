import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  // 1. Find all projects without a discussion
  const projects = await prisma.project.findMany({
    where: { discussion: null },
    select: { id: true, title: true, userId: true },
  });

  console.log(`Found ${projects.length} projects without a discussion — creating...`);

  for (const project of projects) {
    await prisma.discussion.create({
      data: {
        title: project.title,
        type: "project",
        ownerId: project.userId,
        projectId: project.id,
      },
    });
    console.log(`  Created discussion for project: ${project.title} (${project.id})`);
  }

  // 2. Backfill render comments/pins
  const allDiscussions = await prisma.discussion.findMany({
    where: { projectId: { not: null } },
    select: { id: true, projectId: true },
  });

  const discussionByProject = new Map(
    allDiscussions.map((d) => [d.projectId!, d.id])
  );

  // Get all non-internal render comments across all projects
  const renders = await prisma.render.findMany({
    where: { archived: false },
    select: {
      id: true,
      name: true,
      projectId: true,
      comments: {
        where: { isInternal: false },
        select: {
          id: true,
          content: true,
          author: true,
          posX: true,
          posY: true,
          createdAt: true,
        },
      },
    },
  });

  let renderMsgCreated = 0;
  let renderMsgSkipped = 0;

  for (const render of renders) {
    const discussionId = discussionByProject.get(render.projectId);
    if (!discussionId) continue;

    for (const comment of render.comments) {
      const isPin = comment.posX !== null && comment.posY !== null;
      const sourceType = isPin ? "render_pin" : "render_comment";
      const sourceUrl = `/projects/${render.projectId}/renders/${render.id}${
        isPin ? `?pinId=${comment.id}` : `?chatId=${comment.id}`
      }`;

      // Check if already backfilled
      const existing = await prisma.discussionMessage.findFirst({
        where: { sourceId: comment.id, discussionId },
      });

      if (existing) {
        renderMsgSkipped++;
        continue;
      }

      await prisma.discussionMessage.create({
        data: {
          discussionId,
          content: comment.content,
          authorName: comment.author,
          sourceType,
          sourceId: comment.id,
          sourceUrl,
          sourceName: render.name,
          createdAt: comment.createdAt,
        },
      });
      renderMsgCreated++;
    }
  }

  console.log(`\nRender comments: ${renderMsgCreated} created, ${renderMsgSkipped} skipped (already exist)`);

  // 3. Backfill list product comments
  const lists = await prisma.shoppingList.findMany({
    where: { projectId: { not: null }, archived: false },
    select: {
      id: true,
      name: true,
      projectId: true,
      sections: {
        select: {
          products: {
            select: {
              id: true,
              name: true,
              comments: {
                select: {
                  id: true,
                  content: true,
                  author: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      },
    },
  });

  let listMsgCreated = 0;
  let listMsgSkipped = 0;

  for (const list of lists) {
    const discussionId = discussionByProject.get(list.projectId!);
    if (!discussionId) continue;

    for (const section of list.sections) {
      for (const product of section.products) {
        for (const comment of product.comments) {
          const existing = await prisma.discussionMessage.findFirst({
            where: { sourceId: comment.id, discussionId },
          });

          if (existing) {
            listMsgSkipped++;
            continue;
          }

          await prisma.discussionMessage.create({
            data: {
              discussionId,
              content: comment.content,
              authorName: comment.author,
              sourceType: "product_comment",
              sourceId: comment.id,
              sourceName: product.name,
              createdAt: comment.createdAt,
            },
          });
          listMsgCreated++;
        }
      }
    }
  }

  console.log(`List product comments: ${listMsgCreated} created, ${listMsgSkipped} skipped (already exist)`);
  console.log(`\nBackfill complete!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
