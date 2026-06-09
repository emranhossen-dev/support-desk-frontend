'use client';
import { useAuth, UserProfile } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { AiOutlineUserAdd, AiOutlineCheck, AiOutlineMessage } from "react-icons/ai";
import Image from "next/image";

interface PendingRequest {
  id: number;
  sender: UserProfile;
}

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [friends, setFriends] = useState<UserProfile[]>([]);

  // ১. পেন্ডিং রিকোয়েস্টগুলো ফেচ করার পিওর ডাটা ফাংশন
  const getPendingRequestsData = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('friendships')
      .select(`id, sender:profiles!friendships_sender_id_fkey(*)`)
      .eq('receiver_id', userId)
      .eq('status', 'pending');
    
    return (data as unknown as PendingRequest[]) || [];
  }, []);

  // ২. বন্ধুদের লিস্ট ফেচ করার পিওর ডাটা ফাংশন
  const getFriendsData = useCallback(async (userId: string) => {
    const { data: received } = await supabase
      .from('friendships')
      .select(`sender:profiles!friendships_sender_id_fkey(*)`)
      .eq('receiver_id', userId)
      .eq('status', 'accepted');

    const { data: sent } = await supabase
      .from('friendships')
      .select(`receiver:profiles!friendships_receiver_id_fkey(*)`)
      .eq('sender_id', userId)
      .eq('status', 'accepted');

    const friendsList: UserProfile[] = [];
    if (received) {
      received.forEach((f: unknown) => {
        const item = f as { sender: UserProfile };
        if (item.sender) friendsList.push(item.sender);
      });
    }
    if (sent) {
      sent.forEach((f: unknown) => {
        const item = f as { receiver: UserProfile };
        if (item.receiver) friendsList.push(item.receiver);
      });
    }

    return friendsList;
  }, []);

  // ৩. রিকোয়েস্ট হ্যান্ডেলার (বাটন ক্লিকের পর ড্যাশবোর্ড ডেটা রিফ্রেশ করার জন্য)
  const refreshDashboardData = useCallback(async () => {
    if (!user) return;
    const [pending, activeFriends] = await Promise.all([
      getPendingRequestsData(user.id),
      getFriendsData(user.id)
    ]);
    setPendingRequests(pending);
    setFriends(activeFriends);
  }, [user, getPendingRequestsData, getFriendsData]);

  // ৪. রেন্ডার সেফ ডেটা লোডিং (Cascading Render ও Memory Leak প্রিভেন্ট করার জন্য)
  useEffect(() => {
    if (!user && !loading) {
      router.push('/');
      return;
    }

    if (!user) return;

    let isSubscribed = true;

    Promise.all([
      getPendingRequestsData(user.id),
      getFriendsData(user.id)
    ]).then(([pending, activeFriends]) => {
      if (isSubscribed) {
        setPendingRequests(pending);
        setFriends(activeFriends);
      }
    }).catch(err => console.error("Error loading dashboard data:", err));

    return () => {
      isSubscribed = false;
    };
  }, [user, loading, router, getPendingRequestsData, getFriendsData]);

  // ৫. অন্য ইউজারদের সার্চ করা
  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .ilike('email', `%${searchQuery}%`)
      .neq('id', user.id);

    if (data) setSearchResults(data as UserProfile[]);
  };

  // ৬. ফ্রেন্ড রিকোয়েস্ট পাঠানো
  const sendFriendRequest = async (receiverId: string) => {
    if (!user) return;
    const { error } = await supabase.from('friendships').insert([
      { sender_id: user.id, receiver_id: receiverId, status: 'pending' }
    ]);
    if (!error) {
      alert("Friend request sent!");
      setSearchResults(prev => prev.filter(item => item.id !== receiverId));
    } else {
      alert("Request already pending or existing.");
    }
  };

  // ৭. ফ্রেন্ড রিকোয়েস্ট এক্সেপ্ট করা এবং চ্যাট রুম তৈরি করা
  const acceptRequest = async (requestId: number, senderId: string) => {
    if (!user) return;
    
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', requestId);

    const { data: newRoom } = await supabase.from('rooms').insert([{}]).select().single();

    if (newRoom) {
      await supabase.from('room_members').insert([
        { room_id: newRoom.id, user_id: user.id },
        { room_id: newRoom.id, user_id: senderId }
      ]);
    }

    alert("Request Accepted! You can now chat.");
    refreshDashboardData();
  };

  // ৮. চ্যাট রুমে রিডাইরেক্ট করা (সম্পূর্ণ টাইপ-সেফ RPC কল)
  const startChat = async (friendId: string) => {
    if (!user) return;
    
    const { data, error } = await supabase
      .rpc('get_common_room', { user_a: user.id, user_b: friendId });

    if (error) {
      console.error("RPC Error:", error);
      alert("Could not connect to chat room.");
      return;
    }

    const rooms = data as { room_id: string }[] | null;

    if (rooms && rooms.length > 0) {
      router.push(`/chat/${rooms[0].room_id}`);
    } else {
      alert("Chat room not found. Try refreshing.");
    }
  };

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#080616]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-t-transparent border-[#2F2FE4]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080616] p-6 text-white">
      {/* হেডার */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-6">
        <div className="flex items-center gap-3">
          {user.avatar_url && (
            <Image 
              src={user.avatar_url} 
              alt="profile" 
              width={40} 
              height={40} 
              className="rounded-full border border-[#2F2FE4]" 
            />
          )}
          <div>
            <h2 className="text-lg font-bold">{user.username}</h2>
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>
        </div>
        <button onClick={logout} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-700 transition">
          Logout
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* সার্চ ও রিকোয়েস্ট সেকশন */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-[#1A1953] p-4 border border-gray-800">
            <h3 className="text-md font-bold mb-3">Find Friends</h3>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Search by exact email..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 rounded-xl bg-[#080616] border border-gray-700 p-2 text-sm outline-none"
              />
              <button onClick={handleSearch} className="bg-[#2F2FE4] px-4 rounded-xl text-sm font-semibold hover:bg-blue-700">Search</button>
            </div>

            <div className="mt-4 space-y-2">
              {searchResults.map(profile => (
                <div key={profile.id} className="flex items-center justify-between bg-[#080616] p-2 rounded-xl border border-gray-850">
                  <div className="flex items-center gap-2">
                    {profile.avatar_url && <Image src={profile.avatar_url} alt={profile.username} width={32} height={32} className="rounded-full" />}
                    <span className="text-sm truncate max-w-30">{profile.username}</span>
                  </div>
                  <button onClick={() => sendFriendRequest(profile.id)} className="flex items-center gap-1 bg-[#162E93] hover:bg-blue-800 text-xs px-2 py-1.5 rounded-lg font-medium">
                    <AiOutlineUserAdd /> Add Friend
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* পেন্ডিং রিকোয়েস্ট লিস্ট */}
          <div className="rounded-2xl bg-[#1A1953] p-4 border border-gray-800">
            <h3 className="text-md font-bold mb-3">Pending Requests ({pendingRequests.length})</h3>
            <div className="space-y-2">
              {pendingRequests.map(req => (
                <div key={req.id} className="flex items-center justify-between bg-[#080616] p-2 rounded-xl">
                  <div className="flex items-center gap-2">
                    {req.sender.avatar_url && <Image src={req.sender.avatar_url} alt={req.sender.username} width={32} height={32} className="rounded-full" />}
                    <span className="text-sm">{req.sender.username}</span>
                  </div>
                  <button onClick={() => acceptRequest(req.id, req.sender.id)} className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-xs px-2 py-1.5 rounded-lg font-medium">
                    <AiOutlineCheck /> Accept
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* অ্যাক্টিভ চ্যাট বা ফ্রেন্ড লিস্ট */}
        <div className="lg:col-span-2 rounded-2xl bg-[#1A1953] p-4 border border-gray-800">
          <h3 className="text-md font-bold mb-3">Your Friends (Active Chats)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {friends.map(friend => (
              <div key={friend.id} className="flex items-center justify-between bg-[#080616] p-3 rounded-xl border border-gray-850">
                <div className="flex items-center gap-3">
                  {friend.avatar_url && <Image src={friend.avatar_url} alt={friend.username} width={40} height={40} className="rounded-full" />}
                  <div>
                    <h4 className="text-sm font-bold">{friend.username}</h4>
                    <p className="text-xs text-gray-400">Connected</p>
                  </div>
                </div>
                <button onClick={() => startChat(friend.id)} className="flex items-center gap-1 bg-[#2F2FE4] hover:bg-blue-700 text-sm px-3 py-2 rounded-xl font-semibold">
                  <AiOutlineMessage /> Chat
                </button>
              </div>
            ))}
            {friends.length === 0 && <p className="text-sm text-gray-400 col-span-2 text-center py-8">No friends yet. Search and add some!</p>}
          </div>
        </div>
      </div>
    </div>
  );
}