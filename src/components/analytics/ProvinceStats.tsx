import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpDown } from "lucide-react";
import type { ProvinceStats } from "@/types";

interface ProvinceStatsTableProps {
  data: ProvinceStats[];
}

export function ProvinceStatsTable({ data }: ProvinceStatsTableProps) {
  const sortedData = [...data].sort((a, b) => b.listings_count - a.listings_count);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-BE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const maxListings = Math.max(...data.map((d) => d.listings_count));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Listings by Province</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Province</TableHead>
              <TableHead className="text-right">
                <div className="flex items-center justify-end gap-1 cursor-pointer">
                  Avg Price
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="text-right">
                <div className="flex items-center justify-end gap-1 cursor-pointer">
                  Listings
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((province) => (
              <TableRow key={province.province}>
                <TableCell className="font-medium">{province.province}</TableCell>
                <TableCell className="text-right">
                  <span className="text-blue-600 font-medium">
                    {formatPrice(province.avg_price)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                        style={{
                          width: `${(province.listings_count / maxListings) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm text-slate-600 w-10 text-right">
                      {province.listings_count}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
