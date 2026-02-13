import Image from "next/image";
// функция, която връща логото
export default function Logo36() {
  return <Image src="/logos/logo.svg" alt="Logo" width={36} height={36} />;
}
