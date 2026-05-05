import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../lib/api";

interface ReportModalProps {
  targetType: "event" | "gallery_photo";
  targetId: string;
  isOpen: boolean;
  onClose: () => void;
  onReported: () => void;
}

export default function ReportModal({ targetType, targetId, isOpen, onClose, onReported }: ReportModalProps) {
  const { token } = useAuth();
  const [reason, setReason] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (reason.trim().length < 10) {
      setErrorMsg("Reason must be at least 10 characters");
      setState("error");
      return;
    }

    setState("loading");
    try {
      const res = await fetch(`${API_URL}/api/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ target_type: targetType, target_id: targetId, reason: reason.trim() }),
      });

      if (res.status === 409) {
        setErrorMsg("You have already reported this");
        setState("error");
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit report");
      }

      setState("success");
      setTimeout(() => {
        onReported();
        onClose();
        setState("idle");
        setReason("");
      }, 2000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setState("error");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-lg font-bold mb-4">Report {targetType === "event" ? "Event" : "Photo"}</h2>

        {state === "success" ? (
          <p className="text-green-600">Report submitted. Thank you.</p>
        ) : (
          <>
            <textarea
              value={reason}
              onChange={(e) => { setReason(e.target.value); setState("idle"); }}
              placeholder="Why are you reporting this? (min 10 characters)"
              className="border rounded px-3 py-2 w-full h-24 resize-none"
              disabled={state === "loading"}
            />

            {state === "error" && <p className="text-red-500 text-sm mt-1">{errorMsg}</p>}

            <div className="flex gap-3 mt-4">
              <button
                onClick={onClose}
                className="border rounded px-4 py-2 text-sm"
                disabled={state === "loading"}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={state === "loading"}
                className="border rounded px-4 py-2 text-sm bg-red-500 text-white"
              >
                {state === "loading" ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
