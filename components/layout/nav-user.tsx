"use client"

import { UserButton } from "@clerk/nextjs"
import {
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavUser() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex w-full items-center">
          <UserButton
            appearance={{
              elements: {
                userButtonBox: "w-full",
                userButtonTrigger: "w-full justify-start gap-2 h-12 px-2 rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
                userButtonAvatarBox: "h-8 w-8 rounded-lg",
                userButtonPopoverCard: "shadow-lg rounded-lg",
                userButtonPopoverActions: "p-2",
              },
            }}
            userProfileMode="modal"
            afterSignOutUrl="/sign-in"
          />
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
