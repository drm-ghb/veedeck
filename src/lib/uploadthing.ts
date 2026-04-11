import { createUploadthing, type FileRouter } from "uploadthing/next";
import { auth } from "./auth";
import { prisma } from "./prisma";

const f = createUploadthing();

export const ourFileRouter = {
  renderUploader: f({ image: { maxFileSize: "16MB", maxFileCount: 10 } })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user?.id) throw new Error("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.url, key: file.key, userId: metadata.userId };
    }),
  productImageUploader: f({ image: { maxFileSize: "8MB", maxFileCount: 1 } })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user?.id) throw new Error("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.url, key: file.key };
    }),
  logoUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user?.id) throw new Error("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.url, key: file.key };
    }),
  clientRenderUploader: f({ image: { maxFileSize: "16MB", maxFileCount: 10 } })
    .middleware(async ({ req }) => {
      const token = req.headers.get("x-share-token");
      if (!token) throw new Error("Unauthorized");
      const project = await prisma.project.findUnique({
        where: { shareToken: token },
        select: { id: true, clientCanUpload: true, archived: true },
      });
      if (!project || project.archived || !project.clientCanUpload) {
        throw new Error("Unauthorized");
      }
      return { projectId: project.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.url, key: file.key, projectId: metadata.projectId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
