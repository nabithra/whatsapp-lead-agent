import Link from 'next/link';
import { OPENROUTER_MODEL, OPENROUTER_COST_NOTE } from '@/lib/openrouter';

const integrations = [
  { name: 'Twilio', role: 'WhatsApp inbound/outbound' },
  { name: 'Composio', role: 'Tool orchestration (Twilio + Razorpay)' },
  { name: 'Razorpay', role: '₹2999 payment links → direct revenue' },
  { name: 'OpenRouter', role: `AI: ${OPENROUTER_MODEL}` },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full text-center">
        <h1 className="text-4xl font-bold text-white mb-2">
          Wheelztracker WhatsApp Lead Agent
        </h1>
        <p className="text-gray-400 text-sm mb-6">
          WhatsApp chats → qualified leads → paid GPS installations
        </p>

        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
          </span>
          <span className="text-green-400 font-medium">Live</span>
        </div>

        <p className="text-gray-300 mb-6">
          Agent is running and listening for WhatsApp messages
        </p>

        <div className="bg-gray-800 rounded-lg p-5 mb-4 text-left">
          <p className="text-gray-400 text-xs uppercase tracking-wide mb-3">
            Integrations
          </p>
          <ul className="space-y-2">
            {integrations.map((item) => (
              <li key={item.name} className="flex justify-between text-sm">
                <span className="text-white font-medium">{item.name}</span>
                <span className="text-gray-400">{item.role}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-lg p-4 mb-6 text-left">
          <p className="text-emerald-300 text-xs font-semibold mb-1">Cost optimization</p>
          <p className="text-gray-300 text-sm">{OPENROUTER_COST_NOTE}</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-8 text-left">
          <p className="text-gray-400 text-sm mb-2">Webhook URL</p>
          <code className="text-green-400 text-sm break-all">
            /api/whatsapp-webhook
          </code>
        </div>

        <Link
          href="/dashboard"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          View Dashboard →
        </Link>
      </div>
    </div>
  );
}
