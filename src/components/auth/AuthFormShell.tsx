import * as React from "react";

interface AuthFormShellProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function AuthFormShell({ title, description, children, onSubmit }: AuthFormShellProps) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
        {description && <p className="text-sm text-gray-600">{description}</p>}
      </div>
      <form onSubmit={onSubmit} noValidate className="space-y-6">
        {children}
      </form>
    </div>
  );
}
