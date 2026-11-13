import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Phân tích & trực quan hóa giá cổ phiếu – tiền số",
  description:
    "Thu thập, làm sạch, phân tích và dự báo giá cổ phiếu Việt Nam & tiền mã hóa bằng ARIMA và XGBoost; giải thích mô hình bằng SHAP.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="flex min-h-screen flex-col bg-page text-slate-100 antialiased">
        <Navbar />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-5">{children}</main>
        <footer className="border-t border-line bg-panel py-4 text-center text-xs text-slate-400">
          Bài tập lớn Phân tích &amp; Trực quan hóa dữ liệu — Hệ thống thu thập, phân tích &amp; dự báo giá cổ phiếu VN và tiền mã hóa
        </footer>
      </body>
    </html>
  );
}
