
"use client";

import { 
  LayoutDashboard, 
  Upload, 
  Bell, 
  TrendingUp, 
  PieChart, 
  Settings,
  Wallet,
  LogOut,
  LogIn
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser, useAuth } from "@/firebase";
import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Payment Reminders", url: "/reminders", icon: Bell },
  { title: "Cash Flow Projections", url: "/projections", icon: TrendingUp },
  { title: "Financial Reports", url: "/reports", icon: PieChart },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, loading } = useUser();
  const auth = useAuth();
  const { toast } = useToast();

  const handleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast({
        title: "Signed in successfully",
        description: "Welcome back to Payplanr!",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: error.message,
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Signed out",
        description: "See you soon!",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign out failed",
        description: error.message,
      });
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

      <SidebarFooter className="p-4 border-t border-white/10">
        <SidebarMenu>
          {user ? (
            <>
              <SidebarMenuItem>
                <SidebarMenuButton className="h-12 w-full justify-start gap-3">
                  <Avatar className="h-8 w-8 border border-white/20">
                    <AvatarImage src={user.photoURL || ""} />
                    <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                      {user.displayName?.substring(0, 2).toUpperCase() || "JD"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col text-left group-data-[collapsible=icon]:hidden">
                    <span className="text-sm font-medium truncate max-w-[120px]">{user.displayName || "User"}</span>
                    <span className="text-xs text-white/50">Admin</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={handleSignOut}
                  className="w-full justify-start gap-3 hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="group-data-[collapsible=icon]:hidden">Sign Out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </>
          ) : (
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={handleSignIn}
                className="w-full justify-start gap-3 bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <LogIn className="w-5 h-5" />
                <span className="group-data-[collapsible=icon]:hidden">Sign In with Google</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
