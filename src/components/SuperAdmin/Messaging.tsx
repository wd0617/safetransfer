import { useState, useEffect } from 'react';
import { MessageSquare, Send, Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';


type Business = {
  id: string;
  name: string;
  email: string;
  status?: string | null;
};
type AdminMessage = {
  id: string;
  business_id: string | null;
  sender_id: string | null;
  subject: string;
  message: string;
  message_type: string;
  is_read: boolean | null;
  sent_at?: string | null;
};

interface MessagingProps {
  selectedBusinessId?: string;
}

export function Messaging({ selectedBusinessId }: MessagingProps) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string>(selectedBusinessId || '');
  const [messageType, setMessageType] = useState<'info' | 'warning' | 'alert' | 'notice'>('info');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sentMessages, setSentMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBusinesses();
    loadSentMessages();
  }, []);

  useEffect(() => {
    if (selectedBusinessId) {
      setSelectedBusiness(selectedBusinessId);
    }
  }, [selectedBusinessId]);

  const loadBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .order('name');

      if (error) throw error;
      setBusinesses(data || []);
    } catch (error) {
      console.error('Error loading businesses:', error);
    }
  };

  const loadSentMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_messages')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setSentMessages(data || []);
    } catch (error) {
      console.error('Error loading sent messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!selectedBusiness || !subject.trim() || !message.trim()) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase.from('admin_messages').insert({
        business_id: selectedBusiness,
        sender_id: user.user.id,
        subject,
        message,
        message_type: messageType,
        is_read: false,
      });

      if (error) throw error;

      await supabase.from('admin_audit_log').insert({
        admin_user_id: user.user.id,
        business_id: selectedBusiness,
        action_type: 'message_sent',
        action_description: `Sent ${messageType} message: ${subject}`,
        entity_type: 'message',
        entity_id: selectedBusiness,
      });

      setSubject('');
      setMessage('');
      setMessageType('info');
      loadSentMessages();
      alert('Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const getMessageTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      info: 'bg-blue-100 text-blue-800 border-blue-200',
      warning: 'bg-amber-100 text-amber-800 border-amber-200',
      alert: 'bg-red-100 text-red-800 border-red-200',
      notice: 'bg-slate-100 text-slate-800 border-slate-200',
    };
    return colors[type] || colors.info;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Messaging</h2>
        <p className="text-slate-600 mt-1">Send messages to businesses</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Send className="w-5 h-5" />
            Send Message
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Business
              </label>
              <select
                value={selectedBusiness}
                onChange={(e) => setSelectedBusiness(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a business...</option>
                {businesses.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Message Type
              </label>
              <select
                value={messageType}
                onChange={(e) => setMessageType(e.target.value as 'info' | 'warning' | 'alert' | 'notice')}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="info">Information</option>
                <option value="notice">Notice</option>
                <option value="warning">Warning</option>
                <option value="alert">Alert</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter message subject"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your message"
                rows={6}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <button
              onClick={sendMessage}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-400"
            >
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Recent Messages
          </h3>

          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {sentMessages.map((msg) => {
              const business = businesses.find((b) => b.id === msg.business_id);

              return (
                <div key={msg.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{msg.subject}</p>
                      <p className="text-sm text-slate-600 mt-1">
                        To: {business?.name || 'Unknown'}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold border ${getMessageTypeColor(
                        msg.message_type
                      )}`}
                    >
                      {msg.message_type}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-2">{msg.message}</p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                    <p className="text-xs text-slate-500">
                      {msg.sent_at ? new Date(msg.sent_at).toLocaleString() : '-'}
                    </p>
                    {msg.is_read && (
                      <span className="text-xs text-green-600 font-medium">Read</span>
                    )}
                  </div>
                </div>
              );
            })}

            {sentMessages.length === 0 && (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600">No messages sent yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
