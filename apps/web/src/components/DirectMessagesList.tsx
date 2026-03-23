"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Search } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

export default function DirectMessagesList() {
  const { t } = useTranslation();
  const router = useRouter();
  const conversations = useQuery(api.chat.getInbox);
  const [searchTerm, setSearchTerm] = useState("");

  if (conversations === undefined) {
    {/* 👇 Tận dụng key chat.loading đã có sẵn 👇 */}
    return <div className="p-4 text-center text-gray-400 text-sm">{t('chat.loading')}</div>;
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-3 border-b border-gray-100 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('members.search_placeholder')}
            className="w-full bg-gray-100 border border-gray-200 rounded-lg py-1.5 pl-9 pr-3 text-[13px] outline-none focus:border-green-300 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto hidden-scrollbar space-y-1 p-2">
        {conversations?.map((conv: any) => {
          const otherUser = conv.otherUser;

          return (
            <div
              key={conv._id}
              onClick={() => router.push(`/chat/${conv._id}`)}
              className="flex items-center gap-3 p-2 hover:bg-green-50 rounded-lg cursor-pointer transition-colors relative"
            >
              <div className="relative shrink-0">
                <img
                  src={otherUser?.imageUrl || "https://ui-avatars.com/api/?name=U"}
                  alt="Avt"
                  className="w-12 h-12 rounded-full object-cover border border-gray-100"
                />
                {otherUser?.isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>}
              </div>

              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="text-[14px] font-bold text-gray-950 truncate leading-tight">
                  @{otherUser?.email?.split('@')[0] || otherUser?.username?.toLowerCase() || 'user'}
                </div>

                <p className="text-[12px] text-gray-600 truncate mt-0.5">
                  <span className="font-semibold text-gray-800">
                    {otherUser?.first_name || ''}:
                  </span> {conv.lastMessage || t('messages.empty_messages')} {/* 👇 Tận dụng key empty_messages 👇 */}
                </p>
              </div>

              {conv.unreadCount > 0 && (
                <div className="flex flex-col items-end shrink-0 ml-1">
                   <span className="bg-green-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
                     {conv.unreadCount}
                   </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}