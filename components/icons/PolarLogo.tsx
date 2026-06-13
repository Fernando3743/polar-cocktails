import Image from "next/image";

interface IconProps {
  className?: string;
  src?: string;
}

export function PolarLogo({ className, src = "/images/polar-logo.jpg" }: IconProps) {
  return (
    <Image
      src={src}
      alt="Polar Cocktails"
      width={150}
      height={150}
      className={["object-contain", className].filter(Boolean).join(" ")}
    />
  );
}
