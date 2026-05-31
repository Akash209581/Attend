import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

export default function AdminLayout() {
    return (
        <div className="flex h-screen bg-slate-100 dark:bg-slate-950 overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Navbar />
                <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
