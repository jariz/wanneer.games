import { RotateCw } from "lucide-react";

interface SpinnerProps {
  className?: string;
}

export default function Spinner({ className = "" }: SpinnerProps = {}) {
  return (
    <RotateCw className={`animate-spin text-primary inline w-12 h-12 ${className}`} />
  );
}
