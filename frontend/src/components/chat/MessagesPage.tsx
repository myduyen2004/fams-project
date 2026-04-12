import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
} from "react";
import { useLocation } from "react-router-dom";
import {
  MessageCircle,
  Send,
  FileText,
  X,
  Search,
  Users,
  ArrowLeft,
  ChevronDown,
  Image as ImageIcon,
  Info,
  Plus,
  Trash2,
  Download,
  Folder,
  File as FileIcon,
  ExternalLink,
  Reply,
  Eye,
  Smile,
} from "lucide-react";
import {
  chatGroupService,
  ChatGroupResponse,
  ChatMessageResponse,
} from "../../services/api/chatGroupService";
import { getViewableFileUrl } from "../../services/utils/fileViewerUtils";
import { Client } from "@stomp/stompjs";
import { WS_URL } from "../../services/api/config";
import { toast } from "react-hot-toast";
import { ConfirmModal } from "../common/ConfirmModal";

interface MessagesPageProps {
  role: "LECTURER" | "STUDENT";
}

const UNREAD_THRESHOLD = 10;
const MessagesPage: React.FC<MessagesPageProps> = ({ role }) => {
  const location = useLocation();

  const [groups, setGroups] = useState<ChatGroupResponse[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ChatGroupResponse | null>(
    null
  );
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Refs must be declared before any logic that might access them
  const groupsRef = useRef<ChatGroupResponse[]>([]);
  const selectedGroupRef = useRef<ChatGroupResponse | null>(null);
  const stompSubsRef = useRef<{ [key: string]: { unsubscribe: () => void } }>(
    {}
  );
  const timeoutSubsRef = useRef<{
    [key: string]: ReturnType<typeof setTimeout>;
  }>({});
  const stompClientRef = useRef<Client | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastReadTimeRef = useRef<{ [key: number]: number }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInitialLoad = useRef(true);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Sync refs immediately to ensure they are never stale in callbacks
  groupsRef.current = groups;
  selectedGroupRef.current = selectedGroup;

  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<
    { id: string; url: string | null; name: string; type: string }[]
  >([]);
  const [showDetailSidebar, setShowDetailSidebar] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<number | null>(null);
  const [detailViewMode, setDetailViewMode] = useState<
    "INFO" | "MEMBERS" | "MEDIA"
  >("INFO");
  const [mediaTab, setMediaTab] = useState<"IMAGE" | "FILE" | "LINK">("IMAGE");
  const [previewData, setPreviewData] = useState<{
    isOpen: boolean;
    url: string | null;
    name: string | null;
    type: string | null;
  } | null>(null);
  const [isUnreadOnly, setIsUnreadOnly] = useState(false);
  const [expandedMessageId, setExpandedMessageId] = useState<number | null>(
    null
  );
  const [replyingTo, setReplyingTo] = useState<{
    id: number;
    senderName: string;
    content: string;
    attachmentUrl?: string | null;
    type?: string;
  } | null>(null);
  const [showReactionPickerId, setShowReactionPickerId] = useState<
    number | null
  >(null);

  // Sidebar resizing state
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(320);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(320);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);

  // Theme colors based on role
  const themeColor = role === "LECTURER" ? "orange" : "blue";
  const bgColor = role === "LECTURER" ? "bg-orange-500" : "bg-blue-500";
  const bgColorLight = role === "LECTURER" ? "bg-orange-100" : "bg-blue-100";
  const textColor = role === "LECTURER" ? "text-orange-600" : "text-blue-600";

  const triggerMarkAsRead = (groupId: number) => {
    if (!groupId) return;

    const now = Date.now();
    const lastRead = lastReadTimeRef.current[groupId] || 0;

    // 1. Throttle/Debounce: If called within 2s, schedule a trailing call
    if (now - lastRead < 2000) {
      if (timeoutSubsRef.current[`read_timeout_${groupId}`]) {
        clearTimeout(timeoutSubsRef.current[`read_timeout_${groupId}`]);
      }
      timeoutSubsRef.current[`read_timeout_${groupId}`] = setTimeout(() => {
        triggerMarkAsRead(groupId);
      }, 2100 - (now - lastRead));
      return;
    }

    // Clear any pending trailing-edge call
    if (timeoutSubsRef.current[`read_timeout_${groupId}`]) {
      clearTimeout(timeoutSubsRef.current[`read_timeout_${groupId}`]);
      delete timeoutSubsRef.current[`read_timeout_${groupId}`];
    }

    // 2. Refresh local state immediately for UI responsiveness
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, unreadCount: 0, firstUnreadMessageId: undefined }
          : g
      )
    );
    setSelectedGroup((prev) =>
      prev?.id === groupId
        ? { ...prev, unreadCount: 0, firstUnreadMessageId: undefined }
        : prev
    );

    // 3. Add 100ms safety delay before actual persistence to prevent race conditions with DB
    setTimeout(() => {
      const currentSelected = selectedGroupRef.current;
      if (currentSelected?.id !== groupId) return;

      lastReadTimeRef.current[groupId] = now;
      console.debug(
        "[MessagesPage] Triggering read receipt for group",
        groupId
      );

      if (stompClientRef.current?.connected) {
        stompClientRef.current.publish({
          destination: `/app/chat.read/${groupId}`,
        });
      } else {
        chatGroupService
          .markAsRead(groupId)
          .then(() => {
            setGroups((prev) =>
              prev.map((g) => (g.id === groupId ? { ...g, unreadCount: 0 } : g))
            );
          })
          .catch(console.error);
      }
    }, 100);
  };

  // Sidebar resizing handlers
  const startResizingLeft = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingLeft(true);
  }, []);

  const startResizingRight = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingRight(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizingLeft(false);
    setIsResizingRight(false);
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizingLeft) {
        const newWidth = e.clientX;
        if (newWidth >= 200 && newWidth <= 450) {
          setLeftSidebarWidth(newWidth);
        }
      }
      if (isResizingRight) {
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth >= 280 && newWidth <= 500) {
          setRightSidebarWidth(newWidth);
        }
      }
    },
    [isResizingLeft, isResizingRight]
  );

  useEffect(() => {
    if (isResizingLeft || isResizingRight) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    } else {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
      document.body.style.cursor = "default";
      document.body.style.userSelect = "auto";
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizingLeft, isResizingRight, resize, stopResizing]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const data = await chatGroupService.getMyGroups();
      setGroups(data);
      groupsRef.current = data;

      // Handle initial group selection from navigation state
      const state = location.state as { selectedGroupId?: number };
      if (state?.selectedGroupId) {
        const groupToSelect = data.find((g) => g.id === state.selectedGroupId);
        if (groupToSelect) {
          setSelectedGroup(groupToSelect);
        }
      }

      // Connect WebSocket after groups are loaded
      initWebSocket(data);
    } catch (error) {
      console.error("Error loading groups:", error);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadGroups();
    return () => {
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
      }
    };
  }, []);

  // Single WebSocket connection for all chat features
  const initWebSocket = (allGroups: ChatGroupResponse[]) => {
    if (stompClientRef.current) {
      stompClientRef.current.deactivate();
    }

    const token = localStorage.getItem("token");
    const stompClient = new Client({
      brokerURL: WS_URL,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.info("[MessagesPage] WebSocket Connected");

        // 1. Subscribe to ALL groups for message updates, deletions, and read receipts
        allGroups.forEach((group) => {
          // Message subscription
          const msgId = `messages_${group.id}`;
          if (stompSubsRef.current[msgId] && stompClient.connected)
            stompSubsRef.current[msgId].unsubscribe();
          stompSubsRef.current[msgId] = stompClient.subscribe(
            `/topic/chat/${group.id}`,
            (message) => {
              const msg = JSON.parse(message.body);
              const user = JSON.parse(localStorage.getItem("user") || "{}");
              const currentUserId = Number(user.id);
              const isOwnMessage = Number(msg.senderId) === currentUserId;

              // If this group is currently selected, update messages list
              if (selectedGroupRef.current?.id === group.id) {
                const newMsg: ChatMessageResponse = {
                  ...msg,
                  isOwn: isOwnMessage,
                };

                // If window is focused and it's NOT our message, mark as read immediately
                if (document.hasFocus() && !isOwnMessage) {
                  newMsg.isRead = true;
                  const user = JSON.parse(localStorage.getItem("user") || "{}");
                  if (user && user.id) {
                    newMsg.readers = [
                      ...(newMsg.readers || []),
                      {
                        userId: Number(user.id),
                        fullName: user.fullName || user.username,
                        avatar: user.avatar || "",
                      },
                    ];
                  }
                  triggerMarkAsRead(group.id);
                }

                setMessages((prev) => {
                  // 1. If this exact ID is already there, ignore
                  if (prev.find((m) => m.id === newMsg.id)) return prev;

                  // 2. If this is our own message, it might be replacing an optimistic one
                  if (isOwnMessage) {
                    const filtered = prev.filter((m) => {
                      if (!m.isSending) return true;
                      // Match by type and content/filename
                      if (m.type !== newMsg.type) return true;
                      if (m.type === "TEXT")
                        return m.content !== newMsg.content;
                      return m.attachmentName !== newMsg.attachmentName;
                    });
                    return [...filtered, newMsg];
                  }

                  // 3. For others' messages, just append
                  return [...prev, newMsg];
                });
                // Scroll handling logic
                if (scrollContainerRef.current) {
                  const { scrollTop, scrollHeight, clientHeight } =
                    scrollContainerRef.current;
                  const atBottom =
                    scrollHeight - scrollTop - clientHeight < 150;

                  if (atBottom || isOwnMessage) {
                    scrollToBottom();
                  } else {
                    setUnreadMessageCount((prev) => prev + 1);
                    setShowScrollBottom(true);
                  }
                } else {
                  // Fallback during initial load or if ref is missing
                  scrollToBottom();
                }
              }

              // Update sidebar
              setGroups((prevGroups) => {
                const updatedGroups = prevGroups.map((g) => {
                  if (g.id === group.id) {
                    return {
                      ...g,
                      lastMessage: {
                        senderName: msg.senderName,
                        content: msg.content,
                        type: msg.type,
                        sentAt: msg.sentAt,
                      },
                      unreadCount:
                        selectedGroupRef.current?.id !== group.id &&
                          !isOwnMessage
                          ? (g.unreadCount || 0) + 1
                          : selectedGroupRef.current?.id === group.id
                            ? 0
                            : g.unreadCount,
                    };
                  }
                  return g;
                });

                return [...updatedGroups].sort((a, b) => {
                  const timeA = a.lastMessage?.sentAt
                    ? new Date(a.lastMessage.sentAt).getTime()
                    : 0;
                  const timeB = b.lastMessage?.sentAt
                    ? new Date(b.lastMessage.sentAt).getTime()
                    : 0;
                  return timeB - timeA;
                });
              });
            }
          );

          // Read receipt subscription for this group
          const readId = `read_${group.id}`;
          if (stompSubsRef.current[readId] && stompClient.connected)
            stompSubsRef.current[readId].unsubscribe();
          stompSubsRef.current[readId] = stompClient.subscribe(
            `/topic/chat/${group.id}/read`,
            (message) => {
              const data = JSON.parse(message.body);
              const { messageIds, reader } = data;

              console.log(`[READ RECEIPT] Received for group ${group.id}:`, {
                messageIds,
                reader,
                currentMessages: messages.length,
              });

              if (!messageIds || !reader) {
                console.warn(
                  "[READ RECEIPT] Missing messageIds or reader, ignoring"
                );
                return;
              }

              setMessages((prev) => {
                console.log(
                  "[READ RECEIPT] Processing",
                  prev.length,
                  "messages"
                );
                const updated = prev.map((m) => {
                  const isMatch = messageIds.some(
                    (id: string | number) => Number(id) === Number(m.id)
                  );
                  if (isMatch) {
                    const alreadyRead = m.readers?.find(
                      (r) => Number(r.userId) === Number(reader.userId)
                    );
                    if (!alreadyRead) {
                      console.log(
                        "[READ RECEIPT] Adding reader to message",
                        m.id,
                        reader.fullName
                      );
                      return {
                        ...m,
                        isRead: true,
                        readers: [
                          ...(m.readers || []),
                          {
                            userId: Number(reader.userId),
                            fullName: reader.fullName,
                            avatar: reader.avatar,
                          },
                        ],
                      };
                    } else {
                      console.log(
                        "[READ RECEIPT] Reader already exists for message",
                        m.id
                      );
                    }
                  }
                  return m;
                });
                console.log(
                  "[READ RECEIPT] Updated messages count:",
                  updated.filter((m) => m.readers?.length).length
                );
                return updated;
              });
            }
          );
          console.log(
            `[SUBSCRIPTION] Created /read subscription for group ${group.id}`
          );

          // Delete subscription for this group
          const deleteId = `delete_${group.id}`;
          if (stompSubsRef.current[deleteId] && stompClient.connected)
            stompSubsRef.current[deleteId].unsubscribe();
          stompSubsRef.current[deleteId] = stompClient.subscribe(
            `/topic/chat/${group.id}/delete`,
            (message) => {
              const deletedMsg = JSON.parse(
                message.body
              ) as ChatMessageResponse;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === deletedMsg.id ? { ...m, isDeleted: true } : m
                )
              );
            }
          );

          // Reaction subscription for this group
          const reactionId = `reaction_${group.id}`;
          if (stompSubsRef.current[reactionId])
            stompSubsRef.current[reactionId].unsubscribe();
          stompSubsRef.current[reactionId] = stompClient.subscribe(
            `/topic/chat/${group.id}/reaction`,
            (message) => {
              const updatedMsg = JSON.parse(
                message.body
              ) as ChatMessageResponse;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === updatedMsg.id
                    ? { ...m, reactions: updatedMsg.reactions }
                    : m
                )
              );
            }
          );
        });

        // 2. Subscribe to user-specific notifications for read status sync
        const userNotificationsId = "user_notifications";
        if (stompSubsRef.current[userNotificationsId])
          stompSubsRef.current[userNotificationsId].unsubscribe();
        stompSubsRef.current[userNotificationsId] = stompClient.subscribe(
          "/user/queue/chat-notifications",
          (message) => {
            const data = JSON.parse(message.body);
            console.debug("[MessagesPage] User notification received:", data);

            if (data.type === "READ_UPDATE") {
              console.debug(
                `[MessagesPage] Syncing unread count for group ${data.groupId}`
              );
              setGroups((prevGroups) =>
                prevGroups.map((g) =>
                  g.id === Number(data.groupId) ? { ...g, unreadCount: 0 } : g
                )
              );
            }
          }
        );

        // 3. Trigger reactive subscription check
        setGroups((prev) => [...prev]); // Trigger re-render to fire useEffect
      },
      onStompError: (frame) => {
        console.error("STOMP error:", frame);
        toast.error("Lỗi kết nối máy chủ chat");
      },
    });
    stompClient.activate();
    stompClientRef.current = stompClient;
  };

  const setupGroupSubscriptions = (client: Client, groupId: number) => {
    // Typing subscription (group-specific, only for selected group)
    const typingId = `typing_${groupId}`;
    if (stompSubsRef.current[typingId])
      stompSubsRef.current[typingId].unsubscribe();
    stompSubsRef.current[typingId] = client.subscribe(
      `/topic/chat/${groupId}/typing`,
      (message) => {
        const data = JSON.parse(message.body);
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        if (data.username === (user.fullName || user.username)) return;
        if (data.isTyping) {
          setTypingUsers((prev) => [...new Set([...prev, data.username])]);
        } else {
          setTypingUsers((prev) => prev.filter((u) => u !== data.username));
        }
      }
    );
  };

  useEffect(() => {
    const prevId = selectedGroupRef.current?.id;

    if (selectedGroup) {
      // Always load messages when a group is selected
      setMessages([]);
      isInitialLoad.current = true;
      loadMessages(selectedGroup.id);

      if (stompClientRef.current?.connected) {
        // Clear previous typing subscription only if switching groups
        if (prevId && prevId !== selectedGroup.id) {
          const typingId = `typing_${prevId}`;
          if (stompSubsRef.current[typingId])
            stompSubsRef.current[typingId].unsubscribe();
        }
        setupGroupSubscriptions(stompClientRef.current, selectedGroup.id);

        // Mark as read and clear sidebar badge when group is selected only if under threshold
        if (
          !selectedGroup.unreadCount ||
          selectedGroup.unreadCount <= UNREAD_THRESHOLD
        ) {
          stompClientRef.current.publish({
            destination: `/app/chat.read/${selectedGroup.id}`,
          });
          setGroups((prev) =>
            prev.map((g) =>
              g.id === selectedGroup.id ? { ...g, unreadCount: 0 } : g
            )
          );
        }

        // Trigger mark as read after a short delay only if under threshold
        setTimeout(() => {
          if (selectedGroupRef.current?.id === selectedGroup.id) {
            const currentUnread = selectedGroupRef.current?.unreadCount || 0;
            if (currentUnread <= UNREAD_THRESHOLD) {
              triggerMarkAsRead(selectedGroup.id);
            }
          }
        }, 500);
      } else if (!stompClientRef.current) {
        // If no client, try initializing (shouldn't usually happen but safe fallback)
        loadGroups();
      } else {
        // Client exists but not connected yet - mark as read via REST
        chatGroupService
          .markAsRead(selectedGroup.id)
          .then(() => {
            setGroups((prev) =>
              prev.map((g) =>
                g.id === selectedGroup.id ? { ...g, unreadCount: 0 } : g
              )
            );
          })
          .catch(console.error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup?.id, stompClientRef.current?.connected]);

  // Add window focus listener to trigger read when returning to tab
  useEffect(() => {
    const handleFocus = () => {
      if (selectedGroupRef.current && stompClientRef.current?.connected) {
        console.log(
          "[MessagesPage] Window focused, marking current group as read"
        );
        triggerMarkAsRead(selectedGroupRef.current.id);
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [triggerMarkAsRead]);

  // connectWebSocket removed - logic merged into initWebSocket and setupGroupSubscriptions

  const loadMessages = async (groupId: number) => {
    try {
      console.log("[MessagesPage] Loading messages for group:", groupId);
      setMessagesLoading(true);
      const data = await chatGroupService.getMessages(groupId, 0, 100);
      console.log("[MessagesPage] Received messages data:", data);

      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const currentUserId = Number(user.id);
      const msgList = [...data.content].reverse().map((msg) => ({
        ...msg,
        isOwn: Number(msg.senderId) === currentUserId,
      }));
      console.log("[MessagesPage] Formatted messages list (reversed):", msgList);
      setMessages(msgList);

      // If unread messages <= THRESHOLD, mark as read automatically
      if (
        !selectedGroupRef.current?.unreadCount ||
        selectedGroupRef.current.unreadCount <= UNREAD_THRESHOLD
      ) {
        try {
          console.log(
            "[MessagesPage] Unread <= threshold, marking group as read automatically",
            groupId
          );
          await chatGroupService.markAsRead(groupId);

          // Reset unread count locally in the main list
          setGroups((prevGroups) =>
            prevGroups.map((g) =>
              g.id === groupId
                ? { ...g, unreadCount: 0, firstUnreadMessageId: undefined }
                : g
            )
          );
          setSelectedGroup((prev) =>
            prev?.id === groupId
              ? { ...prev, unreadCount: 0, firstUnreadMessageId: undefined }
              : prev
          );
        } catch (err) {
          console.error("[MessagesPage] Failed to mark as read", err);
        }
      } else {
        console.log(
          "[MessagesPage] Unread > threshold, waiting for user to scroll/click icon"
        );
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const scrollToBottom = (instant = false) => {
    setShowScrollBottom(false);
    setUnreadMessageCount(0);

    if (selectedGroupRef.current) {
      triggerMarkAsRead(selectedGroupRef.current.id);
    }

    if (messagesEndRef.current) {
      const scroll = () => {
        messagesEndRef.current?.scrollIntoView({
          behavior: instant ? "auto" : "smooth",
          block: "end",
        });
      };

      scroll();
      // Second pass after a small delay to account for dynamic height (images, etc)
      setTimeout(scroll, 100);
    }
  };

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || !selectedGroupRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

    if (isNearBottom && (unreadMessageCount > 0 || showScrollBottom)) {
      setShowScrollBottom(false);
      setUnreadMessageCount(0);
      triggerMarkAsRead(selectedGroupRef.current.id);
    }
  }, [unreadMessageCount, showScrollBottom, triggerMarkAsRead]);

  const handleGroupSelect = (group: ChatGroupResponse) => {
    if (selectedGroup?.id === group.id) {
      scrollToBottom();
    } else {
      setSelectedGroup(group);
    }
  };

  useLayoutEffect(() => {
    if (messages.length > 0) {
      // Always scroll to bottom as requested by user
      scrollToBottom(isInitialLoad.current);

      if (isInitialLoad.current) {
        isInitialLoad.current = false;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    messages.length,
    selectedGroup?.id,
    selectedGroup?.firstUnreadMessageId,
    selectedGroup?.unreadCount,
  ]);

  // Reset unread button when switching groups
  useEffect(() => {
    setUnreadMessageCount(0);
    setShowScrollBottom(false);
  }, [selectedGroup?.id]);

  // Helper to remove accents for download and upload
  const removeAccents = (str: string) => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/\s+/g, "_");
  };

  const downloadFile = async (url: string, fileName: string) => {
    // Check if it's a local file:// URL (optimistic/unsaved upload)
    if (url.startsWith("file://") || url.startsWith("blob:")) {
      toast.error("File này chưa được tải lên server. Vui lòng gửi lại file!", {
        duration: 5000,
      });
      return;
    }

    // Strip Cloudinary signing component to get clean public URL
    const cleanUrl = url.replace(/\/s--[^/]+--\//, "/");

    try {
      // Create an anchor and trigger download directly from the clean URL
      const link = document.createElement("a");
      link.href = cleanUrl;
      link.download = removeAccents(fileName);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Đang tải file...");
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Không thể tải file. Vui lòng thử lại sau.");
    }
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && selectedFiles.length === 0) || !selectedGroup)
      return;

    const currentMessage = newMessage;
    const currentFiles = [...selectedFiles];
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    // Optimistic UI: Clear inputs immediately
    setNewMessage("");
    setSelectedFiles([]);
    setFilePreviews([]);

    try {
      // 1. Process Message Text
      if (currentMessage.trim()) {
        const urlPattern =
          /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?(\?.*)?$/;
        const isLink = urlPattern.test(currentMessage.trim());
        chatGroupService
          .sendMessage(
            selectedGroup.id,
            currentMessage,
            isLink ? "LINK" : "TEXT",
            replyingTo?.id
          )
          .catch((err) => {
            console.error("Error sending text message:", err);
            toast.error("Vui lòng kiểm soát ngôn từ của mình");
          });
        setReplyingTo(null);
      }

      // 2. Process File Uploads (Parallel + Optimistic)
      if (currentFiles.length > 0) {
        // Upload each file in parallel using the backend endpoint
        await Promise.all(
          currentFiles.map(async (file) => {
            // Generate a temporary ID for the optimistic message
            const tempId = Number("99" + Math.floor(Math.random() * 1000000));

            // Add optimistic message to the list
            const optimisticMsg: ChatMessageResponse = {
              id: tempId,
              senderId: Number(user.id),
              senderName: user.fullName || user.username,
              senderAvatar: user.avatar || "",
              senderRole: user.role || "",
              content: "",
              type: file.type.startsWith("image/") ? "IMAGE" : "FILE",
              attachmentUrl: URL.createObjectURL(file), // Local preview
              attachmentName: file.name,
              sentAt: new Date().toISOString(),
              isOwn: true,
              isSending: true,
              readers: [],
              replyToId: replyingTo?.id || null,
              replyToContent: replyingTo?.content || null,
              replyToAttachmentUrl: replyingTo?.attachmentUrl || null,
              replyToType: replyingTo?.type || null,
            };

            setMessages((prev) => [...prev, optimisticMsg]);
            if (isInitialLoad.current) scrollToBottom();

            try {
              // Upload via Backend Proxy (Old way but parallel)
              const finalMsg = await chatGroupService.uploadAndSendFile(
                selectedGroup.id,
                file,
                replyingTo?.id
              );

              // Replace optimistic message with the real one
              setMessages((prev) => {
                // If the real message is already there (from WebSocket), just remove the optimistic one
                if (prev.some((m) => m.id === finalMsg.id)) {
                  return prev.filter((m) => m.id !== tempId);
                }
                return prev.map((m) =>
                  m.id === tempId ? { ...finalMsg, isOwn: true } : m
                );
              });
            } catch (err) {
              console.error("Failed to upload via backend:", err);
              toast.error(`Không thể tải lên ${file.name}.`);
              setMessages((prev) => prev.filter((m) => m.id !== tempId));
            }
          })
        );
      }
    } catch (error) {
      console.error("Error in handleSendMessage:", error);
      toast.error("Có lỗi xảy ra khi gửi tin nhắn");
    }
  };

  const handleSelectReaction = async (messageId: number, emoji: string) => {
    if (!selectedGroup) return;
    try {
      await chatGroupService.toggleReaction(selectedGroup.id, messageId, emoji);
      // WebSocket will handle the real-time update
    } catch (error) {
      console.error("Error toggling reaction:", error);
      toast.error("Không thể bày tỏ cảm xúc");
    }
  };

  const handleDeleteMessage = (messageId: number) => {
    setMessageToDelete(messageId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedGroup || messageToDelete === null) return;
    try {
      await chatGroupService.deleteMessage(selectedGroup.id, messageToDelete);
      toast.success("Đã thu hồi tin nhắn");
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Không thể xóa tin nhắn");
    } finally {
      setIsDeleteDialogOpen(false);
      setMessageToDelete(null);
    }
  };

  const handleReply = (msg: ChatMessageResponse) => {
    const content =
      msg.type === "TEXT" || msg.type === "LINK"
        ? msg.content
        : msg.type === "IMAGE"
          ? "[Hình ảnh]"
          : "[Tệp tin]";

    setReplyingTo({
      id: msg.id,
      senderName: msg.senderName,
      content: content,
      attachmentUrl: msg.attachmentUrl,
      type: msg.type,
    });

    // Focus input
    setTimeout(() => {
      const input = document.querySelector(
        'input[placeholder="Nhập tin nhắn..."]'
      ) as HTMLInputElement;
      if (input) input.focus();
    }, 100);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0 || !selectedGroup) return;

    setSelectedFiles((prev) => [...prev, ...files]);

    files.forEach((file) => {
      const id = Math.random().toString(36).substring(7);
      const isHeic =
        file.name.toLowerCase().endsWith(".heic") ||
        file.name.toLowerCase().endsWith(".heif");

      if (file.type.startsWith("image/") && !isHeic) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreviews((prev) => [
            ...prev,
            {
              id,
              url: reader.result as string,
              name: file.name,
              type: file.type,
            },
          ]);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreviews((prev) => [
          ...prev,
          {
            id,
            url: null,
            name: file.name,
            type: file.type,
          },
        ]);
      }
    });
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleTyping = useCallback(() => {
    if (!stompClientRef.current?.connected || !selectedGroup) return;
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    stompClientRef.current.publish({
      destination: `/app/chat.typing/${selectedGroup.id}`,
      body: JSON.stringify({
        username: user.fullName || user.username,
        isTyping: true,
      }),
    });
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      if (stompClientRef.current?.connected) {
        stompClientRef.current.publish({
          destination: `/app/chat.typing/${selectedGroup.id}`,
          body: JSON.stringify({
            username: user.fullName || user.username,
            isTyping: false,
          }),
        });
      }
    }, 2000);
  }, [selectedGroup?.id, selectedGroup]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatFullTime = (dateString: string | undefined) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string | undefined) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN");
  };

  const getFriendlyDate = (dateString: string | undefined) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    ) {
      return "Hôm nay";
    }

    if (
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()
    ) {
      return "Hôm qua";
    }

    return formatDate(dateString);
  };

  const handleOpenPreview = (url: string, name: string, type: string) => {
    setPreviewData({
      isOpen: true,
      url,
      name,
      type,
    });
  };

  const renderMessageContent = (msg: ChatMessageResponse) => {
    if (msg.type === "IMAGE_GROUP" && (msg as any).imageMessages) {
      const images = (msg as any).imageMessages as ChatMessageResponse[];
      const count = images.length;

      // Layout logic: 1-large, 2-side by side, 3-grid, 4-2x2, >4-3 columns
      let gridClass = "grid-cols-2";
      if (count === 1) gridClass = "grid-cols-1";
      else if (count === 3) gridClass = "grid-cols-3";
      else if (count > 4) gridClass = "grid-cols-3";

      return (
        <div
          className={`grid ${gridClass} gap-1 w-full max-w-[280px] sm:max-w-[320px]`}
        >
          {images.map((img) => (
            <div
              key={img.id}
              className={`relative aspect-square cursor-pointer active:scale-95 transition-transform overflow-hidden ${count === 1 ? "max-h-[300px]" : ""
                }`}
              onClick={() =>
                handleOpenPreview(
                  img.attachmentUrl!,
                  img.attachmentName || "Hình ảnh",
                  "IMAGE"
                )
              }
            >
              <img
                src={
                  img.attachmentUrl &&
                    img.attachmentUrl.includes("cloudinary.com")
                    ? img.attachmentUrl.replace(
                      "/upload/",
                      "/upload/f_auto,q_auto,w_300/"
                    )
                    : img.attachmentUrl || ""
                }
                alt={img.attachmentName || "Image"}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      );
    }
    if (msg.type === "IMAGE" && msg.attachmentUrl) {
      return (
        <div
          className="overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
          onClick={() =>
            handleOpenPreview(
              msg.attachmentUrl!,
              msg.attachmentName || "Hình ảnh",
              "IMAGE"
            )
          }
        >
          <div className="w-[150px] h-[150px] rounded-2xl overflow-hidden bg-gray-100 shadow-sm border border-gray-100">
            <img
              src={
                msg.attachmentUrl &&
                  msg.attachmentUrl.includes("cloudinary.com")
                  ? msg.attachmentUrl.replace(
                    "/upload/",
                    "/upload/f_auto,q_auto,w_300/"
                  )
                  : msg.attachmentUrl
              }
              alt={msg.attachmentName || "Image"}
              className="w-full h-full object-cover block"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect width="200" height="200" fill="%23f0f0f0"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="14" fill="%23999" text-anchor="middle" dominant-baseline="middle"%3ELỗi tải ảnh%3C/text%3E%3C/svg%3E';
              }}
            />
          </div>
          {msg.content && (
            <p className="mt-2 text-sm px-1 pb-1">{msg.content}</p>
          )}
        </div>
      );
    }
    if (msg.type === "FILE" && msg.attachmentUrl) {
      const fileName = msg.attachmentName || "Download file";
      const isPDF = fileName.toLowerCase().endsWith(".pdf");
      const isWord =
        fileName.toLowerCase().endsWith(".doc") ||
        fileName.toLowerCase().endsWith(".docx");
      const isExcel =
        fileName.toLowerCase().endsWith(".xls") ||
        fileName.toLowerCase().endsWith(".xlsx");

      const viewableUrl = getViewableFileUrl(msg.attachmentUrl);

      const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        downloadFile(msg.attachmentUrl!, fileName);
      };

      return (
        <div
          onClick={(e) => {
            if (
              (e.target as HTMLElement).closest("button") ||
              (e.target as HTMLElement).closest("a")
            )
              return;
            if (isPDF) {
              window.open(viewableUrl, "_blank", "noopener,noreferrer");
            } else {
              handleOpenPreview(msg.attachmentUrl!, fileName, "FILE");
            }
          }}
          className="flex flex-col w-[300px] sm:w-[350px] bg-[#EAF2FF] border border-[#D6E6FF] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group/file"
        >
          {/* Top Preview Area */}
          <div className="bg-white m-3 mb-1 rounded-lg h-44 flex items-center justify-center relative overflow-hidden group">
            {/* Background Icon */}
            <div
              className={`relative opacity-20 group-hover:opacity-30 transition-opacity`}
            >
              <FileIcon size={80} className="text-gray-400" />
              <div className="absolute -right-4 -bottom-4 bg-white/50 rounded-lg p-2 rotate-12">
                <FileIcon size={40} className="text-gray-300" />
              </div>
              <div className="absolute -left-4 -top-4 bg-white/50 rounded-lg p-2 -rotate-12">
                <FileIcon size={40} className="text-gray-300" />
              </div>
            </div>

            {/* Status Overlay */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 bg-white/80 rounded-full border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-[10px] font-bold text-gray-500">
                {isPDF ? "Click để xem PDF" : "Trạng thái: Sẵn sàng"}
              </span>
            </div>
          </div>

          {/* Bottom Info Section */}
          <div className="p-3 flex items-center gap-3">
            {/* File Icon */}
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${isPDF
                ? "bg-[#FF7A7A]"
                : isWord
                  ? "bg-[#4B8BFF]"
                  : isExcel
                    ? "bg-[#21A366]"
                    : "bg-gray-400"
                }`}
            >
              {isPDF ? (
                <span className="text-white font-black text-xs">PDF</span>
              ) : (
                <FileText size={24} className="text-white" />
              )}
            </div>

            {/* File Details */}
            <div className="flex-1 min-w-0 pr-2">
              <h4
                className="text-sm font-bold text-gray-800 truncate leading-tight mb-0.5"
                title={fileName}
              >
                {fileName}
              </h4>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center justify-center w-4 h-4 rounded-full bg-green-100">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-green-600"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <span className="text-[10px] font-bold text-green-600">
                  Đã có trên hệ thống
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5">
              {isPDF ? (
                <a
                  href={viewableUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 bg-white text-gray-400 hover:text-red-600 rounded-lg border border-gray-100 transition-colors shadow-sm"
                  title="Xem PDF"
                >
                  <Eye size={18} />
                </a>
              ) : (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className="p-1.5 bg-white text-gray-400 hover:text-blue-600 rounded-lg border border-gray-100 transition-colors shadow-sm"
                  title="Xem thư mục"
                >
                  <Folder size={18} />
                </button>
              )}
              <button
                onClick={handleDownload}
                className="p-1.5 bg-white text-gray-400 hover:text-blue-600 rounded-lg border border-gray-100 transition-colors shadow-sm"
                title="Tải xuống"
              >
                <Download size={18} />
              </button>
            </div>
          </div>
        </div>
      );
    }
    if (msg.type === "LINK" && msg.content) {
      return (
        <a
          href={
            msg.content.startsWith("http")
              ? msg.content
              : `https://${msg.content}`
          }
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-2 underline break-all hover:opacity-80 transition-opacity ${msg.isOwn ? "text-white" : "text-blue-600"
            }`}
        >
          <ExternalLink size={16} className="flex-shrink-0" />
          {msg.content}
        </a>
      );
    }
    return (
      <span className="whitespace-pre-wrap">{(msg.content || "").trim()}</span>
    );
  };

  return (
    <div className="flex h-[calc(100vh-80px)] bg-gray-50 overflow-hidden">
      {/* Sidebar - Group List */}
      <div
        className={`${selectedGroup ? "hidden md:flex" : "flex"
          } flex-col relative bg-white border-r border-gray-100 transition-[width] duration-75`}
        style={{
          width:
            selectedGroup && window.innerWidth < 768
              ? "100%"
              : `${leftSidebarWidth}px`,
        }}
      >
        <div
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-orange-400/20 active:bg-orange-500/40 transition-colors z-20 group"
          onMouseDown={startResizingLeft}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-8 bg-gray-200 rounded-full group-hover:bg-orange-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>
        <div className="p-4 pb-2">
          <h1 className="text-sm font-bold text-gray-400 mb-4 tracking-[0.2em] uppercase px-1">
            Tin nhắn nhóm
          </h1>
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Tìm kiếm tên nhóm hoặc id giáo viên"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-full bg-gray-50/50 shadow-none focus:bg-white focus:ring-1 focus:ring-orange-400 text-xs font-medium placeholder:text-gray-400 transition-all"
            />
            <button
              onClick={() => setIsUnreadOnly(!isUnreadOnly)}
              className={`absolute right-4 top-1/2 transform -translate-y-1/2 p-2 rounded-full transition-all ${isUnreadOnly
                ? "bg-[#FF8C33] text-white"
                : "text-gray-400 hover:bg-gray-100"
                }`}
              title={isUnreadOnly ? "Hiện tất cả" : "Chỉ hiện chưa xem"}
            >
              <MessageCircle size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div
                className={`animate-spin rounded-full h-8 w-8 border-b-2 border-${themeColor}-500`}
              ></div>
            </div>
          ) : (isUnreadOnly
            ? groups.filter((g) => (g.unreadCount || 0) > 0)
            : groups
          ).filter(
            (group) =>
              group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              group.lecturerName
                ?.toLowerCase()
                .includes(searchTerm.toLowerCase())
          ).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <MessageCircle size={32} className="mb-2" />
              <p>
                {isUnreadOnly
                  ? "Không có tin nhắn chưa đọc"
                  : "Chưa có nhóm chat nào"}
              </p>
              {role === "STUDENT" && !isUnreadOnly && (
                <p className="text-sm text-gray-400 mt-1 text-center px-4">
                  Giảng viên sẽ tạo nhóm chat cho lớp học
                </p>
              )}
            </div>
          ) : (
            (isUnreadOnly
              ? groups.filter((g) => (g.unreadCount || 0) > 0)
              : groups
            )
              .filter(
                (group) =>
                  group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  group.lecturerName
                    ?.toLowerCase()
                    .includes(searchTerm.toLowerCase())
              )
              .map((group) => {
                const isSelected = selectedGroup?.id === group.id;
                return (
                  <div
                    key={group.id}
                    onClick={() => handleGroupSelect(group)}
                    className={`p-3 rounded-2xl cursor-pointer transition-all duration-300 relative bg-white border ${isSelected
                      ? "border-orange-200 bg-orange-50/30"
                      : "border-transparent hover:bg-gray-50/80 shadow-none"
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      {(() => {
                        const studentMembers =
                          group.members?.filter((m) => m.role === "STUDENT") ||
                          [];
                        const avatars = studentMembers.slice(0, 2);

                        if (avatars.length === 0) {
                          return (
                            <div
                              className={`w-11 h-11 ${isSelected ? "bg-orange-100" : "bg-orange-50"
                                } rounded-full flex items-center justify-center flex-shrink-0 border border-transparent`}
                            >
                              <Users
                                className={
                                  isSelected
                                    ? "text-orange-600"
                                    : "text-orange-400"
                                }
                                size={20}
                              />
                            </div>
                          );
                        }

                        return (
                          <div className="flex -space-x-3 mx-1 flex-shrink-0">
                            {avatars.map((member, idx) => (
                              <div
                                key={member.userId}
                                className={`w-9 h-9 rounded-full border-2 border-white dark:border-zinc-950 overflow-hidden shadow-sm relative flex items-center justify-center bg-gray-50 ${idx === 0 ? "z-20" : "z-10 bg-orange-200"
                                  }`}
                              >
                                {member.avatar ? (
                                  <>
                                    <img
                                      src={`${member.avatar}${member.avatar.includes("?") ? "&" : "?"
                                        }t=${new Date().getTime()}`}
                                      alt={member.fullName}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (
                                          e.target as HTMLElement
                                        ).style.display = "none";
                                        (
                                          e.target as HTMLElement
                                        ).nextElementSibling?.classList.remove(
                                          "hidden"
                                        );
                                      }}
                                    />
                                    <div className="hidden w-full h-full bg-orange-100 flex text-fpt-orange items-center justify-center font-bold text-xs uppercase leading-none">
                                      {member.fullName
                                        .split(" ")
                                        .pop()
                                        ?.charAt(0) || "U"}
                                    </div>
                                  </>
                                ) : (
                                  <div className="w-full h-full bg-orange-100 flex text-fpt-orange flex-col items-center justify-center font-bold text-sm uppercase">
                                    {member.fullName
                                      .split(" ")
                                      .pop()
                                      ?.charAt(0) || "U"}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                      <div className=" flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-bold text-[14px] text-gray-800 truncate tracking-tight uppercase leading-tight">
                            {group.name}
                          </h3>
                          <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                            {group.lastMessage?.sentAt
                              ? formatTime(group.lastMessage.sentAt)
                              : ""}
                          </span>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                          <p className="text-[12px] text-gray-500 truncate font-medium">
                            {group.lastMessage
                              ? (() => {
                                const lm = group.lastMessage;
                                let preview = "";
                                if (lm.type === "IMAGE")
                                  preview = "🖼️ Hình ảnh";
                                else if (lm.type === "FILE")
                                  preview = `📎 ${lm.attachmentName ||
                                    lm.content ||
                                    "Tệp tin"
                                    }`;
                                else if (lm.type === "LINK")
                                  preview = `🔗 ${lm.content || "Liên kết"}`;
                                else preview = lm.content || "";
                                return (
                                  <>
                                    {lm.senderName}: {preview}
                                  </>
                                );
                              })()
                              : `Mr.${group.lecturerName || "An"}: `}
                          </p>
                          {group.unreadCount !== undefined &&
                            group.unreadCount > 0 &&
                            !isSelected && (
                              <div className="flex-shrink-0 w-5 h-5 bg-[#FF8C33] text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-md">
                                {group.unreadCount}
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* Chat Area & Detail Sidebar Container */}
      {selectedGroup ? (
        <div className="flex-1 flex flex-row overflow-hidden bg-white relative">
          {/* Chat Column */}
          <div className="flex-1 flex flex-col min-w-0 relative h-full">
            {/* Chat Header */}
            <div className="flex items-center gap-3 p-3 bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm shadow-gray-50">
              <button
                onClick={() => setSelectedGroup(null)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-full"
              >
                <ArrowLeft size={20} />
              </button>
              {(() => {
                const studentMembers =
                  selectedGroup.members?.filter((m) => m.role === "STUDENT") ||
                  [];
                const avatars = studentMembers.slice(0, 2);

                if (avatars.length === 0) {
                  return (
                    <div
                      className={`w-10 h-10 ${bgColorLight} rounded-full flex items-center justify-center flex-shrink-0`}
                    >
                      <Users className={textColor} size={20} />
                    </div>
                  );
                }

                return (
                  <div className="flex -space-x-4 mx-1 flex-shrink-0">
                    {avatars.map((member, idx) => (
                      <div
                        key={member.userId}
                        className={`w-10 h-10 rounded-full border-2 border-white dark:border-zinc-950 overflow-hidden shadow-sm relative flex items-center justify-center bg-gray-50 ${idx === 0 ? "z-20" : "z-10 bg-orange-200"
                          }`}
                      >
                        {member.avatar ? (
                          <>
                            <img
                              src={`${member.avatar}${member.avatar.includes("?") ? "&" : "?"
                                }t=${new Date().getTime()}`}
                              alt={member.fullName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display =
                                  "none";
                                (
                                  e.target as HTMLElement
                                ).nextElementSibling?.classList.remove(
                                  "hidden"
                                );
                              }}
                            />
                            <div className="hidden w-full h-full bg-orange-100 flex text-fpt-orange items-center justify-center font-bold text-xs uppercase leading-none">
                              {member.fullName.split(" ").pop()?.charAt(0) ||
                                "U"}
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full bg-orange-100 flex text-fpt-orange flex-col items-center justify-center font-bold text-sm uppercase">
                            {member.fullName.split(" ").pop()?.charAt(0) || "U"}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
              <div className="flex-1">
                <h2 className="font-bold text-xl text-gray-800 uppercase tracking-wide">
                  {selectedGroup.name}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowDetailSidebar(!showDetailSidebar);
                    setDetailViewMode("INFO");
                  }}
                  className={`p-2 hover:bg-gray-100 rounded-full transition-colors ${showDetailSidebar ? textColor : "text-gray-500"
                    }`}
                  title="Thông tin nhóm"
                >
                  <Info size={20} />
                </button>
                <button
                  onClick={() => setShowMembers(!showMembers)}
                  className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
                >
                  <Users size={20} />
                </button>
              </div>
            </div>

            {/* Members Panel (Floating) */}
            {showMembers && selectedGroup.members && (
              <div className="absolute right-4 top-14 w-60 bg-white shadow-xl border rounded-xl p-3 z-30">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold">Thành viên</h3>
                  <button
                    onClick={() => setShowMembers(false)}
                    className="p-1 hover:bg-gray-100 rounded-full"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {selectedGroup.members.map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center gap-3 py-2 px-1 hover:bg-gray-50 rounded-lg"
                    >
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                        {member.avatar ? (
                          <img
                            src={member.avatar}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-bold text-gray-500 leading-none">
                            {member.fullName.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {member.fullName}
                        </p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase">
                          {member.role === "LECTURER"
                            ? "Giảng viên"
                            : "Sinh viên"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 relative flex flex-col min-h-0">
              {/* Floating Unread Button */}
              {showScrollBottom && unreadMessageCount > 0 && (
                <button
                  onClick={() => scrollToBottom()}
                  className="absolute bottom-6 right-8 z-30 flex items-center justify-center w-12 h-12 bg-white text-gray-600 rounded-full shadow-xl border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all duration-200 animate-in fade-in zoom-in slide-in-from-bottom-4 group"
                  title={`${unreadMessageCount} tin nhắn mới`}
                >
                  <ChevronDown
                    size={28}
                    className="text-gray-500 group-hover:text-orange-500 transition-colors"
                  />
                  <span className="absolute -top-1 -right-1 flex h-6 min-w-[24px] px-1.5 items-center justify-center bg-[#FF8C33] text-white text-[11px] font-bold rounded-full border-2 border-white shadow-sm">
                    {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                  </span>
                </button>
              )}
              <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 flex flex-col gap-0.5 bg-[#FBFBFC]"
              >
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div
                      className={`animate-spin rounded-full h-8 w-8 border-b-2 border-${themeColor}-500`}
                    ></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-30">
                    <MessageCircle size={64} className="mb-4" />
                    <p className="text-lg font-bold">Chưa có tin nhắn nào</p>
                  </div>
                ) : (
                  (() => {
                    const processedMessages: any[] = [];
                    let i = 0;
                    while (i < messages.length) {
                      const currentMsg = messages[i];
                      if (
                        currentMsg.type === "IMAGE" &&
                        !currentMsg.isDeleted
                      ) {
                        const group: any[] = [currentMsg];
                        let j = i + 1;
                        while (j < messages.length) {
                          const nextMsg = messages[j];
                          const timeDiff =
                            nextMsg.sentAt &&
                              messages[j - 1] &&
                              messages[j - 1].sentAt
                              ? new Date(nextMsg.sentAt).getTime() -
                              new Date(messages[j - 1].sentAt).getTime()
                              : 999999;
                          if (
                            nextMsg.type === "IMAGE" &&
                            !nextMsg.isDeleted &&
                            nextMsg.senderId === currentMsg.senderId &&
                            timeDiff < 60000
                          ) {
                            group.push(nextMsg);
                            j++;
                          } else {
                            break;
                          }
                        }
                        if (group.length > 1) {
                          processedMessages.push({
                            ...currentMsg,
                            type: "IMAGE_GROUP",
                            imageMessages: group,
                            id: `group-${currentMsg.id}`,
                          });
                          i = j;
                        } else {
                          processedMessages.push(currentMsg);
                          i++;
                        }
                      } else {
                        processedMessages.push(currentMsg);
                        i++;
                      }
                    }

                    return processedMessages.map((msg, index) => {
                      const currentMsgDate = new Date(msg.sentAt);
                      const prevMsgDate =
                        index > 0
                          ? new Date(processedMessages[index - 1].sentAt)
                          : null;
                      const isDateChanged =
                        !prevMsgDate ||
                        formatDate(processedMessages[index - 1].sentAt) !==
                        formatDate(msg.sentAt);
                      const timeGapSinceLast = prevMsgDate
                        ? currentMsgDate.getTime() - prevMsgDate.getTime()
                        : 0;
                      const showDateSeparator = isDateChanged;
                      const showTimeSeparator =
                        timeGapSinceLast > 3600000 && !isDateChanged;

                      return (
                        <React.Fragment key={msg.id}>
                          {showDateSeparator && (
                            <div className="flex justify-center my-6">
                              <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500 px-4 py-1.5 bg-gray-200/50 rounded-full">
                                {getFriendlyDate(msg.sentAt)}
                              </span>
                            </div>
                          )}
                          {msg.id === selectedGroup?.firstUnreadMessageId &&
                            selectedGroup.unreadCount &&
                            selectedGroup.unreadCount > UNREAD_THRESHOLD && (
                              <div className="flex items-center my-6">
                                <div className="flex-1 h-px bg-red-200"></div>
                                <div className="px-4 py-1 bg-red-50 text-red-500 text-[11px] font-bold uppercase tracking-wider rounded-full border border-red-100 shadow-sm">
                                  Tin nhắn mới
                                </div>
                                <div className="flex-1 h-px bg-red-200"></div>
                              </div>
                            )}
                          {showTimeSeparator && (
                            <div className="flex justify-center my-4">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-4 py-1.5 bg-gray-50 rounded-full border border-gray-100 shadow-sm">
                                {formatTime(msg.sentAt)}
                              </span>
                            </div>
                          )}
                          {(() => {
                            const isFirstInSequence =
                              index === 0 ||
                              processedMessages[index - 1].senderId !==
                              msg.senderId ||
                              showDateSeparator ||
                              showTimeSeparator;

                            const isLastInSequence =
                              index === processedMessages.length - 1 ||
                              processedMessages[index + 1].senderId !==
                              msg.senderId ||
                              (index < processedMessages.length - 1 &&
                                (formatDate(
                                  processedMessages[index + 1].sentAt
                                ) !== formatDate(msg.sentAt) ||
                                  new Date(
                                    processedMessages[index + 1].sentAt
                                  ).getTime() -
                                  currentMsgDate.getTime() >
                                  3600000));

                            const getRadiusClasses = () => {
                              const shadow =
                                "shadow-[0_1px_2px_rgba(0,0,0,0.05)]";
                              if (msg.isOwn) {
                                return `${shadow} ${isFirstInSequence
                                  ? "rounded-tr-2xl"
                                  : "rounded-tr-sm"
                                  } ${isLastInSequence
                                    ? "rounded-br-2xl"
                                    : "rounded-br-sm"
                                  } rounded-l-2xl`;
                              } else {
                                return `${shadow} ${isFirstInSequence
                                  ? "rounded-tl-2xl"
                                  : "rounded-tl-sm"
                                  } ${isLastInSequence
                                    ? "rounded-bl-2xl"
                                    : "rounded-bl-sm"
                                  } rounded-r-2xl`;
                              }
                            };

                            return (
                              <div
                                ref={(el) => (messageRefs.current[msg.id] = el)}
                                className={`flex ${msg.isOwn ? "justify-end" : "justify-start"
                                  } ${isFirstInSequence ? "mt-4" : "mt-0"
                                  } w-full relative z-0`}
                              >
                                <div
                                  className={`flex gap-3 max-w-[85%] ${msg.isOwn ? "flex-row-reverse" : ""
                                    }`}
                                >
                                  {!msg.isOwn && (
                                    <div className="w-8 flex-shrink-0 flex flex-col justify-end pb-1">
                                      {isLastInSequence ? (
                                        <div
                                          className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm overflow-hidden mt-0.5"
                                          title={msg.senderName}
                                        >
                                          {msg.senderAvatar ? (
                                            <img
                                              src={msg.senderAvatar}
                                              alt=""
                                              className="w-full h-full object-cover"
                                            />
                                          ) : (
                                            <span className="text-[10px] font-bold text-orange-600 leading-none">
                                              {msg.senderName.charAt(0)}
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="w-8" />
                                      )}
                                    </div>
                                  )}
                                  <div className="flex flex-col">
                                    {!msg.isOwn &&
                                      isFirstInSequence &&
                                      !msg.isDeleted && (
                                        <span className="text-sm font-bold text-gray-500 mb-1 ml-1">
                                          {msg.senderName}
                                        </span>
                                      )}
                                    <div
                                      className="relative group/msg"
                                      onClick={() =>
                                        setExpandedMessageId(
                                          expandedMessageId === msg.id
                                            ? null
                                            : msg.id
                                        )
                                      }
                                    >
                                      <div
                                        title={formatFullTime(msg.sentAt)}
                                        className={`group/bubble relative cursor-pointer transition-all duration-200 ${msg.reactions && msg.reactions.length > 0 ? "z-20" : "z-10"
                                          } hover:z-30 ${(msg.type === "IMAGE" ||
                                            msg.type === "IMAGE_GROUP" ||
                                            msg.type === "FILE") &&
                                            !msg.isDeleted
                                            ? "p-0 overflow-hidden"
                                            : "px-4 py-2.5"
                                          } ${getRadiusClasses()} ${(msg.type === "IMAGE" ||
                                            msg.type === "IMAGE_GROUP") &&
                                            !msg.isDeleted
                                            ? ""
                                            : msg.isOwn
                                              ? "bg-gradient-to-br from-[#FF8C33] to-[#FF7A1A] text-white shadow-sm"
                                              : "bg-white text-gray-700 shadow-sm"
                                          } min-w-[40px]`}
                                      >
                                        <div className="flex flex-col">
                                          {msg.replyToId && (
                                            <div
                                              className={`mb-2 p-2 rounded-lg text-xs border-l-2 cursor-pointer hover:brightness-95 transition-all ${msg.isOwn
                                                ? "bg-orange-600/30 border-white/50 text-white/90"
                                                : "bg-gray-100 border-orange-500 text-gray-500"
                                                }`}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (msg.replyToId) {
                                                  const targetEl = messageRefs.current[msg.replyToId];
                                                  if (targetEl) {
                                                    targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
                                                    // Briefly highlight the target message
                                                    targetEl.style.transition = "background 0.3s";
                                                    targetEl.style.background = "rgba(255,140,51,0.15)";
                                                    setTimeout(() => { targetEl.style.background = ""; }, 1500);
                                                  }
                                                }
                                              }}
                                            >
                                              <div className="flex items-center gap-1 mb-0.5">
                                                <p className="font-bold">
                                                  Trả lời{" "}
                                                  {msg.replyToSenderName || ""}:
                                                </p>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                {msg.replyToType === "IMAGE" &&
                                                  msg.replyToAttachmentUrl && (
                                                    <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 border border-gray-200">
                                                      <img
                                                        src={
                                                          msg.replyToAttachmentUrl &&
                                                            msg.replyToAttachmentUrl.includes(
                                                              "cloudinary.com"
                                                            )
                                                            ? msg.replyToAttachmentUrl.replace(
                                                              "/upload/",
                                                              "/upload/c_thumb,w_100,h_100,f_auto/"
                                                            )
                                                            : msg.replyToAttachmentUrl ||
                                                            ""
                                                        }
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                      />
                                                    </div>
                                                  )}
                                                <p className={`line-clamp-2 italic text-xs pr-4 overflow-visible ${msg.replyToIsDeleted ? "opacity-70" : ""
                                                  }`}>
                                                  {msg.replyToIsDeleted
                                                    ? "Tin nhắn đã bị thu hồi"
                                                    : msg.replyToContent ||
                                                    (msg.replyToType === "IMAGE"
                                                      ? "[Hình ảnh]"
                                                      : msg.replyToType === "FILE"
                                                        ? "[Tệp tin]"
                                                        : "")}
                                                </p>
                                              </div>
                                            </div>
                                          )}
                                          {msg.isDeleted ? (
                                            <p className="text-sm italic opacity-70 flex items-center gap-2">
                                              <Trash2 size={12} />
                                              Tin nhắn đã bị thu hồi
                                            </p>
                                          ) : (
                                            <div className="text-[15.5px] leading-tight break-words">
                                              {renderMessageContent(msg)}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      {!msg.isDeleted &&
                                        showReactionPickerId === msg.id && (
                                          <div
                                            className={`absolute -top-12 ${msg.isOwn ? "right-0" : "left-0"
                                              } z-[100] pb-2`}
                                            onMouseLeave={() =>
                                              setShowReactionPickerId(null)
                                            }
                                          >
                                            <div className="bg-white rounded-full shadow-2xl border border-gray-100 p-1.5 flex items-center gap-1 animate-in zoom-in-95 duration-200 origin-bottom">
                                              {[
                                                "👍",
                                                "❤️",
                                                "😂",
                                                "😮",
                                                "😭",
                                                "😡",
                                              ].map((emoji) => (
                                                <button
                                                  key={emoji}
                                                  className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 rounded-full transition-all text-xl hover:scale-125 duration-200"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSelectReaction(
                                                      msg.id,
                                                      emoji
                                                    );
                                                    setShowReactionPickerId(
                                                      null
                                                    );
                                                  }}
                                                >
                                                  {emoji}
                                                </button>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      {!msg.isDeleted && (
                                        <div
                                          className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity z-20 ${msg.isOwn ? "-left-28" : "-right-20"
                                            }`}
                                        >
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setShowReactionPickerId(
                                                showReactionPickerId === msg.id
                                                  ? null
                                                  : msg.id
                                              );
                                            }}
                                            className="p-2 bg-white/90 rounded-full shadow-md text-gray-500 hover:text-orange-500 hover:bg-orange-50"
                                            title="Bày tỏ cảm xúc"
                                          >
                                            <Smile size={14} />
                                          </button>
                                          <button
                                            onClick={() => handleReply(msg)}
                                            className="p-2 bg-white/90 text-blue-500 rounded-full shadow-md hover:bg-blue-50"
                                            title="Trả lời"
                                          >
                                            <Reply size={14} />
                                          </button>
                                          {msg.isOwn && (
                                            <button
                                              onClick={() =>
                                                handleDeleteMessage(msg.id)
                                              }
                                              className="p-2 bg-white/90 text-red-500 rounded-full shadow-md hover:bg-red-50"
                                              title="Thu hồi"
                                            >
                                              <Trash2 size={14} />
                                            </button>
                                          )}
                                        </div>
                                      )}
                                      {!msg.isDeleted &&
                                        msg.reactions &&
                                        msg.reactions.length > 0 && (
                                          <div className="absolute -bottom-3 -right-2 flex flex-wrap gap-1 z-[40] scale-90 origin-bottom-right max-w-[150px] justify-end">
                                            {msg.reactions.map(
                                              (r: any, ri: number) => (
                                                <div
                                                  key={ri}
                                                  className={`px-2 py-0.5 rounded-full shadow-md border flex items-center gap-1 cursor-pointer transition-all duration-200 hover:scale-110 ${r.reactedByMe
                                                    ? "bg-orange-50 border-orange-200 text-orange-600"
                                                    : "bg-white border-gray-100 text-gray-700"
                                                    }`}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSelectReaction(
                                                      msg.id,
                                                      r.emoji
                                                    );
                                                  }}
                                                >
                                                  <span className="text-xs">
                                                    {r.emoji}
                                                  </span>
                                                  <span className="text-[10px] font-bold">
                                                    {r.count}
                                                  </span>
                                                </div>
                                              )
                                            )}
                                          </div>
                                        )}
                                    </div>
                                    {!msg.isDeleted &&
                                      (expandedMessageId === msg.id ||
                                        index ===
                                        processedMessages.length - 1) &&
                                      msg.readers &&
                                      msg.readers.filter(
                                        (r: any) =>
                                          Number(r.userId) !==
                                          Number(msg.senderId)
                                      ).length > 0 && (
                                        <div
                                          className={`flex items-center mt-1 ${msg.isOwn
                                            ? "justify-end"
                                            : "justify-start"
                                            } px-1 relative z-10 min-h-[20px] gap-2 animate-in fade-in slide-in-from-top-1 duration-200`}
                                        >
                                          <div className="flex items-center -space-x-2 transition-all duration-300 hover:space-x-1">
                                            {msg.readers
                                              .filter(
                                                (r: any) =>
                                                  Number(r.userId) !==
                                                  Number(msg.senderId)
                                              )
                                              .slice(0, 5)
                                              .map((reader: any) => (
                                                <div
                                                  key={reader.userId}
                                                  className="w-5 h-5 rounded-full border border-white shadow-sm overflow-hidden bg-gray-200 flex-shrink-0 transition-transform hover:scale-125 z-0 hover:z-10 flex items-center justify-center"
                                                  title={reader.fullName}
                                                >
                                                  {reader.avatar ? (
                                                    <img
                                                      src={reader.avatar}
                                                      alt={reader.fullName}
                                                      className="w-full h-full object-cover"
                                                    />
                                                  ) : (
                                                    <div
                                                      className={`w-full h-full flex items-center justify-center text-[8px] font-bold text-white ${bgColor} leading-none`}
                                                    >
                                                      {reader.fullName?.charAt(
                                                        0
                                                      ) || "?"}
                                                    </div>
                                                  )}
                                                </div>
                                              ))}
                                          </div>
                                        </div>
                                      )}
                                    {msg.isOwn && msg.isSending && (
                                      <div className="flex justify-end mt-1 px-1">
                                        <span className="text-[9px] font-bold text-orange-400 mr-2 animate-pulse">
                                          Đang gửi...
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </React.Fragment>
                      );
                    });
                  })()
                )}
                {typingUsers.length > 0 && (
                  <div className="flex items-center gap-2 text-gray-400 text-xs font-bold bg-white/50 py-2 px-4 rounded-full w-fit animate-pulse mb-2">
                    <div className="flex gap-1">
                      <span
                        className={`w-1.5 h-1.5 ${bgColor} rounded-full animate-bounce`}
                        style={{ animationDelay: "0ms" }}
                      ></span>
                      <span
                        className={`w-1.5 h-1.5 ${bgColor} rounded-full animate-bounce`}
                        style={{ animationDelay: "150ms" }}
                      ></span>
                      <span
                        className={`w-1.5 h-1.5 ${bgColor} rounded-full animate-bounce`}
                        style={{ animationDelay: "300ms" }}
                      ></span>
                    </div>
                    <span className={`uppercase tracking-wider ${textColor}`}>
                      {typingUsers.join(", ")} đang soạn tin...
                    </span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              {/* end scrollContainerRef */}
            </div>
            {/* end relative wrapper */}

            {/* Input Area */}
            <div className="p-3 bg-white border-t pr-16">
              {/* File Preview Area */}
              {filePreviews.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-3 p-2 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                  {filePreviews.map((preview, index) => (
                    <div key={preview.id} className="relative group">
                      {preview.url ? (
                        <div className="relative w-24 h-24 rounded-none overflow-hidden border border-white shadow-sm">
                          <img
                            src={preview.url}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center w-24 h-24 text-gray-500 bg-white p-2 rounded-none border border-white shadow-sm text-center">
                          <FileText
                            size={24}
                            className="text-orange-500 mb-1"
                          />
                          <span className="text-[10px] font-bold truncate w-full px-1">
                            {preview.name}
                          </span>
                        </div>
                      )}
                      <button
                        onClick={() => removeSelectedFile(index)}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg z-10"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {replyingTo && (
                <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-b border-gray-100 animate-in slide-in-from-bottom-2 duration-200">
                  <div className="flex flex-col text-sm border-l-2 border-orange-400 pl-2">
                    <span className="font-bold text-orange-500 text-xs mb-0.5">
                      Đang trả lời {replyingTo.senderName}
                    </span>
                    <div className="text-gray-600 line-clamp-1 text-xs flex items-center gap-1">
                      {replyingTo.content === "[Hình ảnh]" && (
                        <ImageIcon size={12} />
                      )}
                      {replyingTo.content === "[Tệp tin]" && (
                        <FileIcon size={12} />
                      )}
                      {replyingTo.content}
                    </div>
                  </div>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="p-1.5 hover:bg-gray-200 rounded-full text-gray-400 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 bg-gray-50/80 p-1.5 rounded-full border border-gray-100 focus-within:bg-white focus-within:shadow-sm transition-all mr-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 bg-white text-gray-400 rounded-full border border-gray-100 hover:text-orange-500 hover:border-orange-200 transition-all active:scale-95 flex items-center justify-center shrink-0"
                >
                  <Plus size={18} />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,.heic,.heif,.pdf,.doc,.docx,.xls,.xlsx"
                  multiple
                />
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 bg-transparent border-none focus:ring-0 text-base font-medium text-gray-800 py-2"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={
                    (!newMessage.trim() && selectedFiles.length === 0) ||
                    !selectedGroup
                  }
                  className={`p-2.5 bg-[#FF8C33] text-white rounded-full shadow-lg shadow-orange-200 transition-all active:scale-90 disabled:opacity-50 disabled:grayscale shrink-0`}
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Detail Sidebar */}
          {showDetailSidebar && (
            <div
              className="relative bg-white border-l border-gray-100 h-full flex flex-col animate-in slide-in-from-right duration-300"
              style={{ width: `${rightSidebarWidth}px` }}
            >
              <div
                className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-orange-400/20 active:bg-orange-500/40 transition-colors z-20 group"
                onMouseDown={startResizingRight}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-10 bg-gray-200 rounded-full group-hover:bg-orange-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
              {/* Sidebar Header */}
              <div className="p-3 border-b border-gray-100 flex items-center gap-3 bg-white sticky top-0 z-10 shadow-sm shadow-gray-50">
                <button
                  onClick={() =>
                    detailViewMode === "INFO"
                      ? setShowDetailSidebar(false)
                      : setDetailViewMode("INFO")
                  }
                  className="p-1 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <h2 className="font-bold text-gray-800 text-sm">
                  {detailViewMode === "INFO" && "Thông tin nhóm"}
                  {detailViewMode === "MEMBERS" && "Thành viên"}
                  {detailViewMode === "MEDIA" && "Ảnh, file, link"}
                </h2>
              </div>

              {/* Sidebar Content */}
              <div className="flex-1 overflow-y-auto">
                {detailViewMode === "INFO" && (
                  <div className="flex flex-col">
                    {/* Group Banner */}
                    <div className="py-8 flex flex-col items-center px-4">
                      {(() => {
                        const studentMembers =
                          selectedGroup.members?.filter(
                            (m) => m.role === "STUDENT"
                          ) || [];
                        const avatars = studentMembers.slice(0, 2);

                        if (avatars.length === 0) {
                          return (
                            <div
                              className={`w-16 h-16 ${bgColorLight} rounded-full flex items-center justify-center mb-4 transition-transform hover:rotate-3 cursor-pointer`}
                            >
                              <Users className="text-[#FF8C33]" size={32} />
                            </div>
                          );
                        }

                        return (
                          <div className="flex -space-x-6 mb-4 cursor-pointer">
                            {avatars.map((member, idx) => (
                              <div
                                key={member.userId}
                                className={`w-14 h-14 rounded-full border border-white dark:border-zinc-950 overflow-hidden shadow-md relative transition-transform hover:-translate-y-1 ${idx === 0 ? "z-20" : "z-10 bg-orange-200"
                                  }`}
                              >
                                {member.avatar ? (
                                  <>
                                    <img
                                      src={`${member.avatar}${member.avatar.includes("?") ? "&" : "?"
                                        }t=${new Date().getTime()}`}
                                      alt={member.fullName}
                                      className="w-full h-full object-cover block"
                                      onError={(e) => {
                                        (
                                          e.target as HTMLElement
                                        ).style.display = "none";
                                        (
                                          e.target as HTMLElement
                                        ).nextElementSibling?.classList.remove(
                                          "hidden"
                                        );
                                      }}
                                    />
                                    <div className="hidden w-full h-full bg-orange-100 flex text-fpt-orange items-center justify-center font-bold text-2xl uppercase leading-none">
                                      {member.fullName
                                        .split(" ")
                                        .pop()
                                        ?.charAt(0) || "U"}
                                    </div>
                                  </>
                                ) : (
                                  <div className="w-full h-full bg-orange-100 flex text-fpt-orange flex-col items-center justify-center font-bold text-3xl uppercase">
                                    {member.fullName
                                      .split(" ")
                                      .pop()
                                      ?.charAt(0) || "U"}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                      <h3 className="text-sm font-bold text-gray-800 text-center leading-tight mb-1 uppercase tracking-wider">
                        {selectedGroup.name}
                      </h3>
                      <p className="text-gray-400 font-bold text-[10px] uppercase tracking-wide">
                        Giảng viên: {selectedGroup.lecturerName || "Mr. Alex"}
                      </p>
                    </div>

                    {/* Actions List */}
                    <div className="px-4 space-y-1">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">
                        Thông tin về đoạn chat
                      </p>

                      <button
                        onClick={() => setDetailViewMode("MEMBERS")}
                        className="w-full flex items-center justify-between py-3 group"
                      >
                        <span className="text-sm font-bold text-gray-700 group-hover:text-orange-500 transition-colors">
                          Xem thành viên trong đoạn chat
                        </span>
                        <Users size={16} className="text-gray-400" />
                      </button>

                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pt-6 mb-4">
                        Hành động khác
                      </p>

                      <button
                        onClick={() => {
                          setDetailViewMode("MEDIA");
                          setMediaTab("IMAGE");
                        }}
                        className="w-full flex items-center justify-between py-4 group"
                      >
                        <span className="text-sm font-bold text-gray-700 group-hover:text-orange-500 transition-colors">
                          Ảnh, file, link
                        </span>
                        <ImageIcon size={16} className="text-gray-400" />
                      </button>

                      <button className="w-full flex items-center justify-between py-4 group">
                        <span className="text-sm font-bold text-gray-700 group-hover:text-orange-500 transition-colors">
                          Xem ghi chú lớp học
                        </span>
                        <FileText size={16} className="text-gray-400" />
                      </button>
                    </div>
                  </div>
                )}

                {detailViewMode === "MEMBERS" && (
                  <div className="p-3 space-y-2">
                    {selectedGroup.members?.map((member) => (
                      <div
                        key={member.userId}
                        className="flex items-center gap-3 group"
                      >
                        <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                          {member.avatar ? (
                            <img
                              src={member.avatar}
                              alt=""
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            <span className="text-sm font-bold text-gray-400 leading-none">
                              {member.fullName.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-800 text-sm truncate">
                            {member.fullName}
                          </p>
                          <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">
                            {member.role === "LECTURER" ? "Host" : "Member"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {detailViewMode === "MEDIA" && (
                  <div className="flex flex-col h-full">
                    <div className="flex p-1 bg-[#FFF1E7] rounded-[18px] mx-4 mt-3 mb-4">
                      {(["IMAGE", "FILE", "LINK"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setMediaTab(tab)}
                          className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-[14px] transition-all duration-300 ${mediaTab === tab
                            ? "bg-white shadow-sm text-[#FF8C33]"
                            : "text-gray-400 hover:text-orange-500"
                            }`}
                        >
                          {tab === "IMAGE"
                            ? "Ảnh"
                            : tab === "FILE"
                              ? "File"
                              : "Link"}
                        </button>
                      ))}
                    </div>

                    <div className="px-6 pb-6 overflow-y-auto">
                      {mediaTab === "IMAGE" && (
                        <div className="grid grid-cols-3 gap-3">
                          {messages
                            .filter((m) => m.type === "IMAGE" && !m.isDeleted)
                            .map((m) => (
                              <div
                                key={m.id}
                                onClick={() =>
                                  handleOpenPreview(
                                    m.attachmentUrl!,
                                    m.attachmentName || "Ảnh",
                                    "IMAGE"
                                  )
                                }
                                className="relative w-full pb-[100%] bg-gray-50 rounded-[14px] overflow-hidden shadow-sm hover:scale-[1.05] transition-transform duration-300 cursor-pointer border border-white"
                              >
                                <img
                                  src={
                                    m.attachmentUrl &&
                                      m.attachmentUrl.includes("cloudinary.com")
                                      ? m.attachmentUrl.replace(
                                        "/upload/",
                                        "/upload/f_auto,q_auto/"
                                      )
                                      : m.attachmentUrl!
                                  }
                                  alt=""
                                  className="absolute inset-0 w-full h-full object-cover"
                                />
                              </div>
                            ))}
                          {messages.filter(
                            (m) => m.type === "IMAGE" && !m.isDeleted
                          ).length === 0 && (
                              <div className="col-span-3 text-center py-20 opacity-20">
                                <ImageIcon size={48} className="mx-auto mb-2" />
                                <p className="text-xs font-black uppercase tracking-widest">
                                  Không có ảnh
                                </p>
                              </div>
                            )}
                        </div>
                      )}

                      {mediaTab === "FILE" && (
                        <div className="space-y-4">
                          {messages
                            .filter((m) => m.type === "FILE" && !m.isDeleted)
                            .map((m) => (
                              <div
                                key={m.id}
                                onClick={() => {
                                  handleOpenPreview(
                                    m.attachmentUrl!,
                                    m.attachmentName || "Untitled File",
                                    m.attachmentName
                                      ?.toLowerCase()
                                      .endsWith(".pdf")
                                      ? "PDF"
                                      : "FILE"
                                  );
                                }}
                                className="flex items-center gap-4 group cursor-pointer"
                              >
                                <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl group-hover:bg-blue-500 group-hover:text-white transition-all">
                                  <FileText size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-gray-800 truncate group-hover:text-blue-500 transition-colors">
                                    {m.attachmentName || "Untitled File"}
                                  </p>
                                  <p className="text-[10px] text-gray-400 font-bold uppercase">
                                    {formatTime(m.sentAt)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          {messages.filter(
                            (m) => m.type === "FILE" && !m.isDeleted
                          ).length === 0 && (
                              <div className="text-center py-20 opacity-20">
                                <FileText size={48} className="mx-auto mb-2" />
                                <p className="text-xs font-black uppercase tracking-widest">
                                  Không có file
                                </p>
                              </div>
                            )}
                        </div>
                      )}

                      {mediaTab === "LINK" && (
                        <div className="space-y-4">
                          {messages
                            .filter((m) => m.type === "LINK" && !m.isDeleted)
                            .map((m) => (
                              <a
                                key={m.id}
                                href={
                                  m.content?.startsWith("http")
                                    ? m.content
                                    : `https://${m.content}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-4 group cursor-pointer"
                              >
                                <div className="p-3 bg-green-50 text-green-500 rounded-2xl group-hover:bg-green-500 group-hover:text-white transition-all">
                                  <ExternalLink size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-gray-800 truncate group-hover:text-green-500 transition-colors">
                                    {m.content}
                                  </p>
                                  <p className="text-[10px] text-gray-400 font-bold uppercase">
                                    {formatTime(m.sentAt)}
                                  </p>
                                </div>
                              </a>
                            ))}
                          {messages.filter(
                            (m) => m.type === "LINK" && !m.isDeleted
                          ).length === 0 && (
                              <div className="text-center py-20 opacity-20">
                                <ExternalLink
                                  size={48}
                                  className="mx-auto mb-2"
                                />
                                <p className="text-xs font-black uppercase tracking-widest">
                                  Không có link
                                </p>
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50">
          <div className="text-center text-gray-500">
            <MessageCircle size={64} className="mx-auto mb-4 opacity-10" />
            <h2 className="text-xl font-black uppercase tracking-tight mb-2">
              Chọn một cuộc trò chuyện
            </h2>
            <p className="text-sm font-medium">
              Bắt đầu kết nối với lớp học của bạn
            </p>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setMessageToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Thu hồi tin nhắn"
        message="Bạn có chắc chắn muốn thu hồi tin nhắn này không? Hành động này không thể hoàn tác."
        confirmLabel="Thu hồi"
        cancelLabel="Hủy"
        type="danger"
      />

      {/* Minimal Zalo-like Preview Overlay */}
      {previewData && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 animate-in fade-in duration-200">
          {/* Minimal Header */}
          <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between text-white/70 z-10 bg-gradient-to-b from-black/50 to-transparent">
            <div className="flex items-center gap-3 pl-4">
              <span className="text-sm font-bold truncate max-w-[200px] sm:max-w-md">
                {previewData.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={previewData.url!}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:text-white transition-colors"
                title="Xem bản gốc"
              >
                <ExternalLink size={20} />
              </a>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  downloadFile(previewData.url!, previewData.name || "file");
                }}
                className="p-2 hover:text-white transition-colors"
                title="Tải xuống"
              >
                <Download size={20} />
              </button>
              <button
                onClick={() => setPreviewData(null)}
                className="p-2 hover:text-white transition-colors ml-2"
                title="Đóng"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Media Content */}
          <div
            className="w-full h-full flex items-center justify-center p-4 pt-16 overflow-hidden"
            onClick={() => setPreviewData(null)}
          >
            {previewData.type === "IMAGE" ? (
              <img
                src={
                  previewData.url!.includes("cloudinary.com")
                    ? previewData.url!.replace(
                      "/upload/",
                      "/upload/f_auto,q_auto/"
                    )
                    : previewData.url!
                }
                alt=""
                className="max-w-full max-h-full object-contain shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              />
            ) : previewData.type === "PDF" &&
              !previewData.url?.startsWith("file://") ? (
              <div
                className="w-full h-full max-w-6xl max-h-[90vh] bg-white rounded-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <iframe
                  src={previewData.url!}
                  className="w-full h-full"
                  title={previewData.name || "PDF Preview"}
                  onError={() => {
                    toast.error("Không tải được tài liệu PDF");
                    // Fallback to download
                    downloadFile(
                      previewData.url!,
                      previewData.name || "document.pdf"
                    );
                    setPreviewData(null);
                  }}
                />
              </div>
            ) : (
              <div
                className="bg-white/10 p-12 rounded-3xl text-white text-center border border-white/10 backdrop-blur-md animate-in slide-in-from-bottom-4 duration-300"
                onClick={(e) => e.stopPropagation()}
              >
                <FileText size={80} className="mx-auto mb-6 opacity-30" />
                <h4 className="text-xl font-bold mb-2 tracking-tight">
                  {previewData.name}
                </h4>
                <p className="mb-8 opacity-60 text-sm">
                  Loại file này hiện chưa hỗ trợ xem trực tiếp.
                </p>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    downloadFile(previewData.url!, previewData.name || "file");
                  }}
                  className="px-8 py-3 bg-[#FF8C33] hover:bg-orange-600 transition-all rounded-full font-bold shadow-lg inline-flex items-center gap-3 active:scale-95 hover:scale-105"
                >
                  <Download size={20} />
                  Tải xuống ngay
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesPage;
