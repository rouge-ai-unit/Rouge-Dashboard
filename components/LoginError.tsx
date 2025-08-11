import React from "react";
import { Alert, AlertTitle } from "./ui/alert";

interface LoginErrorProps {
  message: string;
  onClose?: () => void;
}

export const LoginError: React.FC<LoginErrorProps> = ({ message, onClose }) => (
  <Alert variant="destructive" className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md">
    <AlertTitle>Login Error</AlertTitle>
    <div>{message}</div>
    {onClose && (
      <button
        className="mt-2 px-3 py-1 bg-red-600 text-white rounded"
        onClick={onClose}
      >
        Close
      </button>
    )}
  </Alert>
);
