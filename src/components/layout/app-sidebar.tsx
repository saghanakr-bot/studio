
"use client";

import { 
  LayoutDashboard, 
  TrendingUp, 
  PieChart, 
  Wallet,
  RefreshCw,
  Loader2,
  CalendarDays
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useFirestore } from "@/firebase";
import { collection, getDocs, deleteDoc, collectionGroup } from "firebase/firestore";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Projections", url: "/projections", icon: TrendingUp },
  { title: "Reminders", url: "/reminders", icon: CalendarDays },
  { title: "Reports", url: "/reports", icon: PieChart },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const db = useFirestore();
  const { toast } = useToast();
  const [isResetting, setIsResetting] = useState(false);

  const handleResetData = async () => {
    if (!db) return;
    setIsResetting(true);
    
    try {
      const txSnapshot = await getDocs(collectionGroup(db, "transactions"));
      const txDeletes = txSnapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(txDeletes);

      const accountsSnapshot = await getDocs(collection(db, "accounts"));
      const accountDeletes = accountsSnapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(accountDeletes);

      toast({
        title: "Account Reset",
        description: "All financial data has been wiped successfully.",
      });
      
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Reset Error:", error);
      toast({
        variant: "destructive",
        title: "Reset Failed",
        description: "Could not clear data. Please try again.",
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="p-4 flex flex-row items-center gap-2 text-white">
        <div className="bg-accent text-accent-foreground p-1.5 rounded-lg">
          <Wallet size={24} />
        </div>
        <span className="font-bold text-xl tracking-tight group-data-[collapsible=icon]:hidden">
          Payplanr
        </span>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/60 group-data-[collapsible=icon]:hidden">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                    <Link href={item.url}>
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-white/10 space-y-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <SidebarMenuButton className="h-10 w-full justify-start gap-3 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10">
                  {isResetting ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                  <span className="group-data-[collapsible=icon]:hidden">Reset Account</span>
                </SidebarMenuButton>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action will permanently delete all your synced accounts, statements, and pending transactions. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetData} className="bg-destructive hover:bg-destructive/90">
                    Wipe Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton className="h-12 w-full justify-start gap-3">
              <Avatar className="h-8 w-8 border border-white/20">
                <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                  DU
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-left group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-medium">Demo User</span>
                <span className="text-xs text-white/50">Admin</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
