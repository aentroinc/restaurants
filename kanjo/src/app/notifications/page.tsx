"use client";

import { notifications, lineMessages } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

const typeConfig: Record<string, { icon: string; bg: string }> = {
  forecast: { icon: "📊", bg: "bg-blue-50" },
  stock: { icon: "🥩", bg: "bg-yellow-50" },
  sales: { icon: "💰", bg: "bg-green-50" },
  staff: { icon: "🙋", bg: "bg-red-50" },
  waste: { icon: "🥗", bg: "bg-orange-50" },
};

export default function NotificationsPage() {
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/" className="text-gray-400">
          ← もどる
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">おしらせ</h1>
        {unread > 0 && (
          <Badge className="bg-red-500 text-white border-0 text-xs">
            よんでない {unread}件
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        {notifications.map((notif) => {
          const config = typeConfig[notif.type] || {
            icon: "📌",
            bg: "bg-gray-50",
          };
          return (
            <Card
              key={notif.id}
              className={`border-0 shadow-sm ${!notif.read ? config.bg : ""}`}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <span className="text-lg mt-0.5">{config.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p
                        className={`text-sm ${!notif.read ? "font-bold" : "font-medium text-gray-600"}`}
                      >
                        {notif.title}
                      </p>
                      <span className="text-xs text-gray-400">
                        {notif.time}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{notif.body}</p>
                    {!notif.read && (
                      <div className="w-2 h-2 bg-orange-500 rounded-full absolute top-3 right-3" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Separator />

      <div>
        <h2 className="text-sm font-bold mb-2">📱 LINEで届くおしらせ</h2>
        <div className="space-y-3">
          {lineMessages.map((msg, i) => (
            <Card key={i} className="border-0 shadow-sm bg-green-50">
              <CardContent className="p-4">
                <p className="text-xs text-gray-400 mb-2">{msg.time} に届く</p>
                <div className="bg-white rounded-xl p-3 shadow-sm text-sm whitespace-pre-line leading-relaxed">
                  {msg.content}
                </div>
                <button className="mt-2 w-full bg-green-500 text-white rounded-lg py-2 text-sm font-medium">
                  👉 {msg.button}
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
