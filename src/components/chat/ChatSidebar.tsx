import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  MessageSquare,
  Trash2,
  Settings,
  LogOut,
  PanelLeftClose,
  LayoutDashboard,
  Home,
  Video,
  ChevronDown
} from "lucide-react";
import { RefObject } from "react";

interface Chat {
  id: string;
  title: string;
  createdAt: string;
}

interface User {
  name?: string;
  email?: string;
  picture?: string;
}

interface ChatSidebarProps {
  setIsLeftSidebarOpen: (open: boolean) => void;
  chats: Chat[];
  activeChatId: string | null;
  handleChatSelect: (id: string) => void;
  handleDeleteChat: (e: React.MouseEvent, id: string) => void;
  formatChatDate: (date: string) => string;
  userInitial: string;
  displayName: string;
  user: User | null;
  isAccountMenuOpen: boolean;
  setIsAccountMenuOpen: (open: boolean) => void;
  accountMenuRef: RefObject<HTMLDivElement | null>;
  handleLogout: () => void;
}

export default function ChatSidebar({
  setIsLeftSidebarOpen,
  chats,
  activeChatId,
  handleChatSelect,
  handleDeleteChat,
  formatChatDate,
  userInitial,
  displayName,
  user,
  isAccountMenuOpen,
  setIsAccountMenuOpen,
  accountMenuRef,
  handleLogout
}: ChatSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-[300px] border-r border-gray-100 flex flex-col bg-gray-50/50 h-full shrink-0">
      <div className="p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">
            Menu
          </span>
          <button
            onClick={() => setIsLeftSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-all"
            title="Chiudi sidebar"
          >
            <PanelLeftClose size={16} />
          </button>
        </div>

        <Link
          href="/"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm shadow-sm transition-all ${
            pathname === "/"
              ? "bg-purple-50 border border-purple-200 text-purple-700"
              : "bg-white border border-gray-200 text-gray-700 hover:border-purple-300 hover:bg-purple-50"
          }`}
        >
          <Home
            size={18}
            className={pathname === "/" ? "text-purple-600" : "text-gray-500"}
          />
          Home
        </Link>

        <Link
          href="/chat"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm shadow-sm transition-all ${
            pathname === "/chat"
              ? "bg-purple-50 border border-purple-200 text-purple-700"
              : "bg-white border border-gray-200 text-gray-700 hover:border-purple-300 hover:bg-purple-50"
          }`}
        >
          <MessageSquare
            size={18}
            className={pathname === "/chat" ? "text-purple-600" : "text-gray-500"}
          />
          Chat
        </Link>

        <Link
          href="/videos"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm shadow-sm transition-all ${
            pathname === "/videos"
              ? "bg-purple-50 border border-purple-200 text-purple-700"
              : "bg-white border border-gray-200 text-gray-700 hover:border-purple-300 hover:bg-purple-50"
          }`}
        >
          <Video
            size={18}
            className={pathname === "/videos" ? "text-purple-600" : "text-gray-500"}
          />
          Trascrizioni
        </Link>

        <Link
          href="/dashboard"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm shadow-sm transition-all ${
            pathname === "/dashboard"
              ? "bg-purple-50 border border-purple-200 text-purple-700"
              : "bg-white border border-gray-200 text-gray-700 hover:border-purple-300 hover:bg-purple-50"
          }`}
        >
          <LayoutDashboard
            size={18}
            className={pathname === "/dashboard" ? "text-purple-600" : "text-gray-500"}
          />
          Dashboard
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
        <div>
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 mb-3">
            Cronologia Conversazioni
          </h4>
          <div className="space-y-1">
            {chats.length > 0 &&
              chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-bold transition-all group cursor-pointer ${
                    activeChatId === chat.id
                      ? "bg-white text-purple-600 shadow-sm border border-gray-100"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                  onClick={() => handleChatSelect(chat.id)}
                >
                  <MessageSquare
                    size={16}
                    className={
                      activeChatId === chat.id
                        ? "text-purple-600"
                        : "text-gray-400 shrink-0"
                    }
                  />
                  <span className="truncate flex-1 text-left">
                    {chat.title}
                  </span>
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {formatChatDate(chat.createdAt)}
                  </span>
                  <button
                    onClick={(e) => handleDeleteChat(e, chat.id)}
                    className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    title="Elimina chat"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-gray-100" ref={accountMenuRef}>
        <div className="relative">
          <button
            onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-white border border-gray-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all group"
          >
            {user?.picture ? (
              <img src={user.picture} alt="" className="w-9 h-9 rounded-full object-cover shadow-sm shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-linear-to-br from-purple-600 to-red-500 text-white flex items-center justify-center font-black text-xs shadow-sm shrink-0">
                {userInitial}
              </div>
            )}
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-bold text-gray-900 truncate">
                {displayName}
              </p>
              <p className="text-[10px] font-bold text-gray-400 truncate">
                {user?.email}
              </p>
            </div>
            <ChevronDown
              size={16}
              className={`text-gray-400 shrink-0 transition-transform ${isAccountMenuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {isAccountMenuOpen && (
            <div className="overflow-hidden mt-2 py-2 bg-white rounded-xl border border-gray-100 shadow-lg absolute bottom-full left-0 right-0 z-55 mb-2">
              <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                <Settings size={16} className="text-gray-500" />
                Impostazioni account
              </button>
              <button
                onClick={() => {
                  handleLogout();
                  setIsAccountMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut size={16} />
                Esci
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
