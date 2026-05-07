// lib/toast.ts
// Sonner-based toast helpers with color coding and durations per spec
import { toast } from "sonner";

export const toastSuccess = (msg: string) =>
  toast.success(msg, {
    duration: 4000,
    style: { background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d" },
  });

export const toastError = (msg: string) =>
  toast.error(msg, {
    duration: 6000,
    style: { background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" },
  });

export const toastInfo = (msg: string) =>
  toast(msg, {
    duration: 4000,
    style: { background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8" },
  });

export const toastWarning = (msg: string) =>
  toast.warning(msg, {
    duration: 4000,
    style: { background: "#fefce8", border: "1px solid #fef08a", color: "#a16207" },
  });