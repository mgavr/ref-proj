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
        {/* Inter as the primary face. JetBrains Mono kept only for
            technical metadata (ids, dates, status codes). Preconnect
            for snap. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body className="min-h-screen">
        <main>{children}</main>
      </body>
    </html>
  );
}
