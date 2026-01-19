import React, { useState } from 'react';

const Layout = ({ children, activeTab, onTabChange }) => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      {/* Navbar */}
      <nav className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
                  VehicleAI
                </span>
              </div>
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  <button
                    onClick={() => onTabChange('upload')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'upload'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    Analysis Setup
                  </button>
                  <button
                    onClick={() => onTabChange('results')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'results'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    Results Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
