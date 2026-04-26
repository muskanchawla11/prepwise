"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

interface Props {
  userId: string;
}

const InterviewGenerateForm = ({ userId }: Props) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    role: "Frontend Developer",
    level: "Junior",
    type: "Mixed",
    techstack: "React, TypeScript, Next.js, Tailwind CSS",
    amount: 5,
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vapi/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          role: form.role,
          level: form.level,
          techstack: form.techstack,
          amount: form.amount,
          userid: userId,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError("Failed to generate interview. Try again.");
        setLoading(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError("Network error. Try again.");
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="form flex flex-col gap-4 w-full max-w-2xl"
    >
      <div className="flex flex-col gap-2">
        <label className="label">Role</label>
        <input
          className="input"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          placeholder="e.g. Frontend Developer"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="label">Experience Level</label>
        <select
          className="input"
          value={form.level}
          onChange={(e) => setForm({ ...form, level: e.target.value })}
        >
          <option value="Junior">Junior</option>
          <option value="Mid">Mid</option>
          <option value="Senior">Senior</option>
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="label">Interview Type</label>
        <select
          className="input"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        >
          <option value="Behavioural">Behavioural</option>
          <option value="Technical">Technical</option>
          <option value="Mixed">Mixed</option>
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="label">Tech Stack (comma-separated)</label>
        <input
          className="input"
          value={form.techstack}
          onChange={(e) => setForm({ ...form, techstack: e.target.value })}
          placeholder="e.g. React, Node.js, PostgreSQL"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="label">Number of Questions</label>
        <input
          className="input"
          type="number"
          min={1}
          max={20}
          value={form.amount}
          onChange={(e) =>
            setForm({ ...form, amount: parseInt(e.target.value) || 1 })
          }
          required
        />
      </div>

      {error && <p className="text-destructive-100">{error}</p>}

      <Button type="submit" className="btn" disabled={loading}>
        {loading ? "Generating..." : "Generate Interview"}
      </Button>
    </form>
  );
};

export default InterviewGenerateForm;
