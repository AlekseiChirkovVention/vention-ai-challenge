import Navbar from "../components/Navbar";

type Props = {
  children: React.ReactNode;
};

export default function MainLayout({ children }: Props) {
  return (
    <div className="min-h-screen antialiased">
      <Navbar />
      <main className="container mx-auto">
        {children}
      </main>
    </div>
  );
}
