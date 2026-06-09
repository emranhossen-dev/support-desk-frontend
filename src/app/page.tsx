'use client';
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext"; 
import { useRouter } from "next/navigation";
import { AiOutlineMail, AiOutlineLock, AiOutlineUser, AiOutlineArrowRight } from "react-icons/ai";
import { FcGoogle } from "react-icons/fc";

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // TypeScript definition bypass securely
  const auth = useAuth() as Record<string, any>; 
  const router = useRouter();

  // 🔄 অটো-রিডাইরেক্ট ইফেক্ট: ইউজার সেশন একটিভ হলেই ড্যাশবোর্ডে নিয়ে যাবে
  useEffect(() => {
    if (auth?.user) {
      router.replace("/dashboard");
    }
  }, [auth?.user, router]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setAuthLoading(true);

    try {
      if (isSignUp) {
        if (!username.trim()) throw new Error("Username is required");
        
        if (auth.signUpEmail) {
          await auth.signUpEmail(email, password, username);
        } else if (auth.signUp) {
          await auth.signUp(email, password, username);
        } else {
          throw new Error("Sign up method not found in AuthContext");
        }
        setError("Registration successful! Please check your email for verification or sign in.");
      } else {
        if (auth.loginEmail) {
          await auth.loginEmail(email, password);
        } else if (auth.login) {
          await auth.login(email, password);
        } else if (auth.signIn) {
          await auth.signIn(email, password);
        } else {
          throw new Error("Login method not found in AuthContext");
        }
        // সফলভাবে ইমেইল লগইন হলে সেশন চেঞ্জের জন্য ১ সেকেন্ড সময় দিয়ে ফোর্সড রিডাইরেক্ট
        setTimeout(() => {
          router.push("/dashboard");
        }, 1000);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Authentication failed. Please try again.");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    try {
      if (auth.signInWithGoogle) {
        await auth.signInWithGoogle();
      } else if (auth.loginWithGoogle) {
        await auth.loginWithGoogle();
      } else {
        throw new Error("Google login method not found in AuthContext");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Google login failed.");
      }
    }
  };

  // ইউজার অলরেডি লগইন থাকলে ব্ল্যাঙ্ক স্ক্রিন দেখাবে যেন ড্যাশবোর্ডে রিডাইরেক্ট হয়ে যায়
  if (auth?.user) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#0b0c22]">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-[#0b0c22] text-white antialiased overflow-hidden p-4 selection:bg-[#2F2FE4]/30">
      {/* লুমিনাস ডার্ক থিম ব্যাকগ্রাউন্ড লাইট এলিমেন্টস */}
      <div className="absolute top-[-10%] left-[-10%] h-125 w-125 rounded-full bg-[#2F2FE4]/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] h-125 w-125 rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />

      {/* মেইন গ্লাসমরফিক ডিজাইন কন্টেইনার কার্ড */}
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#1A1953]/30 backdrop-blur-xl p-8 shadow-2xl z-10 transition-all duration-300 hover:border-white/15">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-wider bg-linear-to-r from-white via-cyan-300 to-indigo-400 bg-clip-text text-transparent">
            Support Desk Chat
          </h1>
          <p className="text-xs text-gray-400 mt-2 font-medium tracking-wide">
            {isSignUp ? "Create an account to get started" : "Welcome back! Please login to your desk"}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center text-xs text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          {isSignUp && (
            <div className="relative flex items-center">
              <AiOutlineUser className="absolute left-4 text-gray-400 text-lg" />
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full rounded-xl border border-white/10 bg-[#080616]/50 py-3 pl-12 pr-4 text-sm outline-none transition-all placeholder:text-gray-500 focus:border-indigo-500/50 focus:bg-[#080616]/80"
              />
            </div>
          )}

          <div className="relative flex items-center">
            <AiOutlineMail className="absolute left-4 text-gray-400 text-lg" />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-white/10 bg-[#080616]/50 py-3 pl-12 pr-4 text-sm outline-none transition-all placeholder:text-gray-500 focus:border-indigo-500/50 focus:bg-[#080616]/80"
            />
          </div>

          <div className="relative flex items-center">
            <AiOutlineLock className="absolute left-4 text-gray-400 text-lg" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-white/10 bg-[#080616]/50 py-3 pl-12 pr-4 text-sm outline-none transition-all placeholder:text-gray-500 focus:border-indigo-500/50 focus:bg-[#080616]/80"
            />
          </div>

          <button
            type="submit"
            disabled={authLoading}
            className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-500 active:scale-[0.98] disabled:bg-indigo-700/50 disabled:cursor-not-allowed"
          >
            {authLoading ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <span>{isSignUp ? "Sign Up" : "Sign In"}</span>
                <AiOutlineArrowRight className="text-lg transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>

        <div className="relative flex items-center justify-center my-6">
          <div className="w-full border-t border-white/10"></div>
          <span className="absolute px-3 bg-[#11122a] text-[11px] text-gray-500 uppercase font-bold tracking-widest rounded-full border border-white/5">
            OR
          </span>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 py-3 font-medium text-white transition-all hover:bg-white/10 hover:border-white/20 active:scale-[0.98]"
        >
          <FcGoogle className="text-xl" />
          <span className="text-sm">Continue with Google</span>
        </button>

        <div className="mt-8 text-center text-xs text-gray-400">
          {isSignUp ? "Already have an account? " : "Don't have an account? "}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
            }}
            className="font-semibold text-cyan-400 hover:text-cyan-300 transition underline underline-offset-4 pl-1"
          >
            {isSignUp ? "Sign In here" : "Sign Up here"}
          </button>
        </div>

      </div>
    </div>
  );
}