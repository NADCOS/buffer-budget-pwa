import Image from "next/image";

interface Props {
  /** Rendered pixel size of the square mark. */
  size?: number;
  className?: string;
  priority?: boolean;
}

/** Buffer brand mark — the stacked-envelope logo. */
export function Logo({ size = 48, className = "", priority = false }: Props) {
  return (
    <Image
      src="/icons/logo-512.png"
      alt="Buffer"
      width={size}
      height={size}
      priority={priority}
      className={`rounded-2xl ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
