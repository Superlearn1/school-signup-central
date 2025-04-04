
import React from 'react';
import { useUser, useClerk, useOrganization } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { School, Users, FileText, Settings, LogOut, LayoutDashboard, UserPlus, Puzzle, BookOpen } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { organization } = useOrganization();
  const location = useLocation();

  // Navigation items
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { name: 'Students', path: '/students', icon: <Users className="h-5 w-5" /> },
    { name: 'Resources', path: '/resources', icon: <BookOpen className="h-5 w-5" /> },
    { name: 'NCCD Evidence', path: '/evidence', icon: <FileText className="h-5 w-5" /> },
    { name: 'Settings', path: '/settings', icon: <Settings className="h-5 w-5" /> },
  ];

  const handleSignOut = () => {
    signOut();
  };

  return (
    <div className="min-h-screen bg-secondary/30 flex flex-col">
      <header className="bg-white border-b py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-primary flex items-center">
            <Puzzle className="mr-2" /> Superlearn
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {user?.username || user?.firstName || 'User'}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="hidden md:block w-64 bg-white border-r shrink-0">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <School className="h-5 w-5 text-primary" />
              <span className="font-medium truncate">
                {organization?.name || 'Your School'}
              </span>
            </div>
            
            <nav>
              <ul className="space-y-1">
                {navItems.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                        location.pathname === item.path
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-secondary'
                      }`}
                    >
                      {item.icon}
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            
            <div className="mt-6 pt-6 border-t">
              <Button className="w-full justify-start" variant="outline" size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Teacher
              </Button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      <footer className="bg-white border-t py-4 px-6 text-center text-sm text-muted-foreground">
        <div className="max-w-7xl mx-auto">
          &copy; {new Date().getFullYear()} Superlearn. All rights reserved.
        </div>
      </footer>
    </div>
  );
};
