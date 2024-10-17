"use client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { useParams } from "next/navigation";
const GroupsTab: React.FC = () => {
  const { group } = useParams();
  return (
    <Tabs defaultValue={group as string}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger asChild value="kiwis">
          <Link href="/">🥝 Kiwi&#39;s</Link>
        </TabsTrigger>
        <TabsTrigger asChild value="niglos">
          <Link href="/niglos">🦔 Niglo&#39;s</Link>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};
export default GroupsTab;
