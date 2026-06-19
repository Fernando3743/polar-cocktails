import Image from "next/image";

interface IconProps {
  className?: string;
  src?: string;
}

export function PolarLogo({ className, src = "/images/polar-logo.png" }: IconProps) {
  return (
    <Image
      src={src}
      alt="Polar Cocktails"
      width={1200}
      height={255}
      priority
      className={["w-auto object-contain", className].filter(Boolean).join(" ")}
    />
  );
}
