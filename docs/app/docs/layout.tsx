import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { DocsSidebar } from "@/components/DocsSidebar";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
            <DocsSidebar />
            <div className="min-w-0 flex-1 pb-24 lg:max-w-3xl">{children}</div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
