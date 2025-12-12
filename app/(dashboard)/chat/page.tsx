"use client"

import React from 'react'
import { ChatInterface } from '@/components/chat/ChatInterface'

export default function ChatPage() {
  const handleSendMessage = (message: string) => {
    // TODO: Implement API call to send message
    console.log('Sending message:', message)
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] w-full max-w-4xl">
      <ChatInterface onSendMessage={handleSendMessage} />
    </div>
  )
}


