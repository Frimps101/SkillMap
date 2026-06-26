import { useMutation, useQueryClient } from "@tanstack/react-query";

import { saveJob, unsaveJob } from "../api/jobs";
import type { Job, JobsResponse } from "../types/job";

interface SaveVars {
  job: Job;
  save: boolean;
}

export function useSaveJobMutation(queryKey: unknown[], removeOnUnsave = false) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ job, save }: SaveVars) => {
      if (save) await saveJob(job.id);
      else await unsaveJob(job.id);
    },
    onMutate: async ({ job, save }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<JobsResponse>(queryKey);

      queryClient.setQueryData<JobsResponse>(queryKey, (old) => {
        if (!old) return old;
        if (removeOnUnsave && !save) {
          return {
            ...old,
            count: Math.max(0, old.count - 1),
            results: old.results.filter((j) => j.id !== job.id),
          };
        }
        return {
          ...old,
          results: old.results.map((j) =>
            j.id === job.id ? { ...j, is_saved: save } : j
          ),
        };
      });

      return { previous, key: queryKey };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["saved-jobs"] });
    },
  });
}
