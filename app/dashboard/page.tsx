'use client';

import { useEffect, useState } from 'react';

interface Lead {
  id: number;
  phone_number: string;
  name: string | null;
  vehicle_type: string | null;
  vehicle_number: string | null;
  status: string;
  payment_link: string | null;
  created_at: string;
  message_count: number;
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    paid: 'bg-green-100 text-green-800',
    talking: 'bg-yellow-100 text-yellow-800',
    lost: 'bg-red-100 text-red-800',
    payment_sent: 'bg-blue-100 text-blue-800',
    new: 'bg-gray-100 text-gray-800',
    interested: 'bg-purple-100 text-purple-800',
  };

  return (
    <span
      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
        styles[status] || 'bg-gray-100 text-gray-800'
      }`}
    >
      {status}
    </span>
  );
}

function formatIndianDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchLeads() {
    try {
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setLeads(data);
      setError(null);
    } catch {
      setError('Could not load leads. Check database connection.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLeads();
    const interval = setInterval(fetchLeads, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Wheelztracker Lead Agent Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Auto-refreshes every 30 seconds
          </p>
        </div>

        {loading && (
          <p className="text-gray-500">Loading leads...</p>
        )}

        {error && (
          <p className="text-red-600 mb-4">{error}</p>
        )}

        {!loading && !error && leads.length === 0 && (
          <p className="text-gray-500">No leads yet. Send a WhatsApp message to get started.</p>
        )}

        {leads.length > 0 && (
          <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vehicle Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vehicle Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Link
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Messages
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {lead.phone_number}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {statusBadge(lead.status)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {lead.vehicle_type || '—'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {lead.vehicle_number || '—'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      {lead.payment_link ? (
                        <a
                          href={lead.payment_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          View Link
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatIndianDate(lead.created_at)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      {lead.message_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6">
          <a href="/" className="text-sm text-blue-600 hover:text-blue-800">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
