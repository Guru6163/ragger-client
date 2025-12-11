"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
  MessageSquare,
  Settings,
  FileText,
  Bot,
  BookOpen,
  SquareTerminal,
  Frame,
  PieChart,
  Map,
} from "lucide-react"
import { NavMain } from "./nav-main"
import { NavProjects } from "./nav-projects"
import { NavUser } from "./nav-user"
import { TeamSwitcher } from "./team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

const navMainItems = [
  {
    title: "Chat",
    url: "/chat",
    icon: SquareTerminal,
    isActive: false,
    items: [
      {
        title: "History",
        url: "/chat/history",
      },
      {
        title: "Starred",
        url: "/chat/starred",
      },
      {
        title: "Settings",
        url: "/chat/settings",
      },
    ],
  },
  {
    title: "Projects",
    url: "/projects",
    icon: Bot,
    isActive: false,
    items: [
      {
        title: "All Projects",
        url: "/projects",
      },
      {
        title: "Recent",
        url: "/projects/recent",
      },
      {
        title: "Archived",
        url: "/projects/archived",
      },
    ],
  },
  {
    title: "Documents",
    url: "/documents",
    icon: BookOpen,
    isActive: false,
    items: [
      {
        title: "All Documents",
        url: "/documents",
      },
      {
        title: "Recent",
        url: "/documents/recent",
      },
      {
        title: "Favorites",
        url: "/documents/favorites",
      },
    ],
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    isActive: false,
    items: [
      {
        title: "General",
        url: "/settings",
      },
      {
        title: "Team",
        url: "/settings/team",
      },
      {
        title: "Billing",
        url: "/settings/billing",
      },
      {
        title: "Limits",
        url: "/settings/limits",
      },
    ],
  },
]


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  // Update active state based on current pathname
  const navMainItemsWithActive = navMainItems.map((item) => ({
    ...item,
    isActive: pathname === item.url || pathname?.startsWith(item.url + "/"),
  }))

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainItemsWithActive} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
