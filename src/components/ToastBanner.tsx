import React from "react";
import { Icon } from "./UiIcons";

export interface ToastBannerProps {
  message: string;
}

export const ToastBanner: React.FC<ToastBannerProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="toast">
      <span>
        <Icon name="check" size={15} />
      </span>
      {message}
    </div>
  );
};
