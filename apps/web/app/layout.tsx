import './globals.css';

export const metadata = {
  title: 'ref-proj',
  description: 'A reference project for Karaoke Place and Prompt Bout.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts — preloaded for snap. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body className="relative min-h-screen">
        <main className="relative z-10">{children}</main>
      </body>
    </html>
  );
}
