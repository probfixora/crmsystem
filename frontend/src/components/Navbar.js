import React from 'react';
import { LayoutDashboard, LogOut } from 'lucide-react';

const Navbar = ({ onLogout }) => {
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-3 group cursor-pointer">
            <div className="bg-blue-600 p-2 rounded-xl group-hover:rotate-12 transition-transform duration-300 shadow-lg shadow-blue-100">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black text-gray-900 tracking-tight">Solar CRM</span>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center text-gray-500 hover:text-red-600 font-bold text-sm px-4 py-2 rounded-xl hover:bg-red-50 transition-all duration-300"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
