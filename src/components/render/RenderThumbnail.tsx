import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface RenderThumbnailProps {
  id: string;
  name: string;
  fileUrl: string;
  commentCount: number;
  projectId: string;
}

export default function RenderThumbnail({
  id,
  name,
  fileUrl,
  commentCount,
  projectId,
}: RenderThumbnailProps) {
  return (
    <Link href={`/projects/${projectId}/renders/${id}`}>
      <Card className="overflow-hidden hover:shadow-[0_4px_16px_rgba(25,33,61,0.2)] hover:border-primary/30 transition-all cursor-pointer group">
        <div className="aspect-video bg-gray-100 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fileUrl}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        </div>
        <div className="p-3 flex items-center justify-between">
          <span className="text-sm font-medium truncate">{name}</span>
          {commentCount > 0 && (
            <Badge variant="secondary" className="ml-2 flex-shrink-0">
              {commentCount} uwag
            </Badge>
          )}
        </div>
      </Card>
    </Link>
  );
}
