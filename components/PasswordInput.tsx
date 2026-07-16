"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

// One password field for the whole app — a normal <input> plus a show/hide (eye) toggle.
// Spreads every input prop through, so it drops in wherever a password <input> was used.
// `wrapperClassName` lets a caller keep the input's old layout footprint (e.g. flex-1).
type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  wrapperClassName?: string;
  iconClassName?: string;
};

export default function PasswordInput({ className = "", wrapperClassName = "", iconClassName = "", ...props }: Props) {
  const [show, setShow] = useState(false);
  return (
    <div className={`relative ${wrapperClassName || "w-full"}`}>
      <input {...props} type={show ? "text" : "password"} className={`${className} pr-11`} />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className={`absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 transition hover:text-neutral-200 ${iconClassName}`}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
