import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Returns total render count (non-archived) for each folder ID,
 * recursively including all nested subfolders at any depth.
 */
export async function getRecursiveRenderCounts(
  folderIds: string[]
): Promise<Map<string, number>> {
  if (folderIds.length === 0) return new Map();

  const results = await prisma.$queryRaw<{ root_id: string; count: bigint }[]>`
    WITH RECURSIVE folder_tree AS (
      SELECT id, id AS root_id FROM "Folder" WHERE id IN (${Prisma.join(folderIds)})
      UNION ALL
      SELECT f.id, ft.root_id FROM "Folder" f
      INNER JOIN folder_tree ft ON f."parentId" = ft.id
    )
    SELECT ft.root_id, COUNT(r.id) AS count
    FROM folder_tree ft
    LEFT JOIN "Render" r ON r."folderId" = ft.id AND r.archived = false
    GROUP BY ft.root_id
  `;

  const map = new Map<string, number>();
  for (const row of results) {
    map.set(row.root_id, Number(row.count));
  }
  for (const id of folderIds) {
    if (!map.has(id)) map.set(id, 0);
  }
  return map;
}
