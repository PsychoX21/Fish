import './globals.css';

export const metadata = {
  title: 'Fish Card Game',
  description: 'Strategic multiplayer card game',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}