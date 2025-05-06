'use client';
import AdminLayout from '@/layouts/AdminLayout';

export default function AdminSettingsPage() {
  // No data fetching or filtering yet, as settings will be populated later

  return (
    <AdminLayout>
      <div className="flex flex-col mb-8 gap-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        </div>
      </div>
      {/* Intentionally left blank for future settings content */}
    </AdminLayout>
  );
}