import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import PdfThumbnail from "./PdfThumbnail";

interface RenderThumbnailProps {
  id: string;
  name: string;
  fileUrl: string;
  fileType?: string;
  commentCount: number;
  projectId: string;
}

export default function RenderThumbnail({
  id,
  name,
  fileUrl,
  fileType,
  commentCount,
  projectId,
}: RenderThumbnailProps) {
  return (
    <Link href={`/projekty/${projectId}/renders/${id}`}>
      <Card className="overflow-hidden hover:shadow-[0_4px_16px_rgba(25,33,61,0.2)] hover:border-primary/30 transition-all cursor-pointer group">
        <div className="relative aspect-video bg-gray-100 overflow-hidden flex items-center justify-center">
          {fileType === "pdf" ? (
            <PdfThumbnail fileUrl={fileUrl} className="w-full h-full group-hover:scale-105 transition-transform duration-200" />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={fileUrl}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          )}
          {fileType === "pdf" && (
            <span className="absolute bottom-2 left-2 z-10 bg-black/50 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">PDF</span>
          )}
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
