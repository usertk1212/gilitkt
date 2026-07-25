import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { TableCell, TableRow } from './ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Asset } from '../utils/appwriteApi';
import { ASSET_TYPE_LABELS } from './constants/projectConstants';
import { copyToClipboard } from '../utils/clipboard';
import { Copy, Edit, Eye, MoreHorizontal, Trash2 } from "./icons";

interface AssetTableRowProps {
  asset: Asset;
}

export function AssetTableRow({ asset }: AssetTableRowProps) {
  const handleCopyUrl = (url: string, assetName: string) => {
    copyToClipboard(url, `"${assetName}" URL copied to clipboard!`);
  };

  return (
    <TableRow className="hover:bg-gray-50">
      <TableCell>
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
          <ImageWithFallback
            src={asset.url_lightroom}
            alt={asset.asset_name}
            className="w-full h-full object-contain"
          />
        </div>
      </TableCell>
      <TableCell>
        <div className="font-medium">{asset.asset_name}</div>
        <div className="text-sm text-muted-foreground truncate max-w-48">
          {asset.nama_file}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className="text-xs">
          {ASSET_TYPE_LABELS[asset.type as keyof typeof ASSET_TYPE_LABELS] || asset.type}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="text-sm text-muted-foreground truncate max-w-32">
          {asset.nama_file}
        </div>
      </TableCell>
      <TableCell>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleCopyUrl(asset.url_lightroom, asset.asset_name)}
          className="h-7 px-2 text-xs"
          style={{
            background: 'var(--pp-bg-blue-high)',
            color: 'white',
            border: 'none'
          }}
        >
          <Copy className="w-3 h-3 mr-1" />
          Copy URL
        </Button>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => window.open(asset.url_lightroom, '_blank')}>
              <Eye className="w-4 h-4 mr-2" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}