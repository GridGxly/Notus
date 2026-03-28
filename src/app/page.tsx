import Sidebar from "./components/Sidebar";
import MapView from "./components/MapView";
import ActionBar from "./components/ActionBar";

export default function Home() {
  return (
    <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Sidebar />
      <main className="flex-1 flex flex-col relative">
        <MapView />
        <ActionBar />
      </main>
    </div>
  );
}
