'use client';
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { AiOutlineSend, AiOutlinePicture, AiOutlineArrowLeft, AiOutlineSmile } from "react-icons/ai";
import Image from "next/image";

interface Message {
  room_id: string;
  sender_id: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
}

interface ChatPartner {
  id: string;
  username: string;
  avatar_url: string;
}

// 📌 পরিবর্তন: প্রডাকশন ও লোকালহোস্ট দুটোর জন্যই ডাইনামিক সকেট URL কনফিগারেশন
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";
const socket: Socket = io(SOCKET_URL);

export default function ChatPage() {
  const { id: roomId } = useParams() as { id: string };
  const { user, loading } = useAuth();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [imageLoading, setImageLoading] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [chatPartner, setChatPartner] = useState<ChatPartner | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getPartnerInfoData = useCallback(async (currentUserId: string) => {
    const { data: members, error: memError } = await supabase
      .from('room_members')
      .select('user_id')
      .eq('room_id', roomId)
      .neq('user_id', currentUserId);

    if (memError || !members || members.length === 0) return null;

    const partnerId = members[0].user_id;
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .eq('id', partnerId)
      .single();

    return (profile as ChatPartner) || null;
  }, [roomId]);

  const getChatHistoryData = useCallback(async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });
    return (data as Message[]) || [];
  }, [roomId]);

  useEffect(() => {
    if (!user && !loading) {
      router.push('/');
      return;
    }

    if (!user) return;

    let isSubscribed = true;

    Promise.all([
      getPartnerInfoData(user.id),
      getChatHistoryData()
    ]).then(([partner, history]) => {
      if (isSubscribed) {
        if (partner) setChatPartner(partner);
        setMessages(history);
      }
    }).catch(err => console.error("Error loading chat assets:", err));

    socket.emit('join_room', roomId);

    socket.on('receive_message', (data: Message) => {
      if (isSubscribed) setMessages((prev) => [...prev, data]);
    });

    socket.on('display_typing', (data: { room_id: string; username: string; isTyping: boolean }) => {
      if (isSubscribed && data.room_id === roomId) {
        setIsPartnerTyping(data.isTyping);
      }
    });

    return () => {
      isSubscribed = false;
      socket.off('receive_message');
      socket.off('display_typing');
    };
  }, [roomId, user, loading, router, getPartnerInfoData, getChatHistoryData]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPartnerTyping]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (!user) return;

    socket.emit('typing', { room_id: roomId, username: user.username, isTyping: true });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { room_id: roomId, username: user.username, isTyping: false });
    }, 2000);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    const messageData: Message = {
      room_id: roomId,
      sender_id: user.id,
      content: input,
      image_url: null,
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, messageData]);
    socket.emit('send_message', messageData);
    setInput("");
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit('typing', { room_id: roomId, username: user.username, isTyping: false });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setImageLoading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY || "YOUR_IMGBB_API_KEY";
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData
      });
      const resData = await response.json();
      const directImageUrl = resData.data.url;

      const messageData: Message = {
        room_id: roomId,
        sender_id: user.id,
        content: null,
        image_url: directImageUrl,
        created_at: new Date().toISOString()
      };

      setMessages((prev) => [...prev, messageData]);
      socket.emit('send_message', messageData);
    } catch (error) {
      console.error("Image Upload Failed:", error);
    } finally {
      setImageLoading(false);
    }
  };

  if (loading || !user) return null;

  return (
    <div className="relative flex h-screen w-full flex-col bg-[#0b0c22] text-white antialiased overflow-hidden selection:bg-[#2F2FE4]/30">
      <div className="absolute top-[-20%] left-[25%] h-[600px] w-[600px] rounded-full bg-cyan-500/10 blur-[140px] pointer-events-none" />
      <div className="absolute top-[30%] right-[10%] h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[160px] pointer-events-none" />

      {/* ১. গ্লাসমরফিক টপ হেডার বার */}
      <div className="flex h-16 w-full items-center justify-between border-b border-white/10 bg-[#1A1953]/40 backdrop-blur-md px-6 py-3 shadow-lg shrink-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/dashboard')} className="p-2 rounded-full hover:bg-white/10 transition text-xl text-gray-300 hover:text-white">
            <AiOutlineArrowLeft />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 shrink-0">
              {chatPartner?.avatar_url ? (
                <Image 
                  src={chatPartner.avatar_url} 
                  alt="partner" 
                  width={40}
                  height={40}
                  className="rounded-full object-cover ring-2 ring-cyan-400/40 h-10 w-10" 
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-[#162E93] animate-pulse" />
              )}
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-[#1A1953]"></span>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-wide">
                {chatPartner ? chatPartner.username : "Loading..."}
              </h2>
              <p className="text-[11px] text-cyan-400 font-medium">Active now</p>
            </div>
          </div>
        </div>
      </div>

      {/* ২. গ্লাসমরফিক চ্যাট বাবল এরিয়া */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 w-full z-10 custom-scrollbar">
        {messages.map((msg, index) => {
          const isMe = msg.sender_id === user.id;
          return (
            <div key={index} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex items-end gap-3 max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                
                {!isMe && chatPartner?.avatar_url && (
                  <div className="relative h-7 w-7 shrink-0">
                    <Image 
                      src={chatPartner.avatar_url} 
                      alt="avatar" 
                      width={28}
                      height={28}
                      className="rounded-full object-cover h-7 w-7 ring-1 border-white/10" 
                    />
                  </div>
                )}

                <div className={`rounded-2xl px-4 py-2.5 shadow-md text-sm border ${
                  isMe 
                    ? 'bg-[#4f46e5]/80 text-white rounded-br-none border-indigo-500/30' 
                    : 'bg-[#212443]/70 backdrop-blur-sm text-white/95 rounded-bl-none border-white/5'
                }`}>
                  {msg.content && <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>}
                  
                  {msg.image_url && (
                    <div className="mt-2 overflow-hidden rounded-xl border border-white/10 max-w-xs">
                      <Image 
                        src={msg.image_url} 
                        alt="Shared attachment" 
                        width={280} 
                        height={210} 
                        className="w-full h-auto object-cover" 
                      />
                    </div>
                  )}
                </div>

              </div>
            </div>
          );
        })}
        
        {/* টাইপিং ইন্ডিকেটর বাবল */}
        {isPartnerTyping && (
          <div className="flex justify-start items-end gap-3">
            {chatPartner?.avatar_url && (
              <div className="relative h-7 w-7 shrink-0">
                <Image 
                  src={chatPartner.avatar_url} 
                  alt="avatar" 
                  width={28}
                  height={28}
                  className="rounded-full object-cover h-7 w-7" 
                />
              </div>
            )}
            <div className="bg-[#212443]/70 backdrop-blur-sm border border-white/5 px-4 py-3 rounded-2xl rounded-bl-none shadow-md flex items-center gap-1.5">
              <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></span>
            </div>
          </div>
        )}

        {imageLoading && (
          <div className="flex justify-end">
            <p className="text-xs text-cyan-400 bg-[#1A1953]/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 animate-pulse">
              Sending media asset...
            </p>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* ৩. বটম ট্রিমড গ্লাসমরফিক ইনপুট প্যানেল */}
      <div className="bg-[#1A1953]/30 backdrop-blur-md p-4 border-t border-white/10 shrink-0 z-20 w-full">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-3 bg-[#080616]/60 border border-white/10 rounded-full px-4 py-1.5 shadow-inner">
          
          <label className="cursor-pointer p-2 rounded-full text-gray-400 hover:text-cyan-400 hover:bg-white/5 transition-all shrink-0 text-xl">
            <AiOutlinePicture />
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>

          <button type="button" className="p-2 rounded-full text-gray-400 hover:text-cyan-400 hover:bg-white/5 transition-all shrink-0 text-xl">
            <AiOutlineSmile />
          </button>
          
          <input 
            type="text" 
            value={input}
            onChange={handleInputChange}
            placeholder="Aa" 
            className="flex-1 bg-transparent px-2 py-2 text-sm text-white placeholder-gray-500 outline-none"
          />
          
          <button 
            type="submit" 
            disabled={!input.trim()}
            className={`rounded-full p-2.5 transition-all shrink-0 ${
              input.trim() 
                ? 'text-indigo-400 hover:text-indigo-300 hover:scale-110 active:scale-95' 
                : 'text-gray-600 cursor-not-allowed'
            }`}
          >
            <AiOutlineSend className="text-xl" />
          </button>

        </form>
      </div>
    </div>
  );
}