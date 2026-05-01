import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../api/axios";
import { getStoredUser } from "../../store/authStore";

export default function SettingsPage() {
  const user = getStoredUser();
  const [currentRole, setCurrentRole] = useState(user?.profile?.current_role ?? "");
  const [targetRole, setTargetRole] = useState(user?.profile?.target_role ?? "");
  const [saved, setSaved] = useState(false);

  const saveProfile = useMutation({
    mutationFn: () =>
      api.patch("/api/auth/me/", {
        profile: { current_role: currentRole, target_role: targetRole },
      }),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  return (
    <div className="p-6 max-w-xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Profile & Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Manage your identity and career trajectory.
        </p>
      </div>

      <div className="bg-surface-secondary border border-surface-border rounded-xl p-5 space-y-5">
        <h2 className="text-sm font-medium text-white">Personal Details</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Full name</label>
            <input
              value={user?.username ?? ""}
              disabled
              className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-gray-400 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Email</label>
            <input
              value={user?.email ?? ""}
              disabled
              className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-gray-400 cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      <div className="bg-surface-secondary border border-surface-border rounded-xl p-5 space-y-5">
        <h2 className="text-sm font-medium text-white">Career Trajectory</h2>
        <p className="text-xs text-gray-500">
          This is used to personalise your learning path recommendations.
        </p>

        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Current Role</label>
          <input
            value={currentRole}
            onChange={(e) => setCurrentRole(e.target.value)}
            placeholder="e.g. Junior Frontend Developer"
            className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Target Role</label>
          <input
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="e.g. Senior Full-Stack Engineer"
            className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand"
          />
        </div>

        <button
          onClick={() => saveProfile.mutate()}
          disabled={saveProfile.isPending}
          className="bg-brand hover:bg-brand-hover disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {saved ? "Saved!" : saveProfile.isPending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
