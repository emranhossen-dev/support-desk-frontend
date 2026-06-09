'use client';
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FcGoogle } from "react-icons/fc";

export default function LoginPage() {
  const { user, loading, loginWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !loading) {
      router.push('/dashboard'); 
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#080616]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-t-transparent border-[#2F2FE4]"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#080616] px-4">
      <div className="w-full max-w-md rounded-2xl bg-[#1A1953] p-8 text-center shadow-2xl border border-gray-800">
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
          Luminous <span className="text-[#2F2FE4]">Chat</span>
        </h1>
        <p className="text-sm text-gray-400 mb-8">
          Experience super-fast real-time messaging.
        </p>

        <button
          onClick={loginWithGoogle}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#080616] px-5 py-4 text-white font-medium hover:bg-black border border-gray-750 transition-all duration-200 shadow-lg active:scale-[0.98]"
        >
          <FcGoogle className="text-2xl" />
          <span>Sign in with Google</span>
        </button>
      </div>
    </div>
  );
}