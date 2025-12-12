"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {ChatInput} from "@/components/chat/ChatInput"
import { MessageList } from "@/components/chat/MessageList"
import { ErrorDisplay } from "@/components/chat/ErrorDisplay"

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface ChatInterfaceProps {
  messages?: Message[]
  isLoading?: boolean
  error?: string | null
  onSendMessage?: (message: string) => void
}

// Stable empty array to avoid recreating on every render
const EMPTY_MESSAGES: Message[] = []

export function ChatInterface({
  messages,
  isLoading = false,
  error = null,
  onSendMessage,
}: ChatInterfaceProps) {
  const messagesToUse = messages ?? EMPTY_MESSAGES
  const [localMessages, setLocalMessages] = React.useState<Message[]>(messagesToUse)
  const prevMessagesKeyRef = React.useRef<string>("")

  React.useEffect(() => {
    // Create a stable key from messages to detect actual changes
    const messagesKey = messagesToUse.map(m => `${m.id}:${m.content}`).join("|")
    
    // Only update if the messages actually changed
    if (messagesKey !== prevMessagesKeyRef.current) {
      setLocalMessages(messagesToUse)
      prevMessagesKeyRef.current = messagesKey
    }
  }, [messagesToUse])

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    }
    setLocalMessages((prev) => [...prev, newMessage])
    onSendMessage?.(content)
  }

  return (
    <Card className="flex h-full max-h-full flex-col">
      <CardHeader className="shrink-0">
        <CardTitle>Chat Assistant</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        {error && <ErrorDisplay error={error} />}
        <div className="flex min-h-0 flex-1">
          <MessageList messages={localMessages} isLoading={isLoading} />
        </div>
        <div className="shrink-0">
          <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
        </div>
      </CardContent>
    </Card>
  )
}


