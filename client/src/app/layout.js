import './globals.css';
import Providers from './Providers';

export const metadata = {
  title: 'Fish Card Game',
  description: 'Strategic multiplayer card game',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

