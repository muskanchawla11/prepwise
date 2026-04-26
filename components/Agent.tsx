"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { createFeedback } from "@/lib/actions/general.action";

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

interface SavedMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

const Agent = ({
  userName,
  userId,
  interviewId,
  feedbackId,
  type,
  questions,
}: AgentProps) => {
  const router = useRouter();
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [lastMessage, setLastMessage] = useState<string>("");
  const [supported, setSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const stopRequestedRef = useRef(false);
  const finishListenRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR || !window.speechSynthesis) setSupported(false);
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setLastMessage(messages[messages.length - 1].content);
    }
  }, [messages]);

  useEffect(() => {
    if (callStatus !== CallStatus.FINISHED) return;

    if (type === "generate") {
      router.push("/");
      return;
    }

    const run = async () => {
      const { success, feedbackId: id } = await createFeedback({
        interviewId: interviewId!,
        userId: userId!,
        transcript: messages,
        feedbackId,
      });

      if (success && id) {
        router.push(`/interview/${interviewId}/feedback`);
      } else {
        router.push("/");
      }
    };

    run();
  }, [callStatus, feedbackId, interviewId, messages, router, type, userId]);

  const speak = (text: string) =>
    new Promise<void>((resolve) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        resolve();
        return;
      }
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1;
      utter.pitch = 1;
      utter.lang = "en-US";

      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find((v) => /female|samantha|zira|google us/i.test(v.name)) ||
        voices.find((v) => v.lang.startsWith("en"));
      if (preferred) utter.voice = preferred;

      utter.onstart = () => setIsSpeaking(true);
      utter.onend = () => {
        setIsSpeaking(false);
        resolve();
      };
      utter.onerror = () => {
        setIsSpeaking(false);
        resolve();
      };
      window.speechSynthesis.speak(utter);
    });

  const listen = (timeoutMs = 5 * 60 * 1000) =>
    new Promise<string>((resolve) => {
      const SR =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (!SR) {
        resolve("");
        return;
      }
      const rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      let final = "";
      let settled = false;

      const finish = () => {
        if (settled) return;
        settled = true;
        finishListenRef.current = null;
        setIsListening(false);
        setInterimText("");
        try {
          rec.stop();
        } catch {}
        resolve(final.trim());
      };

      rec.onresult = (e: any) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const transcript = e.results[i][0].transcript;
          if (e.results[i].isFinal) {
            final += transcript + " ";
          } else {
            interim += transcript;
          }
        }
        setInterimText(interim);
      };

      rec.onerror = (e: any) => {
        if (e.error === "no-speech" || e.error === "aborted") return;
        finish();
      };

      rec.onend = () => {
        if (settled) return;
        try {
          rec.start();
        } catch {
          finish();
        }
      };

      recognitionRef.current = rec;
      finishListenRef.current = finish;
      setIsListening(true);

      try {
        rec.start();
      } catch {
        finish();
      }

      setTimeout(finish, timeoutMs);
    });

  const handleNextQuestion = () => {
    if (finishListenRef.current) finishListenRef.current();
  };

  const handleCall = async () => {
    if (!supported) {
      alert(
        "Your browser does not support voice input. Please use Chrome, Edge, or Safari."
      );
      return;
    }
    if (type !== "interview" || !questions || questions.length === 0) {
      alert("No questions available for this interview.");
      return;
    }

    setCallStatus(CallStatus.CONNECTING);
    stopRequestedRef.current = false;
    setMessages([]);

    if (typeof window !== "undefined") {
      window.speechSynthesis.getVoices();
    }

    setCallStatus(CallStatus.ACTIVE);

    const greeting = `Hello ${userName}. Welcome to your mock interview. I will ask you a series of questions. Click the Done answering button when you finish each response. Let's begin.`;
    setMessages((prev) => [...prev, { role: "assistant", content: greeting }]);
    await speak(greeting);

    for (let i = 0; i < questions.length; i++) {
      if (stopRequestedRef.current) break;
      const q = questions[i];
      setMessages((prev) => [...prev, { role: "assistant", content: q }]);
      await speak(q);
      if (stopRequestedRef.current) break;

      const answer = await listen();
      if (stopRequestedRef.current) break;
      if (answer) {
        setMessages((prev) => [...prev, { role: "user", content: answer }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "user", content: "(no response)" },
        ]);
      }
    }

    if (!stopRequestedRef.current) {
      const closing =
        "Thank you for your time. Generating your feedback now. Please wait.";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: closing },
      ]);
      await speak(closing);
    }

    setCallStatus(CallStatus.FINISHED);
  };

  const handleDisconnect = () => {
    stopRequestedRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    if (typeof window !== "undefined") {
      window.speechSynthesis.cancel();
    }
    setIsListening(false);
    setInterimText("");
    setCallStatus(CallStatus.FINISHED);
  };

  return (
    <>
      <div className="call-view">
        <div className="card-interviewer">
          <div className="avatar">
            <Image
              src="/ai-avatar.png"
              alt="profile-image"
              width={65}
              height={54}
              className="object-cover"
            />
            {isSpeaking && <span className="animate-speak" />}
          </div>
          <h3>AI Interviewer</h3>
        </div>

        <div className="card-border">
          <div className="card-content">
            <Image
              src="/user-avatar.png"
              alt="profile-image"
              width={539}
              height={539}
              className="rounded-full object-cover size-[120px]"
            />
            <h3>{userName}</h3>
            {isListening && (
              <p className="text-success-100 text-sm mt-2">
                🎙️ Listening...
              </p>
            )}
          </div>
        </div>
      </div>

      {messages.length > 0 && (
        <div className="transcript-border">
          <div className="transcript">
            <p
              key={lastMessage}
              className={cn(
                "transition-opacity duration-500 opacity-0",
                "animate-fadeIn opacity-100"
              )}
            >
              {lastMessage}
            </p>
          </div>
        </div>
      )}

      {isListening && interimText && (
        <p className="text-center text-light-400 italic">{interimText}</p>
      )}

      {!supported && (
        <p className="text-center text-destructive-100">
          Your browser does not support the Web Speech API. Use Chrome, Edge, or
          Safari to take voice interviews.
        </p>
      )}

      <div className="w-full flex justify-center gap-4">
        {callStatus !== "ACTIVE" ? (
          <button className="relative btn-call" onClick={() => handleCall()}>
            <span
              className={cn(
                "absolute animate-ping rounded-full opacity-75",
                callStatus !== "CONNECTING" && "hidden"
              )}
            />

            <span className="relative">
              {callStatus === "INACTIVE" || callStatus === "FINISHED"
                ? "Start Interview"
                : ". . ."}
            </span>
          </button>
        ) : (
          <>
            {isListening && (
              <button className="btn-call" onClick={handleNextQuestion}>
                Done answering
              </button>
            )}
            <button className="btn-disconnect" onClick={() => handleDisconnect()}>
              End
            </button>
          </>
        )}
      </div>
    </>
  );
};

export default Agent;
