import Image from "next/image";

interface IconProps {
  className?: string;
}

export function PolarLogo({ className }: IconProps) {
  return (
    <Image
      src="/images/polar logo.jpg"
      alt="Polar Cocktails"
      width={150}
      height={150}
      className={["object-contain", className].filter(Boolean).join(" ")}
    />
  );
}
