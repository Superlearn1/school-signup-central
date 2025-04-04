
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { School, Users, ShieldCheck, Sparkles } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-primary flex items-center">
            <School className="mr-2" /> SchoolSignup Central
          </h1>
          <Link to="/admin-signup">
            <Button>Get Started</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-white to-blue-50 py-16 px-6 flex-1">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 space-y-6">
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                The complete platform for <span className="text-primary">school administration</span>
              </h1>
              <p className="text-xl text-gray-600">
                Streamline your school's operations with our all-in-one platform for administrators and teachers.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/admin-signup">
                  <Button size="lg" className="gap-2">
                    <ShieldCheck className="h-5 w-5" />
                    Register as Administrator
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex-1">
              <img 
                src="https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
                alt="School Administration" 
                className="rounded-xl shadow-2xl w-full" 
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Everything you need to manage your school</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our platform provides powerful tools for school administrators and teachers.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-blue-50 p-6 rounded-xl">
              <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Administrator Dashboard</h3>
              <p className="text-gray-600">
                Get a complete overview of your school's operations with our intuitive dashboard.
              </p>
            </div>

            <div className="bg-blue-50 p-6 rounded-xl">
              <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Teacher Management</h3>
              <p className="text-gray-600">
                Easily manage your teaching staff, assign classes, and track performance.
              </p>
            </div>

            <div className="bg-blue-50 p-6 rounded-xl">
              <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Advanced Analytics</h3>
              <p className="text-gray-600">
                Gain insights into student performance, attendance, and school operations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary py-16 px-6 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to transform your school management?</h2>
          <p className="text-xl mb-8">
            Join thousands of schools already using our platform to streamline their operations.
          </p>
          <Link to="/admin-signup">
            <Button size="lg" variant="secondary">Get Started Today</Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between pb-8 border-b border-gray-700">
            <div className="mb-8 md:mb-0">
              <h2 className="text-xl font-bold flex items-center">
                <School className="mr-2" /> SchoolSignup Central
              </h2>
              <p className="mt-2 text-gray-400 max-w-xs">
                The complete platform for modern school administration.
              </p>
            </div>
          </div>
          <div className="pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} SchoolSignup Central. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
