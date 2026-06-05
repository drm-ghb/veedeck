import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getWorkspaceUserId } from "@/lib/workspace";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ count: 0 });

  const designerId = getWorkspaceUserId(session as any);

  const count = await prisma.contractorFileComment.count({
    where: {
      viewedByDesigner: false,
      file: {
        folder: {
          assignment: {
            contractor: { designerId },
          },
        },
      },
    },
  });

  return NextResponse.json({ count });
}
