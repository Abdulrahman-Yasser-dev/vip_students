import { useQuery } from "@tanstack/react-query";
import { api } from "../pages/Questions";

const useCategoriesSummary = (studentId) => {
  return useQuery({
    queryKey: ["categories-summary", studentId],
    queryFn: () => api.getCategoriesSummary(studentId).then((res) => res.data),
    enabled: !!studentId, // ✅ يتفعل بس لو فيه studentId
  });
};

export default useCategoriesSummary;
