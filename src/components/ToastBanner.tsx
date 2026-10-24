import React from "react";
import { Icon } from "./UiIcons";
import { AlertCircle } from "lucide-react";

export interface ToastBannerProps {
  message: string;
  type?: "info" | "success" | "error";
}

export const ToastBanner: React.FC<ToastBannerProps> = ({ message, type = "success" }) => {
  if (!message) return null;

  const isError = type === "error";

  return (
    <div
      className={`toast ${isError ? "toast-error" : ""}`}
      style={
        isError
          ? {
              backgroundColor: "#b91c1c",
              color: "#ffffff",
              boxShadow: "0 8px 24px rgba(185, 28, 28, 0.35)",
            }
          : undefined
      }
    >
      <span>
        {isError ? (
          <AlertCircle size={15} color="#ffffff" />
        ) : (
          <Icon name="check" size={15} />
        )}
      </span>
      {message}
    </div>
  );
};
