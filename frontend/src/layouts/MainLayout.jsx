import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { SidebarProvider, SidebarInset } from '../components/ui/sidebar';

function MainLayout() {
  return (
    <SidebarProvider>
      <Sidebar />
      <SidebarInset>
        <Navbar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default MainLayout;
