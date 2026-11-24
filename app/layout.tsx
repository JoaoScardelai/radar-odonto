import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Radar Odonto",
  description: "Concursos e processos seletivos para Odontologia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}