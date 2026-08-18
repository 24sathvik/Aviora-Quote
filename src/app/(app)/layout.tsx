import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex w-0 flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="relative flex-1 overflow-y-auto focus:outline-none">
          <div className="py-6 px-4 sm:px-6 lg:px-8">
            {children}
            <footer className="mt-12 border-t border-gray-200/80 pt-4 pb-2 text-center text-xs text-gray-500">
              <div className="flex items-center justify-center gap-1.5">
                <span>Developed &amp; maintained by</span>
                <a
                  href="https://zyxen.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-bold text-navy-800 hover:text-navy-950 hover:underline transition-colors"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/zyxen-logo.png"
                    alt="ZYXEN"
                    className="h-5 w-auto object-contain bg-black px-1.5 py-0.5 rounded shrink-0 shadow-2xs"
                  />
                  <span className="font-extrabold text-xs">ZYXEN</span>
                </a>
              </div>
            </footer>
          </div>
        </main>
      </div>
    </div>
  )
}
