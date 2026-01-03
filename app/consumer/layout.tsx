// app/consumer/layout.tsx
import { ConsumerHeader } from '@/components/layout/consumer-header';

export default function ConsumerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50/30">
      <ConsumerHeader />
      {children}
    </div>
  );
}
