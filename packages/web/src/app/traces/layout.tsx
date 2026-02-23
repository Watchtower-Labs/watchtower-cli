import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Traces | Watchtower',
  description: 'Browse and analyze your agent trace history.',
};

export default function TracesLayout({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}
