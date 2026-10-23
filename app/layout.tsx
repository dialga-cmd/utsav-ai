import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/ui/BrandMark";
import { Container } from "@/components/ui/Container";
import "./globals.css";

const bodyFont = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const displayFont = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Utsav AI — plan the celebration, keep the budget in sight",
  description:
    "A calm planning assistant for Indian weddings, birthdays and community events. Get a budget, timeline, vendor checklist and personalised ideas in one place.",
  applicationName: "Utsav AI",
  formatDetection: { telephone: false },
  openGraph: {
    title: "Utsav AI",
    description:
      "A budget, timeline, vendor checklist, ideas and print-ready plan for Indian celebrations.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#faf6ef",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${displayFont.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <div className="app-shell">
          <header className="site-header no-print">
            <Container>
              <div className="header-row">
                <Link className="brand-link" href="/" aria-label="Utsav AI home">
                  <BrandMark />
                  <span className="brand-name">Utsav AI</span>
                </Link>
                <nav className="site-nav" aria-label="Primary">
                  <a href="#plan-workspace">Plan</a>
                  <a href="#about-utsav">Good to know</a>
                </nav>
              </div>
            </Container>
          </header>
          {children}
          <footer id="about-utsav" className="site-footer">
            <Container>
              <div className="site-footer-inner">
                <div>
                  <p className="footer-title">A first draft, not a guarantee.</p>
                  <p>
                    Confirm prices, availability, safety requirements and permissions with
                    local vendors and authorities. Utsav AI never books anything for you.
                  </p>
                </div>
                <div>
                  <p className="footer-title">Private by default.</p>
                  <p>
                    Your plan is saved only in this browser. No account, no guest list
                    uploads and no third-party analytics.
                  </p>
                </div>
              </div>
            </Container>
          </footer>
        </div>
      </body>
    </html>
  );
}
